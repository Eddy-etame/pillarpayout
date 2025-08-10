const db = require('../db');

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
    console.error('Get rounds history error:', err);
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
    console.error('Get my bets history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
