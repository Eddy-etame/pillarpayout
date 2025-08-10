const request = require('supertest');
const express = require('express');
const productionService = require('../services/productionService');

const app = express();
app.use(express.json());

const productionRoutes = require('../routes/production');
app.use('/api/v1/production', productionRoutes);

describe('Production System Tests', () => {
  beforeAll(() => {
    productionService.clearCache();
  });

  describe('Production Service Tests', () => {
    it('should calculate baseline profitability for 100 players', () => {
      const profitability = productionService.calculateBaselineProfitability(100);
      
      expect(profitability.playerCount).toBe(100);
      expect(profitability.daily.bets).toBe(12000); // 100 * 15 * 8
      expect(profitability.daily.volume).toBe(30000); // 12000 * 2.50
      expect(profitability.daily.profit).toBe(7500); // 30000 * 0.25
      expect(profitability.daily.volumeFCFA).toBe(19500000); // 30000 * 650
      expect(profitability.daily.profitFCFA).toBe(4875000); // 7500 * 650
    });

    it('should calculate monthly profitability correctly', () => {
      const profitability = productionService.calculateBaselineProfitability(100);
      
      expect(profitability.monthly.volume).toBe(900000); // 30000 * 30
      expect(profitability.monthly.profit).toBe(225000); // 7500 * 30
      expect(profitability.monthly.volumeFCFA).toBe(585000000); // 900000 * 650
      expect(profitability.monthly.profitFCFA).toBe(146250000); // 225000 * 650
    });

    it('should calculate yearly profitability correctly', () => {
      const profitability = productionService.calculateBaselineProfitability(100);
      
      expect(profitability.yearly.volume).toBe(10950000); // 30000 * 365
      expect(profitability.yearly.profit).toBe(2737500); // 7500 * 365
      expect(profitability.yearly.volumeFCFA).toBe(7117500000); // 10950000 * 650
      expect(profitability.yearly.profitFCFA).toBe(1779375000); // 2737500 * 650
    });

    it('should simulate load balancing correctly', () => {
      const loadBalancing = productionService.simulateLoadBalancing(100, 3);
      
      expect(loadBalancing.totalPlayers).toBe(100);
      expect(loadBalancing.serverCount).toBe(3);
      expect(loadBalancing.playersPerServer).toBe(34); // ceil(100/3)
      expect(loadBalancing.distribution.length).toBe(3);
      expect(loadBalancing.averageLoad).toBeGreaterThan(0);
    });

    it('should track performance correctly', async () => {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate operation
      const duration = Date.now() - startTime;
      
      const record = await productionService.trackPerformance('test_operation', duration, true);
      
      expect(record.operation).toBe('test_operation');
      expect(record.duration).toBe(duration);
      expect(record.success).toBe(true);
      expect(record.timestamp).toBeDefined();
    });

    it('should add alerts correctly', () => {
      const alert = productionService.addAlert('test', 'Test alert message', 'warning');
      
      expect(alert.type).toBe('test');
      expect(alert.message).toBe('Test alert message');
      expect(alert.severity).toBe('warning');
      expect(alert.acknowledged).toBe(false);
      expect(alert.timestamp).toBeDefined();
    });

    it('should acknowledge alerts correctly', () => {
      const alert = productionService.addAlert('test', 'Test alert');
      const acknowledged = productionService.acknowledgeAlert(alert.id);
      
      expect(acknowledged).toBe(true);
      
      const foundAlert = productionService.alerts.find(a => a.id === alert.id);
      expect(foundAlert.acknowledged).toBe(true);
    });

    it('should calculate average response time correctly', () => {
      // Clear performance history
      productionService.performanceHistory = [];
      
      // Add some test records
      productionService.performanceHistory.push(
        { duration: 100, success: true },
        { duration: 200, success: true },
        { duration: 300, success: true }
      );
      
      const avgResponseTime = productionService.calculateAverageResponseTime();
      expect(avgResponseTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should calculate success rate correctly', () => {
      // Clear performance history
      productionService.performanceHistory = [];
      
      // Add some test records
      productionService.performanceHistory.push(
        { duration: 100, success: true },
        { duration: 200, success: true },
        { duration: 300, success: false }
      );
      
      const successRate = productionService.calculateSuccessRate();
      expect(successRate).toBe(66.67); // 2/3 * 100
    });
  });

  describe('Profitability Scenarios', () => {
    it('should calculate profitability for different player counts', () => {
      const scenarios = [50, 100, 200, 500, 1000];
      
      scenarios.forEach(playerCount => {
        const profitability = productionService.calculateBaselineProfitability(playerCount);
        
        expect(profitability.playerCount).toBe(playerCount);
        expect(profitability.daily.profit).toBeGreaterThan(0);
        expect(profitability.monthly.profit).toBeGreaterThan(0);
        expect(profitability.yearly.profit).toBeGreaterThan(0);
        
        // Verify FCFA calculations
        expect(profitability.daily.profitFCFA).toBe(profitability.daily.profit * 650);
        expect(profitability.monthly.profitFCFA).toBe(profitability.monthly.profit * 650);
        expect(profitability.yearly.profitFCFA).toBe(profitability.yearly.profit * 650);
      });
    });

    it('should scale linearly with player count', () => {
      const profitability50 = productionService.calculateBaselineProfitability(50);
      const profitability100 = productionService.calculateBaselineProfitability(100);
      const profitability200 = productionService.calculateBaselineProfitability(200);
      
      // 100 players should have double the profit of 50 players
      expect(profitability100.daily.profit).toBe(profitability50.daily.profit * 2);
      
      // 200 players should have double the profit of 100 players
      expect(profitability200.daily.profit).toBe(profitability100.daily.profit * 2);
    });
  });

  describe('Load Balancing Scenarios', () => {
    it('should handle different server configurations', () => {
      const scenarios = [
        { players: 100, servers: 1 },
        { players: 100, servers: 2 },
        { players: 100, servers: 3 },
        { players: 100, servers: 5 }
      ];
      
      scenarios.forEach(scenario => {
        const loadBalancing = productionService.simulateLoadBalancing(
          scenario.players, 
          scenario.servers
        );
        
        expect(loadBalancing.totalPlayers).toBe(scenario.players);
        expect(loadBalancing.serverCount).toBe(scenario.servers);
        expect(loadBalancing.distribution.length).toBeLessThanOrEqual(scenario.servers);
        
        // Verify total players across all servers
        const totalDistributedPlayers = loadBalancing.distribution.reduce(
          (sum, server) => sum + server.players, 0
        );
        expect(totalDistributedPlayers).toBe(scenario.players);
      });
    });

    it('should identify high load servers', () => {
      const loadBalancing = productionService.simulateLoadBalancing(100, 2);
      
      loadBalancing.distribution.forEach(server => {
        if (server.load > 80) {
          expect(server.status).toBe('high');
        } else {
          expect(server.status).toBe('normal');
        }
      });
    });
  });

  describe('System Monitoring', () => {
    it('should update system metrics', async () => {
      const metrics = await productionService.updateSystemMetrics();
      
      expect(metrics.cpu).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu).toBeLessThanOrEqual(100);
      expect(metrics.memory).toBeGreaterThanOrEqual(0);
      expect(metrics.memory).toBeLessThanOrEqual(100);
      expect(metrics.uptime).toBeGreaterThan(0);
      expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
    });

    it('should update game metrics', async () => {
      const gameData = {
        activePlayers: 100,
        totalBets: 12000,
        totalWagered: 30000,
        totalWon: 22500,
        crashRate: 0.75,
        houseEdge: 0.25
      };
      
      const metrics = await productionService.updateGameMetrics(gameData);
      
      expect(metrics.activePlayers).toBe(100);
      expect(metrics.totalBets).toBe(12000);
      expect(metrics.totalWagered).toBe(30000);
      expect(metrics.totalWon).toBe(22500);
      expect(metrics.averageBetSize).toBe(2.50); // 30000 / 12000
      expect(metrics.crashRate).toBe(0.75);
      expect(metrics.houseEdge).toBe(0.25);
    });

    it('should update business metrics', async () => {
      const businessData = {
        dailyRevenue: 30000,
        dailyProfit: 7500,
        monthlyRevenue: 900000,
        monthlyProfit: 225000,
        playerRetention: 0.70,
        averageSessionTime: 45
      };
      
      const metrics = await productionService.updateBusinessMetrics(businessData);
      
      expect(metrics.dailyRevenue).toBe(30000);
      expect(metrics.dailyProfit).toBe(7500);
      expect(metrics.monthlyRevenue).toBe(900000);
      expect(metrics.monthlyProfit).toBe(225000);
      expect(metrics.playerRetention).toBe(0.70);
      expect(metrics.averageSessionTime).toBe(45);
    });
  });

  describe('Alert System', () => {
    it('should generate system alerts for high CPU usage', () => {
      // Mock high CPU usage
      productionService.metrics.system.cpu = 85;
      productionService.checkSystemAlerts();
      
      const criticalAlerts = productionService.alerts.filter(
        alert => alert.type === 'system' && alert.severity === 'critical'
      );
      
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });

    it('should generate system alerts for high memory usage', () => {
      // Mock high memory usage
      productionService.metrics.system.memory = 90;
      productionService.checkSystemAlerts();
      
      const criticalAlerts = productionService.alerts.filter(
        alert => alert.type === 'system' && alert.severity === 'critical'
      );
      
      expect(criticalAlerts.length).toBeGreaterThan(0);
    });
  });

  describe('API Endpoint Tests', () => {
    it('should reject unauthorized access to production endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/production/profitability')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject non-admin access to production endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/production/profitability')
        .set('Authorization', 'Bearer valid_token_but_not_admin')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', () => {
      expect(() => productionService.clearCache()).not.toThrow();
    });

    it('should get cache statistics', () => {
      const cacheStats = productionService.getCacheStats();
      
      expect(cacheStats.alerts).toBeDefined();
      expect(cacheStats.performanceHistory).toBeDefined();
      expect(cacheStats.maxHistorySize).toBeDefined();
    });
  });
}); 