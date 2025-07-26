const Joi = require('joi');
const communityGoalsService = require('../services/communityGoalsService');
const logger = require('../utils/logger');

// Validation schemas
const createGoalSchema = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().min(10).max(1000).required(),
  targetAmount: Joi.number().positive().required(),
  rewardType: Joi.string().valid('bonus_multiplier', 'free_bet', 'cash_reward', 'special_feature').required(),
  rewardValue: Joi.number().positive().required(),
  duration: Joi.number().integer().min(1).max(168).required(), // 1 hour to 1 week
  minBetAmount: Joi.number().min(0).optional(),
  maxBetAmount: Joi.number().positive().optional(),
  requiredParticipants: Joi.number().integer().min(1).optional()
});

const contributeToGoalSchema = Joi.object({
  goalId: Joi.number().integer().positive().required(),
  betAmount: Joi.number().positive().required(),
  betResult: Joi.object().optional()
});

/**
 * @swagger
 * /api/v1/community-goals:
 *   post:
 *     summary: Create a new community goal (Admin only)
 *     tags: [Community Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - targetAmount
 *               - rewardType
 *               - rewardValue
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *               targetAmount:
 *                 type: number
 *                 minimum: 0.01
 *               rewardType:
 *                 type: string
 *                 enum: [bonus_multiplier, free_bet, cash_reward, special_feature]
 *               rewardValue:
 *                 type: number
 *                 minimum: 0.01
 *               duration:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 168
 *               minBetAmount:
 *                 type: number
 *                 minimum: 0
 *               maxBetAmount:
 *                 type: number
 *                 minimum: 0.01
 *               requiredParticipants:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Community goal created successfully
 *       400:
 *         description: Invalid goal data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const createGoal = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Validate request body
    const { error, value } = createGoalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const goal = await communityGoalsService.createGoal(value);
    
    res.status(201).json({
      success: true,
      message: 'Community goal created successfully',
      goal
    });
  } catch (error) {
    logger.error('Error creating community goal:', error);
    res.status(500).json({ error: 'Failed to create community goal' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals:
 *   get:
 *     summary: Get all active community goals
 *     tags: [Community Goals]
 *     responses:
 *       200:
 *         description: List of active community goals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   targetAmount:
 *                     type: number
 *                   currentAmount:
 *                     type: number
 *                   rewardType:
 *                     type: string
 *                   rewardValue:
 *                     type: number
 *                   status:
 *                     type: string
 *                   participantCount:
 *                     type: integer
 */
