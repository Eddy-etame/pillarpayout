const db = require('../db');
const winston = require('winston');
const Joi = require('joi');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

const adjustBalanceSchema = Joi.object({
  userId: Joi.number().required(),
  amount: Joi.number().required(),
  reason: Joi.string().allow('').optional(),
});

const gameParametersSchema = Joi.object({
  minBet: Joi.number().min(0).optional(),
  maxBet: Joi.number().min(0).optional(),
  rtpFactor: Joi.number().min(0).max(1).optional(),
  specialEventProbabilities: Joi.object().optional(),
  integrityMeterRate: Joi.number().min(0).optional(),
});

const createCommunityGoalSchema = Joi.object({
  name: Joi.string().required(),
  targetHeight: Joi.number().required(),
  rewardAmount: Joi.number().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

exports.listUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT id as userId, username, balance, created_at as "createdAt" FROM users ORDER BY created_at DESC LIMIT 100');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

exports.listTransactions = async (req, res) => {
  try {
    const result = await db.query('SELECT id as transactionId, user_id as userId, type, amount, status, timestamp FROM transactions ORDER BY timestamp DESC LIMIT 100');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

exports.adjustBalance = async (req, res) => {
  const { error } = adjustBalanceSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const { userId, amount, reason } = req.body;
  try {
    const userRes = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const newBalance = parseFloat(userRes.rows[0].balance) + amount;
    await db.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
    logger.info(`Admin adjusted balance for user ${userId} by ${amount}. Reason: ${reason}`);
    res.status(200).json({ message: 'Balance adjusted successfully', newBalance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
};

exports.updateGameParameters = async (req, res) => {
  const { error } = gameParametersSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  logger.info('Admin updated game parameters', req.body);
  res.status(200).json({ message: 'Game parameters updated successfully' });
};

exports.createCommunityGoal = async (req, res) => {
  const { error } = createCommunityGoalSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  const { name, targetHeight, rewardAmount, startDate, endDate } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO community_goals (name, target_blocks, reward, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, targetHeight, `cash_reward:${rewardAmount}`, startDate, endDate, 'active']
    );
    logger.info(`Admin created community goal: ${name}`);
    res.status(201).json({ message: 'Community goal created', goalId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create community goal' });
  }
};

exports.getLogs = async (req, res) => {
  res.status(200).json([
    { timestamp: new Date().toISOString(), level: 'info', message: 'Stub log entry' }
  ]);
}; 