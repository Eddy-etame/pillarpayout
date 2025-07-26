const db = require('../db');
const logger = require('../utils/logger');
const os = require('os');

class ProductionService {
  constructor() {
    this.metrics = {
      system: {
        cpu: 0,
        memory: 0,
        uptime: 0,
        activeConnections: 0
      },
      game: {
        activePlayers: 0,
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        averageBetSize: 0,
        crashRate: 0,
        houseEdge: 0
      },
      business: {
        dailyRevenue: 0,
        dailyProfit: 0,
        monthlyRevenue: 0,
        monthlyProfit: 0,
        playerRetention: 0,
        averageSessionTime: 0
      }
    };

    this.alerts = [];
    this.performanceHistory = [];
    this.maxHistorySize = 1000;
  }

  // Calculate profitability for 100 players
  calculateBaselineProfitability(playerCount = 100) {
    const baseMetrics = {
      averageBetSize: 2.50, // $2.50 average bet
      betsPerHour: 15, // 15 bets per hour per player
      activeHours: 8, // 8 active hours per day
      houseEdge: 0.25, // 25% house edge
      playerRetention: 0.70 // 70% daily retention
    };

    // Daily calculations
    const dailyBets = playerCount * baseMetrics.betsPerHour * baseMetrics.activeHours;
    const dailyVolume = dailyBets * baseMetrics.averageBetSize;
    const dailyProfit = dailyVolume * baseMetrics.houseEdge;

    // Monthly calculations (30 days)
    const monthlyVolume = dailyVolume * 30;
    const monthlyProfit = dailyProfit * 30;

    // Yearly calculations
    const yearlyVolume = dailyVolume * 365;
    const yearlyProfit = dailyProfit * 365;

    // FCFA calculations (1 USD = 650 FCFA)
    const fcfRate = 650;
    const dailyVolumeFCFA = dailyVolume * fcfRate;
    const dailyProfitFCFA = dailyProfit * fcfRate;
    const monthlyVolumeFCFA = monthlyVolume * fcfRate;
    const monthlyProfitFCFA = monthlyProfit * fcfRate;
    const yearlyVolumeFCFA = yearlyVolume * fcfRate;
    const yearlyProfitFCFA = yearlyProfit * fcfRate;

    return {
      playerCount,
      daily: {
        bets: dailyBets,
        volume: parseFloat(dailyVolume.toFixed(2)),
        profit: parseFloat(dailyProfit.toFixed(2)),
        volumeFCFA: parseFloat(dailyVolumeFCFA.toFixed(2)),
        profitFCFA: parseFloat(dailyProfitFCFA.toFixed(2))
      },
      monthly: {
        volume: parseFloat(monthlyVolume.toFixed(2)),
        profit: parseFloat(monthlyProfit.toFixed(2)),
        volumeFCFA: parseFloat(monthlyVolumeFCFA.toFixed(2)),
        profitFCFA: parseFloat(monthlyProfitFCFA.toFixed(2))
      },
      yearly: {
        volume: parseFloat(yearlyVolume.toFixed(2)),
        profit: parseFloat(yearlyProfit.toFixed(2)),
        volumeFCFA: parseFloat(yearlyVolumeFCFA.toFixed(2)),
        profitFCFA: parseFloat(yearlyProfitFCFA.toFixed(2))
      },
      metrics: baseMetrics
    };
  }

  // System monitoring
  async updateSystemMetrics() {
    try {
      const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
      const uptime = os.uptime();

      this.metrics.system = {
        cpu: parseFloat(cpuUsage.toFixed(2)),
        memory: parseFloat(memoryUsage.toFixed(2)),
        uptime: parseFloat(uptime.toFixed(2)),
        activeConnections: this.metrics.system.activeConnections
      };

      // Store in database
      await this.storeSystemMetrics();

      // Check for alerts
      this.checkSystemAlerts();

      return this.metrics.system;
    } catch (error) {
      logger.error('Error updating system metrics:', error);
      throw error;
    }
  }

  // Game metrics monitoring
  async updateGameMetrics(gameData) {
    try {
      this.metrics.game = {
        activePlayers: gameData.activePlayers || 0,
        totalBets: gameData.totalBets || 0,
        totalWagered: gameData.totalWagered || 0,
        totalWon: gameData.totalWon || 0,
        averageBetSize: gameData.totalWagered > 0 ? 
          parseFloat((gameData.totalWagered / gameData.totalBets).toFixed(2)) : 0,
        crashRate: gameData.crashRate || 0,
        houseEdge: gameData.houseEdge || 0
      };

      // Store in database
      await this.storeGameMetrics();

      return this.metrics.game;
    } catch (error) {
      logger.error('Error updating game metrics:', error);
      throw error;
    }
  }

  // Business metrics monitoring
  async updateBusinessMetrics(businessData) {
    try {
      this.metrics.business = {
        dailyRevenue: businessData.dailyRevenue || 0,
        dailyProfit: businessData.dailyProfit || 0,
        monthlyRevenue: businessData.monthlyRevenue || 0,
        monthlyProfit: businessData.monthlyProfit || 0,
        playerRetention: businessData.playerRetention || 0,
        averageSessionTime: businessData.averageSessionTime || 0
      };

      // Store in database
      await this.storeBusinessMetrics();

      return this.metrics.business;
    } catch (error) {
      logger.error('Error updating business metrics:', error);
      throw error;
    }
  }

