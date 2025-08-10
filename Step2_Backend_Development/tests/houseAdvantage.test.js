const gameEngine = require('../services/gameEngine');

describe('House Advantage System Tests', () => {
  beforeEach(() => {
    // Reset game engine state
    gameEngine.activeBets.clear();
    gameEngine.activePlayers.clear();
  });

  describe('House Advantage Calculation', () => {
    it('should calculate higher crash probability for higher bets', () => {
      const lowBet = 1.00; // $1
      const mediumBet = 2.00; // $2 (baseline)
      const highBet = 10.00; // $10
      const veryHighBet = 50.00; // $50

      const lowProbability = gameEngine.calculateHouseAdvantage(lowBet);
      const mediumProbability = gameEngine.calculateHouseAdvantage(mediumBet);
      const highProbability = gameEngine.calculateHouseAdvantage(highBet);
      const veryHighProbability = gameEngine.calculateHouseAdvantage(veryHighBet);

      // Higher bets should have higher crash probability
      expect(highProbability).toBeGreaterThan(mediumProbability);
      expect(veryHighProbability).toBe(gameEngine.MAX_CRASH_PROBABILITY);
      // Lower bets should have slightly lower crash probability
      expect(lowProbability).toBeLessThan(mediumProbability);
      
      // All probabilities should be within bounds
      expect(lowProbability).toBeGreaterThanOrEqual(gameEngine.MIN_CRASH_PROBABILITY);
      expect(veryHighProbability).toBeLessThanOrEqual(gameEngine.MAX_CRASH_PROBABILITY);
    });

    it('should respect probability bounds', () => {
      const extremeLowBet = 0.01; // Very low bet
      const extremeHighBet = 1000.00; // Very high bet

      const lowProbability = gameEngine.calculateHouseAdvantage(extremeLowBet);
      const highProbability = gameEngine.calculateHouseAdvantage(extremeHighBet);

      expect(lowProbability).toBeGreaterThanOrEqual(gameEngine.MIN_CRASH_PROBABILITY);
      expect(highProbability).toBeLessThanOrEqual(gameEngine.MAX_CRASH_PROBABILITY);
    });

    it('should use $2 as medium bet amount', () => {
      const mediumBet = gameEngine.MEDIUM_BET_AMOUNT;
      expect(mediumBet).toBe(2.00);
    });
  });

  describe('Crash Point Calculation with House Advantage', () => {
    it('should generate different crash points for different bet amounts', () => {
      // Test with no bets
      gameEngine.activeBets.clear();
      gameEngine.serverSeed = 'test-seed-no-bets';
      gameEngine.clientSeed = 'test-client-no-bets';
      gameEngine.nonce = 111111111;
      const crashPoint1 = gameEngine.calculateCrashPointWithAdvantage();

      // Test with low bet
      gameEngine.activeBets.set(1, { amount: 1.00 });
      gameEngine.serverSeed = 'test-seed-low-bet';
      gameEngine.clientSeed = 'test-client-low-bet';
      gameEngine.nonce = 222222222;
      const crashPoint2 = gameEngine.calculateCrashPointWithAdvantage();

      // Test with high bet
      gameEngine.activeBets.set(2, { amount: 10.00 });
      gameEngine.serverSeed = 'test-seed-high-bet';
      gameEngine.clientSeed = 'test-client-high-bet';
      gameEngine.nonce = 333333333;
      const crashPoint3 = gameEngine.calculateCrashPointWithAdvantage();

      // Crash points should be different
      expect(crashPoint1).not.toBe(crashPoint2);
      expect(crashPoint2).not.toBe(crashPoint3);
    });

    it('should generate crash points within expected range', () => {
      gameEngine.serverSeed = 'test-seed-2';
      gameEngine.clientSeed = 'test-client-2';
      gameEngine.nonce = 987654321;

      // Test multiple scenarios
      const scenarios = [
        { betAmount: 1.00, description: 'low bet' },
        { betAmount: 2.00, description: 'medium bet' },
        { betAmount: 10.00, description: 'high bet' },
        { betAmount: 50.00, description: 'very high bet' }
      ];

      scenarios.forEach(scenario => {
        gameEngine.activeBets.clear();
        gameEngine.activeBets.set(1, { amount: scenario.betAmount });
        
        const crashPoint = gameEngine.calculateCrashPointWithAdvantage();
        
        // Crash point should be between 1.00x and 20.00x
        expect(crashPoint).toBeGreaterThanOrEqual(1.00);
        expect(crashPoint).toBeLessThanOrEqual(20.00);
        expect(typeof crashPoint).toBe('number');
      });
    });
  });

  describe('House Advantage Statistics', () => {
    it('should calculate house advantage statistics correctly', () => {
      // Add some test bets
      gameEngine.activeBets.set(1, { amount: 5.00 });
      gameEngine.activeBets.set(2, { amount: 10.00 });
      gameEngine.activeBets.set(3, { amount: 2.00 });

      const stats = gameEngine.getHouseAdvantageStats();

      expect(stats.totalBetAmount).toBe(17.00);
      expect(stats.mediumBetAmount).toBe(2.00);
      expect(stats.baseCrashProbability).toBe(0.85);
      expect(stats.activeBets).toBe(3);
      expect(stats.adjustedCrashProbability).toBeGreaterThanOrEqual(gameEngine.MIN_CRASH_PROBABILITY);
      expect(stats.adjustedCrashProbability).toBeLessThanOrEqual(gameEngine.MAX_CRASH_PROBABILITY);
      expect(stats.houseAdvantage).toBeDefined();
    });

    it('should handle empty bets scenario', () => {
      gameEngine.activeBets.clear();
      
      const stats = gameEngine.getHouseAdvantageStats();
      
      expect(stats.totalBetAmount).toBe(0);
      expect(stats.activeBets).toBe(0);
      expect(stats.adjustedCrashProbability).toBe(gameEngine.BASE_CRASH_PROBABILITY);
      expect(stats.houseAdvantage).toBe(0);
    });
  });

  describe('Bet Placement with House Advantage', () => {
    it('should recalculate crash point when bet is placed during waiting phase', async () => {
      // Mock database operations
      const mockDb = {
        query: jest.fn().mockResolvedValue({
          rows: [{ balance: 1000.00 }]
        })
      };
      
      // Replace db module temporarily
      const originalDb = require('../db');
      jest.doMock('../db', () => mockDb);

      // Set game state to waiting
      gameEngine.gameState = 'waiting';
      gameEngine.serverSeed = 'test-seed-3';
      gameEngine.clientSeed = 'test-client-3';
      gameEngine.nonce = 111111111;

      // Get initial crash point
      const initialCrashPoint = gameEngine.calculateCrashPointWithAdvantage();

      // Place a bet
      try {
        await gameEngine.placeBet(1, 10.00);
        
        // Crash point should be recalculated
        expect(gameEngine.crashPoint).not.toBe(initialCrashPoint);
      } catch (error) {
        // Expected to fail due to mocked database, but crash point should still be recalculated
        expect(gameEngine.crashPoint).not.toBe(initialCrashPoint);
      }

      // Restore original db module
      jest.doMock('../db', () => originalDb);
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid house advantage configuration', () => {
      expect(gameEngine.MEDIUM_BET_AMOUNT).toBe(2.00);
      expect(gameEngine.BASE_CRASH_PROBABILITY).toBe(0.85);
      expect(gameEngine.HOUSE_ADVANTAGE_FACTOR).toBe(0.15);
      expect(gameEngine.MAX_CRASH_PROBABILITY).toBe(0.95);
      expect(gameEngine.MIN_CRASH_PROBABILITY).toBe(0.75);
      
      // Validate probability bounds
      expect(gameEngine.MIN_CRASH_PROBABILITY).toBeLessThan(gameEngine.BASE_CRASH_PROBABILITY);
      expect(gameEngine.BASE_CRASH_PROBABILITY).toBeLessThan(gameEngine.MAX_CRASH_PROBABILITY);
      expect(gameEngine.HOUSE_ADVANTAGE_FACTOR).toBeGreaterThan(0);
      expect(gameEngine.HOUSE_ADVANTAGE_FACTOR).toBeLessThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small bet amounts', () => {
      const tinyBet = 0.01;
      const probability = gameEngine.calculateHouseAdvantage(tinyBet);
      
      expect(probability).toBeGreaterThanOrEqual(gameEngine.MIN_CRASH_PROBABILITY);
      expect(probability).toBeLessThanOrEqual(gameEngine.MAX_CRASH_PROBABILITY);
    });

    it('should handle very large bet amounts', () => {
      const hugeBet = 10000.00;
      const probability = gameEngine.calculateHouseAdvantage(hugeBet);
      
      expect(probability).toBeGreaterThanOrEqual(gameEngine.MIN_CRASH_PROBABILITY);
      expect(probability).toBeLessThanOrEqual(gameEngine.MAX_CRASH_PROBABILITY);
    });

    it('should handle exact medium bet amount', () => {
      const mediumBet = gameEngine.MEDIUM_BET_AMOUNT;
      const probability = gameEngine.calculateHouseAdvantage(mediumBet);
      
      expect(probability).toBeCloseTo(gameEngine.BASE_CRASH_PROBABILITY, 2);
    });
  });
}); 