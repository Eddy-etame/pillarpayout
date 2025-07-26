const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.get('/state', gameController.getGameState);
router.get('/history', gameController.getRoundHistory);
router.post('/verify', gameController.verifyCrashPoint);

// Protected routes (authentication required)
router.post('/bet', authMiddleware, gameController.placeBet);
router.post('/cashout', authMiddleware, gameController.cashOut);

module.exports = router; 