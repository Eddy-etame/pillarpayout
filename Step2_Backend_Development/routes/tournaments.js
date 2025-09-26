const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/', tournamentController.getActiveTournaments);

// Admin routes (specific routes first)
router.get('/stats', authMiddleware, adminMiddleware.adminAuthMiddleware, tournamentController.getTournamentStats);
router.post('/cache/clear', authMiddleware, adminMiddleware.adminAuthMiddleware, tournamentController.clearCache);
router.get('/cache/info', authMiddleware, adminMiddleware.adminAuthMiddleware, tournamentController.getCacheInfo);

// Parameterized routes (after specific routes)
router.get('/:tournamentId', tournamentController.getTournamentById);

// Authenticated routes
router.post('/join', authMiddleware, tournamentController.joinTournament);
router.get('/user', authMiddleware, tournamentController.getUserTournaments);

// Admin routes (parameterized)
router.post('/', authMiddleware, adminMiddleware.adminAuthMiddleware, tournamentController.createTournament);
router.post('/:tournamentId/start', authMiddleware, adminMiddleware.adminAuthMiddleware, tournamentController.startTournament);
router.post('/:tournamentId/end', authMiddleware, adminMiddleware.adminAuthMiddleware, tournamentController.endTournament);

module.exports = router; 