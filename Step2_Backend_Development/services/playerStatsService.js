const db = require('../db');
const logger = require('../utils/logger');

class PlayerStatsService {
  constructor() {
    this.statsCache = new Map(); // userId -> stats object
    this.cacheTimeout = 300000; // 5 minutes
  }

  // Calculate player statistics
  async calculatePlayerStats(userId) {
    try {
      // Get all bets for the user
      const betsResult = await db.query(`
        SELECT 
          b.id,
          b.amount,
          b.cashout_multiplier,
          b.timestamp,
          r.crash_point,
          r.timestamp as round_timestamp
        FROM bets b
        JOIN rounds r ON b.round_id = r.id
        WHERE b.user_id = $1
        ORDER BY b.timestamp DESC
      `, [userId]);

      const bets = betsResult.rows;
      
      if (bets.length === 0) {
        return this.getDefaultStats();
      }

      // Calculate statistics
      let totalBets = bets.length;
      let totalWagered = 0;
      let totalWon = 0;
      let totalLost = 0;
      let wins = 0;
      let losses = 0;
      let biggestWin = 0;
      let biggestLoss = 0;
      let highestMultiplier = 0;
      let averageBet = 0;
      let winRate = 0;
      let profitLoss = 0;

      // Process each bet
      for (const bet of bets) {
        totalWagered += parseFloat(bet.amount);
        
        if (bet.cashout_multiplier) {
          // Win
          const winnings = bet.amount * bet.cashout_multiplier;
          totalWon += winnings;
          wins++;
          
          if (winnings > biggestWin) {
            biggestWin = winnings;
          }
          
          if (bet.cashout_multiplier > highestMultiplier) {
            highestMultiplier = bet.cashout_multiplier;
          }
        } else {
          // Loss
          totalLost += parseFloat(bet.amount);
          losses++;
          
          if (bet.amount > biggestLoss) {
            biggestLoss = bet.amount;
          }
        }
      }

      // Calculate derived statistics
      averageBet = totalWagered / totalBets;
      winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0;
      profitLoss = totalWon - totalWagered;

      // Get recent activity (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentBets = bets.filter(bet => new Date(bet.timestamp) > oneDayAgo);
      
      const recentStats = {
        bets: recentBets.length,
        wagered: recentBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0),
        won: recentBets.filter(bet => bet.cashout_multiplier).reduce((sum, bet) => sum + (bet.amount * bet.cashout_multiplier), 0),
        lost: recentBets.filter(bet => !bet.cashout_multiplier).reduce((sum, bet) => sum + parseFloat(bet.amount), 0)
      };

      const stats = {
        userId,
        totalBets,
        totalWagered: parseFloat(totalWagered.toFixed(2)),
        totalWon: parseFloat(totalWon.toFixed(2)),
        totalLost: parseFloat(totalLost.toFixed(2)),
        wins,
        losses,
        biggestWin: parseFloat(biggestWin.toFixed(2)),
        biggestLoss: parseFloat(biggestLoss.toFixed(2)),
        highestMultiplier: parseFloat(highestMultiplier.toFixed(2)),
        averageBet: parseFloat(averageBet.toFixed(2)),
        winRate: parseFloat(winRate.toFixed(2)),
        profitLoss: parseFloat(profitLoss.toFixed(2)),
        recentStats,
        lastUpdated: new Date().toISOString()
      };

      // Cache the stats
      this.statsCache.set(userId, {
        stats,
        timestamp: Date.now()
      });

      return stats;
    } catch (error) {
      logger.error('Error calculating player stats:', error);
      throw error;
    }
  }

  // Get player statistics (with caching)
  async getPlayerStats(userId) {
    try {
      // Check cache first
      const cached = this.statsCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.stats;
      }

      // Calculate fresh stats
      return await this.calculatePlayerStats(userId);
    } catch (error) {
      logger.error('Error getting player stats:', error);
      return this.getDefaultStats();
    }
  }

  // Get default stats for new players
  getDefaultStats() {
    return {
      userId: null,
      totalBets: 0,
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      wins: 0,
      losses: 0,
      biggestWin: 0,
      biggestLoss: 0,
      highestMultiplier: 0,
      averageBet: 0,
      winRate: 0,
      profitLoss: 0,
      recentStats: {
        bets: 0,
        wagered: 0,
        won: 0,
        lost: 0
      },
      lastUpdated: new Date().toISOString()
    };
  }

  // Update stats after a bet (real-time update)
  async updateStatsAfterBet(userId, betAmount, cashoutMultiplier = null) {
    try {
      // Invalidate cache to force recalculation
      this.statsCache.delete(userId);
      
      // Get updated stats
      return await this.getPlayerStats(userId);
    } catch (error) {
      logger.error('Error updating stats after bet:', error);
    }
  }

  // Get leaderboard data
  async getLeaderboard(type = 'profit', limit = 10) {
    try {
      let query = '';
      let orderBy = '';

      switch (type) {
        case 'profit':
          query = `
            SELECT 
              u.id,
              u.username,
              COUNT(b.id) as total_bets,
              SUM(b.amount) as total_wagered,
              SUM(CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.amount * b.cashout_multiplier ELSE 0 END) as total_won,
              SUM(CASE WHEN b.cashout_multiplier IS NULL THEN b.amount ELSE 0 END) as total_lost,
              MAX(CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.cashout_multiplier ELSE 0 END) as highest_multiplier
            FROM users u
            LEFT JOIN bets b ON u.id = b.user_id
            GROUP BY u.id, u.username
            HAVING COUNT(b.id) > 0
          `;
          orderBy = 'ORDER BY (SUM(CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.amount * b.cashout_multiplier ELSE 0 END) - SUM(b.amount)) DESC';
          break;
        
        case 'biggest_win':
          query = `
            SELECT 
              u.id,
              u.username,
              MAX(CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.amount * b.cashout_multiplier ELSE 0 END) as biggest_win,
              COUNT(b.id) as total_bets
            FROM users u
            LEFT JOIN bets b ON u.id = b.user_id
            GROUP BY u.id, u.username
            HAVING COUNT(b.id) > 0
          `;
          orderBy = 'ORDER BY MAX(CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.amount * b.cashout_multiplier ELSE 0 END) DESC';
          break;
        
        case 'highest_multiplier':
          query = `
            SELECT 
              u.id,
              u.username,
              MAX(CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.cashout_multiplier ELSE 0 END) as highest_multiplier,
              COUNT(b.id) as total_bets
            FROM users u
            LEFT JOIN bets b ON u.id = b.user_id
            GROUP BY u.id, u.username
            HAVING COUNT(b.id) > 0
          `;
          orderBy = 'ORDER BY MAX(CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.cashout_multiplier ELSE 0 END) DESC';
          break;
        
        case 'most_bets':
          query = `
            SELECT 
              u.id,
              u.username,
              COUNT(b.id) as total_bets,
              SUM(b.amount) as total_wagered
            FROM users u
            LEFT JOIN bets b ON u.id = b.user_id
            GROUP BY u.id, u.username
            HAVING COUNT(b.id) > 0
          `;
          orderBy = 'ORDER BY COUNT(b.id) DESC';
          break;
        
        default:
          throw new Error('Invalid leaderboard type');
      }

      const result = await db.query(query + ' ' + orderBy + ` LIMIT ${limit}`);
      
      return result.rows.map((row, index) => ({
        rank: index + 1,
        ...row
      }));
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Get recent big wins
  async getRecentBigWins(limit = 10) {
    try {
      const result = await db.query(`
        SELECT 
          u.username,
          b.amount,
          b.cashout_multiplier,
          (b.amount * b.cashout_multiplier) as winnings,
          b.timestamp,
          r.id as round_id
        FROM bets b
        JOIN users u ON b.user_id = u.id
        JOIN rounds r ON b.round_id = r.id
        WHERE b.cashout_multiplier IS NOT NULL
        ORDER BY (b.amount * b.cashout_multiplier) DESC
        LIMIT $1
      `, [limit]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting recent big wins:', error);
      return [];
    }
  }

  // Get user's betting history
  async getUserBettingHistory(userId, limit = 50, offset = 0) {
    try {
      const result = await db.query(`
        SELECT 
          b.id,
          b.amount,
          b.cashout_multiplier,
          (CASE WHEN b.cashout_multiplier IS NOT NULL THEN b.amount * b.cashout_multiplier ELSE 0 END) as winnings,
          b.timestamp,
          r.id as round_id,
          r.crash_point
        FROM bets b
        JOIN rounds r ON b.round_id = r.id
        WHERE b.user_id = $1
        ORDER BY b.timestamp DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting user betting history:', error);
      return [];
    }
  }

  // Clear stats cache
  clearCache() {
    this.statsCache.clear();
    logger.info('Player stats cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cacheSize: this.statsCache.size,
      cacheTimeout: this.cacheTimeout
    };
  }
}

module.exports = new PlayerStatsService(); 