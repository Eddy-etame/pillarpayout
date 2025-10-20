const db = require('../db');
const redisClient = require('../redisClient');
const logger = require('../utils/logger');

class AdminService {
  constructor() {
    this.blockedIPs = new Set();
    this.failedLoginAttempts = new Map();
    this.suspiciousActivities = new Map();
  }

  // PROFITABILITY CALCULATIONS - REAL DATA FROM DATABASE
  async getProfitabilityMetrics() {
    try {
      // Get total revenue from all bets (simplified query)
      const revenueResult = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM bets
        WHERE timestamp >= NOW() - INTERVAL '30 days'
      `);
      
      // Get total payouts from winning bets (simplified query)
      let totalPayouts = 0;
      try {
        const payoutsResult = await db.query(`
          SELECT COALESCE(SUM(winnings), 0) as total_payouts
          FROM round_results
          WHERE result = 'win' AND timestamp >= NOW() - INTERVAL '30 days'
        `);
        totalPayouts = parseFloat(payoutsResult.rows[0].total_payouts) || 0;
      } catch (error) {
        logger.warn('round_results table query failed, using 0 for payouts:', error.message);
        // If round_results table doesn't exist or has issues, use 0
        totalPayouts = 0;
      }
      
      // Get betting statistics (simplified query)
      const bettingStatsResult = await db.query(`
        SELECT 
          COUNT(*) as total_bets,
          COALESCE(AVG(amount), 0) as average_bet_amount
        FROM bets
        WHERE timestamp >= NOW() - INTERVAL '30 days'
      `);
      
      // Get crash rate from rounds (simplified query)
      const crashRateResult = await db.query(`
        SELECT 
          COUNT(*) as total_rounds,
          COUNT(CASE WHEN crash_point < 2.0 THEN 1 END) as early_crashes
        FROM rounds
        WHERE timestamp >= NOW() - INTERVAL '30 days'
      `);
      
      // Calculate metrics
      const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue) || 0;
      const netProfit = totalRevenue - totalPayouts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      
      const totalBets = parseInt(bettingStatsResult.rows[0].total_bets) || 0;
      const averageBetAmount = parseFloat(bettingStatsResult.rows[0].average_bet_amount) || 0;
      
      const totalRounds = parseInt(crashRateResult.rows[0].total_rounds) || 0;
      const earlyCrashes = parseInt(crashRateResult.rows[0].early_crashes) || 0;
      const crashRate = totalRounds > 0 ? (earlyCrashes / totalRounds) * 100 : 0;
      
      // Calculate time-based revenue
      const hourlyRevenue = await this.getTimeBasedRevenue('1 hour');
      const dailyRevenue = await this.getTimeBasedRevenue('1 day');
      const weeklyRevenue = await this.getTimeBasedRevenue('1 week');
      
      // Monthly projection based on current daily average
      const monthlyProjection = dailyRevenue * 30;
      
      // House edge calculation (difference between theoretical and actual payouts)
      const houseEdge = this.calculateHouseEdge(totalRevenue, totalPayouts, totalBets);
      
      return {
        totalRevenue,
        totalPayouts,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        averageBetAmount: Math.round(averageBetAmount),
        totalBets,
        crashRate: Math.round(crashRate * 100) / 100,
        houseEdge: Math.round(houseEdge * 100) / 100,
        monthlyProjection: Math.round(monthlyProjection),
        hourlyRevenue: Math.round(hourlyRevenue),
        dailyRevenue: Math.round(dailyRevenue),
        weeklyRevenue: Math.round(weeklyRevenue)
      };
    } catch (error) {
      logger.error('Error calculating profitability metrics:', error);
      // Return safe default values instead of throwing
      return {
        totalRevenue: 0,
        totalPayouts: 0,
        netProfit: 0,
        profitMargin: 0,
        averageBetAmount: 0,
        totalBets: 0,
        crashRate: 0,
        houseEdge: 0,
        monthlyProjection: 0,
        hourlyRevenue: 0,
        dailyRevenue: 0,
        weeklyRevenue: 0
      };
    }
  }

  async getTimeBasedRevenue(timeInterval) {
    try {
      const result = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as revenue
        FROM bets
        WHERE timestamp >= NOW() - INTERVAL '${timeInterval}'
      `);
      return parseFloat(result.rows[0].revenue) || 0;
    } catch (error) {
      logger.error(`Error getting ${timeInterval} revenue:`, error);
      return 0;
    }
  }

  calculateHouseEdge(totalRevenue, totalPayouts, totalBets) {
    if (totalBets === 0) return 0;
    
    // Theoretical house edge is typically 5-15% for crash games
    const theoreticalEdge = 0.10; // 10%
    const actualEdge = (totalRevenue - totalPayouts) / totalRevenue;
    
    return Math.max(0, actualEdge);
  }

  // GAME CONTROL FUNCTIONS
  async getGameStatus() {
    try {
      // Get current game state from Redis
      const gameState = await redisClient.get('game:state');
      const currentRound = await redisClient.get('game:currentRound');
      const crashPoint = await redisClient.get('game:crashPoint');
      const multiplier = await redisClient.get('game:multiplier');
      const isPaused = await redisClient.get('game:paused');
      
      // Get active players count
      const activePlayersResult = await db.query(`
        SELECT COUNT(DISTINCT user_id) as active_players
        FROM bets
        WHERE timestamp >= NOW() - INTERVAL '5 minutes'
      `);
      
      // Get total bets for current round
      const totalBetsResult = await db.query(`
        SELECT COALESCE(SUM(amount), 0) as total_bets
        FROM bets
        WHERE round_id = $1
      `, [currentRound]);
      
      // Get house advantage from game engine
      const houseAdvantage = await this.calculateCurrentHouseAdvantage();
      
      return {
        isPaused: isPaused === 'true',
        currentRound: parseInt(currentRound) || 0,
        gameState: gameState || 'waiting',
        crashPoint: parseFloat(crashPoint) || 1.0,
        multiplier: parseFloat(multiplier) || 1.0,
        activePlayers: parseInt(activePlayersResult.rows[0].active_players) || 0,
        totalBets: parseFloat(totalBetsResult.rows[0].total_bets) || 0,
        roundTime: 0, // Will be calculated from game engine
        houseAdvantage: Math.round(houseAdvantage * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting game status:', error);
      // Return safe default values instead of throwing
      return {
        isPaused: false,
        currentRound: 0,
        gameState: 'waiting',
        crashPoint: 1.0,
        multiplier: 1.0,
        activePlayers: 0,
        totalBets: 0,
        roundTime: 0,
        houseAdvantage: 0.10
      };
    }
  }

  async calculateCurrentHouseAdvantage() {
    try {
      // Get recent bet amounts to calculate house advantage
      const recentBetsResult = await db.query(`
        SELECT amount FROM bets 
        WHERE timestamp >= NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC LIMIT 100
      `);
      
      if (recentBetsResult.rows.length === 0) return 0.10; // Default 10%
      
      const totalBetAmount = recentBetsResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
      const averageBetAmount = totalBetAmount / recentBetsResult.rows.length;
      
      // Higher bets = higher house advantage
      if (averageBetAmount > 1000) return 0.15; // 15% for high rollers
      if (averageBetAmount > 500) return 0.12;  // 12% for medium bets
      return 0.10; // 10% for regular bets
    } catch (error) {
      logger.error('Error calculating house advantage:', error);
      return 0.10;
    }
  }

  async pauseGame() {
    try {
      await redisClient.set('game:paused', 'true');
      await redisClient.set('game:pauseTime', Date.now().toString());
      logger.info('Game paused by admin');
      return { success: true, message: 'Game paused successfully' };
    } catch (error) {
      logger.error('Error pausing game:', error);
      throw error;
    }
  }

  async resumeGame() {
    try {
      await redisClient.del('game:paused');
      await redisClient.del('game:pauseTime');
      logger.info('Game resumed by admin');
      return { success: true, message: 'Game resumed successfully' };
    } catch (error) {
      logger.error('Error resuming game:', error);
      throw error;
    }
  }

  async emergencyStop() {
    try {
      // Force crash the current round
      await redisClient.set('game:emergencyStop', 'true');
      await redisClient.set('game:crashPoint', '1.0');
      logger.warn('Game emergency stopped by admin');
      return { success: true, message: 'Game emergency stopped' };
    } catch (error) {
      logger.error('Error emergency stopping game:', error);
      throw error;
    }
  }

  async setCrashPoint(crashPoint) {
    try {
      if (crashPoint < 1.0 || crashPoint > 100.0) {
        throw new Error('Crash point must be between 1.0x and 100.0x');
      }
      
      await redisClient.set('game:nextCrashPoint', crashPoint.toString());
      await redisClient.set('game:crashPointOverride', 'true');
      
      logger.info(`Admin set next crash point to ${crashPoint}x`);
      return { success: true, message: `Next crash point set to ${crashPoint}x` };
    } catch (error) {
      logger.error('Error setting crash point:', error);
      throw error;
    }
  }

  // SECURITY FUNCTIONS
  async getSecurityOverview() {
    try {
      // Get failed login attempts
      const failedLoginsResult = await db.query(`
        SELECT COUNT(*) as failed_attempts
        FROM login_attempts
        WHERE success = false AND timestamp >= NOW() - INTERVAL '24 hours'
      `);
      
      // Get suspicious activities
      const suspiciousResult = await db.query(`
        SELECT COUNT(*) as suspicious_count
        FROM user_activities
        WHERE risk_level = 'high' AND timestamp >= NOW() - INTERVAL '24 hours'
      `);
      
      // Get blocked IPs count
      const blockedIPsCount = this.blockedIPs.size;
      
      // Calculate security level
      const securityLevel = this.calculateSecurityLevel(
        parseInt(failedLoginsResult.rows[0].failed_attempts),
        parseInt(suspiciousResult.rows[0].suspicious_count),
        blockedIPsCount
      );
      
      return {
        failedLoginAttempts: parseInt(failedLoginsResult.rows[0].failed_attempts) || 0,
        suspiciousActivities: parseInt(suspiciousResult.rows[0].suspicious_count) || 0,
        blockedIPs: blockedIPsCount,
        lastSecurityScan: new Date().toISOString(),
        activeThreats: this.calculateActiveThreats(),
        securityLevel
      };
    } catch (error) {
      logger.error('Error getting security overview:', error);
      throw error;
    }
  }

  calculateSecurityLevel(failedLogins, suspiciousActivities, blockedIPs) {
    let score = 100;
    
    if (failedLogins > 10) score -= 30;
    else if (failedLogins > 5) score -= 20;
    else if (failedLogins > 0) score -= 10;
    
    if (suspiciousActivities > 5) score -= 40;
    else if (suspiciousActivities > 0) score -= 20;
    
    if (blockedIPs > 10) score -= 20;
    else if (blockedIPs > 0) score -= 10;
    
    if (score >= 80) return 'SECURE';
    if (score >= 60) return 'MODERATE';
    if (score >= 40) return 'LOW';
    return 'CRITICAL';
  }

  calculateActiveThreats() {
    let threats = 0;
    
    // Check for multiple failed logins from same IP
    for (const [ip, attempts] of this.failedLoginAttempts) {
      if (attempts > 5) threats++;
    }
    
    // Check for suspicious activities
    for (const [ip, activities] of this.suspiciousActivities) {
      if (activities > 3) threats++;
    }
    
    return threats;
  }

  async runSecurityScan() {
    try {
      // Scan for suspicious patterns
      const suspiciousIPsResult = await db.query(`
        SELECT ip_address, COUNT(*) as failed_attempts
        FROM login_attempts
        WHERE success = false AND timestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY ip_address
        HAVING COUNT(*) > 5
      `);
      
      // Auto-block suspicious IPs
      for (const row of suspiciousIPsResult.rows) {
        await this.blockIP(row.ip_address, 'Auto-blocked due to multiple failed login attempts');
      }
      
      // Log security scan
      await db.query(`
        INSERT INTO admin_logs (admin_id, action, details, timestamp)
        VALUES (1, 'security_scan', 'Security scan completed', NOW())
      `);
      
      logger.info('Security scan completed');
      return { success: true, message: 'Security scan completed', blockedIPs: suspiciousIPsResult.rows.length };
    } catch (error) {
      logger.error('Error running security scan:', error);
      throw error;
    }
  }

  async blockIP(ipAddress, reason) {
    try {
      this.blockedIPs.add(ipAddress);
      
      // Store in database
      await db.query(`
        INSERT INTO blocked_ips (ip_address, reason, blocked_at, blocked_by)
        VALUES ($1, $2, NOW(), 'admin')
        ON CONFLICT (ip_address) DO UPDATE SET
        reason = $2, blocked_at = NOW(), blocked_by = 'admin'
      `, [ipAddress, reason]);
      
      logger.info(`IP ${ipAddress} blocked by admin: ${reason}`);
      return { success: true, message: `IP ${ipAddress} blocked successfully` };
    } catch (error) {
      logger.error('Error blocking IP:', error);
      throw error;
    }
  }

  async unblockIP(ipAddress) {
    try {
      this.blockedIPs.delete(ipAddress);
      
      // Remove from database
      await db.query(`
        DELETE FROM blocked_ips WHERE ip_address = $1
      `, [ipAddress]);
      
      logger.info(`IP ${ipAddress} unblocked by admin`);
      return { success: true, message: `IP ${ipAddress} unblocked successfully` };
    } catch (error) {
      logger.error('Error unblocking IP:', error);
      throw error;
    }
  }

  isIPBlocked(ipAddress) {
    return this.blockedIPs.has(ipAddress);
  }

  // USER MANAGEMENT FUNCTIONS
  async getUserOverview() {
    try {
      // Get user statistics
      const userStatsResult = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_today
        FROM users
      `);
      
      // Get top players (safe against minimal schema: no round_results table, no last_login column)
      const topPlayersResult = await db.query(`
        SELECT 
          u.id,
          u.username,
          u.balance,
          COUNT(b.id) AS total_bets,
          0::numeric AS total_winnings,
          u.updated_at AS last_active
        FROM users u
        LEFT JOIN bets b ON u.id = b.user_id
        GROUP BY u.id, u.username, u.balance, u.updated_at
        ORDER BY total_bets DESC, u.balance DESC
        LIMIT 10
      `);
      
      return {
        totalUsers: parseInt(userStatsResult.rows[0].total_users) || 0,
        activeUsers: parseInt(userStatsResult.rows[0].active_users) || 0,
        newUsersToday: parseInt(userStatsResult.rows[0].new_users_today) || 0,
        topPlayers: topPlayersResult.rows.map(row => ({
          id: row.id,
          username: row.username,
          balance: parseFloat(row.balance) || 0,
          totalBets: parseInt(row.total_bets) || 0,
          totalWinnings: parseFloat(row.total_winnings) || 0,
          lastActive: row.last_active ? new Date(row.last_active).toLocaleString() : 'Never'
        }))
      };
    } catch (error) {
      logger.error('Error getting user overview:', error);
      throw error;
    }
  }

  async blockUser(userId, reason) {
    try {
      await db.query(`
        UPDATE users SET 
        status = 'blocked', 
        blocked_at = NOW(), 
        blocked_reason = $2
        WHERE id = $1
      `, [userId, reason]);
      
      logger.info(`User ${userId} blocked by admin: ${reason}`);
      return { success: true, message: 'User blocked successfully' };
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  async unblockUser(userId) {
    try {
      await db.query(`
        UPDATE users SET 
        status = 'active', 
        blocked_at = NULL, 
        blocked_reason = NULL
        WHERE id = $1
      `, [userId]);
      
      logger.info(`User ${userId} unblocked by admin`);
      return { success: true, message: 'User unblocked successfully' };
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  // SYSTEM MONITORING
  async getSystemHealth() {
    try {
      // Check database connection
      const dbHealth = await db.query('SELECT 1 as health');
      
      // Check Redis connection
      const redisHealth = await redisClient.ping();
      
      // Get system metrics
      const systemMetrics = {
        database: dbHealth.rows.length > 0 ? 'healthy' : 'unhealthy',
        redis: redisHealth === 'PONG' ? 'healthy' : 'unhealthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
      
      return systemMetrics;
    } catch (error) {
      logger.error('Error getting system health:', error);
      throw error;
    }
  }

  // AUDIT LOGGING
  async logAdminAction(adminId, action, details) {
    try {
      await db.query(`
        INSERT INTO admin_logs (admin_id, action, details, timestamp)
        VALUES ($1, $2, $3, NOW())
      `, [adminId, action, details]);
      
      logger.info(`Admin action logged: ${action} by admin ${adminId}`);
    } catch (error) {
      logger.error('Error logging admin action:', error);
    }
  }
}

module.exports = new AdminService(); 