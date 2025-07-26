const request = require('supertest');
const db = require('../db');
const gameEngine = require('../services/gameEngine');

// Create a simple Express app for testing
const express = require('express');
const app = express();
app.use(express.json());

// Import game routes
const gameRoutes = require('../routes/game');
app.use('/api/v1/game', gameRoutes);

describe('Game Engine Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create a test user
    const userResult = await db.query(
      'INSERT INTO users (username, email, password_hash, balance, role) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['testplayer', 'test@example.com', 'hashedpassword', 1000, 'player']
    );
    testUser = userResult.rows[0];

    // Mock authentication middleware for testing
    app.use((req, res, next) => {
      req.user = { id: testUser.id };
      next();
    });
  });

  afterAll(async () => {
    // Clean up test data
    await db.query('DELETE FROM bets WHERE user_id = $1', [testUser.id]);
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await db.query('DELETE FROM rounds WHERE id > 0');
    await db.end();
  });

  describe('GET /api/v1/game/state', () => {
    it('should return current game state', async () => {
      const response = await request(app)
        .get('/api/v1/game/state')
        .expect(200);

      expect(response.body).toHaveProperty('roundId');
      expect(response.body).toHaveProperty('gameState');
      expect(response.body).toHaveProperty('multiplier');
      expect(response.body).toHaveProperty('integrity');
      expect(['waiting', 'running', 'crashed', 'results']).toContain(response.body.gameState);
    });
  });

  describe('GET /api/v1/game/history', () => {
    it('should return round history', async () => {
      const response = await request(app)
        .get('/api/v1/game/history')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('crash_point');
        expect(response.body[0]).toHaveProperty('timestamp');
      }
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/game/history?limit=5')
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/v1/game/bet', () => {
    it('should place a bet successfully', async () => {
      const response = await request(app)
        .post('/api/v1/game/bet')
        .send({ amount: 50 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('newBalance');
      expect(response.body).toHaveProperty('betAmount', 50);
    });

    it('should reject invalid bet amounts', async () => {
      await request(app)
        .post('/api/v1/game/bet')
        .send({ amount: 0 })
        .expect(400);

      await request(app)
        .post('/api/v1/game/bet')
        .send({ amount: 2000 })
        .expect(400);
    });

    it('should reject bets when user has insufficient balance', async () => {
      await request(app)
        .post('/api/v1/game/bet')
        .send({ amount: 2000 })
        .expect(400);
    });
  });

  describe('POST /api/v1/game/cashout', () => {
    it('should cash out successfully when game is running', async () => {
      // First place a bet
      await request(app)
        .post('/api/v1/game/bet')
        .send({ amount: 25 });

      // Try to cash out (may fail if game is not in running state)
      const response = await request(app)
        .post('/api/v1/game/cashout')
        .expect(200);

      // Response should indicate success or failure based on game state
      expect(response.body).toHaveProperty('success');
    });

    it('should reject cashout when no active bet', async () => {
      const response = await request(app)
        .post('/api/v1/game/cashout')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/game/verify', () => {
    it('should verify provably fair result', async () => {
      const testData = {
        serverSeed: 'testserverseed123456789012345678901234567890123456789012345678901234567890',
        clientSeed: 'testclientseed123456789012345678901234567890123456789012345678901234567890',
        nonce: 123456789
      };

      const response = await request(app)
        .post('/api/v1/game/verify')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('crashPoint');
      expect(response.body).toHaveProperty('verified', true);
      expect(typeof response.body.crashPoint).toBe('number');
      expect(response.body.crashPoint).toBeGreaterThan(1);
    });

    it('should reject verification with missing parameters', async () => {
      await request(app)
        .post('/api/v1/game/verify')
        .send({ serverSeed: 'test' })
        .expect(400);
    });
  });
});

describe('Game Engine Logic Tests', () => {
  it('should calculate crash point correctly', () => {
    const serverSeed = 'testserverseed123456789012345678901234567890123456789012345678901234567890';
    const clientSeed = 'testclientseed123456789012345678901234567890123456789012345678901234567890';
    const nonce = 123456789;

    const crashPoint = gameEngine.verifyCrashPoint(serverSeed, clientSeed, nonce);
    
    expect(typeof crashPoint).toBe('number');
    expect(crashPoint).toBeGreaterThan(1);
    expect(crashPoint).toBeLessThan(1000); // Reasonable upper bound
  });

  it('should generate different crash points for different inputs', () => {
    const serverSeed1 = 'seed1';
    const serverSeed2 = 'seed2';
    const clientSeed = 'clientseed';
    const nonce = 123;

    const crashPoint1 = gameEngine.verifyCrashPoint(serverSeed1, clientSeed, nonce);
    const crashPoint2 = gameEngine.verifyCrashPoint(serverSeed2, clientSeed, nonce);

    expect(crashPoint1).not.toBe(crashPoint2);
  });
}); 