const express = require('express');
const router = express.Router();
const productionController = require('../controllers/productionController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// All production routes require authentication and admin privileges
router.use(authMiddleware);
router.use(adminMiddleware.adminAuthMiddleware);

// Metrics endpoints
router.get('/metrics', productionController.getAllMetrics);
router.get('/system', productionController.getSystemMetrics);
router.get('/game', productionController.getGameMetrics);
router.get('/business', productionController.getBusinessMetrics);

// Analysis endpoints
router.get('/profitability', productionController.getProfitabilityAnalysis);
router.get('/load-balancing', productionController.getLoadBalancingSimulation);
router.get('/performance', productionController.getPerformanceAnalytics);

// Alert management
router.get('/alerts', productionController.getAlerts);
router.post('/alerts/:alertId/acknowledge', productionController.acknowledgeAlert);

// Cache management
router.post('/cache/clear', productionController.clearCache);
router.get('/cache/info', productionController.getCacheInfo);

module.exports = router; 