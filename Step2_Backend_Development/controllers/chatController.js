const Joi = require('joi');
const chatService = require('../services/chatService');
const logger = require('../utils/logger');

// Validation schemas
const sendMessageSchema = Joi.object({
  message: Joi.string().min(1).max(200).required()
});

/**
 * @swagger
 * /api/v1/chat/history:
 *   get:
 *     summary: Get chat history
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to return
 *     responses:
 *       200:
 *         description: Chat history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: integer
 *                   username:
 *                     type: string
 *                   message:
 *                     type: string
 *                   roundId:
 *                     type: integer
 *                     nullable: true
 *                   timestamp:
 *                     type: string
 *                   type:
 *                     type: string
 *                     enum: [chat, system]
 */
const getChatHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = chatService.getChatHistory(limit);
    
    res.json(history);
  } catch (error) {
    logger.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
};

/**
 * @swagger
 * /api/v1/chat/send:
 *   post:
 *     summary: Send a chat message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: object
 *       400:
 *         description: Invalid message or rate limited
 *       401:
 *         description: Unauthorized
 */
const sendMessage = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = sendMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const userId = req.user.id;
    const { message } = value;
    const roundId = req.body.roundId || null;

    // Send message through chat service
    const chatMessage = await chatService.sendMessage(userId, message, roundId);
    
    res.json({
      success: true,
      message: chatMessage
    });
  } catch (error) {
    logger.error('Error sending chat message:', error);
    
    if (error.message.includes('rate limited') || error.message.includes('Please wait')) {
      res.status(429).json({ error: error.message });
    } else if (error.message.includes('prohibited content') || error.message.includes('too long')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
};

/**
 * @swagger
 * /api/v1/chat/users:
 *   get:
 *     summary: Get active chat users
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Active users list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   username:
 *                     type: string
 *                   lastActivity:
 *                     type: number
 */
const getActiveUsers = async (req, res) => {
  try {
    const activeUsers = chatService.getActiveUsers();
    res.json(activeUsers);
  } catch (error) {
    logger.error('Error getting active users:', error);
    res.status(500).json({ error: 'Failed to get active users' });
  }
};

/**
 * @swagger
 * /api/v1/chat/stats:
 *   get:
 *     summary: Get chat statistics
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: Chat statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeUsers:
 *                   type: integer
 *                 totalMessages:
 *                   type: integer
 *                 lastActivity:
 *                   type: string
 *                   nullable: true
 */
const getChatStats = async (req, res) => {
  try {
    const stats = chatService.getChatStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting chat stats:', error);
    res.status(500).json({ error: 'Failed to get chat stats' });
  }
};

/**
 * @swagger
 * /api/v1/chat/clear:
 *   post:
 *     summary: Clear chat history (Admin only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Chat history cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const clearChatHistory = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    chatService.clearChatHistory();
    
    res.json({
      success: true,
      message: 'Chat history cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
};

/**
 * @swagger
 * /api/v1/chat/ban:
 *   post:
 *     summary: Ban user from chat (Admin only)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: User banned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 */
const banUser = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const banMessage = chatService.banUserFromChat(userId, reason);
    
    res.json({
      success: true,
      message: 'User banned successfully',
      banMessage
    });
  } catch (error) {
    logger.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
};

module.exports = {
  getChatHistory,
  sendMessage,
  getActiveUsers,
  getChatStats,
  clearChatHistory,
  banUser
}; 