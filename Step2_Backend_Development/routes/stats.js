const express = require('express');
const router = express.Router();
const playerStatsController = require('../controllers/playerStatsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes (no authentication required)
router.get('/leaderboard', playerStatsController.getLeaderboard);
router.get('/big-wins', playerStatsController.getRecentBigWins);

// Protected routes (authentication required)
router.get('/player', authMiddleware, playerStatsController.getPlayerStats);
router.get('/history', authMiddleware, playerStatsController.getBettingHistory);

// Admin routes (admin authentication required)
router.post('/cache/clear', authMiddleware, adminMiddleware, playerStatsController.clearStatsCache);
router.get('/cache/info', authMiddleware, adminMiddleware, playerStatsController.getCacheInfo);

module.exports = router; 