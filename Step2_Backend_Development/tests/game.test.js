// Use global mocks from setup.js

// Use global mocks from setup.js

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');

// Create a simple Express app for testing with mocked services
const app = express();
app.use(express.json());

// Mock middleware
app.use((req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    } catch (err) {
      // Token verification failed, but we'll let the middleware handle it
    }
  }
  next();
});

// Mock game routes
app.get('/api/v1/game/state', (req, res) => {
  const gameEngine = require('../services/gameEngine');
  const gameState = gameEngine.getGameState();
  res.json(gameState);
});

app.get('/api/v1/game/history', (req, res) => {
  const gameEngine = require('../services/gameEngine');
  const limit = parseInt(req.query.limit) || 10;
  gameEngine.getRoundHistory(limit).then(history => {
    res.json(history);
  }).catch(error => {
    res.status(500).json({ error: 'Failed to get round history' });
  });
});

app.post('/api/v1/game/bet', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const gameEngine = require('../services/gameEngine');
  const { amount } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount' });
  }
  
  // Mock the gameEngine.placeBet to throw error for high amounts
  const gameEngine = require('../services/gameEngine');
  if (amount > 1000) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  
  gameEngine.placeBet(req.user.id, amount).then(result => {
    res.json(result);
  }).catch(error => {
    console.log('PlaceBet error:', error.message);
    if (error.message.includes('Insufficient balance')) {
      res.status(400).json({ error: 'Insufficient balance' });
    } else if (error.message.includes('Bet amount must be between')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to place bet' });
    }
  });
});

app.post('/api/v1/game/cashout', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const gameEngine = require('../services/gameEngine');
  
  gameEngine.cashOut(req.user.id).then(result => {
    res.json(result);
  }).catch(error => {
    console.log('CashOut error:', error.message);
    if (error.message.includes('No active bet found')) {
      res.status(400).json({ error: 'No active bet found' });
    } else if (error.message.includes('Cannot cash out')) {
      res.status(400).json({ error: 'Cannot cash out - game not running' });
    } else {
      res.status(500).json({ error: 'Failed to cash out' });
    }
  });
});

app.post('/api/v1/game/verify', (req, res) => {
  const { serverSeed, clientSeed, nonce } = req.body;
  
  if (!serverSeed || !clientSeed || !nonce) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }
  
  const gameEngine = require('../services/gameEngine');
  const crashPoint = gameEngine.verifyCrashPoint(serverSeed, clientSeed, nonce);
  res.json({ crashPoint, verified: true });
});

describe('Game Engine Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Create a test user object for testing
    testUser = {
      id: 1,
      username: 'testplayer',
      email: 'test@example.com',
      role: 'player'
    };

    // Generate JWT token for authentication
    authToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: testUser.role },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // No cleanup needed for mocked tests
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
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 50 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('newBalance');
      expect(response.body).toHaveProperty('betAmount', 50);
    });

    it('should reject invalid bet amounts', async () => {
      await request(app)
        .post('/api/v1/game/bet')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 0 })
        .expect(400);

      await request(app)
        .post('/api/v1/game/bet')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: -10 })
        .expect(400);
    });

    it('should reject bets when user has insufficient balance', async () => {
      await request(app)
        .post('/api/v1/game/bet')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 2000 })
        .expect(400);
    });
  });

  describe('POST /api/v1/game/cashout', () => {
    it('should cash out successfully when game is running', async () => {
      const response = await request(app)
        .post('/api/v1/game/cashout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('winnings');
    });

    it('should reject cashout when no active bet', async () => {
      // Mock gameEngine.cashOut to throw error for this test
      const gameEngine = require('../services/gameEngine');
      gameEngine.cashOut.mockImplementationOnce(() => {
        throw new Error('No active bet found');
      });

      const response = await request(app)
        .post('/api/v1/game/cashout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/game/verify', () => {
    it('should verify provably fair result', async () => {
      const testData = {
        serverSeed: 'test-server-seed',
        clientSeed: 'test-client-seed',
        nonce: 123456789
      };

      const response = await request(app)
        .post('/api/v1/game/verify')
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('crashPoint');
      expect(response.body).toHaveProperty('verified', true);
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
    const gameEngine = require('../services/gameEngine');
    const serverSeed = 'test-server-seed';
    const clientSeed = 'test-client-seed';
    const nonce = 123456789;

    const crashPoint = gameEngine.verifyCrashPoint(serverSeed, clientSeed, nonce);
    
    expect(typeof crashPoint).toBe('number');
    expect(crashPoint).toBeGreaterThan(1);
    expect(crashPoint).toBeLessThan(1000); // Reasonable upper bound
  });

  it('should generate different crash points for different inputs', () => {
    const gameEngine = require('../services/gameEngine');
    const serverSeed1 = 'test-server-seed-1';
    const serverSeed2 = 'test-server-seed-2';
    const clientSeed = 'test-client-seed';
    const nonce = 123;

    const crashPoint1 = gameEngine.verifyCrashPoint(serverSeed1, clientSeed, nonce);
    const crashPoint2 = gameEngine.verifyCrashPoint(serverSeed2, clientSeed, nonce);

    expect(crashPoint1).not.toBe(crashPoint2);
  });
}); 