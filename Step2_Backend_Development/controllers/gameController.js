const Joi = require('joi');
const gameEngine = require('../services/gameEngine');
const logger = require('../utils/logger');

// Validation schemas
const placeBetSchema = Joi.object({
  amount: Joi.number().min(1).max(1000).required()
});

const cashoutSchema = Joi.object({
  // No body needed for cashout, just authentication
});

/**
 * @swagger
 * /api/v1/game/state:
 *   get:
 *     summary: Get current game state
 *     tags: [Game]
 *     responses:
 *       200:
 *         description: Current game state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roundId:
 *                   type: integer
 *                 gameState:
 *                   type: string
 *                   enum: [waiting, running, crashed, results]
 *                 multiplier:
 *                   type: number
 *                 integrity:
 *                   type: number
 *                 specialBlock:
 *                   type: object
 *                   nullable: true
 *                 activePlayers:
 *                   type: array
 *                   items:
 *                     type: integer
 */
const getGameState = async (req, res) => {
  try {
    const gameState = await gameEngine.getGameState();
    res.json(gameState);
  } catch (error) {
    logger.error('Error getting game state:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
};

/**
 * @swagger
 * /api/v1/game/history:
 *   get:
 *     summary: Get round history
 *     tags: [Game]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of rounds to return
 *     responses:
 *       200:
 *         description: Round history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   crash_point:
 *                     type: number
 *                   timestamp:
 *                     type: string
 */
const getRoundHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user?.id || null;
    
    const history = await gameEngine.getRoundHistory(limit, userId);
    res.json(history);
  } catch (error) {
    logger.error('Error getting round history:', error);
    res.status(500).json({ error: 'Failed to get round history' });
  }
};

/**
 * @swagger
 * /api/v1/game/user-history:
 *   get:
 *     summary: Get user's round history with win/loss information
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of rounds to return
 *     responses:
 *       200:
 *         description: User round history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   round_id:
 *                     type: integer
 *                   crash_point:
 *                     type: number
 *                   timestamp:
 *                     type: string
 *                   result:
 *                     type: string
 *                     enum: [win, loss]
 *                   bet_amount:
 *                     type: number
 *                   cashout_multiplier:
 *                     type: number
 *                   final_multiplier:
 *                     type: number
 *                   winnings:
 *                     type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
const getUserRoundHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.user.id;
    
    const history = await gameEngine.getRoundHistory(limit, userId);
    res.json(history);
  } catch (error) {
    logger.error('Error getting user round history:', error);
    res.status(500).json({ error: 'Failed to get user round history' });
  }
};

/**
 * @swagger
 * /api/v1/game/bet:
 *   post:
 *     summary: Place a bet
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Bet amount in dollars
 *     responses:
 *       200:
 *         description: Bet placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 newBalance:
 *                   type: number
 *                 betAmount:
 *                   type: number
 *       400:
 *         description: Invalid bet amount or insufficient balance
 *       401:
 *         description: Unauthorized
 */
const placeBet = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = placeBetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { amount } = value;

    // Check if game is in waiting state
    const gameState = await gameEngine.getGameState();
    if (gameState.gameState !== 'waiting') {
      return res.status(400).json({ error: 'Bets can only be placed during waiting phase' });
    }

    // Check if user already has an active bet
    if (gameState.activePlayers.includes(userId)) {
      return res.status(400).json({ error: 'You already have an active bet' });
    }

    const result = await gameEngine.placeBet(userId, amount);
    res.json(result);
  } catch (error) {
    logger.error('Error placing bet:', error);
    if (error.message.includes('Insufficient balance')) {
      res.status(400).json({ error: 'Insufficient balance' });
    } else if (error.message.includes('Bet amount must be between')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to place bet' });
    }
  }
};

/**
 * @swagger
 * /api/v1/game/cashout:
 *   post:
 *     summary: Cash out current bet
 *     tags: [Game]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cash out successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 cashoutMultiplier:
 *                   type: number
 *                 winnings:
 *                   type: number
 *                 betAmount:
 *                   type: number
 *       400:
 *         description: No active bet or game not running
 *       401:
 *         description: Unauthorized
 */
const cashOut = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await gameEngine.cashOut(userId);
    res.json(result);
  } catch (error) {
    logger.error('Error cashing out:', error);
    if (error.message.includes('No active bet found')) {
      res.status(400).json({ error: 'No active bet found' });
    } else if (error.message.includes('Cannot cash out')) {
      res.status(400).json({ error: 'Cannot cash out - game not running' });
    } else {
      res.status(500).json({ error: 'Failed to cash out' });
    }
  }
};

/**
 * @swagger
 * /api/v1/game/verify:
 *   post:
 *     summary: Verify provably fair result
 *     tags: [Game]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serverSeed
 *               - clientSeed
 *               - nonce
 *             properties:
 *               serverSeed:
 *                 type: string
 *               clientSeed:
 *                 type: string
 *               nonce:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 crashPoint:
 *                   type: number
 *                 verified:
 *                   type: boolean
 */
const verifyCrashPoint = async (req, res) => {
  try {
    const { serverSeed, clientSeed, nonce } = req.body;

    if (!serverSeed || !clientSeed || nonce === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const crashPoint = gameEngine.verifyCrashPoint(serverSeed, clientSeed, nonce);
    
    res.json({
      crashPoint: crashPoint,
      verified: true
    });
  } catch (error) {
    logger.error('Error verifying crash point:', error);
    res.status(500).json({ error: 'Failed to verify crash point' });
  }
};

// Get live bets for current round
const getLiveBets = async (req, res) => {
  try {
    const liveBets = Array.from(gameEngine.activeBets.values()).map(bet => ({
      userId: bet.userId,
      username: bet.username,
      amount: bet.amount,
      timestamp: bet.timestamp,
      hasInsurance: !!bet.insurance
    }));
    res.json(liveBets);
  } catch (error) {
    logger.error('Error getting live bets:', error);
    res.status(500).json({ error: 'Failed to get live bets' });
  }
};

// Get active players count
const getActivePlayers = async (req, res) => {
  try {
    const activePlayers = gameEngine.activePlayers.size;
    res.json({ activePlayers });
  } catch (error) {
    logger.error('Error getting active players:', error);
    res.status(500).json({ error: 'Failed to get active players' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await gameEngine.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
};

// Place bet with insurance
const placeBetWithInsurance = async (req, res) => {
  try {
    const { error, value } = placeBetSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { amount, insuranceType } = value;
    const userId = req.user.id;

    const result = await gameEngine.placeBet(userId, amount, insuranceType);
    res.json(result);
  } catch (error) {
    logger.error('Error placing bet with insurance:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getGameState,
  getRoundHistory,
  getUserRoundHistory,
  placeBet,
  cashOut,
  verifyCrashPoint,
  getLiveBets,
  getActivePlayers,
  getUserStats,
  placeBetWithInsurance
}; 