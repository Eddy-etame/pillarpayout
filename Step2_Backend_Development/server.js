require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const historyRoutes = require('./routes/history');
const communityGoalsRoutes = require('./routes/communityGoals');
const insuranceRoutes = require('./routes/insurance');
const paymentRoutes = require('./routes/payment');
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
const chatService = require('./services/chatService');
const paymentService = require('./services/paymentService');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

gameEngine.setIo(io);

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/community-goals', communityGoalsRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', apiV1Router);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Basic route for health check
app.get('/', (req, res) => {
  res.send('PillarPayout Backend Server is running');
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.query('SELECT 1 as health');
    const dbStatus = dbHealth.rows.length > 0 ? 'healthy' : 'unhealthy';
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      redis: 'unavailable',
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// WebSocket connection handler
io.on('connection', async (socket) => {
  logger.info('User connected:', socket.id);

  // Join game room
  socket.join('game');

  try {
    // Send current game state to new connection - ENHANCED FOR FRONTEND SYNC
    const gameState = await gameEngine.getGameState();
    socket.emit('game_update', {
      type: 'initial_state',
      data: gameState // ✅ Use fresh state
    });

    // Send chat history to new connection
    const chatHistory = chatService.getChatHistory(50);
    socket.emit('chat_history', chatHistory);

    // Send active users to new connection
    const activeUsers = chatService.getActiveUsers();
    socket.emit('active_users', activeUsers);

    // ✅ CRITICAL: Send crash point information for frontend sync
    if (gameState.crashPoint) {
      socket.emit('game_update', {
        type: 'crash_point_info',
        data: {
          crashPoint: gameState.crashPoint,
          roundId: gameState.roundId
        }
      });
    }
  } catch (error) {
    logger.error('Error sending initial game state:', error);
    // Send basic state as fallback
    socket.emit('game_update', {
      type: 'initial_state',
      data: { gameState: 'waiting', multiplier: 1.0, integrity: 100 }
    });
  }

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
          socket.emit('error', { message: 'Invalid action' });
      }
    } catch (error) {
      logger.error('Error handling player action:', error);
      socket.emit('error', { message: 'Action failed', error: error.message });
    }
  });

  // Handle chat messages
  socket.on('chat_message', (data) => {
    try {
      const { userId, username, message } = data;
      if (userId && username && message) {
        const chatMessage = chatService.sendUserMessage(userId, username, message);
        io.to('game').emit('chat_message', chatMessage);
        logger.info(`Chat message from ${username}: ${message}`);
      }
    } catch (error) {
      logger.error('Error handling chat message:', error);
    }
  });

  // Handle user leaving chat
  socket.on('leave_chat', (data) => {
    try {
      const { userId, username } = data;
      if (userId && username) {
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
    
    // Also emit live bets and round history for sidebar
    const activeBets = Array.from(gameEngine.activeBets.values()).map(bet => ({
      userId: bet.userId,
      username: bet.username || 'Player',
      amount: bet.amount,
      multiplier: gameState.multiplier,
      timestamp: new Date()
    }));
    
    io.to('game').emit('live_bets', activeBets);
    
  } catch (error) {
    logger.error('Error broadcasting game state:', error);
  }
}, 1000); // Update every 1000ms (reduced from 100ms to prevent excessive logging)

// Chat cleanup interval (clean up inactive users every 5 minutes)
setInterval(() => {
  try {
    chatService.cleanupInactiveUsers();
  } catch (error) {
    logger.error('Error cleaning up inactive users:', error);
  }
}, 300000); // Every 5 minutes

// Initialize game engine and payment service
async function initializeGame() {
  try {
    await gameEngine.initialize();
    logger.info('Game engine initialized successfully');
    
    await paymentService.initializeGateways();
    logger.info('Payment service initialized successfully');
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

// Export app for testing
module.exports = app;
