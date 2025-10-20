const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const historyController = require('../controllers/historyController');

const router = express.Router();

router.get('/rounds', historyController.getRoundsHistory);
router.get('/my-bets', authMiddleware, historyController.getMyBetsHistory);
router.get('/user-rounds', authMiddleware, historyController.getUserRoundHistory);
router.get('/activities', authMiddleware, historyController.getRecentActivities);

module.exports = router;
