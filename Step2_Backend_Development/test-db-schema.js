const db = require('./db');

async function testDatabaseSchema() {
  console.log('🧪 Testing Database Schema...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const result = await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connected:', result.rows[0].current_time);

    // Check if users table exists
    console.log('\n2. Checking users table structure...');
    const tableInfo = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users table columns:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Test inserting a user
    console.log('\n3. Testing user insertion...');
    const testUser = {
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@gmail.com',
      password_hash: 'test_hash',
      balance: 1000,
      role: 'player'
    };

    const insertResult = await db.query(
      'INSERT INTO users (username, email, password_hash, salt, balance, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, username, email, balance, role, created_at',
      [testUser.username, testUser.email, testUser.password_hash, null, testUser.balance, testUser.role]
    );

    console.log('✅ User inserted successfully:', insertResult.rows[0]);

    // Clean up
    await db.query('DELETE FROM users WHERE username = $1', [testUser.username]);
    console.log('✅ Test user cleaned up');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await db.end();
  }
}

testDatabaseSchema(); 