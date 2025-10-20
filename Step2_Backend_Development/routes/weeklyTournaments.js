

const express = require('express');
const router = express.Router();
const weeklyTournamentController = require('../controllers/weeklyTournamentController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/', weeklyTournamentController.getActiveWeeklyTournaments);
router.get('/stats', weeklyTournamentController.getWeeklyTournamentStats);
router.get('/global-leaderboard', weeklyTournamentController.getGlobalLeaderboard);

// Authenticated routes (before parameterized routes)
router.post('/join', authMiddleware, weeklyTournamentController.joinWeeklyTournament);
router.get('/user', authMiddleware, weeklyTournamentController.getUserWeeklyTournaments);

// Parameterized routes (after specific routes)
router.get('/:tournamentId/leaderboard', weeklyTournamentController.getWeeklyTournamentLeaderboard);
router.get('/:tournamentId', weeklyTournamentController.getWeeklyTournamentById);

// Admin routes (parameterized)
router.post('/create', authMiddleware, adminMiddleware.adminAuthMiddleware, weeklyTournamentController.createWeeklyTournament);
router.post('/:tournamentId/start', authMiddleware, adminMiddleware.adminAuthMiddleware, weeklyTournamentController.startWeeklyTournament);
router.post('/:tournamentId/end', authMiddleware, adminMiddleware.adminAuthMiddleware, weeklyTournamentController.endWeeklyTournament);

module.exports = router;
