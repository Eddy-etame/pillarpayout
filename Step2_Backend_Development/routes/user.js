const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/profile', authMiddleware, userController.getProfile);
router.post('/validate-email', userController.validateEmail);

module.exports = router;
