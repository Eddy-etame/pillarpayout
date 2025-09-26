const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/history', gameController.getRoundHistory);
router.get('/state', gameController.getGameState);
router.get('/live-bets', gameController.getLiveBets);
router.get('/active-players', gameController.getActivePlayers);

// Protected routes (require authentication)
router.post('/bet', authMiddleware, gameController.placeBet);
router.post('/cashout', authMiddleware, gameController.cashOut);
router.get('/user-history', authMiddleware, gameController.getUserRoundHistory);
router.get('/user-stats', authMiddleware, gameController.getUserStats);
router.post('/bet-with-insurance', authMiddleware, gameController.placeBetWithInsurance);

module.exports = router; 