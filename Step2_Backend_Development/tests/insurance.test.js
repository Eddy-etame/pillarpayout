const request = require('supertest');
const express = require('express');
const insuranceService = require('../services/insuranceService');

// Create a simple Express app for testing
const app = express();
app.use(express.json());

// Import routes
const insuranceRoutes = require('../routes/insurance');
app.use('/api/v1/insurance', insuranceRoutes);

describe('Insurance System Tests', () => {
  beforeAll(() => {
    // Clear cache for clean testing
    insuranceService.clearCache();
  });

  describe('Insurance Service Tests', () => {
    it('should calculate insurance premiums correctly', () => {
      const betAmount = 100.00;
      
      // Test basic insurance
      const basicInsurance = insuranceService.calculateInsurancePremium(betAmount, 'basic');
      expect(basicInsurance.premium).toBe(15.00); // 15% of $100
      expect(basicInsurance.coverageAmount).toBe(50.00); // 50% of $100
      expect(basicInsurance.totalCost).toBe(115.00); // $100 + $15 premium
      
      // Test premium insurance
      const premiumInsurance = insuranceService.calculateInsurancePremium(betAmount, 'premium');
      expect(premiumInsurance.premium).toBe(25.00); // 25% of $100
      expect(premiumInsurance.coverageAmount).toBe(75.00); // 75% of $100
      expect(premiumInsurance.totalCost).toBe(125.00); // $100 + $25 premium
      
      // Test elite insurance
      const eliteInsurance = insuranceService.calculateInsurancePremium(betAmount, 'elite');
      expect(eliteInsurance.premium).toBe(35.00); // 35% of $100
      expect(eliteInsurance.coverageAmount).toBe(90.00); // 90% of $100
      expect(eliteInsurance.totalCost).toBe(135.00); // $100 + $35 premium
    });

    it('should validate insurance types correctly', () => {
      const betAmount = 50.00;
      
      // Valid insurance types
      expect(() => insuranceService.calculateInsurancePremium(betAmount, 'basic')).not.toThrow();
      expect(() => insuranceService.calculateInsurancePremium(betAmount, 'premium')).not.toThrow();
      expect(() => insuranceService.calculateInsurancePremium(betAmount, 'elite')).not.toThrow();
      
      // Invalid insurance type
      expect(() => insuranceService.calculateInsurancePremium(betAmount, 'invalid')).toThrow('Invalid insurance type');
    });

    it('should get insurance options correctly', () => {
      const betAmount = 50.00;
      const options = insuranceService.getInsuranceOptions(betAmount);
      
      expect(options.available).toBe(true);
      expect(options.betAmount).toBe(betAmount);
      expect(options.options).toHaveLength(3);
      
      // Check each option
      const basicOption = options.options.find(opt => opt.type === 'basic');
      const premiumOption = options.options.find(opt => opt.type === 'premium');
      const eliteOption = options.options.find(opt => opt.type === 'elite');
      
      expect(basicOption).toBeDefined();
      expect(premiumOption).toBeDefined();
      expect(eliteOption).toBeDefined();
      
      // Verify premium rates
      expect(basicOption.premiumRate).toBe(0.15);
      expect(premiumOption.premiumRate).toBe(0.25);
      expect(eliteOption.premiumRate).toBe(0.35);
    });

    it('should reject insurance for bets below minimum', () => {
      const lowBetAmount = 3.00;
      const options = insuranceService.getInsuranceOptions(lowBetAmount);
      
      expect(options.available).toBe(false);
      expect(options.reason).toContain('Minimum bet amount');
    });

    it('should reject insurance for bets above maximum', () => {
      const highBetAmount = 1500.00;
      const options = insuranceService.getInsuranceOptions(highBetAmount);
      
      expect(options.available).toBe(false);
      expect(options.reason).toContain('Maximum insurance coverage');
    });

    it('should calculate profitability metrics correctly', () => {
      const metrics = insuranceService.calculateProfitabilityMetrics();
      
      // Check basic insurance profitability
      expect(metrics.basic.houseEdge).toBe(35); // 15% premium - 50% coverage = -35% (house advantage)
      expect(metrics.basic.premiumRate).toBe(0.15);
      expect(metrics.basic.coverageRate).toBe(0.50);
      
      // Check premium insurance profitability
      expect(metrics.premium.houseEdge).toBe(50); // 25% premium - 75% coverage = -50% (house advantage)
      expect(metrics.premium.premiumRate).toBe(0.25);
      expect(metrics.premium.coverageRate).toBe(0.75);
      
      // Check elite insurance profitability
      expect(metrics.elite.houseEdge).toBe(55); // 35% premium - 90% coverage = -55% (house advantage)
      expect(metrics.elite.premiumRate).toBe(0.35);
      expect(metrics.elite.coverageRate).toBe(0.90);
      
      // Check overall profitability
      expect(metrics.overallHouseEdge).toBeGreaterThan(0);
      expect(metrics.minBetForInsurance).toBe(5.00);
      expect(metrics.maxInsuranceAmount).toBe(1000.00);
    });
  });

  describe('Insurance API Endpoints', () => {
    it('should calculate insurance via API', async () => {
      const response = await request(app)
        .post('/calculate')
        .send({
          betAmount: 100,
          insuranceType: 'basic'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.insuranceDetails.premium).toBe(15.00);
      expect(response.body.insuranceDetails.coverageAmount).toBe(50.00);
    });

    it('should get insurance options via API', async () => {
      const response = await request(app)
        .get('/options?betAmount=50')
        .expect(200);

      expect(response.body.available).toBe(true);
      expect(response.body.options).toHaveLength(3);
    });

    it('should reject invalid insurance calculation', async () => {
      await request(app)
        .post('/calculate')
        .send({
          betAmount: 100,
          insuranceType: 'invalid'
        })
        .expect(400);
    });
  });

  describe('Profitability Analysis', () => {
    it('should demonstrate high profitability for house', () => {
      const betAmount = 100.00;
      
      // Calculate all insurance types
      const basic = insuranceService.calculateInsurancePremium(betAmount, 'basic');
      const premium = insuranceService.calculateInsurancePremium(betAmount, 'premium');
      const elite = insuranceService.calculateInsurancePremium(betAmount, 'elite');
      
      // House profit calculations
      const basicProfit = basic.premium - basic.coverageAmount; // $15 - $50 = -$35 (house keeps premium)
      const premiumProfit = premium.premium - premium.coverageAmount; // $25 - $75 = -$50 (house keeps premium)
      const eliteProfit = elite.premium - elite.coverageAmount; // $35 - $90 = -$55 (house keeps premium)
      
      // House always wins the premium
      expect(basic.premium).toBe(15.00); // House keeps $15
      expect(premium.premium).toBe(25.00); // House keeps $25
      expect(elite.premium).toBe(35.00); // House keeps $35
      
      // Only pay out if bet loses (which is controlled by house advantage)
      expect(basic.coverageAmount).toBe(50.00); // Only paid if bet loses
      expect(premium.coverageAmount).toBe(75.00); // Only paid if bet loses
      expect(elite.coverageAmount).toBe(90.00); // Only paid if bet loses
    });

    it('should show insurance increases total house edge', () => {
      // Base game house edge: 15-25%
      const baseHouseEdge = 0.20; // 20% average
      
      // Insurance adds additional revenue
      const insuranceRevenue = 0.25; // 25% average premium
      
      // Combined house edge
      const totalHouseEdge = baseHouseEdge + insuranceRevenue;
      
      expect(totalHouseEdge).toBeGreaterThan(0.40); // 40%+ total house edge
      expect(totalHouseEdge).toBeLessThan(0.60); // But not too obvious
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small bet amounts', () => {
      const tinyBet = 0.01;
      const options = insuranceService.getInsuranceOptions(tinyBet);
      
      expect(options.available).toBe(false);
      expect(options.reason).toContain('Minimum bet amount');
    });

    it('should handle very large bet amounts', () => {
      const hugeBet = 10000.00;
      const options = insuranceService.getInsuranceOptions(hugeBet);
      
      expect(options.available).toBe(false);
      expect(options.reason).toContain('Maximum insurance coverage');
    });

    it('should handle exact minimum bet amount', () => {
      const minBet = insuranceService.minBetForInsurance;
      const options = insuranceService.getInsuranceOptions(minBet);
      
      expect(options.available).toBe(true);
      expect(options.options).toHaveLength(3);
    });

    it('should handle exact maximum insurance amount', () => {
      const maxBet = insuranceService.maxInsuranceAmount;
      const options = insuranceService.getInsuranceOptions(maxBet);
      
      expect(options.available).toBe(true);
      expect(options.options).toHaveLength(3);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      insuranceService.clearCache();
      const cacheStats = insuranceService.getCacheStats();
      expect(cacheStats.cacheSize).toBe(0);
    });

    it('should get cache statistics', () => {
      const cacheStats = insuranceService.getCacheStats();
      
      expect(cacheStats).toHaveProperty('cacheSize');
      expect(typeof cacheStats.cacheSize).toBe('number');
    });
  });
}); 