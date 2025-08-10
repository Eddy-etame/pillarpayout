const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testEndpoints() {
  console.log('🧪 Testing API Endpoints...\n');

  try {
    // Test health check
    console.log('1. Testing health check...');
    const health = await axios.get(`${BASE_URL}/`);
    console.log('✅ Health check:', health.data);

    // Test user registration
    console.log('\n2. Testing user registration...');
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'password123'
    };
    
    try {
      const register = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
      console.log('✅ Registration:', register.status, register.data);
    } catch (error) {
      console.log('❌ Registration failed:', error.response?.status, error.response?.data);
    }

    // Test email validation
    console.log('\n3. Testing email validation...');
    try {
      const emailValidation = await axios.post(`${BASE_URL}/api/user/validate-email`, {
        email: 'test@example.com'
      });
      console.log('✅ Email validation:', emailValidation.status, emailValidation.data);
    } catch (error) {
      console.log('❌ Email validation failed:', error.response?.status, error.response?.data);
    }

    // Test history endpoints
    console.log('\n4. Testing history endpoints...');
    try {
      const rounds = await axios.get(`${BASE_URL}/api/history/rounds`);
      console.log('✅ Rounds history:', rounds.status, rounds.data.length, 'rounds');
    } catch (error) {
      console.log('❌ Rounds history failed:', error.response?.status, error.response?.data);
    }

    // Test community goals
    console.log('\n5. Testing community goals...');
    try {
      const goals = await axios.get(`${BASE_URL}/api/community-goals`);
      console.log('✅ Community goals:', goals.status, goals.data.length, 'goals');
    } catch (error) {
      console.log('❌ Community goals failed:', error.response?.status, error.response?.data);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints(); 