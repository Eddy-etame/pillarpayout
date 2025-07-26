const Joi = require('joi');
const userService = require('../services/userService');
const logger = require('../utils/logger');

// Validation schemas
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(), // username or email
  password: Joi.string().required()
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 userId:
 *                   type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error or email validation failed
 *       409:
 *         description: Username or email already exists
 */
const register = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password } = value;

    // Register user with email validation
    const result = await userService.registerUser({ username, email, password });
    
    res.status(201).json(result);
  } catch (error) {
    logger.error('Registration error:', error);
    
    if (error.message.includes('Email validation failed')) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('already exists') || error.message.includes('already registered')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
};

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username or email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     balance:
 *                       type: number
 *                     role:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
const login = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { identifier, password } = value;

    // Determine if identifier is email or username
    const isEmail = identifier.includes('@');
    const loginType = isEmail ? 'email' : 'username';

    // Login user
    const result = await userService.loginUser(identifier, password, loginType);
    
    res.json(result);
  } catch (error) {
    logger.error('Login error:', error);
    
    if (error.message.includes('Invalid credentials')) {
      res.status(401).json({ error: 'Invalid credentials' });
    } else {
      res.status(500).json({ error: 'Login failed' });
    }
  }
};

/**
 * @swagger
 * /api/v1/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 balance:
 *                   type: number
 *                 role:
 *                   type: string
 *                 created_at:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await userService.getUserProfile(userId);
    res.json(profile);
  } catch (error) {
    logger.error('Get profile error:', error);
    
    if (error.message.includes('User not found')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
};

/**
 * @swagger
 * /api/v1/user/validate-email:
 *   post:
 *     summary: Validate email address
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Email validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 reason:
 *                   type: string
 *                   description: Reason for validation failure (if any)
 */
const validateEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const validation = await userService.validateEmail(email);
    res.json(validation);
  } catch (error) {
    logger.error('Email validation error:', error);
    res.status(500).json({ error: 'Email validation failed' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  validateEmail
};
