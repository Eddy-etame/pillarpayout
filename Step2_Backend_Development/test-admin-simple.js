const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('./config');

// Create a simple Express app
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
      console.log('Token verification failed:', err.message);
    }
  }
  next();
});

// Simple admin route for testing
app.get('/api/v1/admin/test', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  res.json({ message: 'Admin test successful', user: req.user });
});

// Generate admin token
const adminToken = jwt.sign({ id: 9999, username: 'testadmin', role: 'admin' }, config.jwtSecret, { expiresIn: '1h' });

async function testAdmin() {
  console.log('Testing admin endpoint...');
  
  try {
    const res = await request(app)
      .get('/api/v1/admin/test')
      .set('Authorization', `Bearer ${adminToken}`);
    
    console.log('Response status:', res.statusCode);
    console.log('Response body:', res.body);
    
    if (res.statusCode === 200) {
      console.log('✅ Admin test successful!');
    } else {
      console.log('❌ Admin test failed!');
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAdmin(); 