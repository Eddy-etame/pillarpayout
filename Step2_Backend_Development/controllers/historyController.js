const db = require('../db');
const logger = require('../utils/logger');

exports.getRoundsHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const result = await db.query(
      `SELECT id as roundId, crash_point as "finalMultiplier", server_seed as "serverSeedHash", client_seed as "clientSeedHash", nonce, end_time as "endedAt"
       FROM rounds
       WHERE end_time IS NOT NULL
       ORDER BY end_time DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    logger.error('Get rounds history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getMyBetsHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const roundId = req.query.roundId;

    let query = `
      SELECT id as betId, round_id as "roundId", amount as "betAmount", cashout_multiplier as "cashOutMultiplier",
             amount * cashout_multiplier as winnings, 
             CASE WHEN cashout_multiplier IS NOT NULL THEN 'cashed_out' ELSE 'active' END as status, 
             timestamp as "placedAt"
      FROM bets
      WHERE user_id = $1
    `;
    const params = [userId];

    if (roundId) {
      query += ' AND round_id = $2';
      params.push(roundId);
    }

    query += ' ORDER BY timestamp DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    logger.error('Get my bets history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's round history with detailed information
exports.getUserRoundHistory = async (req, res) => {
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
    logger.error('Error getting user round history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get round history' 
    });
  }
};

// Get recent activities for a user
exports.getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // SIMPLIFIED QUERY - Only use bets table to avoid type casting issues
    const simpleQuery = `
      SELECT 
        'bet_activity' as activity_type,
        'Bet placed' as description,
        -amount as amount_change,
        timestamp,
        'bet' as category
      FROM bets
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;

    const result = await db.query(simpleQuery, [userId, limit]);

    // Format activities
    const formattedActivities = result.rows.map(activity => ({
      type: activity.activity_type,
      description: activity.description,
      amountChange: parseFloat(activity.amount_change),
      timestamp: activity.timestamp,
      category: activity.category,
      timeAgo: getTimeAgo(activity.timestamp)
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
};

// Helper function to calculate time ago
function getTimeAgo(timestamp) {
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
