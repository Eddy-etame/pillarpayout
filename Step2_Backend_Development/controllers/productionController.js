const productionService = require('../services/productionService');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/production/metrics:
 *   get:
 *     summary: Get all production metrics
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All production metrics
 *       401:
 *         description: Unauthorized
 */
const getAllMetrics = async (req, res) => {
  try {
    const metrics = productionService.getAllMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting production metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/system:
 *   get:
 *     summary: Get system metrics
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System metrics
 *       401:
 *         description: Unauthorized
 */
const getSystemMetrics = async (req, res) => {
  try {
    const systemMetrics = await productionService.updateSystemMetrics();
    
    res.json({
      success: true,
      system: systemMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting system metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/game:
 *   get:
 *     summary: Get game metrics
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Game metrics
 *       401:
 *         description: Unauthorized
 */
const getGameMetrics = async (req, res) => {
  try {
    // Mock game data for demonstration
    const gameData = {
      activePlayers: 100,
      totalBets: 12000,
      totalWagered: 30000,
      totalWon: 22500,
      crashRate: 0.75,
      houseEdge: 0.25
    };
    
    const gameMetrics = await productionService.updateGameMetrics(gameData);
    
    res.json({
      success: true,
      game: gameMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting game metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/business:
 *   get:
 *     summary: Get business metrics
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Business metrics
 *       401:
 *         description: Unauthorized
 */
const getBusinessMetrics = async (req, res) => {
  try {
    // Mock business data for demonstration
    const businessData = {
      dailyRevenue: 30000,
      dailyProfit: 7500,
      monthlyRevenue: 900000,
      monthlyProfit: 225000,
      playerRetention: 0.70,
      averageSessionTime: 45 // minutes
    };
    
    const businessMetrics = await productionService.updateBusinessMetrics(businessData);
    
    res.json({
      success: true,
      business: businessMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting business metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/profitability:
 *   get:
 *     summary: Get profitability analysis for 100 players
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: playerCount
 *         schema:
 *           type: integer
 *         description: Number of players (default 100)
 *     responses:
 *       200:
 *         description: Profitability analysis
 *       401:
 *         description: Unauthorized
 */
const getProfitabilityAnalysis = async (req, res) => {
  try {
    const playerCount = parseInt(req.query.playerCount) || 100;
    const profitability = productionService.calculateBaselineProfitability(playerCount);
    
    res.json({
      success: true,
      profitability,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting profitability analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/load-balancing:
 *   get:
 *     summary: Simulate load balancing
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: playerCount
 *         schema:
 *           type: integer
 *         description: Number of players (default 100)
 *       - in: query
 *         name: serverCount
 *         schema:
 *           type: integer
 *         description: Number of servers (default 3)
 *     responses:
 *       200:
 *         description: Load balancing simulation
 *       401:
 *         description: Unauthorized
 */
const getLoadBalancingSimulation = async (req, res) => {
  try {
    const playerCount = parseInt(req.query.playerCount) || 100;
    const serverCount = parseInt(req.query.serverCount) || 3;
    
    const loadBalancing = productionService.simulateLoadBalancing(playerCount, serverCount);
    
    res.json({
      success: true,
      loadBalancing,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting load balancing simulation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/alerts:
 *   get:
 *     summary: Get system alerts
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System alerts
 *       401:
 *         description: Unauthorized
 */
const getAlerts = async (req, res) => {
  try {
    const alerts = productionService.alerts.filter(alert => !alert.acknowledged);
    
    res.json({
      success: true,
      alerts,
      count: alerts.length,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Acknowledge an alert
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert acknowledged
 *       404:
 *         description: Alert not found
 *       401:
 *         description: Unauthorized
 */
const acknowledgeAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const acknowledged = productionService.acknowledgeAlert(alertId);
    
    if (acknowledged) {
      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        alertId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/performance:
 *   get:
 *     summary: Get performance analytics
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Performance analytics
 *       401:
 *         description: Unauthorized
 */
const getPerformanceAnalytics = async (req, res) => {
  try {
    const analytics = {
      averageResponseTime: productionService.calculateAverageResponseTime(),
      successRate: productionService.calculateSuccessRate(),
      recentOperations: productionService.performanceHistory.slice(-10),
      totalOperations: productionService.performanceHistory.length
    };
    
    res.json({
      success: true,
      analytics,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting performance analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/cache/clear:
 *   post:
 *     summary: Clear production cache
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       401:
 *         description: Unauthorized
 */
const clearCache = async (req, res) => {
  try {
    productionService.clearCache();
    
    res.json({
      success: true,
      message: 'Production cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing production cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/production/cache/info:
 *   get:
 *     summary: Get cache information
 *     tags: [Production]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache information
 *       401:
 *         description: Unauthorized
 */
const getCacheInfo = async (req, res) => {
  try {
    const cacheStats = productionService.getCacheStats();
    
    res.json({
      success: true,
      cacheStats,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting cache info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllMetrics,
  getSystemMetrics,
  getGameMetrics,
  getBusinessMetrics,
  getProfitabilityAnalysis,
  getLoadBalancingSimulation,
  getAlerts,
  acknowledgeAlert,
  getPerformanceAnalytics,
  clearCache,
  getCacheInfo
}; 