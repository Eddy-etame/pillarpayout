const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const historyController = require('../controllers/historyController');

const router = express.Router();

router.get('/rounds', historyController.getRoundsHistory);
router.get('/my-bets', authMiddleware, historyController.getMyBetsHistory);

module.exports = router;
