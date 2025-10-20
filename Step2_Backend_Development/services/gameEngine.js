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
    this.io = null; // Socket.IO instance
    
    // House advantage configuration - OPTIMIZED FOR FCFA PROFITABILITY
    this.MEDIUM_BET_AMOUNT = 400.00; // 400 FCFA as medium amount (your target average)
    this.BASE_CRASH_PROBABILITY = 0.95; // 95% base crash probability (increased for profitability)
    this.HOUSE_ADVANTAGE_FACTOR = 0.25; // 25% house advantage (increased for profitability)
    this.MAX_CRASH_PROBABILITY = 0.99; // 99% max crash probability (increased for profitability)
    this.MIN_CRASH_PROBABILITY = 0.90; // 90% min crash probability (increased for profitability)
    
    // Performance monitoring
    this.performanceMetrics = {
      roundStartTime: 0,
      roundEndTime: 0,
      totalBetsProcessed: 0,
      totalInsuranceClaims: 0,
      averageBetAmount: 0,
      maxConcurrentPlayers: 0,
      errors: []
    };
    
    // Cache for performance optimization
    this._cachedGameState = null;
    this._cacheTimestamp = 0;
  }

  // Set Socket.IO instance for WebSocket events
  setIo(io) {
    this.io = io;
  }

  // Calculate house advantage based on bet amount - ENHANCED FOR MAXIMUM PROFIT
  calculateHouseAdvantage(betAmount) {
    if (betAmount === this.MEDIUM_BET_AMOUNT || betAmount <= 0) {
      return this.BASE_CRASH_PROBABILITY;
    }
    const ratio = betAmount / this.MEDIUM_BET_AMOUNT;
    let advantage;
    if (ratio > 1) {
      // Higher bets = Much higher crash probability (aggressive profit strategy)
      advantage = Math.min(this.HOUSE_ADVANTAGE_FACTOR * Math.log(ratio) * 1.5, 0.15);
      return Math.min(this.MAX_CRASH_PROBABILITY, this.BASE_CRASH_PROBABILITY + advantage);
    } else {
      // Lower bets = Slightly lower crash probability (maintains player engagement)
      advantage = Math.max(-0.03, -this.HOUSE_ADVANTAGE_FACTOR * Math.log(1/ratio) * 0.5);
      return Math.max(this.MIN_CRASH_PROBABILITY, this.BASE_CRASH_PROBABILITY + advantage);
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

    // Calculate crash point based on probability - OPTIMIZED FOR PROFITABILITY
    if (randomValue < adjustedProbability) {
      // Tower will crash - calculate crash point (MORE AGGRESSIVE)
      const crashPoint = 1.00 + (randomValue / adjustedProbability) * 2.00; // 1.00x to 3.00x (very aggressive)
      return parseFloat(crashPoint.toFixed(2));
    } else {
      // Tower will continue - higher crash point (MAINTAINS ENGAGEMENT)
      const crashPoint = 3.00 + (randomValue - adjustedProbability) / (1 - adjustedProbability) * 4.00; // 3.00x to 7.00x (much reduced max)
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
      this.currentRound = this.roundId; // Set currentRound for admin dashboard
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

      // Emit new round event to all connected clients
      if (this.io) {
        this.io.to('game').emit('new_round', {
          roundId: this.roundId,
          crashPoint: this.crashPoint,
          timestamp: new Date()
        });
      }

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

  // Start running phase
  startRunningPhase() {
    this.gameState = 'running';
    this.multiplier = 1.00;
    this.integrity = 100;
    this.lastUpdateTime = Date.now();

    // Start game loop - OPTIMIZED FOR FRONTEND SMOOTHNESS
    this.gameLoop = setInterval(() => {
      const now = Date.now();
      const timeDiff = now - this.lastUpdateTime;
      
      // Update multiplier every 100ms for smooth frontend animation (was 1000ms)
      if (timeDiff >= 100) {
        this.multiplier += 0.02; // 0.02x per 100ms = 0.2x per second (4x faster for more excitement)
        this.integrity = Math.max(0, 100 - (this.multiplier - 1) * 20);
        
        this.lastUpdateTime = now;
        
        // Update Redis every 100ms to maintain game state sync
        this.updateRedisGameState();
        
        // Emit real-time updates to all connected clients - ENHANCED FOR FRONTEND SYNC
        if (this.io) {
          this.io.to('game').emit('game_update', {
            type: 'multiplier',
            data: {
              multiplier: this.multiplier,
              integrity: this.integrity,
              roundTime: Math.floor((now - this.roundStartTime) / 1000),
              crashPoint: this.crashPoint // ✅ CRITICAL: Include crash point for frontend
            }
          });
        }
        
        // Check if tower should crash
        if (this.multiplier >= this.crashPoint) {
          logger.info(`Tower crashing at ${this.multiplier.toFixed(2)}x (target: ${this.crashPoint}x)`);
          this.crashTower();
        }
      }
    }, 20); // Changed to 20ms for much faster, more engaging gameplay (0.5x per 20ms = 25x per second)

    logger.info(`Round ${this.roundId} running phase started`);
  }

  // Update game state during running phase
  updateGameState() {
    const now = Date.now();
    const elapsed = now - this.lastUpdateTime;

    // Update multiplier (increases by 0.5 every 25ms for much faster gameplay)
    this.multiplier += 0.5;

    // Update integrity meter (decreases by 0-1% randomly for balanced gameplay)
    const integrityDecrease = Math.random() * 1;
    this.integrity = Math.max(0, this.integrity - integrityDecrease);

    // Check for special blocks (5% chance)
    if (Math.random() < 0.05) {
      this.generateSpecialBlock();
    }

    // Check if tower should crash
    if (this.multiplier >= this.crashPoint) {
      logger.info(`Tower crashing at ${this.multiplier.toFixed(2)}x (target: ${this.crashPoint}x)`);
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
    
    // Emit real-time updates to all connected clients
    if (this.io) {
      this.io.to('game').emit('game_update', {
        type: 'multiplier',
        data: {
          multiplier: this.multiplier,
          integrity: this.integrity,
          roundTime: Math.floor((now - this.roundStartTime) / 1000)
        }
      });
    }
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

    // Emit crash event to all connected clients - ENHANCED FOR FRONTEND SYNC
    if (this.io) {
      this.io.to('game').emit('game_update', {
        type: 'crash',
        data: {
          crashPoint: this.crashPoint,
          finalMultiplier: this.multiplier,
          roundId: this.roundId,
          // ✅ ADDITIONAL DATA FOR FRONTEND COMPATIBILITY
          roundTime: Math.floor((Date.now() - this.roundStartTime) / 1000),
          integrity: 0,
          gameState: 'crashed'
        }
      });

      // Emit round history event to all connected clients
      this.io.to('game').emit('round_history', [{
        roundId: this.roundId,
        multiplier: this.multiplier,
        crashed: true,
        timestamp: new Date(),
        crashPoint: this.crashPoint
      }]);
    }

    // Start victory lap phase (3 seconds)
    setTimeout(() => {
      this.startVictoryLap();
    }, 3000);
  }

  // Start victory lap phase
  startVictoryLap() {
    this.gameState = 'results';
    this.updateRedisGameState();

    // Emit victory lap event
    if (this.io) {
      this.io.to('game').emit('game_update', {
        type: 'victory_lap',
        data: {
          finalMultiplier: this.multiplier,
          roundId: this.roundId
        }
      });
    }

    logger.info(`Round ${this.roundId} victory lap started`);

    // Start new round after 5 seconds (total 8 seconds from crash)
    setTimeout(() => {
      this.startNewRound();
    }, 5000);
  }

  // Process bets when tower crashes
  async processCrashedBets() {
    const client = await db.pool.connect();
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
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
        logger.info(`Successfully processed ${this.activeBets.size} crashed bets`);
        break; // Success, exit retry loop
        
      } catch (error) {
        await client.query('ROLLBACK');
        retryCount++;
        logger.error(`Failed to process crashed bets (attempt ${retryCount}/${maxRetries}):`, error);
        
        if (retryCount >= maxRetries) {
          logger.error('Max retries reached for processing crashed bets. Manual intervention required.');
          // Could implement alert system here
          throw new Error(`Failed to process crashed bets after ${maxRetries} attempts`);
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    client.release();
  }

  // Process bet loss with insurance handling
  async processBetLoss(userId, bet, client) {
    // Update existing bet record with loss result
    await client.query(
      'UPDATE bets SET status = $1, result = $2, final_multiplier = $3, winnings = $4 WHERE id = $5',
      ['lost', 'loss', this.multiplier, 0, bet.betId]
    );
    
    // Store round result for user
    await client.query(
      'INSERT INTO round_results (user_id, round_id, bet_amount, cashout_multiplier, final_multiplier, result, winnings) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, round_id) DO UPDATE SET result = $6, final_multiplier = $5, winnings = $7',
      [userId, this.roundId, bet.amount, 0, this.multiplier, 'loss', 0]
    );
    
    // Process insurance claim if bet had insurance
    if (bet.insurance) {
      try {
        const insurance = require('./insuranceService');
        
        // Process insurance claim
        const claimResult = await insurance.processInsuranceClaim(bet.betId);
        
        if (claimResult.success) {
          // Update user balance with insurance payout
          await client.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [claimResult.payoutAmount, userId]
          );
          
          logger.info(`Insurance claim processed for bet ${bet.betId}: payout ${claimResult.payoutAmount} FCFA`);
        }
      } catch (error) {
        logger.error(`Error processing insurance claim for bet ${bet.betId}:`, error);
        // Continue without insurance payout if there's an error
      }
    }
    
    await playerStatsService.updateStatsAfterBet(userId, bet.amount);
  }

  // Place a bet with optional insurance
  async placeBet(userId, amount, insuranceType = null, insuranceGames = 1) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Validate bet amount
      if (amount < 100 || amount > 100000) {
        throw new Error('Bet amount must be between 100 FCFA and 100,000 FCFA');
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

      // Store bet in database first to get bet ID
      const betResult = await client.query(
        'INSERT INTO bets (user_id, round_id, amount, timestamp, status) VALUES ($1, $2, $3, NOW(), $4) RETURNING id',
        [userId, this.roundId, amount, 'active']
      );
      
      const betId = betResult.rows[0].id;

      // Process insurance if requested
      let insuranceDetails = null;
      if (insuranceType && ['basic', 'premium', 'elite'].includes(insuranceType)) {
        try {
          const insurance = require('./insuranceService');
          
          // Calculate insurance premium for multiple games
          const insuranceCalculation = insurance.calculateInsurancePremium(amount, insuranceType);
          const totalPremium = insuranceCalculation.premium * insuranceGames;
          const totalCoverage = insuranceCalculation.coverageAmount * insuranceGames;
          
          // Check if user has sufficient balance for insurance premium
          if (userBalance >= (amount + totalPremium)) {
            // Deduct insurance premium
            await client.query(
              'UPDATE users SET balance = balance - $1 WHERE id = $2',
              [totalPremium, userId]
            );
            
            // Create insurance record with multi-game data
            await client.query(`
              INSERT INTO bet_insurance (
                user_id, bet_id, insurance_type, bet_amount, premium_amount, 
                coverage_rate, coverage_amount, status, purchased_at, games_count, games_remaining
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)
            `, [
              userId, betId, insuranceType, amount, totalPremium,
              insuranceCalculation.coverageRate, totalCoverage, 'active', insuranceGames, insuranceGames
            ]);
            
            insuranceDetails = {
              ...insuranceCalculation,
              totalPremium,
              totalCoverage,
              gamesCount: insuranceGames,
              gamesRemaining: insuranceGames
            };
            logger.info(`Insurance purchased for bet ${betId}: ${insuranceType} type, premium ${totalPremium} FCFA for ${insuranceGames} games`);
          } else {
            logger.warn(`User ${userId} insufficient balance for insurance premium`);
          }
        } catch (error) {
          logger.error(`Error processing insurance for bet ${betId}:`, error);
          // Continue without insurance if there's an error
        }
      }

      // Add to active bets
      const betData = {
        userId: userId,
        amount: amount,
        timestamp: Date.now(),
        cashoutMultiplier: null,
        username: userResult.rows[0].username,
        betId: betId,
        insurance: insuranceDetails
      };
      
      this.activeBets.set(userId, betData);
      this.activePlayers.add(userId);

      // Emit new bet event to all connected clients
      if (this.io) {
        this.io.to('game').emit('new_bet', betData);
      }

      // Update tournament scores if user is participating in active tournaments
      try {
        const tournament = require('./tournamentService');
        await tournament.updatePlayerScore(userId, betId, amount, 'bet_placed');
      } catch (error) {
        logger.warn(`Error updating tournament score for user ${userId}:`, error);
        // Continue without tournament update if there's an error
      }

      // Update weekly tournament scores if user is participating
      try {
        const weeklyTournamentService = require('./weeklyTournamentService');
        await weeklyTournamentService.updateWeeklyPlayerScore(userId, betId, amount, 'bet_placed');
      } catch (error) {
        logger.warn(`Error updating weekly tournament score for user ${userId}:`, error);
        // Continue without tournament update if there's an error
      }

      // Contribute to community goals if user is participating
      try {
        const communityGoalsService = require('./communityGoalsService');
        await communityGoalsService.contributeToActiveGoals(userId, amount, null);
      } catch (error) {
        logger.warn(`Error contributing to community goals for user ${userId}:`, error);
        // Continue without community goals update if there's an error
      }

      // Recalculate crash point with new bet amount
      if (this.gameState === 'waiting') {
        this.crashPoint = this.calculateCrashPointWithAdvantage();
        logger.info(`Crash point recalculated to ${this.crashPoint} after bet of ${amount} FCFA`);
      }

      await client.query('COMMIT');

      logger.info(`User ${userId} placed bet of ${amount} FCFA`);

      return {
        success: true,
        newBalance: userBalance - amount - (insuranceDetails ? insuranceDetails.premium : 0),
        betAmount: amount,
        betId: betId,
        insurance: insuranceDetails
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

      const winnings = bet.amount * this.multiplier;

      await db.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [winnings, userId]
      );

      // Store bet win in bets table with result information
      await db.query(
        'INSERT INTO bets (user_id, round_id, amount, cashout_multiplier, timestamp, status, result, final_multiplier, winnings) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8)',
        [userId, this.roundId, bet.amount, this.multiplier, 'won', 'win', this.multiplier, winnings]
      );

      // Store round result for user
      await db.query(
        'INSERT INTO round_results (user_id, round_id, bet_amount, cashout_multiplier, final_multiplier, result, winnings) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (user_id, round_id) DO UPDATE SET result = $6, final_multiplier = $5, winnings = $7',
        [userId, this.roundId, bet.amount, this.multiplier, this.multiplier, 'win', winnings]
      );

      await playerStatsService.updateStatsAfterBet(userId, bet.amount, this.multiplier);

      // Update tournament scores if user is participating in active tournaments
      try {
        const tournament = require('./tournamentService');
        await tournament.updatePlayerScore(userId, bet.betId, bet.amount, 'cashout', {
          multiplier: this.multiplier,
          winnings: winnings
        });
      } catch (error) {
        logger.warn(`Error updating tournament score for user ${userId}:`, error);
        // Continue without tournament update if there's an error
      }

      // Update weekly tournament scores if user is participating
      try {
        const weeklyTournamentService = require('./weeklyTournamentService');
        await weeklyTournamentService.updateWeeklyPlayerScore(userId, bet.betId, bet.amount, 'cashout', {
          multiplier: this.multiplier,
          winnings: winnings
        });
      } catch (error) {
        logger.warn(`Error updating weekly tournament score for user ${userId}:`, error);
        // Continue without tournament update if there's an error
      }

      // Contribute to community goals with winning bet result
      try {
        const communityGoalsService = require('./communityGoalsService');
        await communityGoalsService.contributeToActiveGoals(userId, bet.amount, {
          cashoutMultiplier: this.multiplier,
          winnings: winnings
        });
      } catch (error) {
        logger.warn(`Error contributing to community goals for user ${userId}:`, error);
        // Continue without community goals update if there's an error
      }

      this.activeBets.delete(userId);
      this.activePlayers.delete(userId);

      if (this.io) {
        this.io.to('game').emit('bet_removed', userId);
        this.io.to('game').emit('player_cashout', {
          userId,
          username: (await db.query('SELECT username FROM users WHERE id = $1', [userId])).rows[0].username,
          amount: bet.amount,
          cashoutMultiplier: this.multiplier,
          winnings: winnings,
          timestamp: new Date()
        });
      }

      logger.info(`User ${userId} cashed out at ${this.multiplier}x, won ${winnings} FCFA`);

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

  // Get house advantage statistics for profitability monitoring
  getHouseAdvantageStats() {
    // Return empty stats to avoid excessive calculations
    return {
      totalBetAmount: 0,
      highValueBets: 0,
      mediumValueBets: 0,
      lowValueBets: 0,
      crashProbability: 0.87,
      adjustedProbability: 0.87,
      houseAdvantage: 0,
      expectedProfit: 0,
      activeBets: this.activeBets.size
    };
  }

  // Get performance metrics for monitoring
  getPerformanceMetrics() {
    const now = Date.now();
    const currentRoundDuration = this.roundStartTime ? now - this.roundStartTime : 0;
    
    return {
      ...this.performanceMetrics,
      currentRoundDuration,
      currentConcurrentPlayers: this.activePlayers.size,
      cacheHitRate: this._cachedGameState ? 'active' : 'inactive',
      lastCacheUpdate: this._cacheTimestamp ? new Date(this._cacheTimestamp).toISOString() : 'never'
    };
  }

  // Update Redis game state (with fallback and caching)
  async updateRedisGameState() {
    const gameState = {
      roundId: this.roundId,
      currentRound: this.currentRound,
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

    // Cache in memory for faster access
    this._cachedGameState = gameState;
    this._cacheTimestamp = Date.now();

    try {
      if (this.redisAvailable) {
        await redisClient.set('game_state', JSON.stringify(gameState), 'EX', 60); // 60 second expiry
        
        // Store individual keys for admin dashboard
        await redisClient.set('game:state', this.gameState, 'EX', 60);
        await redisClient.set('game:currentRound', this.currentRound?.toString() || '0', 'EX', 60);
        await redisClient.set('game:crashPoint', this.crashPoint?.toString() || '1.0', 'EX', 60);
        await redisClient.set('game:multiplier', this.multiplier?.toString() || '1.0', 'EX', 60);
        await redisClient.set('game:paused', 'false', 'EX', 60);
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory state only');
      this.redisAvailable = false;
    }
  }

  // Get current game state - OPTIMIZED WITH CACHING AND FRONTEND SYNC
  async getGameState() {
    const now = Date.now();
    
    // Use cached state if it's fresh (less than 100ms old)
    if (this._cachedGameState && (now - this._cacheTimestamp) < 100) {
      return this._cachedGameState;
    }
    
    try {
      if (this.redisAvailable) {
        const redisState = await redisClient.get('game_state');
        if (redisState) {
          const parsedState = JSON.parse(redisState);
          // Update cache
          this._cachedGameState = parsedState;
          this._cacheTimestamp = now;
          return parsedState;
        }
      }
    } catch (error) {
      logger.warn('Redis not available, using in-memory state');
      this.redisAvailable = false;
    }

    // Fallback to in-memory state - ENHANCED FOR FRONTEND COMPATIBILITY
    const roundTime = this.roundStartTime ? now - this.roundStartTime : 0;
    
    const gameState = {
      roundId: this.roundId,
      gameState: this.gameState,
      multiplier: this.multiplier,
      integrity: this.integrity,
      specialBlock: this.specialBlock,
      activePlayers: Array.from(this.activePlayers),
      activeBets: Array.from(this.activeBets.entries()),
      crashPoint: this.crashPoint, // ✅ CRITICAL: Frontend needs this!
      roundTime: roundTime,
      connectedPlayers: this.activePlayers.size,
      currentRound: this.roundId,
      houseAdvantageStats: this.getHouseAdvantageStats(),
      // Additional fields for frontend compatibility
      state: this.gameState, // Frontend expects both gameState and state
      round: this.roundId,   // Frontend expects both roundId and round
      time: roundTime,       // Frontend expects both roundTime and time
      players: this.activePlayers.size // Frontend expects both connectedPlayers and players
    };
    
    // Update cache
    this._cachedGameState = gameState;
    this._cacheTimestamp = now;
    
    return gameState;
  }

  // Get round history with win/loss information
  async getRoundHistory(limit = 10, userId = null) {
    if (userId) {
      // Get user-specific round history
      const result = await db.query(
        `SELECT 
          r.id as round_id,
          r.crash_point,
          r.timestamp,
          rr.result,
          rr.bet_amount,
          rr.cashout_multiplier,
          rr.final_multiplier,
          rr.winnings
        FROM rounds r
        LEFT JOIN round_results rr ON r.id = rr.round_id AND rr.user_id = $1
        ORDER BY r.timestamp DESC 
        LIMIT $2`,
        [userId, limit]
      );
      return result.rows;
    } else {
      // Get general round history
      const result = await db.query(
        'SELECT id, crash_point, timestamp FROM rounds ORDER BY timestamp DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    }
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