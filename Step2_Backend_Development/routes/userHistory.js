const express = require('express');
const router = express.Router();
const userHistoryController = require('../controllers/userHistoryController');
const authMiddleware = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/v1/user/history/rounds:
 *   get:
 *     summary: Get user's round history
 *     tags: [User History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of rounds per page
 *     responses:
 *       200:
 *         description: Round history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rounds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           roundId:
 *                             type: integer
 *                           crashPoint:
 *                             type: number
 *                           betAmount:
 *                             type: number
 *                           cashoutMultiplier:
 *                             type: number
 *                           finalMultiplier:
 *                             type: number
 *                           result:
 *                             type: string
 *                             enum: [win, loss]
 *                           winnings:
 *                             type: number
 *                           betTimestamp:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalRounds:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/rounds', userHistoryController.getRoundHistory);

/**
 * @swagger
 * /api/v1/user/history/activities:
 *   get:
 *     summary: Get user's recent activities
 *     tags: [User History]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of activities to return
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     activities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           description:
 *                             type: string
 *                           amountChange:
 *                             type: number
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           category:
 *                             type: string
 *                           timeAgo:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/activities', userHistoryController.getRecentActivities);

/**
 * @swagger
 * /api/v1/user/history/stats:
 *   get:
 *     summary: Get user's betting statistics
 *     tags: [User History]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalBets:
 *                       type: integer
 *                     totalWagered:
 *                       type: number
 *                     totalWinnings:
 *                       type: number
 *                     wins:
 *                       type: integer
 *                     winRate:
 *                       type: number
 *                     averageBet:
 *                       type: number
 *                     biggestWin:
 *                       type: number
 *                     biggestBet:
 *                       type: number
 *                     netProfit:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', userHistoryController.getUserStats);

module.exports = router;
