const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const config = require('./config');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Basic route for health check
app.get('/', (req, res) => {
  res.send('PillarPayout Backend Server is running');
});

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
