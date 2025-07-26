const express = require('express');
const router = express.Router();
const communityGoalsController = require('../controllers/communityGoalsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes
router.get('/', communityGoalsController.getActiveGoals);
router.get('/completed', communityGoalsController.getCompletedGoals);
router.get('/:goalId', communityGoalsController.getGoalById);
router.get('/:goalId/progress', communityGoalsController.getGoalProgress);
router.get('/:goalId/participants', communityGoalsController.getGoalParticipants);

// Authenticated routes
router.post('/contribute', authMiddleware, communityGoalsController.contributeToGoal);
router.get('/user', authMiddleware, communityGoalsController.getUserGoals);

// Admin routes
router.post('/', authMiddleware, adminMiddleware, communityGoalsController.createGoal);
router.post('/:goalId/complete', authMiddleware, adminMiddleware, communityGoalsController.completeGoal);
router.post('/cache/clear', authMiddleware, adminMiddleware, communityGoalsController.clearCache);
router.get('/cache/info', authMiddleware, adminMiddleware, communityGoalsController.getCacheInfo);

module.exports = router;
