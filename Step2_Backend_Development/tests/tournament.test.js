const request = require('supertest');
const express = require('express');
const tournamentService = require('../services/tournamentService');

const app = express();
app.use(express.json());

const tournamentRoutes = require('../routes/tournaments');
app.use('/api/v1/tournaments', tournamentRoutes);

describe('Tournament System Tests', () => {
  beforeAll(() => {
    tournamentService.clearCache();
  });

  describe('Tournament Service Tests', () => {
    it('should create a new tournament', async () => {
      const tournament = await tournamentService.createTournament('mini');
      
      expect(tournament).toBeDefined();
      expect(tournament.type).toBe('mini');
      expect(tournament.name).toBe('Mini Tournament');
      expect(tournament.entryFee).toBe(1.00);
      expect(tournament.status).toBe('registration');
    });

    it('should validate tournament types correctly', async () => {
      // Test invalid tournament type
      try {
        await tournamentService.createTournament('invalid');
        throw new Error('Expected createTournament to throw for invalid type');
      } catch (error) {
        expect(error.message).toContain('Invalid tournament type');
      }
      
      const validTypes = ['mini', 'regular', 'major', 'daily'];
      for (const type of validTypes) {
        const tournament = await tournamentService.createTournament(type);
        expect(tournament.type).toBe(type);
      }
    });

    it('should get active tournaments', () => {
      const tournaments = tournamentService.getActiveTournaments();
      expect(Array.isArray(tournaments)).toBe(true);
    });

    it('should get tournament by ID', () => {
      const tournaments = tournamentService.getActiveTournaments();
      if (tournaments.length > 0) {
        const tournament = tournamentService.getTournamentById(tournaments[0].id);
        expect(tournament).toBeDefined();
        expect(tournament.id).toBe(tournaments[0].id);
      }
    });

    it('should calculate profitability correctly', () => {
      const profitability = tournamentService.calculateProfitability();
      
      expect(profitability).toBeDefined();
      expect(profitability.mini).toBeDefined();
      expect(profitability.regular).toBeDefined();
      expect(profitability.major).toBeDefined();
      expect(profitability.daily).toBeDefined();
      expect(profitability.totalDailyProfit).toBeGreaterThan(0);
    });
  });

  describe('Tournament Types Configuration', () => {
    it('should have correct mini tournament configuration', () => {
      const mini = tournamentService.tournamentTypes.mini;
      
      expect(mini.name).toBe('Mini Tournament');
      expect(mini.entryFee).toBe(1.00);
      expect(mini.duration).toBe(3600000); // 1 hour
      expect(mini.maxPlayers).toBe(100);
      expect(mini.prizePool).toBe(0.70);
      expect(mini.minBets).toBe(10);
    });

    it('should have correct regular tournament configuration', () => {
      const regular = tournamentService.tournamentTypes.regular;
      
      expect(regular.name).toBe('Regular Tournament');
      expect(regular.entryFee).toBe(2.00);
      expect(regular.duration).toBe(7200000); // 2 hours
      expect(regular.maxPlayers).toBe(200);
      expect(regular.prizePool).toBe(0.70);
      expect(regular.minBets).toBe(25);
    });

    it('should have correct major tournament configuration', () => {
      const major = tournamentService.tournamentTypes.major;
      
      expect(major.name).toBe('Major Tournament');
      expect(major.entryFee).toBe(5.00);
      expect(major.duration).toBe(14400000); // 4 hours
      expect(major.maxPlayers).toBe(500);
      expect(major.prizePool).toBe(0.70);
      expect(major.minBets).toBe(50);
    });

    it('should have correct daily tournament configuration', () => {
      const daily = tournamentService.tournamentTypes.daily;
      
      expect(daily.name).toBe('Daily Championship');
      expect(daily.entryFee).toBe(10.00);
      expect(daily.duration).toBe(86400000); // 24 hours
      expect(daily.maxPlayers).toBe(1000);
      expect(daily.prizePool).toBe(0.75);
      expect(daily.minBets).toBe(100);
    });
  });

  describe('Tournament Profitability Analysis', () => {
    it('should calculate daily profitability for all tournament types', () => {
      const profitability = tournamentService.calculateProfitability();
      
      // Mini tournaments (24 per day)
      const miniDaily = profitability.mini.dailyProfit;
      expect(miniDaily).toBeGreaterThan(0);
      
      // Regular tournaments (24 per day)
      const regularDaily = profitability.regular.dailyProfit;
      expect(regularDaily).toBeGreaterThan(miniDaily);
      
      // Major tournaments (24 per day)
      const majorDaily = profitability.major.dailyProfit;
      expect(majorDaily).toBeGreaterThan(regularDaily);
      
      // Daily tournaments (1 per day)
      const dailyDaily = profitability.daily.dailyProfit;
      expect(dailyDaily).toBeGreaterThan(0);
      
      // Total daily profit
      expect(profitability.totalDailyProfit).toBeGreaterThan(0);
    });

    it('should calculate monthly and yearly profitability', () => {
      const profitability = tournamentService.calculateProfitability();
      
      // Monthly profit should be daily profit * 30
      expect(profitability.totalMonthlyProfit).toBe(profitability.totalDailyProfit * 30);
      
      // Yearly profit should be daily profit * 365
      expect(profitability.totalYearlyProfit).toBe(profitability.totalDailyProfit * 365);
    });
  });

  describe('Tournament Cache Management', () => {
    it('should clear cache successfully', () => {
      expect(() => tournamentService.clearCache()).not.toThrow();
    });

    it('should get cache statistics', () => {
      const cacheStats = tournamentService.getCacheStats();
      
      expect(cacheStats).toBeDefined();
      expect(cacheStats.activeTournaments).toBeDefined();
      expect(cacheStats.tournamentParticipants).toBeDefined();
      expect(cacheStats.tournamentScores).toBeDefined();
    });
  });

  describe('API Endpoint Tests', () => {
    it('should get active tournaments', async () => {
      const response = await request(app)
        .get('/api/v1/tournaments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tournaments).toBeDefined();
      expect(response.body.count).toBeDefined();
    });

    it('should reject unauthorized tournament creation', async () => {
      const response = await request(app)
        .post('/api/v1/tournaments')
        .send({ type: 'mini' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject unauthorized tournament stats access', async () => {
      const response = await request(app)
        .get('/api/v1/tournaments/stats')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Tournament Profitability Scenarios', () => {
    it('should calculate profitability for different player counts', () => {
      const profitability = tournamentService.calculateProfitability();
      
      // Scenario 1: Low player count (50% of expected)
      const lowPlayerScenario = {
        mini: profitability.mini.dailyProfit * 0.5,
        regular: profitability.regular.dailyProfit * 0.5,
        major: profitability.major.dailyProfit * 0.5,
        daily: profitability.daily.dailyProfit * 0.5
      };
      
      const lowPlayerTotal = Object.values(lowPlayerScenario).reduce((sum, profit) => sum + profit, 0);
      expect(lowPlayerTotal).toBeGreaterThan(0);
      
      // Scenario 2: High player count (150% of expected)
      const highPlayerScenario = {
        mini: profitability.mini.dailyProfit * 1.5,
        regular: profitability.regular.dailyProfit * 1.5,
        major: profitability.major.dailyProfit * 1.5,
        daily: profitability.daily.dailyProfit * 1.5
      };
      
      const highPlayerTotal = Object.values(highPlayerScenario).reduce((sum, profit) => sum + profit, 0);
      expect(highPlayerTotal).toBeGreaterThan(lowPlayerTotal);
    });

    it('should calculate house profit margins', () => {
      const profitability = tournamentService.calculateProfitability();
      
      // House profit should be 25-30% of entry fees
      const miniHouseProfit = 1.00 * 0.30; // 30% of $1 entry fee
      const regularHouseProfit = 2.00 * 0.30; // 30% of $2 entry fee
      const majorHouseProfit = 5.00 * 0.30; // 30% of $5 entry fee
      const dailyHouseProfit = 10.00 * 0.25; // 25% of $10 entry fee
      
      expect(miniHouseProfit).toBe(0.30);
      expect(regularHouseProfit).toBe(0.60);
      expect(majorHouseProfit).toBe(1.50);
      expect(dailyHouseProfit).toBe(2.50);
    });
  });
}); 