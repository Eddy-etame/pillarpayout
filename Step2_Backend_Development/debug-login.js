const request = require('supertest');
const express = require('express');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const historyRoutes = require('./routes/history');
const communityGoalsRoutes = require('./routes/communityGoals');
const insuranceRoutes = require('./routes/insurance');

const app = express();
app.use(express.json());

// Add all routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/community-goals', communityGoalsRoutes);
app.use('/api/insurance', insuranceRoutes);

async function debugLogin() {
  console.log('🧪 Debugging Login...\n');

  try {
    // Test login with username
    console.log('1. Testing login with username...');
    const loginRes1 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'testuser1', password: 'TestPass123!' });
    
    console.log('Login with username status:', loginRes1.statusCode);
    console.log('Login with username body:', loginRes1.body);

    // Test login with email
    console.log('\n2. Testing login with email...');
    const loginRes2 = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'eddy.etame@enksochools.com', password: 'TestPass123!' });
    
    console.log('Login with email status:', loginRes2.statusCode);
    console.log('Login with email body:', loginRes2.body);

    if (loginRes1.statusCode === 200 || loginRes2.statusCode === 200) {
      const token = loginRes1.body.token || loginRes2.body.token;
      console.log('\n3. Testing profile with token...');
      const profileRes = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);
      
      console.log('Profile status:', profileRes.statusCode);
      console.log('Profile body:', profileRes.body);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

debugLogin(); 