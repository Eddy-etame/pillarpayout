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
      res.json(metrics);
    } catch (error) {
      console.log('Admin controller - error:', error);
      logger.error('Error getting profitability metrics:', error);
      res.status(500).json({ error: 'Failed to get profitability metrics' });
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
      const [profitability, gameStatus, security, users] = await Promise.all([
        adminService.getProfitabilityMetrics(),
        adminService.getGameStatus(),
        adminService.getSecurityOverview(),
        adminService.getUserOverview()
      ]);

      const overview = {
        profitability,
        gameStatus,
        security,
        users,
        timestamp: new Date().toISOString()
      };

      res.json(overview);
    } catch (error) {
      logger.error('Error getting dashboard overview:', error);
      res.status(500).json({ error: 'Failed to get dashboard overview' });
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
}

module.exports = new AdminController(); 