const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const config = require('../config');

class CustomError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

class UserService {
  async registerUser(userData) {
    try {
      const { username, email, password } = userData;

      const emailValidation = await emailService.validateEmail(email);
      if (!emailValidation.valid) {
        throw new CustomError(`Email validation failed: ${emailValidation.reason}`, 'EMAIL_INVALID');
      }

      const existingUser = await userModel.findByUsername(username);
      if (existingUser) {
        throw new CustomError('Username already exists', 'DUPLICATE_USERNAME');
      }

      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) {
        throw new CustomError('Email already registered', 'DUPLICATE_EMAIL');
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = await userModel.createUser({
        username,
        email,
        password_hash: hashedPassword,
        balance: 1000,
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

      if (loginType === 'email') {
        user = await userModel.findByEmail(identifier);
      } else {
        user = await userModel.findByUsername(identifier);
      }

      if (!user) {
        throw new CustomError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new CustomError('Invalid credentials', 'INVALID_CREDENTIALS');
      }

      if (!config.jwtSecret) {
        throw new CustomError('JWT secret is not configured', 'CONFIG_ERROR');
      }

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
          role: user.role,
          isAdmin: user.is_admin || user.role === 'admin'
        }
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      console.log(`Getting user profile for user ID: ${userId}`);
      const user = await userModel.findById(userId);
      console.log('User found in database:', user);
      
      if (!user) {
        throw new CustomError('User not found', 'USER_NOT_FOUND');
      }

      console.log(`User balance from database: ${user.balance} (type: ${typeof user.balance})`);

      const profile = {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        role: user.role,
        isAdmin: user.is_admin || user.role === 'admin',
        created_at: user.created_at
      };

      console.log('Returning profile:', profile);
      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
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

  async getUserById(userId) {
    try {
      const user = await userModel.findById(userId);
      return user;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  generateToken(user) {
    try {
      return jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role 
        },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
    } catch (error) {
      logger.error('Error generating token:', error);
      throw error;
    }
  }
}

module.exports = new UserService(); 