const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.post('/calculate', insuranceController.calculateInsurance);
router.get('/options', insuranceController.getInsuranceOptions);

// Authenticated routes
router.post('/purchase', authMiddleware, insuranceController.purchaseInsurance);
router.get('/history', authMiddleware, insuranceController.getInsuranceHistory);

// Admin routes
router.get('/stats', authMiddleware, adminMiddleware.adminAuthMiddleware, insuranceController.getInsuranceStats);
router.get('/profitability', authMiddleware, adminMiddleware.adminAuthMiddleware, insuranceController.getProfitabilityMetrics);
router.post('/claim/:betId', authMiddleware, adminMiddleware.adminAuthMiddleware, insuranceController.processInsuranceClaim);
router.post('/cache/clear', authMiddleware, adminMiddleware.adminAuthMiddleware, insuranceController.clearCache);
router.get('/cache/info', authMiddleware, adminMiddleware.adminAuthMiddleware, insuranceController.getCacheInfo);

module.exports = router; 