const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Public routes (no authentication required)
router.get('/history', chatController.getChatHistory);
router.get('/users', chatController.getActiveUsers);
router.get('/stats', chatController.getChatStats);

// Protected routes (authentication required)
router.post('/send', authMiddleware, chatController.sendMessage);

// Admin routes (admin authentication required)
router.post('/clear', authMiddleware, adminMiddleware.adminAuthMiddleware, chatController.clearChatHistory);
router.post('/ban', authMiddleware, adminMiddleware.adminAuthMiddleware, chatController.banUser);

module.exports = router; 