const getActiveGoals = async (req, res) => {
  try {
    const goals = await communityGoalsService.getActiveGoals();
    
    res.json(goals);
  } catch (error) {
    logger.error('Error getting active goals:', error);
    res.status(500).json({ error: 'Failed to get active goals' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals/completed:
 *   get:
 *     summary: Get completed community goals
 *     tags: [Community Goals]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of goals to return
 *     responses:
 *       200:
 *         description: List of completed community goals
 */
const getCompletedGoals = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const goals = await communityGoalsService.getCompletedGoals(limit);
    
    res.json(goals);
  } catch (error) {
    logger.error('Error getting completed goals:', error);
    res.status(500).json({ error: 'Failed to get completed goals' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals/{goalId}:
 *   get:
 *     summary: Get community goal by ID
 *     tags: [Community Goals]
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Community goal details
 *       404:
 *         description: Goal not found
 */
const getGoalById = async (req, res) => {
  try {
    const goalId = parseInt(req.params.goalId);
    
    if (isNaN(goalId)) {
      return res.status(400).json({ error: 'Invalid goal ID' });
    }

    const goal = await communityGoalsService.getGoalById(goalId);
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(goal);
  } catch (error) {
    logger.error('Error getting goal by ID:', error);
    res.status(500).json({ error: 'Failed to get goal' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals/{goalId}/progress:
 *   get:
 *     summary: Get community goal progress
 *     tags: [Community Goals]
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Goal progress information
 *       404:
 *         description: Goal not found
 */
const getGoalProgress = async (req, res) => {
  try {
    const goalId = parseInt(req.params.goalId);
    
    if (isNaN(goalId)) {
      return res.status(400).json({ error: 'Invalid goal ID' });
    }

    const progress = await communityGoalsService.getGoalProgress(goalId);
    
    if (!progress) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(progress);
  } catch (error) {
    logger.error('Error getting goal progress:', error);
    res.status(500).json({ error: 'Failed to get goal progress' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals/{goalId}/participants:
 *   get:
 *     summary: Get community goal participants
 *     tags: [Community Goals]
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of goal participants
 *       404:
 *         description: Goal not found
 */
const getGoalParticipants = async (req, res) => {
  try {
    const goalId = parseInt(req.params.goalId);
    
    if (isNaN(goalId)) {
      return res.status(400).json({ error: 'Invalid goal ID' });
    }

    const participants = await communityGoalsService.getGoalParticipants(goalId);
    
    res.json(participants);
  } catch (error) {
    logger.error('Error getting goal participants:', error);
    res.status(500).json({ error: 'Failed to get goal participants' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals/contribute:
 *   post:
 *     summary: Contribute to a community goal
 *     tags: [Community Goals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - goalId
 *               - betAmount
 *             properties:
 *               goalId:
 *                 type: integer
 *               betAmount:
 *                 type: number
 *               betResult:
 *                 type: object
 *     responses:
 *       200:
 *         description: Contribution successful
 *       400:
 *         description: Invalid contribution data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Goal not found
 */
const contributeToGoal = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = contributeToGoalSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { goalId, betAmount, betResult } = value;

    const result = await communityGoalsService.contributeToGoal(goalId, userId, betAmount, betResult);
    
    res.json({
      success: true,
      message: 'Contribution successful',
      ...result
    });
  } catch (error) {
    logger.error('Error contributing to goal:', error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('not active') || error.message.includes('expired')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to contribute to goal' });
    }
  }
};

/**
 * @swagger
 * /api/v1/community-goals/user:
 *   get:
 *     summary: Get user's active community goals
 *     tags: [Community Goals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's active goals
 *       401:
 *         description: Unauthorized
 */
const getUserGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const goals = await communityGoalsService.getUserGoals(userId);
    
    res.json(goals);
  } catch (error) {
    logger.error('Error getting user goals:', error);
    res.status(500).json({ error: 'Failed to get user goals' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals/{goalId}/complete:
 *   post:
 *     summary: Complete a community goal (Admin only)
 *     tags: [Community Goals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: goalId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Goal completed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Goal not found
 */
const completeGoal = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const goalId = parseInt(req.params.goalId);
    
    if (isNaN(goalId)) {
      return res.status(400).json({ error: 'Invalid goal ID' });
    }

    const goal = await communityGoalsService.completeGoal(goalId);
    
    res.json({
      success: true,
      message: 'Goal completed successfully',
      goal
    });
  } catch (error) {
    logger.error('Error completing goal:', error);
    
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to complete goal' });
    }
  }
};

/**
 * @swagger
 * /api/v1/community-goals/cache/clear:
 *   post:
 *     summary: Clear community goals cache (Admin only)
 *     tags: [Community Goals]
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

    communityGoalsService.clearCache();
    
    res.json({
      success: true,
      message: 'Community goals cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

/**
 * @swagger
 * /api/v1/community-goals/cache/info:
 *   get:
 *     summary: Get community goals cache information (Admin only)
 *     tags: [Community Goals]
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

    const cacheInfo = communityGoalsService.getCacheStats();
    
    res.json(cacheInfo);
  } catch (error) {
    logger.error('Error getting cache info:', error);
    res.status(500).json({ error: 'Failed to get cache info' });
  }
};

module.exports = {
  createGoal,
  getActiveGoals,
  getCompletedGoals,
  getGoalById,
  getGoalProgress,
  getGoalParticipants,
  contributeToGoal,
  getUserGoals,
  completeGoal,
  clearCache,
  getCacheInfo
};
