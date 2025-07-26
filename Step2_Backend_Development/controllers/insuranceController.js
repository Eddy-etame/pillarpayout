const Joi = require('joi');
const insuranceService = require('../services/insuranceService');
const logger = require('../utils/logger');

// Validation schemas
const purchaseInsuranceSchema = Joi.object({
  betId: Joi.number().integer().positive().required(),
  insuranceType: Joi.string().valid('basic', 'premium', 'elite').required(),
  betAmount: Joi.number().positive().required()
});

/**
 * @swagger
 * /api/v1/insurance/calculate:
 *   post:
 *     summary: Calculate insurance premium for a bet
 *     tags: [Insurance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - betAmount
 *               - insuranceType
 *             properties:
 *               betAmount:
 *                 type: number
 *                 minimum: 5
 *               insuranceType:
 *                 type: string
 *                 enum: [basic, premium, elite]
 *     responses:
 *       200:
 *         description: Insurance calculation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 betAmount:
 *                   type: number
 *                 insuranceType:
 *                   type: string
 *                 premium:
 *                   type: number
 *                 coverageAmount:
 *                   type: number
 *                 totalCost:
 *                   type: number
 */
const calculateInsurance = async (req, res) => {
  try {
    const { betAmount, insuranceType } = req.body;

    if (!betAmount || !insuranceType) {
      return res.status(400).json({ error: 'Bet amount and insurance type are required' });
    }

    const insuranceDetails = insuranceService.calculateInsurancePremium(betAmount, insuranceType);
    
    res.json({
      success: true,
      insuranceDetails
    });
  } catch (error) {
    logger.error('Error calculating insurance:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * @swagger
 * /api/v1/insurance/options:
 *   get:
 *     summary: Get insurance options for a bet amount
 *     tags: [Insurance]
 *     parameters:
 *       - in: query
 *         name: betAmount
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 5
 *     responses:
 *       200:
 *         description: Insurance options
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                 options:
 *                   type: array
 *                   items:
 *                     type: object
 */
const getInsuranceOptions = async (req, res) => {
  try {
    const betAmount = parseFloat(req.query.betAmount);
    
    if (!betAmount || isNaN(betAmount)) {
      return res.status(400).json({ error: 'Valid bet amount is required' });
    }

    const options = insuranceService.getInsuranceOptions(betAmount);
    
    res.json(options);
  } catch (error) {
    logger.error('Error getting insurance options:', error);
    res.status(500).json({ error: 'Failed to get insurance options' });
  }
};

/**
 * @swagger
 * /api/v1/insurance/purchase:
 *   post:
 *     summary: Purchase insurance for a bet
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - betId
 *               - insuranceType
 *               - betAmount
 *             properties:
 *               betId:
 *                 type: integer
 *               insuranceType:
 *                 type: string
 *                 enum: [basic, premium, elite]
 *               betAmount:
 *                 type: number
 *                 minimum: 5
 *     responses:
 *       200:
 *         description: Insurance purchased successfully
 *       400:
 *         description: Invalid insurance data
 *       401:
 *         description: Unauthorized
 */
const purchaseInsurance = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = purchaseInsuranceSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { betId, insuranceType, betAmount } = value;

    const result = await insuranceService.purchaseInsurance(userId, betId, insuranceType, betAmount);
    
    res.json({
      success: true,
      message: 'Insurance purchased successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error purchasing insurance:', error);
    
    if (error.message.includes('Minimum bet amount') || error.message.includes('Maximum insurance')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('Insufficient balance')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to purchase insurance' });
    }
  }
};

/**
 * @swagger
 * /api/v1/insurance/history:
 *   get:
 *     summary: Get user's insurance history
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Insurance history
 *       401:
 *         description: Unauthorized
 */
const getInsuranceHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const history = await insuranceService.getUserInsuranceHistory(userId, limit, offset);
    
    res.json(history);
  } catch (error) {
    logger.error('Error getting insurance history:', error);
    res.status(500).json({ error: 'Failed to get insurance history' });
  }
};

/**
 * @swagger
 * /api/v1/insurance/stats:
 *   get:
 *     summary: Get insurance statistics (Admin only)
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insurance statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const getInsuranceStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await insuranceService.getInsuranceStats();
    
    res.json(stats);
  } catch (error) {
    logger.error('Error getting insurance stats:', error);
    res.status(500).json({ error: 'Failed to get insurance stats' });
  }
};

/**
 * @swagger
 * /api/v1/insurance/profitability:
 *   get:
 *     summary: Get insurance profitability metrics (Admin only)
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profitability metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const getProfitabilityMetrics = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const metrics = insuranceService.calculateProfitabilityMetrics();
    
    res.json(metrics);
  } catch (error) {
    logger.error('Error getting profitability metrics:', error);
    res.status(500).json({ error: 'Failed to get profitability metrics' });
  }
};

/**
 * @swagger
 * /api/v1/insurance/claim/{betId}:
 *   post:
 *     summary: Process insurance claim for a bet (Admin only)
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: betId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Insurance claim processed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: No insurance found for bet
 */
const processInsuranceClaim = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const betId = parseInt(req.params.betId);
    
    if (isNaN(betId)) {
      return res.status(400).json({ error: 'Invalid bet ID' });
    }

    const result = await insuranceService.processInsuranceClaim(betId);
    
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }

    res.json({
      success: true,
      message: 'Insurance claim processed successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error processing insurance claim:', error);
    res.status(500).json({ error: 'Failed to process insurance claim' });
  }
};

/**
 * @swagger
 * /api/v1/insurance/cache/clear:
 *   post:
 *     summary: Clear insurance cache (Admin only)
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const clearCache = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    insuranceService.clearCache();
    
    res.json({
      success: true,
      message: 'Insurance cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

/**
 * @swagger
 * /api/v1/insurance/cache/info:
 *   get:
 *     summary: Get insurance cache information (Admin only)
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const getCacheInfo = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const cacheInfo = insuranceService.getCacheStats();
    
    res.json(cacheInfo);
  } catch (error) {
    logger.error('Error getting cache info:', error);
    res.status(500).json({ error: 'Failed to get cache info' });
  }
};

module.exports = {
  calculateInsurance,
  getInsuranceOptions,
  purchaseInsurance,
  getInsuranceHistory,
  getInsuranceStats,
  getProfitabilityMetrics,
  processInsuranceClaim,
  clearCache,
  getCacheInfo
}; 