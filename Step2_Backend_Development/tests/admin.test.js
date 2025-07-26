const request = require('supertest');
const express = require('express');
const http = require('http');
const adminRoutes = require('../routes/admin');
const jwt = require('jsonwebtoken');
const db = require('../db');

const app = express();
app.use(express.json());
app.use('/api/v1/admin', adminRoutes);

// Generate a test admin JWT
const adminToken = jwt.sign({ userId: 9999, username: 'admin', role: 'admin' }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

beforeAll(async () => {
  // Insert a test admin user if not exists
  await db.query('INSERT INTO users (id, username, email, password_hash, balance, role) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING', [9999, 'admin', 'etame.eddy01@gmail.com', 'testhash', 1000, 'admin']);
});

afterAll(async () => {
  // Clean up test admin user
  await db.query('DELETE FROM users WHERE id = $1', [9999]);
});

describe('Admin API', () => {
  test('GET /api/v1/admin/users returns users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/v1/admin/transactions returns transactions', async () => {
    const res = await request(app)
      .get('/api/v1/admin/transactions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/v1/admin/adjust-balance validates input', async () => {
    const res = await request(app)
      .post('/api/v1/admin/adjust-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: 9999 }); // missing amount
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/v1/admin/adjust-balance adjusts balance', async () => {
    const res = await request(app)
      .post('/api/v1/admin/adjust-balance')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: 9999, amount: 10, reason: 'test' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('newBalance');
  });

  test('PATCH /api/v1/admin/game-parameters validates input', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/game-parameters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minBet: -1 }); // invalid
    expect(res.statusCode).toBe(400);
  });

  test('PATCH /api/v1/admin/game-parameters updates parameters', async () => {
    const res = await request(app)
      .patch('/api/v1/admin/game-parameters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minBet: 1, maxBet: 100 });
    expect(res.statusCode).toBe(200);
  });

  test('POST /api/v1/admin/create-community-goal validates input', async () => {
    const res = await request(app)
      .post('/api/v1/admin/create-community-goal')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Goal' }); // missing fields
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/v1/admin/create-community-goal creates goal', async () => {
    const res = await request(app)
      .post('/api/v1/admin/create-community-goal')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Goal',
        targetHeight: 1000,
        rewardAmount: 100,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString()
      });
    expect([200, 201]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('goalId');
  });

  test('GET /api/v1/admin/logs returns logs', async () => {
    const res = await request(app)
      .get('/api/v1/admin/logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
}); 