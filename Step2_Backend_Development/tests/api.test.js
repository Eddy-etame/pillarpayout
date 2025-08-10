const request = require('supertest');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/user');
const historyRoutes = require('../routes/history');
const communityGoalsRoutes = require('../routes/communityGoals');
const insuranceRoutes = require('../routes/insurance');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db');

// Create a test app with all routes
const app = express();
app.use(express.json());

// Add all routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/community-goals', communityGoalsRoutes);
app.use('/api/insurance', insuranceRoutes);

let server;
let token;
let testUserEmail;

beforeAll(async () => {
  // Create unique test user data
  testUserEmail = 'test_' + Date.now() + '@gmail.com';
  
  // Clean up test user before running tests
  try {
    await db.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    console.log('Test user cleaned up');
  } catch (err) {
    console.log('No test user to clean up or cleanup failed:', err.message);
  }
  
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve)); // Use port 0 for random port
});

afterAll(async () => {
  // Clean up test user after tests
  try {
    await db.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    console.log('Test user cleaned up after tests');
  } catch (err) {
    console.log('Cleanup after tests failed:', err.message);
  }
  
  await new Promise((resolve) => server.close(resolve));
});

describe('Authentication and User APIs', () => {
  const testUser = {
    username: 'testuser' + Date.now(),
    email: 'eddy.etame@enkoschools.com',
    password: 'TestPass123!'
  };

  it('should fail to register with existing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(res.statusCode).toBe(409); // Conflict - email already exists
  }, 15000); // 15 second timeout

  it('should login with existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'testuser1', password: 'TestPass123!' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should login with email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'eddy.etame@enkoschools.com', password: 'TestPass123!' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('Get user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('username', 'testuser1');
  });

  test('Get user profile without token should fail', async () => {
    const res = await request(app)
      .get('/api/user/profile');
    expect(res.statusCode).toBe(401);
  });
});

describe('History APIs', () => {
  test('Get rounds history', async () => {
    const res = await request(app)
      .get('/api/history/rounds');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('Get my bets history without token should fail', async () => {
    const res = await request(app)
      .get('/api/history/my-bets');
    expect(res.statusCode).toBe(401);
  });

  test('Get my bets history with token', async () => {
    const res = await request(app)
      .get('/api/history/my-bets')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Community Goals API', () => {
  test('Get community goals', async () => {
    const res = await request(app)
      .get('/api/community-goals');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
