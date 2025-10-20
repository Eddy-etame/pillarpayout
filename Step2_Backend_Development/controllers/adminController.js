const adminService = require('../services/adminService');
const logger = require('../utils/logger');
const db = require('../db');

class AdminController {
  // PROFITABILITY ENDPOINTS
  async getProfitabilityMetrics(req, res) {
    console.log('Admin controller - getProfitabilityMetrics called');
    console.log('Request user:', req.user);
    try {
      const metrics = await adminService.getProfitabilityMetrics();
      console.log('Admin controller - returning metrics:', metrics);
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('Admin controller - error:', error);
      logger.error('Error getting profitability metrics:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get profitability metrics',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // GAME CONTROL ENDPOINTS
  async getGameStatus(req, res) {
    try {
      const status = await adminService.getGameStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error getting game status:', error);
      res.status(500).json({ error: 'Failed to get game status' });
    }
  }

  async pauseGame(req, res) {
    try {
      const result = await adminService.pauseGame();
      await adminService.logAdminAction(req.user.id, 'pause_game', 'Game paused');
      res.json(result);
    } catch (error) {
      logger.error('Error pausing game:', error);
      res.status(500).json({ error: 'Failed to pause game' });
    }
  }

  async resumeGame(req, res) {
    try {
      const result = await adminService.resumeGame();
      await adminService.logAdminAction(req.user.id, 'resume_game', 'Game resumed');
      res.json(result);
    } catch (error) {
      logger.error('Error resuming game:', error);
      res.status(500).json({ error: 'Failed to resume game' });
    }
  }

  async emergencyStop(req, res) {
    try {
      const result = await adminService.emergencyStop();
      await adminService.logAdminAction(req.user.id, 'emergency_stop', 'Game emergency stopped');
      res.json(result);
    } catch (error) {
      logger.error('Error emergency stopping game:', error);
      res.status(500).json({ error: 'Failed to emergency stop game' });
    }
  }

  async setCrashPoint(req, res) {
    try {
      const { crashPoint } = req.body;
      if (!crashPoint || crashPoint < 1.0 || crashPoint > 100.0) {
        return res.status(400).json({ error: 'Invalid crash point. Must be between 1.0 and 100.0' });
      }
      
      const result = await adminService.setCrashPoint(crashPoint);
      await adminService.logAdminAction(req.user.id, 'set_crash_point', `Crash point set to ${crashPoint}x`);
      res.json(result);
    } catch (error) {
      logger.error('Error setting crash point:', error);
      res.status(500).json({ error: 'Failed to set crash point' });
    }
  }

  // SECURITY ENDPOINTS
  async getSecurityOverview(req, res) {
    try {
      const overview = await adminService.getSecurityOverview();
      res.json(overview);
    } catch (error) {
      logger.error('Error getting security overview:', error);
      res.status(500).json({ error: 'Failed to get security overview' });
    }
  }

  async runSecurityScan(req, res) {
    try {
      const result = await adminService.runSecurityScan();
      await adminService.logAdminAction(req.user.id, 'security_scan', 'Security scan executed');
      res.json(result);
    } catch (error) {
      logger.error('Error running security scan:', error);
      res.status(500).json({ error: 'Failed to run security scan' });
    }
  }

  async blockIP(req, res) {
    try {
      const { ipAddress, reason } = req.body;
      if (!ipAddress || !reason) {
        return res.status(400).json({ error: 'IP address and reason are required' });
      }
      
      const result = await adminService.blockIP(ipAddress, reason);
      await adminService.logAdminAction(req.user.id, 'block_ip', `IP ${ipAddress} blocked: ${reason}`);
      res.json(result);
    } catch (error) {
      logger.error('Error blocking IP:', error);
      res.status(500).json({ error: 'Failed to block IP' });
    }
  }

  async unblockIP(req, res) {
    try {
      const { ipAddress } = req.body;
      if (!ipAddress) {
        return res.status(400).json({ error: 'IP address is required' });
      }
      
      const result = await adminService.unblockIP(ipAddress);
      await adminService.logAdminAction(req.user.id, 'unblock_ip', `IP ${ipAddress} unblocked`);
      res.json(result);
    } catch (error) {
      logger.error('Error unblocking IP:', error);
      res.status(500).json({ error: 'Failed to unblock IP' });
    }
  }

  // USER MANAGEMENT ENDPOINTS
  async getUserOverview(req, res) {
    try {
      const overview = await adminService.getUserOverview();
      res.json(overview);
    } catch (error) {
      logger.error('Error getting user overview:', error);
      res.status(500).json({ error: 'Failed to get user overview' });
    }
  }

  async blockUser(req, res) {
    try {
      const { userId, reason } = req.body;
      if (!userId || !reason) {
        return res.status(400).json({ error: 'User ID and reason are required' });
      }
      
      const result = await adminService.blockUser(userId, reason);
      await adminService.logAdminAction(req.user.id, 'block_user', `User ${userId} blocked: ${reason}`);
      res.json(result);
    } catch (error) {
      logger.error('Error blocking user:', error);
      res.status(500).json({ error: 'Failed to block user' });
    }
  }

  async unblockUser(req, res) {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      const result = await adminService.unblockUser(userId);
      await adminService.logAdminAction(req.user.id, 'unblock_user', `User ${userId} unblocked`);
      res.json(result);
    } catch (error) {
      logger.error('Error unblocking user:', error);
      res.status(500).json({ error: 'Failed to unblock user' });
    }
  }

  // SYSTEM MONITORING ENDPOINTS
  async getSystemHealth(req, res) {
    try {
      const health = await adminService.getSystemHealth();
      res.json(health);
    } catch (error) {
      logger.error('Error getting system health:', error);
      res.status(500).json({ error: 'Failed to get system health' });
    }
  }

  // DASHBOARD OVERVIEW
  async getDashboardOverview(req, res) {
    try {
      console.log('Admin controller - getDashboardOverview called');
      console.log('Request user:', req.user);
      
      // Get all dashboard data in parallel with error handling
      console.log('Admin controller - calling admin service methods...');
      const [
        profitability,
        gameStatus,
        security,
        users
      ] = await Promise.allSettled([
        adminService.getProfitabilityMetrics(),
        adminService.getGameStatus(),
        adminService.getSecurityOverview(),
        adminService.getUserOverview()
      ]);
      
      console.log('Admin controller - Promise.allSettled results:');
      console.log('Profitability status:', profitability.status);
      console.log('GameStatus status:', gameStatus.status);
      console.log('Security status:', security.status);
      console.log('Users status:', users.status);

      const overview = {
        success: true,
        timestamp: new Date().toISOString(),
        profitability: profitability.status === 'fulfilled' ? profitability.value : null,
        gameStatus: gameStatus.status === 'fulfilled' ? gameStatus.value : null,
        security: security.status === 'fulfilled' ? security.value : null,
        users: users.status === 'fulfilled' ? users.value : null,
        errors: []
      };

      // Log any failed promises
      [profitability, gameStatus, security, users].forEach((result, index) => {
        if (result.status === 'rejected') {
          const serviceNames = ['profitability', 'gameStatus', 'security', 'users'];
          logger.warn(`Failed to get ${serviceNames[index]} data:`, result.reason);
          overview.errors.push(`${serviceNames[index]}: ${result.reason.message}`);
        }
      });

      console.log('Admin controller - returning overview:', overview);
      res.json({
        success: true,
        data: overview,
        count: 1,
        error: null,
        details: 'Admin dashboard data retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get dashboard overview',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ADMIN LOGS
  async getAdminLogs(req, res) {
    try {
      const { limit = 100, offset = 0 } = req.query;
      
      const result = await adminService.db.query(`
        SELECT al.*, u.username as admin_username
        FROM admin_logs al
        LEFT JOIN users u ON al.admin_id = u.id
        ORDER BY al.timestamp DESC
        LIMIT $1 OFFSET $2
      `, [parseInt(limit), parseInt(offset)]);
      
      res.json(result.rows);
    } catch (error) {
      logger.error('Error getting admin logs:', error);
      res.status(500).json({ error: 'Failed to get admin logs' });
    }
  }

  // ANALYTICS ENDPOINTS
  async getBettingAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      let interval;
      switch (timeRange) {
        case '1h': interval = '1 hour'; break;
        case '24h': interval = '24 hours'; break;
        case '7d': interval = '7 days'; break;
        case '30d': interval = '30 days'; break;
        default: interval = '24 hours';
      }
      
      const result = await adminService.db.query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as time_bucket,
          COUNT(*) as bet_count,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(CASE WHEN result = 'win' THEN 1 END) as wins,
          COUNT(CASE WHEN result = 'loss' THEN 1 END) as losses
        FROM bets b
        LEFT JOIN round_results r ON b.id = r.bet_id
        WHERE b.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY time_bucket
        ORDER BY time_bucket DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      logger.error('Error getting betting analytics:', error);
      res.status(500).json({ error: 'Failed to get betting analytics' });
    }
  }

  async getCrashPointAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      let interval;
      switch (timeRange) {
        case '1h': interval = '1 hour'; break;
        case '24h': interval = '24 hours'; break;
        case '7d': interval = '7 days'; break;
        case '30d': interval = '30 days'; break;
        default: interval = '24 hours';
      }
      
      const result = await db.query(`
        SELECT 
          crash_point,
          COUNT(*) as frequency,
          AVG(crash_point) as average_crash,
          MIN(crash_point) as min_crash,
          MAX(crash_point) as max_crash
        FROM rounds
        WHERE timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY crash_point
        ORDER BY frequency DESC
        LIMIT 20
      `);
      
      res.json(result.rows);
    } catch (error) {
      logger.error('Error getting crash point analytics:', error);
      res.status(500).json({ error: 'Failed to get crash point analytics' });
    }
  }

  // PROFITABILITY BY TIME RANGE
  async getProfitabilityByTimeRange(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      let interval;
      switch (timeRange) {
        case '1h': interval = '1 hour'; break;
        case '24h': interval = '24 hours'; break;
        case '7d': interval = '7 days'; break;
        case '30d': interval = '30 days'; break;
        default: interval = '24 hours';
      }
      
      const result = await db.query(`
        SELECT 
          DATE_TRUNC('hour', b.timestamp) as time_bucket,
          COUNT(*) as bet_count,
          COALESCE(SUM(b.amount), 0) as revenue,
          COALESCE(SUM(CASE WHEN r.result = 'win' THEN r.winnings ELSE 0 END), 0) as payouts,
          COALESCE(SUM(b.amount), 0) - COALESCE(SUM(CASE WHEN r.result = 'win' THEN r.winnings ELSE 0 END), 0) as profit
        FROM bets b
        LEFT JOIN round_results r ON b.id = r.bet_id
        WHERE b.timestamp >= NOW() - INTERVAL '${interval}'
        GROUP BY time_bucket
        ORDER BY time_bucket DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      logger.error('Error getting profitability by time range:', error);
      res.status(500).json({ error: 'Failed to get profitability by time range' });
    }
  }

  // USER ACTIVITY ANALYTICS
  async getUserActivityAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      
      let interval;
      switch (timeRange) {
        case '1h': interval = '1 hour'; break;
        case '24h': interval = '24 hours'; break;
        case '7d': interval = '7 days'; break;
        case '30d': interval = '30 days'; break;
        default: interval = '24 hours';
      }
      
      const result = await db.query(`
        SELECT 
          DATE_TRUNC('hour', timestamp) as time_bucket,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) as total_actions,
          COUNT(CASE WHEN action_type = 'bet' THEN 1 END) as bets,
          COUNT(CASE WHEN action_type = 'cashout' THEN 1 END) as cashouts
        FROM user_activities
        WHERE timestamp >= NOW() - INTERVAL '30 days'
        GROUP BY time_bucket
        ORDER BY time_bucket DESC
      `);
      
      res.json(result.rows);
    } catch (error) {
      logger.error('Error getting user activity analytics:', error);
      res.status(500).json({ error: 'Failed to get user activity analytics' });
    }
  }

  // Get live players data
  async getLivePlayers(req, res) {
    try {
      console.log('Admin controller - getLivePlayers called');
      
      const db = require('../db');
      
      // Get all players with their current status (simplified query)
      const playersQuery = `
        SELECT 
          u.id,
          u.username,
          u.balance,
          u.last_login,
          u.created_at,
          CASE 
            WHEN u.last_login > NOW() - INTERVAL '5 minutes' THEN true 
            ELSE false 
          END as is_online,
          CASE 
            WHEN u.last_login > NOW() - INTERVAL '5 minutes' THEN 'Online'
            WHEN u.last_login > NOW() - INTERVAL '1 hour' THEN 'Recently Active'
            ELSE 'Offline'
          END as status
        FROM users u
        ORDER BY u.last_login DESC
        LIMIT 50
      `;
      
      const playersResult = await db.query(playersQuery);
      
      const players = playersResult.rows.map(player => ({
        id: player.id,
        username: player.username,
        balance: parseFloat(player.balance || 0),
        totalBets: 0, // Will be populated from separate query if needed
        totalWinnings: 0, // Will be populated from separate query if needed
        lastActive: player.last_login,
        isOnline: player.is_online,
        status: player.status
      }));
      
      console.log(`Found ${players.length} players`);
      
      res.json({
        success: true,
        data: players,
        count: players.length,
        error: null,
        details: 'Live players data retrieved successfully'
      });
      
    } catch (error) {
      console.error('Error getting live players:', error);
      res.status(500).json({
        success: false,
        data: null,
        count: 0,
        error: error.message || 'Internal server error',
        details: error.message
      });
    }
  }

  // Get profitability charts data
  async getProfitabilityCharts(req, res) {
    try {
      console.log('Admin controller - getProfitabilityCharts called');
      
      const db = require('../db');
      
      // Generate sample data for charts (in real implementation, this would come from the database)
      const now = new Date();
      
      // Process revenue data
      const revenue = {
        hourly: [],
        daily: [],
        weekly: [],
        monthly: []
      };
      
      const timeframes = {
        hourly: [],
        daily: [],
        weekly: [],
        monthly: []
      };
      
      // Generate hourly data (last 24 hours)
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
        timeframes.hourly.push(hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        revenue.hourly.push(Math.floor(Math.random() * 10000) + 5000);
      }
      
      // Generate daily data (last 7 days)
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        timeframes.daily.push(day.toLocaleDateString('en-US', { weekday: 'short' }));
        revenue.daily.push(Math.floor(Math.random() * 50000) + 20000);
      }
      
      // Generate weekly data (last 4 weeks)
      for (let i = 3; i >= 0; i--) {
        const week = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        timeframes.weekly.push(`Week ${4-i}`);
        revenue.weekly.push(Math.floor(Math.random() * 200000) + 100000);
      }
      
      // Generate monthly data (last 12 months)
      for (let i = 11; i >= 0; i--) {
        const month = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
        timeframes.monthly.push(month.toLocaleDateString('en-US', { month: 'short' }));
        revenue.monthly.push(Math.floor(Math.random() * 500000) + 300000);
      }
      
      // Process payout data
      const payouts = {
        total: Math.floor(Math.random() * 100000) + 50000,
        byMethod: {
          'MTN Mobile Money': Math.floor(Math.random() * 30000) + 15000,
          'Orange Money': Math.floor(Math.random() * 25000) + 10000,
          'Credit Card': Math.floor(Math.random() * 20000) + 8000,
          'Bank Transfer': Math.floor(Math.random() * 15000) + 5000,
          'Digital Wallet': Math.floor(Math.random() * 10000) + 2000
        }
      };
      
      // Process metrics
      const profitMargin = Math.random() * 30 + 40; // 40-70%
      const houseEdge = Math.random() * 5 + 2; // 2-7%
      const crashRate = Math.random() * 20 + 30; // 30-50%
      const avgBet = Math.floor(Math.random() * 5000) + 2000; // 2000-7000
      
      const chartsData = {
        revenue,
        payouts,
        metrics: {
          profitMargin: Math.round(profitMargin * 100) / 100,
          houseEdge: Math.round(houseEdge * 100) / 100,
          crashRate: Math.round(crashRate * 100) / 100,
          averageBet: avgBet
        },
        timeframes
      };
      
      console.log('Profitability charts data generated');
      
      res.json({
        success: true,
        data: chartsData,
        count: 1,
        error: null,
        details: 'Profitability charts data retrieved successfully'
      });
      
    } catch (error) {
      console.error('Error getting profitability charts:', error);
      res.status(500).json({
        success: false,
        data: null,
        count: 0,
        error: error.message || 'Internal server error',
        details: error.message
      });
    }
  }
}

module.exports = new AdminController(); 