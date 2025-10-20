const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./user');
const historyRoutes = require('./history');
const communityGoalsRoutes = require('./communityGoals');
const adminRoutes = require('./admin');
const gameRoutes = require('./game');
const chatRoutes = require('./chat');
const statsRoutes = require('./stats');
const insuranceRoutes = require('./insurance');
const tournamentRoutes = require('./tournaments');
const weeklyTournamentRoutes = require('./weeklyTournaments');
const productionRoutes = require('./production');

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/history', historyRoutes);
router.use('/community-goals', communityGoalsRoutes);
router.use('/admin', adminRoutes);
router.use('/game', gameRoutes);
router.use('/chat', chatRoutes);
router.use('/stats', statsRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/tournaments', tournamentRoutes);
router.use('/weekly-tournaments', weeklyTournamentRoutes);
router.use('/production', productionRoutes);

module.exports = router; 