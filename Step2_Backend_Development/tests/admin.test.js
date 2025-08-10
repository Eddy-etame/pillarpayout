const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');

const app = express();
app.use(express.json());

// Mock admin middleware
app.use((req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    } catch (err) {
      // Token verification failed, but we'll let the middleware handle it
    }
  }
  next();
});

// Simple admin routes for testing
app.get('/api/v1/admin/users', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json([{ id: 1, username: 'testuser', balance: 100 }]);
});

app.get('/api/v1/admin/logs', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json([{ timestamp: new Date().toISOString(), level: 'info', message: 'Test log' }]);
});

// Generate a test admin JWT
const adminToken = jwt.sign({ id: 9999, username: 'testadmin', role: 'admin' }, config.jwtSecret, { expiresIn: '1h' });

describe('Admin API', () => {
  test('GET /api/v1/admin/users returns users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/v1/admin/logs returns logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
}); 