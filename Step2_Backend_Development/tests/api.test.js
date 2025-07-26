const request = require('supertest');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/user');
const historyRoutes = require('../routes/history');
const communityGoalsRoutes = require('../routes/communityGoals');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../db');
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/community-goals', communityGoalsRoutes);

let server;
let token;

beforeAll(async () => {
  // Clean up test user before running tests
  try {
    await db.query('DELETE FROM users WHERE email = $1', ['testuser@example.com']);
    console.log('Test user cleaned up');
  } catch (err) {
    console.log('No test user to clean up or cleanup failed:', err.message);
  }
  
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(resolve));
});

afterAll(async () => {
  // Clean up test user after tests
  try {
    await db.query('DELETE FROM users WHERE email = $1', ['testuser@example.com']);
    console.log('Test user cleaned up after tests');
  } catch (err) {
    console.log('Cleanup after tests failed:', err.message);
  }
  
  await new Promise((resolve) => server.close(resolve));
});

describe('Authentication and User APIs', () => {
  const testUser = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'TestPass123!'
  };

  test('Register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('message', 'User registered successfully');
    expect(res.body).toHaveProperty('userId');
  });

  test('Register with invalid email should fail', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...testUser, email: 'invalid-email' });
    expect(res.statusCode).toBe(400);
  });

  test('Login with registered user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: testUser.username, password: testUser.password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  test('Login with email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('Get user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('username', testUser.username);
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
