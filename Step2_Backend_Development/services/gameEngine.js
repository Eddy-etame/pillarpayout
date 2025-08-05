const crypto = require('crypto');
const db = require('../db');
const redisClient = require('../redisClient');
const logger = require('../utils/logger');
const playerStatsService = require('./playerStatsService');

class GameEngine {
  constructor() {
    this.currentRound = null;
    this.gameState = 'waiting'; // waiting, running, crashed, results
    this.multiplier = 1.00;
    this.integrity = 100;
    this.specialBlock = null;
    this.activePlayers = new Set();
    this.activeBets = new Map();
    this.roundTimer = null;
    this.gameLoop = null;
    this.roundId = null;
    this.serverSeed = null;
    this.clientSeed = null;
    this.nonce = 0;
    this.crashPoint = null;
    this.roundStartTime = null;
    this.lastUpdateTime = null;
    this.redisAvailable = false;
    
    // House advantage configuration
    this.MEDIUM_BET_AMOUNT = 2.00; // $2 USD as medium amount
    this.BASE_CRASH_PROBABILITY = 0.85; // 85% base crash probability
    this.HOUSE_ADVANTAGE_FACTOR = 0.15; // 15% house advantage
    this.MAX_CRASH_PROBABILITY = 0.95; // 95% max crash probability
    this.MIN_CRASH_PROBABILITY = 0.75; // 75% min crash probability
  }

  // Calculate house advantage based on bet amount
  calculateHouseAdvantage(betAmount) {
    const ratio = betAmount / this.MEDIUM_BET_AMOUNT;
    
    if (ratio >= 1) {
      // Higher bets = higher crash probability (house advantage)
      const advantage = Math.min(this.HOUSE_ADVANTAGE_FACTOR * Math.log(ratio + 1), 0.10);
      return this.BASE_CRASH_PROBABILITY + advantage;
    } else {
      // Lower bets = slightly lower crash probability (still house advantage)
      const advantage = Math.max(-0.05, -this.HOUSE_ADVANTAGE_FACTOR * Math.log(1/ratio + 1));
      return this.BASE_CRASH_PROBABILITY + advantage;
    }
  }

  // Calculate crash point with house advantage
  calculateCrashPointWithAdvantage() {
    const combined = this.serverSeed + this.clientSeed + this.nonce.toString();
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    const decimal = parseInt(hash.substring(0, 8), 16);
    const randomValue = (decimal % 10000) / 10000; // 0 to 1

    // Get total bet amount for this round
    let totalBetAmount = 0;
    for (const [userId, bet] of this.activeBets) {
      totalBetAmount += bet.amount;
    }

    // Calculate house advantage based on total bets
    const crashProbability = this.calculateHouseAdvantage(totalBetAmount);
    
    // Ensure probability is within bounds
    const adjustedProbability = Math.max(
      this.MIN_CRASH_PROBABILITY,
      Math.min(this.MAX_CRASH_PROBABILITY, crashProbability)
    );

    // Calculate crash point based on probability
    if (randomValue < adjustedProbability) {
      // Tower will crash - calculate crash point
      const crashPoint = 1.00 + (randomValue / adjustedProbability) * 4.00; // 1.00x to 5.00x
      return parseFloat(crashPoint.toFixed(2));
    } else {
      // Tower will continue - higher crash point
      const crashPoint = 5.00 + (randomValue - adjustedProbability) / (1 - adjustedProbability) * 15.00; // 5.00x to 20.00x
      return parseFloat(crashPoint.toFixed(2));
    }
  }

  // Initialize a new round
  async startNewRound() {
    try {
      // Generate provably fair seeds
      this.serverSeed = crypto.randomBytes(32).toString('hex');
      this.clientSeed = crypto.randomBytes(32).toString('hex');
      this.nonce = Math.floor(Math.random() * 1000000); // Use smaller integer for database compatibility

      // Calculate crash point using house advantage algorithm
      this.crashPoint = this.calculateCrashPointWithAdvantage();

      // Create round in database
      const roundResult = await db.query(
        'INSERT INTO rounds (crash_point, server_seed, client_seed, nonce, timestamp) VALUES ($1, $2, $3, $4, NOW()) RETURNING id',
        [this.crashPoint, this.serverSeed, this.clientSeed, this.nonce]
      );

      this.roundId = roundResult.rows[0].id;
      this.roundStartTime = Date.now();
      this.lastUpdateTime = Date.now();

      // Reset game state
      this.gameState = 'waiting';
      this.multiplier = 1.00;
      this.integrity = 100;
      this.specialBlock = null;
      this.activePlayers.clear();
      this.activeBets.clear();

      // Store game state in Redis (if available)
      await this.updateRedisGameState();

      // Start waiting phase (5 seconds)
      this.roundTimer = setTimeout(() => {
        this.startRunningPhase();
      }, 5000);

      logger.info(`New round ${this.roundId} started with crash point: ${this.crashPoint} (House advantage applied)`);

      return {
        roundId: this.roundId,
        gameState: this.gameState,
        multiplier: this.multiplier,
        integrity: this.integrity,
        crashPoint: this.crashPoint,
        serverSeed: this.serverSeed,
        clientSeed: this.clientSeed,
        nonce: this.nonce
      };
    } catch (error) {
      logger.error('Error starting new round:', error);
      throw error;
    }
  }

