const adminModel = require('../models/adminModel');
const logger = require('winston').createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [new (require('winston').transports.Console)()],
});

exports.listUsers = async () => {
  return await adminModel.getUsers();
};

exports.listTransactions = async () => {
  return await adminModel.getTransactions();
};

exports.adjustBalance = async (userId, amount, reason) => {
  const user = await adminModel.getUserById(userId);
  if (!user) throw new Error('User not found');
  const newBalance = parseFloat(user.balance) + amount;
  await adminModel.updateUserBalance(userId, newBalance);
  logger.info(`Admin adjusted balance for user ${userId} by ${amount}. Reason: ${reason}`);
  return newBalance;
};

exports.updateGameParameters = async (params) => {
  // This would update a config table or in-memory config; here we just log and return success
  logger.info('Admin updated game parameters', params);
  return true;
};

exports.createCommunityGoal = async (goal) => {
  const goalId = await adminModel.insertCommunityGoal(goal);
  logger.info(`Admin created community goal: ${goal.name}`);
  return goalId;
};

exports.getLogs = async () => {
  // In a real app, fetch logs from a log store or file. Here, return a stub.
  return [
    { timestamp: new Date().toISOString(), level: 'info', message: 'Stub log entry' }
  ];
}; 