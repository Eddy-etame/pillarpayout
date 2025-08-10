const request = require('supertest');
const express = require('express');
const insuranceRoutes = require('./routes/insurance');

const app = express();
app.use(express.json());
app.use('/api/insurance', insuranceRoutes);

async function testInsuranceEndpoints() {
  console.log('🧪 Testing Insurance Endpoints...\n');

  try {
    // Test insurance calculation
    console.log('1. Testing insurance calculation...');
    const calcRes = await request(app)
      .post('/api/insurance/calculate')
      .send({
        betAmount: 100,
        insuranceType: 'basic'
      });

    console.log('Calculation status:', calcRes.statusCode);
    console.log('Calculation body:', calcRes.body);

    // Test insurance options
    console.log('\n2. Testing insurance options...');
    const optionsRes = await request(app)
      .get('/api/insurance/options?betAmount=50');

    console.log('Options status:', optionsRes.statusCode);
    console.log('Options body:', optionsRes.body);

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testInsuranceEndpoints(); 