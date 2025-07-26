const db = require('../db');

exports.getRoundsHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const result = await db.query(
      `SELECT id as roundId, final_multiplier as "finalMultiplier", server_seed as "serverSeedHash", client_seed_hash as "clientSeedHash", crash_point_nonce as nonce, ended_at as "endedAt"
       FROM rounds
       WHERE ended_at IS NOT NULL
       ORDER BY ended_at DESC
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
      SELECT id as betId, round_id as "roundId", bet_amount as "betAmount", cash_out_multiplier as "cashOutMultiplier",
             winnings, status, placed_at as "placedAt"
      FROM bets
      WHERE user_id = $1
    `;
    const params = [userId];

    if (roundId) {
      query += ' AND round_id = $2';
      params.push(roundId);
    }

    query += ' ORDER BY placed_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get my bets history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
