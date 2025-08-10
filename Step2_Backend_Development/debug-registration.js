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

async function debugRegistration() {
  console.log('🧪 Debugging Registration...\n');

  const testUser = {
    username: 'testuser' + Date.now(),
    email: 'test' + Date.now() + '@gmail.com',
    password: 'TestPass123!'
  };

  console.log('Test user:', testUser);

  try {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    console.log('Response status:', res.statusCode);
    console.log('Response body:', res.body);

    if (res.statusCode === 201) {
      console.log('✅ Registration successful!');
      
      // Test login
      console.log('\n🧪 Testing Login...');
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ identifier: testUser.username, password: testUser.password });
      
      console.log('Login status:', loginRes.statusCode);
      console.log('Login body:', loginRes.body);
      
      if (loginRes.statusCode === 200) {
        console.log('✅ Login successful!');
        
        // Test profile with token
        console.log('\n🧪 Testing Profile...');
        const profileRes = await request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${loginRes.body.token}`);
        
        console.log('Profile status:', profileRes.statusCode);
        console.log('Profile body:', profileRes.body);
      } else {
        console.log('❌ Login failed');
      }
    } else {
      console.log('❌ Registration failed');
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

debugRegistration(); 