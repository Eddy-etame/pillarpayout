const db = require('../db');
const logger = require('../utils/logger');

class ChatService {
  constructor() {
    this.activeUsers = new Map(); // userId -> { username, socketId, lastActivity }
    this.chatHistory = []; // In-memory chat history (last 100 messages)
    this.maxHistorySize = 100;
    this.rateLimit = new Map(); // userId -> lastMessageTime
    this.rateLimitWindow = 2000; // 2 seconds between messages
  }

  // Add user to active users
  addActiveUser(userId, username, socketId) {
    this.activeUsers.set(userId, {
      username,
      socketId,
      lastActivity: Date.now()
    });
    
    logger.info(`User ${username} (${userId}) joined chat`);
  }

  // Remove user from active users
  removeActiveUser(userId) {
    const user = this.activeUsers.get(userId);
    if (user) {
      logger.info(`User ${user.username} (${userId}) left chat`);
      this.activeUsers.delete(userId);
    }
  }

  // Get active users list
  getActiveUsers() {
    return Array.from(this.activeUsers.values()).map(user => ({
      username: user.username,
      lastActivity: user.lastActivity
    }));
  }

  // Check if user is rate limited
  isRateLimited(userId) {
    const lastMessage = this.rateLimit.get(userId);
    if (!lastMessage) return false;
    
    return (Date.now() - lastMessage) < this.rateLimitWindow;
  }

  // Update rate limit for user
  updateRateLimit(userId) {
    this.rateLimit.set(userId, Date.now());
  }

  // Validate message
  validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return { valid: false, reason: 'Message is required' };
    }

    if (message.trim().length === 0) {
      return { valid: false, reason: 'Message cannot be empty' };
    }

    if (message.length > 200) {
      return { valid: false, reason: 'Message too long (max 200 characters)' };
    }

    // Check for spam patterns
    const spamPatterns = [
      /(.)\1{4,}/, // Repeated characters (5+ times)
      /(https?:\/\/[^\s]+)/, // URLs
      /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/, // Email addresses
      /(\b\d{10,}\b)/, // Phone numbers
      /(buy|sell|trade|money|cash|bitcoin|eth|wallet)/i // Suspicious keywords
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(message)) {
        return { valid: false, reason: 'Message contains prohibited content' };
      }
    }

    return { valid: true };
  }

  // Send chat message
  async sendMessage(userId, message, roundId = null) {
    try {
      // Validate message
      const validation = this.validateMessage(message);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      // Check rate limit
      if (this.isRateLimited(userId)) {
        throw new Error('Please wait before sending another message');
      }

      // Get user info
      const user = this.activeUsers.get(userId);
      if (!user) {
        throw new Error('User not found in active users');
      }

      // Update rate limit
      this.updateRateLimit(userId);

      // Create chat message object
      const chatMessage = {
        id: Date.now() + Math.random(), // Simple ID generation
        userId,
        username: user.username,
        message: message.trim(),
        roundId,
        timestamp: new Date().toISOString(),
        type: 'chat'
      };

      // Add to chat history
      this.chatHistory.push(chatMessage);
      
      // Keep only last maxHistorySize messages
      if (this.chatHistory.length > this.maxHistorySize) {
        this.chatHistory = this.chatHistory.slice(-this.maxHistorySize);
      }

      // Store in database
      await this.storeMessageInDatabase(chatMessage);

      // Update user activity
      user.lastActivity = Date.now();

      logger.info(`Chat message from ${user.username}: ${message}`);

      return chatMessage;
    } catch (error) {
      logger.error('Error sending chat message:', error);
      throw error;
    }
  }

  // Store message in database
  async storeMessageInDatabase(chatMessage) {
    try {
      await db.query(
        'INSERT INTO chat_messages (user_id, round_id, message, timestamp) VALUES ($1, $2, $3, $4)',
        [chatMessage.userId, chatMessage.roundId, chatMessage.message, chatMessage.timestamp]
      );
    } catch (error) {
      logger.error('Error storing chat message in database:', error);
      // Don't throw error to avoid breaking chat functionality
    }
  }

  // Get chat history
  getChatHistory(limit = 50) {
    return this.chatHistory.slice(-limit);
  }

  // Get chat history from database
  async getChatHistoryFromDatabase(limit = 50) {
    try {
      const result = await db.query(`
        SELECT 
          cm.id,
          cm.user_id,
          u.username,
          cm.message,
          cm.round_id,
          cm.timestamp
        FROM chat_messages cm
        JOIN users u ON cm.user_id = u.id
        ORDER BY cm.timestamp DESC
        LIMIT $1
      `, [limit]);

      return result.rows.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Error getting chat history from database:', error);
      return [];
    }
  }

  // Send system message
  sendSystemMessage(message, type = 'info') {
    const systemMessage = {
      id: Date.now() + Math.random(),
      userId: null,
      username: 'System',
      message,
      timestamp: new Date().toISOString(),
      type: 'system',
      systemType: type
    };

    this.chatHistory.push(systemMessage);
    
    if (this.chatHistory.length > this.maxHistorySize) {
      this.chatHistory = this.chatHistory.slice(-this.maxHistorySize);
    }

    logger.info(`System message: ${message}`);
    return systemMessage;
  }

  // Send game event message
  sendGameEventMessage(event, data = {}) {
    let message = '';
    
    switch (event) {
      case 'round_start':
        message = `🎮 Round ${data.roundId} starting in 5 seconds!`;
        break;
      case 'round_crash':
        message = `💥 Round ${data.roundId} crashed at ${data.multiplier}x!`;
        break;
      case 'big_win':
        message = `🎉 ${data.username} won $${data.amount} at ${data.multiplier}x!`;
        break;
      case 'special_block':
        message = `⭐ Special block: ${data.type} at ${data.multiplier}x!`;
        break;
      case 'user_joined':
        message = `👋 ${data.username} joined the game!`;
        break;
      case 'user_left':
        message = `👋 ${data.username} left the game!`;
        break;
      default:
        message = `📢 ${event}: ${JSON.stringify(data)}`;
    }

    return this.sendSystemMessage(message, 'game_event');
  }

  // Clean up inactive users (called periodically)
  cleanupInactiveUsers(timeout = 300000) { // 5 minutes
    const now = Date.now();
    const inactiveUsers = [];

    for (const [userId, user] of this.activeUsers.entries()) {
      if (now - user.lastActivity > timeout) {
        inactiveUsers.push(userId);
      }
    }

    inactiveUsers.forEach(userId => {
      this.removeActiveUser(userId);
    });

    if (inactiveUsers.length > 0) {
      logger.info(`Cleaned up ${inactiveUsers.length} inactive users`);
    }
  }

  // Get chat statistics
  getChatStats() {
    return {
      activeUsers: this.activeUsers.size,
      totalMessages: this.chatHistory.length,
      lastActivity: this.chatHistory.length > 0 ? this.chatHistory[this.chatHistory.length - 1].timestamp : null
    };
  }

  // Clear chat history (admin function)
  clearChatHistory() {
    this.chatHistory = [];
    logger.info('Chat history cleared by admin');
  }

  // Ban user from chat (admin function)
  banUserFromChat(userId, reason = 'Violation of chat rules') {
    this.removeActiveUser(userId);
    this.rateLimit.set(userId, Date.now() + 3600000); // Ban for 1 hour
    
    const banMessage = this.sendSystemMessage(
      `🚫 User has been banned from chat: ${reason}`,
      'ban'
    );
    
    logger.info(`User ${userId} banned from chat: ${reason}`);
    return banMessage;
  }
}

module.exports = new ChatService(); 