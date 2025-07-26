require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const historyRoutes = require('./routes/history');
const communityGoalsRoutes = require('./routes/communityGoals');
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');
const config = require('./config');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const adminRoutes = require('./routes/admin');
const apiV1Router = require('./routes/api');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const winston = require('winston');
const gameEngine = require('./services/gameEngine');
const logger = require('./utils/logger');
const chatService = require('./services/chatService'); // Added

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PillarPayout API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js', './controllers/*.js'],
});

app.use(express.json());
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/community-goals', communityGoalsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/v1', apiV1Router);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic route for health check
app.get('/', (req, res) => {
  res.send('PillarPayout Backend Server is running');
});

// WebSocket connection handler
io.on('connection', (socket) => {
  logger.info('User connected:', socket.id);

  // Join game room
  socket.join('game');

  // Send current game state to new connection
  socket.emit('game_state', {
    type: 'initial_state',
    data: gameEngine.getGameState()
  });

  // Send chat history to new connection
  const chatHistory = chatService.getChatHistory(50);
  socket.emit('chat_history', chatHistory);

  // Send active users to new connection
  const activeUsers = chatService.getActiveUsers();
  socket.emit('active_users', activeUsers);

  // Handle user joining chat
  socket.on('join_chat', (data) => {
    try {
      const { userId, username } = data;
      if (userId && username) {
        chatService.addActiveUser(userId, username, socket.id);
        
        // Broadcast user joined message
        const joinMessage = chatService.sendGameEventMessage('user_joined', { username });
        io.to('game').emit('chat_message', joinMessage);
        
        // Broadcast updated active users
        const updatedActiveUsers = chatService.getActiveUsers();
        io.to('game').emit('active_users', updatedActiveUsers);
        
        logger.info(`User ${username} joined chat`);
      }
    } catch (error) {
      logger.error('Error handling join_chat:', error);
    }
  });

  // Handle player actions
  socket.on('player_action', async (data) => {
    try {
      const { action, amount, userId } = data;

      switch (action) {
        case 'bet':
          if (userId && amount) {
            const result = await gameEngine.placeBet(userId, amount);
            socket.emit('bet_result', result);
          }
          break;
        case 'cashout':
          if (userId) {
            const result = await gameEngine.cashOut(userId);
            socket.emit('cashout_result', result);
          }
          break;
        default:
          logger.warn('Unknown player action:', action);
      }
    } catch (error) {
      logger.error('Error handling player action:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Handle chat messages
  socket.on('chat_message', async (data) => {
    try {
      const { userId, message, roundId } = data;

      if (!userId || !message) {
        socket.emit('chat_error', { message: 'Missing userId or message' });
        return;
      }

      // Send message through chat service
      const chatMessage = await chatService.sendMessage(userId, message, roundId);
      
      // Broadcast chat message to all connected clients
      io.to('game').emit('chat_message', chatMessage);
      
      logger.info(`Chat message from user ${userId}: ${message}`);
    } catch (error) {
      logger.error('Error handling chat message:', error);
      socket.emit('chat_error', { message: error.message });
    }
  });

  // Handle user leaving
  socket.on('user_leave', (data) => {
    try {
      const { userId, username } = data;
      if (userId) {
        chatService.removeActiveUser(userId);
        
        // Broadcast user left message
        const leaveMessage = chatService.sendGameEventMessage('user_left', { username });
        io.to('game').emit('chat_message', leaveMessage);
        
        // Broadcast updated active users
        const updatedActiveUsers = chatService.getActiveUsers();
        io.to('game').emit('active_users', updatedActiveUsers);
        
        logger.info(`User ${username} left chat`);
      }
    } catch (error) {
      logger.error('Error handling user_leave:', error);
    }
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected:', socket.id);
  });
});

// Game state update interval (broadcast to all connected clients)
setInterval(async () => {
  try {
    const gameState = await gameEngine.getGameState();
    io.to('game').emit('game_update', {
      type: 'state_update',
      data: gameState
    });
  } catch (error) {
    logger.error('Error broadcasting game state:', error);
  }
}, 100); // Update every 100ms

// Chat cleanup interval (clean up inactive users every 5 minutes)
setInterval(() => {
  try {
    chatService.cleanupInactiveUsers();
  } catch (error) {
    logger.error('Error cleaning up inactive users:', error);
  }
}, 300000); // Every 5 minutes

// Initialize game engine
async function initializeGame() {
  try {
    await gameEngine.initialize();
    logger.info('Game engine initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize game engine:', error);
    process.exit(1);
  }
}

// Start server
const PORT = config.port;
server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  await initializeGame();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  gameEngine.cleanup();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  gameEngine.cleanup();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