  // Calculate crash point using provably fair algorithm (legacy method)
  // REMOVED: Duplicate calculateCrashPoint() method
  // Using calculateCrashPointWithAdvantage() instead for house edge

  // Start the running phase
  startRunningPhase() {
    this.gameState = 'running';
    this.lastUpdateTime = Date.now();

    // Start game loop (1000ms intervals for proper timing)
    this.gameLoop = setInterval(() => {
      this.updateGameState();
    }, 1000);

    logger.info(`Round ${this.roundId} running phase started`);
  }

  // Update game state during running phase
  updateGameState() {
    const now = Date.now();
    const elapsed = now - this.lastUpdateTime;

    // Update multiplier (increases by 0.05 every 100ms)
    this.multiplier += 0.05;

    // Update integrity meter (decreases by 0-2% randomly)
    const integrityDecrease = Math.random() * 2;
    this.integrity = Math.max(0, this.integrity - integrityDecrease);

    // Check for special blocks (5% chance)
    if (Math.random() < 0.05) {
      this.generateSpecialBlock();
    }

    // Check if tower should crash
    if (this.multiplier >= this.crashPoint) {
      this.crashTower();
      return;
    }

    // Check if integrity is too low (emergency crash)
    if (this.integrity <= 0) {
      this.crashTower();
      return;
    }

    this.lastUpdateTime = now;
    this.updateRedisGameState();
  }

  // Generate special block
  generateSpecialBlock() {
    const blockTypes = ['boost', 'stability', 'bonus'];
    const randomType = blockTypes[Math.floor(Math.random() * blockTypes.length)];

    this.specialBlock = {
      type: randomType,
      timestamp: Date.now(),
      multiplier: this.multiplier
    };

    logger.info(`Special block generated: ${randomType} at ${this.multiplier}x`);
  }

  // Crash the tower
  async crashTower() {
    this.gameState = 'crashed';
    clearInterval(this.gameLoop);

    // Process all active bets
    await this.processCrashedBets();

    // Update round in database
    await db.query(
      'UPDATE rounds SET end_time = NOW() WHERE id = $1',
      [this.roundId]
    );

    // Store final game state
    await this.updateRedisGameState();

    logger.info(`Round ${this.roundId} crashed at ${this.multiplier}x`);

    // Start results phase (3 seconds)
    setTimeout(() => {
      this.startResultsPhase();
    }, 3000);
  }

