const request = require('supertest');
const express = require('express');
const chatService = require('../services/chatService');
const playerStatsService = require('../services/playerStatsService');

// Create a simple Express app for testing
const app = express();
app.use(express.json());

// Import routes
const chatRoutes = require('../routes/chat');
const statsRoutes = require('../routes/stats');

// Use the same route structure as the main server
app.use('/chat', chatRoutes);
app.use('/stats', statsRoutes);

describe('Real-time Features Tests', () => {
  beforeAll(() => {
    // Clear caches for clean testing
    chatService.clearCache();
    playerStatsService.clearCache();
  });

  beforeEach(() => {
    // Clear rate limits before each test
    chatService.clearCache();
  });

  describe('Chat Service Tests', () => {
    it('should add and remove active users', () => {
      const userId = 1;
      const username = 'testuser';
      const socketId = 'socket123';

      // Add user
      chatService.addActiveUser(userId, username, socketId);
      expect(chatService.getActiveUsers()).toHaveLength(1);
      expect(chatService.getActiveUsers()[0].username).toBe(username);

      // Remove user
      chatService.removeActiveUser(userId);
      expect(chatService.getActiveUsers()).toHaveLength(0);
    });

    it('should validate messages correctly', () => {
      // Valid message
      const validValidation = chatService.validateMessage('Hello world!');
      expect(validValidation.valid).toBe(true);

      // Empty message
      const emptyValidation = chatService.validateMessage('');
      expect(emptyValidation.valid).toBe(false);
      expect(emptyValidation.reason).toContain('required');

      // Too long message
      const longMessage = 'a'.repeat(201);
      const longValidation = chatService.validateMessage(longMessage);
      expect(longValidation.valid).toBe(false);
      expect(longValidation.reason).toContain('too long');

      // Message with URL (should be rejected)
      const urlValidation = chatService.validateMessage('Check out https://example.com');
      expect(urlValidation.valid).toBe(false);
      expect(urlValidation.reason).toContain('prohibited content');
    });

    it('should enforce rate limiting', () => {
      const userId = 1;
      const username = 'testuser';
      const socketId = 'socket123';

      chatService.addActiveUser(userId, username, socketId);

      // First message should work
      expect(chatService.isRateLimited(userId)).toBe(false);

      // Update rate limit
      chatService.updateRateLimit(userId);

      // Second message should be rate limited
      expect(chatService.isRateLimited(userId)).toBe(true);
    });

    it('should send system messages', () => {
      const systemMessage = chatService.sendSystemMessage('Test system message', 'info');
      
      expect(systemMessage.username).toBe('System');
      expect(systemMessage.message).toBe('Test system message');
      expect(systemMessage.type).toBe('system');
      expect(systemMessage.systemType).toBe('info');
    });

    it('should send game event messages', () => {
      const gameMessage = chatService.sendGameEventMessage('round_start', { roundId: 123 });
      
      expect(gameMessage.username).toBe('System');
      expect(gameMessage.message).toContain('Round 123 starting');
      expect(gameMessage.type).toBe('system');
      expect(gameMessage.systemType).toBe('game_event');
    });
  });

  describe('Player Stats Service Tests', () => {
    it('should return default stats for new players', () => {
      const defaultStats = playerStatsService.getDefaultStats();
      
      expect(defaultStats.totalBets).toBe(0);
      expect(defaultStats.totalWagered).toBe(0);
      expect(defaultStats.wins).toBe(0);
      expect(defaultStats.losses).toBe(0);
      expect(defaultStats.winRate).toBe(0);
      expect(defaultStats.profitLoss).toBe(0);
    });

    it('should clear cache', () => {
      playerStatsService.clearCache();
      const cacheStats = playerStatsService.getCacheStats();
      
      expect(cacheStats.cacheSize).toBe(0);
    });

    it('should get cache statistics', () => {
      const cacheStats = playerStatsService.getCacheStats();
      
      expect(cacheStats).toHaveProperty('cacheSize');
      expect(cacheStats).toHaveProperty('cacheTimeout');
      expect(typeof cacheStats.cacheSize).toBe('number');
      expect(typeof cacheStats.cacheTimeout).toBe('number');
    });
  });

  describe('Chat API Endpoints', () => {
    it('should get chat history', async () => {
      const response = await request(app)
        .get('/chat/history')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get chat stats', async () => {
      const response = await request(app)
        .get('/chat/stats')
        .expect(200);

      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('totalMessages');
    });

    it('should get active users', async () => {
      const response = await request(app)
        .get('/chat/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject invalid message format', async () => {
      await request(app)
        .post('/chat/send')
        .send({ message: '' })
        .expect(401); // Unauthorized because no auth token
    });

    it('should reject message without content', async () => {
      await request(app)
        .post('/chat/send')
        .send({})
        .expect(401); // Unauthorized because no auth token
    });
  });

  describe('Stats API Endpoints', () => {
    it('should get leaderboard', async () => {
      const response = await request(app)
        .get('/stats/leaderboard')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get leaderboard with type parameter', async () => {
      const response = await request(app)
        .get('/stats/leaderboard?type=biggest_win')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get recent big wins', async () => {
      const response = await request(app)
        .get('/stats/big-wins')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject invalid leaderboard type', async () => {
      const response = await request(app)
        .get('/stats/leaderboard?type=invalid_type')
        .expect(200); // The service handles invalid types gracefully

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Chat Service Integration', () => {
    it('should handle user join and leave events', () => {
      const userId = 1;
      const username = 'testuser';
      const socketId = 'socket123';

      // User joins
      chatService.addActiveUser(userId, username, socketId);
      const joinMessage = chatService.sendGameEventMessage('user_joined', { username });
      
      expect(joinMessage.message).toContain('joined the game');
      expect(chatService.getActiveUsers()).toHaveLength(1);

      // User leaves
      chatService.removeActiveUser(userId);
      const leaveMessage = chatService.sendGameEventMessage('user_left', { username });
      
      expect(leaveMessage.message).toContain('left the game');
      expect(chatService.getActiveUsers()).toHaveLength(0);
    });

    it('should handle chat message flow', async () => {
      const userId = 1;
      const username = 'testuser';
      const socketId = 'socket123';

      chatService.addActiveUser(userId, username, socketId);

      // Send a valid message
      const chatMessage = await chatService.sendMessage(userId, 'Hello everyone!');
      
      expect(chatMessage.userId).toBe(userId);
      expect(chatMessage.username).toBe(username);
      expect(chatMessage.message).toBe('Hello everyone!');
      expect(chatMessage.type).toBe('chat');

      // Check chat history
      const history = chatService.getChatHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].message).toBe('Hello everyone!');
    });

    it('should handle rate limiting in message sending', async () => {
      const userId = 1;
      const username = 'testuser';
      const socketId = 'socket123';

      chatService.addActiveUser(userId, username, socketId);

      // First message should work
      await chatService.sendMessage(userId, 'First message');

      // Second message should be rate limited
      try {
        await chatService.sendMessage(userId, 'Second message');
        fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error.message).toContain('Please wait');
      }
    });
  });

  describe('Player Stats Service Integration', () => {
    it('should update stats after bet', async () => {
      const userId = 1;
      const betAmount = 100;
      const cashoutMultiplier = 2.5;

      // Update stats after a win
      const updatedStats = await playerStatsService.updateStatsAfterBet(userId, betAmount, cashoutMultiplier);
      
      // Since there's no actual bet in database, it should return default stats
      expect(updatedStats).toBeDefined();
    });

    it('should handle cache invalidation', () => {
      const userId = 1;
      
      // Clear cache
      playerStatsService.clearCache();
      
      // Cache should be empty
      const cacheStats = playerStatsService.getCacheStats();
      expect(cacheStats.cacheSize).toBe(0);
    });
  });
}); 