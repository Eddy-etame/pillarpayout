const db = require('../db');

exports.getUsers = async () => {
  const result = await db.query('SELECT id as userId, username, balance, created_at as "createdAt" FROM users ORDER BY created_at DESC LIMIT 100');
  return result.rows;
};

exports.getTransactions = async () => {
  const result = await db.query('SELECT id as transactionId, user_id as userId, type, amount, status, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 100');
  return result.rows;
};

exports.getUserById = async (userId) => {
  const result = await db.query('SELECT id, balance FROM users WHERE id = $1', [userId]);
  return result.rows[0];
};

exports.updateUserBalance = async (userId, newBalance) => {
  await db.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
};

exports.insertCommunityGoal = async (goal) => {
  const result = await db.query(
    'INSERT INTO community_goals (name, target_height, reward_amount, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [goal.name, goal.targetHeight, goal.rewardAmount, goal.startDate, goal.endDate, 'active']
  );
  return result.rows[0].id;
}; 