  // Process bets when tower crashes
  async processCrashedBets() {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Process all bets with rollback capability
      for (const [userId, bet] of this.activeBets) {
        try {
          await this.processBetLoss(userId, bet, client);
        } catch (error) {
          logger.error(`Failed to process bet for user ${userId}:`, error);
          // Continue with other bets, don't fail entire round
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to process crashed bets:', error);
      // Implement retry mechanism or manual intervention
    } finally {
      client.release();
    }
  }

  // Process bet loss
  async processBetLoss(userId, bet, client = null) {
    const dbClient = client || db;
    
    await dbClient.query(
      'UPDATE users SET balance = balance - $1 WHERE id = $2',
      [bet.amount, userId]
    );

    // Record bet in database
    await dbClient.query(
      'INSERT INTO bets (user_id, round_id, amount, cashout_multiplier, timestamp) VALUES ($1, $2, $3, $4, NOW())',
      [userId, this.roundId, bet.amount, null]
    );

    // Update player stats
    await playerStatsService.updateStatsAfterBet(userId, bet.amount, null);

    logger.info(`User ${userId} lost bet of $${bet.amount}`);
  }

  // Start results phase
  startResultsPhase() {
    this.gameState = 'results';
    this.updateRedisGameState();

    // Start new round after 2 seconds
    setTimeout(() => {
      this.startNewRound();
    }, 2000);
  }

  // Place a bet
  async placeBet(userId, amount) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Validate bet amount
      if (amount < 1 || amount > 1000) {
        throw new Error('Bet amount must be between $1 and $1000');
      }

      // Check if user has sufficient balance with row lock
      const userResult = await client.query(
        'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userBalance = parseFloat(userResult.rows[0].balance);
      if (userBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Deduct bet amount from balance
      await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [amount, userId]
      );

      // Add to active bets
      this.activeBets.set(userId, {
        amount: amount,
        timestamp: Date.now(),
        cashoutMultiplier: null
      });

      this.activePlayers.add(userId);

      // Recalculate crash point with new bet amount
      if (this.gameState === 'waiting') {
        this.crashPoint = this.calculateCrashPointWithAdvantage();
        logger.info(`Crash point recalculated to ${this.crashPoint} after bet of $${amount}`);
      }

      await client.query('COMMIT');

      logger.info(`User ${userId} placed bet of $${amount}`);

      return {
        success: true,
        newBalance: userBalance - amount,
        betAmount: amount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error placing bet for user ${userId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Cash out a bet
  async cashOut(userId) {
    try {
      const bet = this.activeBets.get(userId);
      if (!bet) {
        throw new Error('No active bet found');
      }

      if (this.gameState !== 'running') {
        throw new Error('Cannot cash out - game not running');
      }

      // Calculate winnings
      const winnings = bet.amount * this.multiplier;

      // Update user balance
      await db.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [winnings, userId]
      );

      // Record bet in database
      await db.query(
        'INSERT INTO bets (user_id, round_id, amount, cashout_multiplier, timestamp) VALUES ($1, $2, $3, $4, NOW())',
        [userId, this.roundId, bet.amount, this.multiplier]
      );

      // Update player stats
      await playerStatsService.updateStatsAfterBet(userId, bet.amount, this.multiplier);

      // Remove from active bets
      this.activeBets.delete(userId);
      this.activePlayers.delete(userId);

      logger.info(`User ${userId} cashed out at ${this.multiplier}x, won $${winnings}`);

      return {
        success: true,
        cashoutMultiplier: this.multiplier,
        winnings: winnings,
        betAmount: bet.amount
      };
    } catch (error) {
      logger.error(`Error cashing out for user ${userId}:`, error);
      throw error;
    }
  }

  // Get house advantage statistics
  getHouseAdvantageStats() {
    let totalBetAmount = 0;
    for (const [userId, bet] of this.activeBets) {
      totalBetAmount += bet.amount;
    }

    const crashProbability = this.calculateHouseAdvantage(totalBetAmount);
    const adjustedProbability = Math.max(
      this.MIN_CRASH_PROBABILITY,
      Math.min(this.MAX_CRASH_PROBABILITY, crashProbability)
    );

    return {
      totalBetAmount: parseFloat(totalBetAmount.toFixed(2)),
      mediumBetAmount: this.MEDIUM_BET_AMOUNT,
      baseCrashProbability: this.BASE_CRASH_PROBABILITY,
      adjustedCrashProbability: parseFloat(adjustedProbability.toFixed(4)),
      houseAdvantage: parseFloat((adjustedProbability - this.BASE_CRASH_PROBABILITY).toFixed(4)),
      activeBets: this.activeBets.size
    };
  }

  // Update Redis game state (with fallback)
  async updateRedisGameState() {
    const gameState = {
      roundId: this.roundId,
      gameState: this.gameState,
      multiplier: this.multiplier,
      integrity: this.integrity,
      specialBlock: this.specialBlock,
      activePlayers: Array.from(this.activePlayers),
      activeBets: Array.from(this.activeBets.entries()),
      crashPoint: this.crashPoint,
      serverSeed: this.serverSeed,
      clientSeed: this.clientSeed,
      nonce: this.nonce,
      roundStartTime: this.roundStartTime,
      lastUpdateTime: this.lastUpdateTime,
      houseAdvantageStats: this.getHouseAdvantageStats()
    };

    try {
      if (this.redisAvailable) {
        await redisClient.set('game_state', JSON.stringify(gameState));
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory state only');
      this.redisAvailable = false;
    }
  }

  // Get current game state
  async getGameState() {
    try {
      if (this.redisAvailable) {
        const redisState = await redisClient.get('game_state');
        if (redisState) {
          return JSON.parse(redisState);
        }
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory state');
      this.redisAvailable = false;
    }

    // Fallback to in-memory state
    return {
      roundId: this.roundId,
      gameState: this.gameState,
      multiplier: this.multiplier,
      integrity: this.integrity,
      specialBlock: this.specialBlock,
      activePlayers: Array.from(this.activePlayers),
      activeBets: Array.from(this.activeBets.entries()),
      houseAdvantageStats: this.getHouseAdvantageStats()
    };
  }

  // Get round history
  async getRoundHistory(limit = 10) {
    const result = await db.query(
      'SELECT id, crash_point, timestamp FROM rounds ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );

    return result.rows;
  }

  // Verify provably fair result
  verifyCrashPoint(serverSeed, clientSeed, nonce) {
    const combined = serverSeed + clientSeed + nonce.toString();
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    const decimal = parseInt(hash.substring(0, 8), 16);
    const crashPoint = (decimal % 10000) / 1000 + 1;
    return parseFloat(crashPoint.toFixed(2));
  }

  // Initialize game engine
  async initialize() {
    try {
      // Test Redis connection
      try {
        await redisClient.ping();
        this.redisAvailable = true;
        await redisClient.del('game_state');
        logger.info('Redis connection established');
      } catch (error) {
        logger.warn('Redis not available, using in-memory state only');
        this.redisAvailable = false;
      }

      // Start first round
      await this.startNewRound();

      logger.info('Game engine initialized successfully with house advantage system');
    } catch (error) {
      logger.error('Error initializing game engine:', error);
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
  }
}

module.exports = new GameEngine(); 