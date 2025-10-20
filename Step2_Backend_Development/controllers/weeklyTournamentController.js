const Joi = require('joi');
const weeklyTournamentService = require('../services/weeklyTournamentService');
const logger = require('../utils/logger');

// Validation schemas
const joinWeeklyTournamentSchema = Joi.object({
  tournamentId: Joi.string().required()
});

/**
 * @swagger
 * /api/v1/weekly-tournaments:
 *   get:
 *     summary: Get active weekly tournaments
 *     tags: [Weekly Tournaments]
 *     responses:
 *       200:
 *         description: List of active weekly tournaments
 */
const getActiveWeeklyTournaments = async (req, res) => {
  try {
    const tournaments = await weeklyTournamentService.getActiveWeeklyTournaments();
    
    res.json({
      success: true,
      data: tournaments,
      count: tournaments.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting active weekly tournaments:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/{tournamentId}:
 *   get:
 *     summary: Get weekly tournament by ID
 *     tags: [Weekly Tournaments]
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Weekly tournament details
 *       404:
 *         description: Tournament not found
 */
const getWeeklyTournamentById = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = weeklyTournamentService.activeWeeklyTournaments.get(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false,
        error: 'Weekly tournament not found' 
      });
    }
    
    // Get leaderboard for this tournament
    const leaderboard = weeklyTournamentService.getWeeklyLeaderboard(tournamentId);
    
    res.json({
      success: true,
      tournament: {
        ...tournament,
        leaderboard: leaderboard.slice(0, 20) // Top 20 players
      }
    });
  } catch (error) {
    logger.error('Error getting weekly tournament by ID:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/join:
 *   post:
 *     summary: Join a weekly tournament
 *     tags: [Weekly Tournaments]
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
 *         description: Successfully joined weekly tournament
 *       400:
 *         description: Invalid request or already joined
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tournament not found
 */
const joinWeeklyTournament = async (req, res) => {
  try {
    const { error, value } = joinWeeklyTournamentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false,
        error: error.details[0].message 
      });
    }

    const { tournamentId } = value;
    const userId = req.user.id;
    const username = req.user.username;

    const result = await weeklyTournamentService.joinWeeklyTournament(tournamentId, userId, username);

    res.json({
      success: true,
      message: 'Successfully joined weekly tournament',
      participant: result.participant,
      group: result.group
    });
  } catch (error) {
    logger.error('Error joining weekly tournament:', error);

    // Robust duplicate detection
    const msg = (error && (error.message || '')) + '';
    const detail = (error && (error.detail || error?.cause?.detail || '')) + '';
    const code = error?.code || error?.cause?.code;
    const text = `${msg} ${detail}`.toLowerCase();
    const isDuplicate = code === '23505' || text.includes('duplicate key') || text.includes('already exists') || text.includes('already joined');

    if (isDuplicate) {
      try {
        // Fetch existing participant to return useful data
        const db = require('../db');
        const existing = await db.query(
          `SELECT tournament_id, user_id, username, group_id, joined_at, score, rank
           FROM weekly_tournament_participants
           WHERE tournament_id = $1 AND user_id = $2
           LIMIT 1`,
          [req.body.tournamentId || req.params.tournamentId || value?.tournamentId, req.user.id]
        );

        return res.status(200).json({
          success: true,
          message: 'You have already joined this tournament',
          participant: existing.rows[0] || null
        });
      } catch (e) {
        // Fall back to 400 if we cannot fetch existing
        return res.status(400).json({
          success: false,
          error: 'You have already joined this tournament'
        });
      }
    }

    if (msg.includes('not found')) {
      return res.status(404).json({ 
        success: false,
        error: msg 
      });
    }

    if (msg.includes('closed') || msg.includes('full')) {
      return res.status(400).json({ 
        success: false,
        error: msg 
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/user:
 *   get:
 *     summary: Get user's weekly tournaments
 *     tags: [Weekly Tournaments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's weekly tournaments
 *       401:
 *         description: Unauthorized
 */
const getUserWeeklyTournaments = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // CRITICAL FIX: Add input validation to prevent 500 errors
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({
        success: false,
        data: null,
        count: 0,
        error: 'Invalid user_id; must be an integer',
        details: 'user_id query parameter is required and must be a valid integer'
      });
    }
    
    const parsedUserId = Number(userId); // Ensure it's an integer
    
    // Get user tournaments from database using correct varchar join on tournament_id
    const db = require('../db');
    const dbResult = await db.query(
      `SELECT 
         wt.tournament_id AS tournament_id,
         wt.name,
         wt.description,
         wt.start_date,
         wt.end_date,
         wt.status,
         wt.created_at,
         wtp.joined_at,
         wtp.group_id,
         wtp.score,
         wtp.rank
       FROM weekly_tournament_participants wtp
       JOIN weekly_tournaments wt ON wt.tournament_id = wtp.tournament_id
       WHERE wtp.user_id = $1
       ORDER BY wt.created_at DESC`,
      [parsedUserId] // Use parsed value
    );
    
    const userTournaments = dbResult.rows.map((row) => ({
      id: row.tournament_id,
      tournamentId: row.tournament_id,
      name: row.name,
      description: row.description,
      startTime: row.start_date,
      endTime: row.end_date,
      status: row.status,
      createdAt: row.created_at,
      participant: {
        joinedAt: row.joined_at,
        groupId: row.group_id,
        score: Number(row.score || 0),
        rank: Number(row.rank || 0),
      },
    }));
    
    // FIXED: Complete envelope with all required fields
    res.json({
      success: true,
      data: userTournaments,
      count: userTournaments.length,
      error: null,
      details: 'Tournaments retrieved successfully'
    });
  } catch (error) {
    logger.error('Error getting user weekly tournaments:', error);
    res.status(500).json({ 
      success: false,
      data: null,
      count: 0,
      error: error.message || 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/{tournamentId}/leaderboard:
 *   get:
 *     summary: Get weekly tournament leaderboard
 *     tags: [Weekly Tournaments]
 *     parameters:
 *       - in: path
 *         name: tournamentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tournament leaderboard
 *       404:
 *         description: Tournament not found
 */
const getWeeklyTournamentLeaderboard = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = weeklyTournamentService.activeWeeklyTournaments.get(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ 
        success: false,
        error: 'Weekly tournament not found' 
      });
    }
    
    const leaderboard = weeklyTournamentService.getWeeklyLeaderboard(tournamentId);
    
    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status
      },
      leaderboard,
      count: leaderboard.length
    });
  } catch (error) {
    logger.error('Error getting weekly tournament leaderboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/stats:
 *   get:
 *     summary: Get weekly tournament statistics
 *     tags: [Weekly Tournaments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly tournament statistics
 *       401:
 *         description: Unauthorized
 */
const getWeeklyTournamentStats = async (req, res) => {
  try {
    const stats = await weeklyTournamentService.getWeeklyTournamentStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting weekly tournament stats:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/create:
 *   post:
 *     summary: Create a new weekly tournament (Admin only)
 *     tags: [Weekly Tournaments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Weekly tournament created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
const createWeeklyTournament = async (req, res) => {
  try {
    const { startDate } = req.body;
    const tournament = await weeklyTournamentService.createWeeklyTournament(startDate);

    res.status(201).json({
      success: true,
      message: 'Weekly tournament created successfully',
      tournament
    });
  } catch (error) {
    logger.error('Error creating weekly tournament:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/{tournamentId}/start:
 *   post:
 *     summary: Start a weekly tournament (Admin only)
 *     tags: [Weekly Tournaments]
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
 *         description: Weekly tournament started successfully
 *       400:
 *         description: Cannot start tournament
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Tournament not found
 */
const startWeeklyTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await weeklyTournamentService.startWeeklyTournament(tournamentId);
    
    res.json({
      success: true,
      message: 'Weekly tournament started successfully',
      tournament
    });
  } catch (error) {
    logger.error('Error starting weekly tournament:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        success: false,
        error: error.message 
      });
    }
    
    if (error.message.includes('cannot be started') || 
        error.message.includes('No participants')) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/{tournamentId}/end:
 *   post:
 *     summary: End a weekly tournament (Admin only)
 *     tags: [Weekly Tournaments]
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
 *         description: Weekly tournament ended successfully
 *       400:
 *         description: Cannot end tournament
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Tournament not found
 */
const endWeeklyTournament = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const result = await weeklyTournamentService.endWeeklyTournament(tournamentId);
    
    res.json({
      success: true,
      message: 'Weekly tournament ended successfully',
      tournament: result.tournament,
      winners: result.winners,
      groupWinners: result.groupWinners
    });
  } catch (error) {
    logger.error('Error ending weekly tournament:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ 
        success: false,
        error: error.message 
      });
    }
    
    if (error.message.includes('not active')) {
      return res.status(400).json({ 
        success: false,
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * @swagger
 * /api/v1/weekly-tournaments/global-leaderboard:
 *   get:
 *     summary: Get global leaderboard for all tournaments
 *     tags: [Weekly Tournaments]
 *     responses:
 *       200:
 *         description: Global leaderboard retrieved successfully
 *       500:
 *         description: Internal server error
 */
const getGlobalLeaderboard = async (req, res) => {
  try {
    const leaderboard = await weeklyTournamentService.getGlobalLeaderboard();
    
    res.json({
      success: true,
      data: leaderboard,
      count: leaderboard.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting global leaderboard:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getActiveWeeklyTournaments,
  getWeeklyTournamentById,
  joinWeeklyTournament,
  getUserWeeklyTournaments,
  getWeeklyTournamentLeaderboard,
  getWeeklyTournamentStats,
  createWeeklyTournament,
  startWeeklyTournament,
  endWeeklyTournament,
  getGlobalLeaderboard
};
