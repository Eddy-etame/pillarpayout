const express = require('express');
const userController = require('../controllers/userController');
const router = express.Router();

// User registration with email validation
router.post('/register', userController.register);

// User login with username or email
router.post('/login', userController.login);

module.exports = router;
