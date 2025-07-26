const Joi = require('joi');
const tournamentService = require('../services/tournamentService');
const logger = require('../utils/logger');

// Validation schemas
const createTournamentSchema = Joi.object({
  type: Joi.string().valid('mini', 'regular', 'major', 'daily').required(),
  startTime: Joi.date().optional()
});

const joinTournamentSchema = Joi.object({
  tournamentId: Joi.string().required()
});

/**
 * @swagger
 * /api/v1/tournaments:
 *   post:
 *     summary: Create a new tournament
 *     tags: [Tournaments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [mini, regular, major, daily]
 *               startTime:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Tournament created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
const createTournament = async (req, res) => {
  try {
    const { error, value } = createTournamentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { type, startTime } = value;
    const tournament = await tournamentService.createTournament(type, startTime);

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      tournament
    });
  } catch (error) {
    logger.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments:
 *   get:
 *     summary: Get active tournaments
 *     tags: [Tournaments]
 *     responses:
 *       200:
 *         description: List of active tournaments
 */
const getActiveTournaments = async (req, res) => {
  try {
    const tournaments = tournamentService.getActiveTournaments();
    
    res.json({
      success: true,
      tournaments,
      count: tournaments.length
    });
  } catch (error) {
    logger.error('Error getting active tournaments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}:
 *   get:
 *     summary: Get tournament by ID
 *     tags: [Tournaments]
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tournament details
 *       404:
 *         description: Tournament not found
 */
const getTournamentById = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = tournamentService.getTournamentById(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json({
      success: true,
      tournament
    });
  } catch (error) {
    logger.error('Error getting tournament by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/join:
 *   post:
 *     summary: Join a tournament
 *     tags: [Tournaments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tournamentId
 *             properties:
 *               tournamentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully joined tournament
 *       400:
 *         description: Invalid request or insufficient balance
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tournament not found
 */
const joinTournament = async (req, res) => {
  try {
    const { error, value } = joinTournamentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { tournamentId } = value;
    const userId = req.user.id;
    const username = req.user.username;

    const participant = await tournamentService.joinTournament(tournamentId, userId, username);

    res.json({
      success: true,
      message: 'Successfully joined tournament',
      participant
    });
  } catch (error) {
    logger.error('Error joining tournament:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('Insufficient balance') || 
        error.message.includes('already joined') ||
        error.message.includes('full') ||
        error.message.includes('closed')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/user:
 *   get:
 *     summary: Get user's tournaments
 *     tags: [Tournaments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's tournaments
 *       401:
 *         description: Unauthorized
 */
const getUserTournaments = async (req, res) => {
  try {
    const userId = req.user.id;
    const tournaments = tournamentService.getUserTournaments(userId);
    
    res.json({
      success: true,
      tournaments,
      count: tournaments.length
    });
  } catch (error) {
    logger.error('Error getting user tournaments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/start:
 *   post:
 *     summary: Start a tournament
 *     tags: [Tournaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tournament started successfully
 *       400:
 *         description: Cannot start tournament
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tournament not found
 */
const startTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await tournamentService.startTournament(tournamentId);
    
    res.json({
      success: true,
      message: 'Tournament started successfully',
      tournament
    });
  } catch (error) {
    logger.error('Error starting tournament:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('cannot be started') || 
        error.message.includes('Need at least')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/{tournamentId}/end:
 *   post:
 *     summary: End a tournament
 *     tags: [Tournaments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tournament ended successfully
 *       400:
 *         description: Cannot end tournament
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tournament not found
 */
const endTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const result = await tournamentService.endTournament(tournamentId);
    
    res.json({
      success: true,
      message: 'Tournament ended successfully',
      tournament: result.tournament,
      winners: result.winners
    });
  } catch (error) {
    logger.error('Error ending tournament:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('not active')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/stats:
 *   get:
 *     summary: Get tournament statistics
 *     tags: [Tournaments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tournament statistics
 *       401:
 *         description: Unauthorized
 */
const getTournamentStats = async (req, res) => {
  try {
    const stats = await tournamentService.getTournamentStats();
    const profitability = tournamentService.calculateProfitability();
    
    res.json({
      success: true,
      stats,
      profitability
    });
  } catch (error) {
    logger.error('Error getting tournament stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/cache/clear:
 *   post:
 *     summary: Clear tournament cache
 *     tags: [Tournaments]
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
    tournamentService.clearCache();
    
    res.json({
      success: true,
      message: 'Tournament cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing tournament cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * @swagger
 * /api/v1/tournaments/cache/info:
 *   get:
 *     summary: Get tournament cache information
 *     tags: [Tournaments]
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
    const cacheStats = tournamentService.getCacheStats();
    
    res.json({
      success: true,
      cacheStats
    });
  } catch (error) {
    logger.error('Error getting tournament cache info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createTournament,
  getActiveTournaments,
  getTournamentById,
  joinTournament,
  getUserTournaments,
  startTournament,
  endTournament,
  getTournamentStats,
  clearCache,
  getCacheInfo
}; 