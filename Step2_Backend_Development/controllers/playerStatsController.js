const playerStatsService = require('../services/playerStatsService');
const logger = require('../utils/logger');

/**
 * @swagger
 * /api/v1/stats/player:
 *   get:
 *     summary: Get current user's statistics
 *     tags: [Player Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Player statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: integer
 *                 totalBets:
 *                   type: integer
 *                 totalWagered:
 *                   type: number
 *                 totalWon:
 *                   type: number
 *                 totalLost:
 *                   type: number
 *                 wins:
 *                   type: integer
 *                 losses:
 *                   type: integer
 *                 biggestWin:
 *                   type: number
 *                 biggestLoss:
 *                   type: number
 *                 highestMultiplier:
 *                   type: number
 *                 averageBet:
 *                   type: number
 *                 winRate:
 *                   type: number
 *                 profitLoss:
 *                   type: number
 *                 recentStats:
 *                   type: object
 *                 lastUpdated:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
const getPlayerStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await playerStatsService.getPlayerStats(userId);
    
    res.json(stats);
  } catch (error) {
    logger.error('Error getting player stats:', error);
    res.status(500).json({ error: 'Failed to get player stats' });
  }
};

/**
 * @swagger
 * /api/v1/stats/leaderboard:
 *   get:
 *     summary: Get leaderboard
 *     tags: [Player Stats]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [profit, biggest_win, highest_multiplier, most_bets]
 *           default: profit
 *         description: Type of leaderboard
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of players to return
 *     responses:
 *       200:
 *         description: Leaderboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   rank:
 *                     type: integer
 *                   id:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   total_bets:
 *                     type: integer
 *                   total_wagered:
 *                     type: number
 *                   total_won:
 *                     type: number
 *                   total_lost:
 *                     type: number
 *                   highest_multiplier:
 *                     type: number
 *                   biggest_win:
 *                     type: number
 */
const getLeaderboard = async (req, res) => {
  try {
    const type = req.query.type || 'profit';
    const limit = parseInt(req.query.limit) || 10;
    
    const leaderboard = await playerStatsService.getLeaderboard(type, limit);
    
    res.json(leaderboard);
  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

/**
 * @swagger
 * /api/v1/stats/big-wins:
 *   get:
 *     summary: Get recent big wins
 *     tags: [Player Stats]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of wins to return
 *     responses:
 *       200:
 *         description: Recent big wins
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   cashout_multiplier:
 *                     type: number
 *                   winnings:
 *                     type: number
 *                   timestamp:
 *                     type: string
 *                   round_id:
 *                     type: integer
 */
const getRecentBigWins = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const bigWins = await playerStatsService.getRecentBigWins(limit);
    
    res.json(bigWins);
  } catch (error) {
    logger.error('Error getting recent big wins:', error);
    res.status(500).json({ error: 'Failed to get recent big wins' });
  }
};

/**
 * @swagger
 * /api/v1/stats/history:
 *   get:
 *     summary: Get user's betting history
 *     tags: [Player Stats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of bets to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of bets to skip
 *     responses:
 *       200:
 *         description: Betting history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   amount:
 *                     type: number
 *                   cashout_multiplier:
 *                     type: number
 *                     nullable: true
 *                   winnings:
 *                     type: number
 *                   timestamp:
 *                     type: string
 *                   round_id:
 *                     type: integer
 *                   crash_point:
 *                     type: number
 *       401:
 *         description: Unauthorized
 */
const getBettingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const history = await playerStatsService.getUserBettingHistory(userId, limit, offset);
    
    res.json(history);
  } catch (error) {
    logger.error('Error getting betting history:', error);
    res.status(500).json({ error: 'Failed to get betting history' });
  }
};

/**
 * @swagger
 * /api/v1/stats/cache/clear:
 *   post:
 *     summary: Clear stats cache (Admin only)
 *     tags: [Player Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const clearStatsCache = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    playerStatsService.clearCache();
    
    res.json({
      success: true,
      message: 'Stats cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing stats cache:', error);
    res.status(500).json({ error: 'Failed to clear stats cache' });
  }
};

/**
 * @swagger
 * /api/v1/stats/cache/info:
 *   get:
 *     summary: Get cache information (Admin only)
 *     tags: [Player Stats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cache information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cacheSize:
 *                   type: integer
 *                 cacheTimeout:
 *                   type: integer
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

    const cacheInfo = playerStatsService.getCacheStats();
    
    res.json(cacheInfo);
  } catch (error) {
    logger.error('Error getting cache info:', error);
    res.status(500).json({ error: 'Failed to get cache info' });
  }
};

module.exports = {
  getPlayerStats,
  getLeaderboard,
  getRecentBigWins,
  getBettingHistory,
  clearStatsCache,
  getCacheInfo
}; 