  // Load balancing simulation
  simulateLoadBalancing(playerCount, serverCount = 3) {
    const playersPerServer = Math.ceil(playerCount / serverCount);
    const loadDistribution = [];

    for (let i = 0; i < serverCount; i++) {
      const serverPlayers = Math.min(playersPerServer, playerCount - (i * playersPerServer));
      if (serverPlayers > 0) {
        loadDistribution.push({
          serverId: `server-${i + 1}`,
          players: serverPlayers,
          load: parseFloat(((serverPlayers / playersPerServer) * 100).toFixed(2)),
          status: serverPlayers > playersPerServer * 0.8 ? 'high' : 'normal'
        });
      }
    }

    return {
      totalPlayers: playerCount,
      serverCount,
      playersPerServer,
      distribution: loadDistribution,
      averageLoad: parseFloat((playerCount / (serverCount * playersPerServer) * 100).toFixed(2))
    };
  }

  // Performance monitoring
  async trackPerformance(operation, duration, success = true) {
    const performanceRecord = {
      operation,
      duration,
      success,
      timestamp: new Date(),
      serverId: process.env.SERVER_ID || 'main'
    };

    this.performanceHistory.push(performanceRecord);

    // Keep only recent history
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }

    // Store in database
    await this.storePerformanceRecord(performanceRecord);

    // Check for performance alerts
    if (duration > 1000) { // Alert if operation takes more than 1 second
      this.addAlert('performance', `Slow operation: ${operation} took ${duration}ms`);
    }

    return performanceRecord;
  }

  // Alert system
  addAlert(type, message, severity = 'warning') {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      severity,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    logger.warn(`Alert: ${message}`, { alert });
    return alert;
  }

  // Check system alerts
  checkSystemAlerts() {
    const { cpu, memory } = this.metrics.system;

    if (cpu > 80) {
      this.addAlert('system', `High CPU usage: ${cpu}%`, 'critical');
    }

    if (memory > 85) {
      this.addAlert('system', `High memory usage: ${memory}%`, 'critical');
    }

    if (cpu > 60) {
      this.addAlert('system', `Elevated CPU usage: ${cpu}%`, 'warning');
    }

    if (memory > 70) {
      this.addAlert('system', `Elevated memory usage: ${memory}%`, 'warning');
    }
  }

  // Get all metrics
  getAllMetrics() {
    return {
      system: this.metrics.system,
      game: this.metrics.game,
      business: this.metrics.business,
      alerts: this.alerts.filter(alert => !alert.acknowledged),
      performance: {
        averageResponseTime: this.calculateAverageResponseTime(),
        successRate: this.calculateSuccessRate(),
        recentOperations: this.performanceHistory.slice(-10)
      }
    };
  }

  // Calculate average response time
  calculateAverageResponseTime() {
    if (this.performanceHistory.length === 0) return 0;

    const totalTime = this.performanceHistory.reduce((sum, record) => sum + record.duration, 0);
    return parseFloat((totalTime / this.performanceHistory.length).toFixed(2));
  }

  // Calculate success rate
  calculateSuccessRate() {
    if (this.performanceHistory.length === 0) return 100;

    const successfulOperations = this.performanceHistory.filter(record => record.success).length;
    return parseFloat(((successfulOperations / this.performanceHistory.length) * 100).toFixed(2));
  }

  // Acknowledge alert
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Database storage methods
  async storeSystemMetrics() {
    try {
      await db.query(`
        INSERT INTO system_metrics (
          cpu_usage, memory_usage, uptime, active_connections, timestamp
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        this.metrics.system.cpu,
        this.metrics.system.memory,
        this.metrics.system.uptime,
        this.metrics.system.activeConnections
      ]);
    } catch (error) {
      logger.error('Error storing system metrics:', error);
    }
  }

  async storeGameMetrics() {
    try {
      await db.query(`
        INSERT INTO game_metrics (
          active_players, total_bets, total_wagered, total_won,
          average_bet_size, crash_rate, house_edge, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        this.metrics.game.activePlayers,
        this.metrics.game.totalBets,
        this.metrics.game.totalWagered,
        this.metrics.game.totalWon,
        this.metrics.game.averageBetSize,
        this.metrics.game.crashRate,
        this.metrics.game.houseEdge
      ]);
    } catch (error) {
      logger.error('Error storing game metrics:', error);
    }
  }

  async storeBusinessMetrics() {
    try {
      await db.query(`
        INSERT INTO business_metrics (
          daily_revenue, daily_profit, monthly_revenue, monthly_profit,
          player_retention, average_session_time, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        this.metrics.business.dailyRevenue,
        this.metrics.business.dailyProfit,
        this.metrics.business.monthlyRevenue,
        this.metrics.business.monthlyProfit,
        this.metrics.business.playerRetention,
        this.metrics.business.averageSessionTime
      ]);
    } catch (error) {
      logger.error('Error storing business metrics:', error);
    }
  }

  async storePerformanceRecord(record) {
    try {
      await db.query(`
        INSERT INTO performance_records (
          operation, duration, success, server_id, timestamp
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        record.operation,
        record.duration,
        record.success,
        record.serverId,
        record.timestamp
      ]);
    } catch (error) {
      logger.error('Error storing performance record:', error);
    }
  }

  // Clear cache
  clearCache() {
    this.alerts = [];
    this.performanceHistory = [];
    logger.info('Production service cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      alerts: this.alerts.length,
      performanceHistory: this.performanceHistory.length,
      maxHistorySize: this.maxHistorySize
    };
  }
}

module.exports = new ProductionService(); 