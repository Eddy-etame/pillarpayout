const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const config = require('../config');

class UserService {
  async registerUser(userData) {
    try {
      const { username, email, password } = userData;

      // Validate email format and existence
      const emailValidation = await emailService.validateEmail(email);
      if (!emailValidation.valid) {
        throw new Error(`Email validation failed: ${emailValidation.reason}`);
      }

      // Check if username already exists
      const existingUser = await userModel.findByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) {
        throw new Error('Email already registered');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await userModel.createUser({
        username,
        email,
        password_hash: hashedPassword,
        balance: 1000, // Starting balance
        role: 'player'
      });

      logger.info(`New user registered: ${username} (${email})`);

      return {
        success: true,
        userId: newUser.id,
        message: 'User registered successfully'
      };
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  async loginUser(identifier, password, loginType = 'username') {
    try {
      let user;

      // Find user by username or email
      if (loginType === 'email') {
        user = await userModel.findByEmail(identifier);
      } else {
        user = await userModel.findByUsername(identifier);
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role 
        },
        config.jwtSecret,
        { expiresIn: '24h' }
      );

      logger.info(`User logged in: ${user.username}`);

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          role: user.role
        }
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        created_at: user.created_at
      };
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserBalance(userId, newBalance) {
    try {
      const result = await userModel.updateBalance(userId, newBalance);
      logger.info(`Updated balance for user ${userId}: ${newBalance}`);
      return result;
    } catch (error) {
      logger.error('Error updating user balance:', error);
      throw error;
    }
  }

  async validateEmail(email) {
    try {
      return await emailService.validateEmail(email);
    } catch (error) {
      logger.error('Error validating email:', error);
      throw error;
    }
  }
}

module.exports = new UserService(); 