const db = require('../db');
const logger = require('../utils/logger');

class UserHistoryController {
  // Get round history for a user
  async getRoundHistory(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Get user's round history with round details
      const historyQuery = `
        SELECT 
          r.id as round_id,
          r.crash_point,
          r.timestamp as round_start_time,
          r.end_time as round_end_time,
          b.amount as bet_amount,
          b.cashout_multiplier,
          b.final_multiplier,
          b.result,
          b.winnings,
          b.timestamp as bet_timestamp
        FROM rounds r
        INNER JOIN bets b ON r.id = b.round_id
        WHERE b.user_id = $1
        ORDER BY b.timestamp DESC
        LIMIT $2 OFFSET $3
      `;

      const historyResult = await db.query(historyQuery, [userId, limit, offset]);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM bets b
        WHERE b.user_id = $1
      `;
      const countResult = await db.query(countQuery, [userId]);

      const totalRounds = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRounds / limit);

      // Format the response
      const roundHistory = historyResult.rows.map(row => ({
        roundId: row.round_id,
        crashPoint: parseFloat(row.crash_point),
        betAmount: parseFloat(row.bet_amount),
        cashoutMultiplier: row.cashout_multiplier ? parseFloat(row.cashout_multiplier) : null,
        finalMultiplier: row.final_multiplier ? parseFloat(row.final_multiplier) : null,
        result: row.result,
        winnings: parseFloat(row.winnings || 0),
        betTimestamp: row.bet_timestamp,
        roundStartTime: row.round_start_time,
        roundEndTime: row.round_end_time
      }));

      res.json({
        success: true,
        data: {
          rounds: roundHistory,
          pagination: {
            currentPage: page,
            totalPages,
            totalRounds,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error getting round history:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get round history' 
      });
    }
  }

  // Get recent activities for a user
  async getRecentActivities(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;

      // Get betting activities
      const bettingQuery = `
        SELECT 
          'bet_placed' as activity_type,
          'Placed bet' as description,
          -amount as amount_change,
          timestamp,
          'bet' as category
        FROM bets
        WHERE user_id = $1
        UNION ALL
        SELECT 
          'bet_won' as activity_type,
          'Won bet' as description,
          winnings as amount_change,
          timestamp,
          'bet' as category
        FROM bets
        WHERE user_id = $1 AND result = 'win' AND winnings > 0
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const bettingResult = await db.query(bettingQuery, [userId, limit]);

      // Get tournament activities
      const tournamentQuery = `
        SELECT 
          'tournament_joined' as activity_type,
          'Joined tournament' as description,
          -entry_fee as amount_change,
          joined_at as timestamp,
          'tournament' as category
        FROM tournament_participants tp
        INNER JOIN tournaments t ON tp.tournament_id = t.id
        WHERE tp.user_id = $1
        ORDER BY joined_at DESC
        LIMIT 5
      `;

      const tournamentResult = await db.query(tournamentQuery, [userId]);

      // Get community goal activities
      const communityGoalQuery = `
        SELECT 
          'community_goal_contributed' as activity_type,
          'Contributed to community goal' as description,
          0 as amount_change,
          contributed_at as timestamp,
          'community_goal' as category
        FROM community_goal_contributions cgc
        INNER JOIN community_goals cg ON cgc.goal_id = cg.id
        WHERE cgc.user_id = $1
        ORDER BY contributed_at DESC
        LIMIT 5
      `;

      const communityGoalResult = await db.query(communityGoalQuery, [userId]);

      // Combine all activities
      const allActivities = [
        ...bettingResult.rows,
        ...tournamentResult.rows,
        ...communityGoalResult.rows
      ];

      // Sort by timestamp and limit
      allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const recentActivities = allActivities.slice(0, limit);

      // Format activities
      const formattedActivities = recentActivities.map(activity => ({
        type: activity.activity_type,
        description: activity.description,
        amountChange: parseFloat(activity.amount_change),
        timestamp: activity.timestamp,
        category: activity.category,
        timeAgo: this.getTimeAgo(activity.timestamp)
      }));

      res.json({
        success: true,
        data: {
          activities: formattedActivities
        }
      });

    } catch (error) {
      logger.error('Error getting recent activities:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get recent activities' 
      });
    }
  }

  // Helper function to calculate time ago
  getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      // Get betting statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_bets,
          SUM(amount) as total_wagered,
          SUM(CASE WHEN result = 'win' THEN winnings ELSE 0 END) as total_winnings,
          SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) as wins,
          AVG(amount) as average_bet,
          MAX(winnings) as biggest_win,
          MAX(amount) as biggest_bet
        FROM bets
        WHERE user_id = $1
      `;

      const statsResult = await db.query(statsQuery, [userId]);
      const stats = statsResult.rows[0];

      // Calculate win rate
      const winRate = stats.total_bets > 0 ? (stats.wins / stats.total_bets) * 100 : 0;
      const netProfit = parseFloat(stats.total_winnings || 0) - parseFloat(stats.total_wagered || 0);

      res.json({
        success: true,
        data: {
          totalBets: parseInt(stats.total_bets || 0),
          totalWagered: parseFloat(stats.total_wagered || 0),
          totalWinnings: parseFloat(stats.total_winnings || 0),
          wins: parseInt(stats.wins || 0),
          winRate: Math.round(winRate * 100) / 100,
          averageBet: parseFloat(stats.average_bet || 0),
          biggestWin: parseFloat(stats.biggest_win || 0),
          biggestBet: parseFloat(stats.biggest_bet || 0),
          netProfit: netProfit
        }
      });

    } catch (error) {
      logger.error('Error getting user stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get user statistics' 
      });
    }
  }
}

module.exports = new UserHistoryController();
