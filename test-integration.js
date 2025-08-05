const axios = require('axios');
const io = require('socket.io-client');

console.log('🧪 Starting PillarPayout Integration Tests...\n');

// Test configuration
const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

async function testBackendHealth() {
  console.log('📡 Testing Backend Health...');
  try {
    const response = await axios.get(`${BACKEND_URL}/`);
    console.log('✅ Backend is running:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️ Testing Database Connection...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/health`);
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testGameEngine() {
  console.log('\n🎮 Testing Game Engine...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/v1/game/state`);
    console.log('✅ Game engine is running');
    console.log('   Current state:', response.data.gameState);
    console.log('   Multiplier:', response.data.multiplier);
    return true;
  } catch (error) {
    console.log('❌ Game engine test failed:', error.message);
    return false;
  }
}

function testWebSocketConnection() {
  console.log('\n🔌 Testing WebSocket Connection...');
  return new Promise((resolve) => {
    const socket = io(BACKEND_URL);
    
    socket.on('connect', () => {
      console.log('✅ WebSocket connected successfully');
      socket.disconnect();
      resolve(true);
    });
    
    socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection failed:', error.message);
      resolve(false);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      console.log('❌ WebSocket connection timeout');
      socket.disconnect();
      resolve(false);
    }, 5000);
  });
}

async function testFrontendAccess() {
  console.log('\n🌐 Testing Frontend Access...');
  try {
    const response = await axios.get(FRONTEND_URL);
    console.log('✅ Frontend is accessible');
    return true;
  } catch (error) {
    console.log('❌ Frontend access failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = {
    backend: await testBackendHealth(),
    database: await testDatabaseConnection(),
    gameEngine: await testGameEngine(),
    websocket: await testWebSocketConnection(),
    frontend: await testFrontendAccess()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);
  
  if (allPassed) {
    console.log('\n🚀 PillarPayout is ready for production!');
  } else {
    console.log('\n🔧 Please fix the failed tests before proceeding.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
}); 