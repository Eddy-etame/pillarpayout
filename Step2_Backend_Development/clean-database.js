const db = require('./db');
const bcrypt = require('bcrypt');

async function cleanDatabase() {
  console.log('🧹 Cleaning Database...\n');

  try {
    // Clean all existing users except the specified ones
    console.log('1. Cleaning existing users...');
    await db.query("DELETE FROM users WHERE email NOT IN ('eddy.etame@enksochools.com', 'etame.eddy01@gmail.com')");
    console.log('✅ Existing users cleaned');

    // Check if the specified users exist
    console.log('\n2. Checking specified users...');
    const user1 = await db.query("SELECT * FROM users WHERE email = 'eddy.etame@enksochools.com'");
    const user2 = await db.query("SELECT * FROM users WHERE email = 'etame.eddy01@gmail.com'");

    // Create test user 1 if not exists
    if (user1.rows.length === 0) {
      console.log('3. Creating test user 1 (eddy.etame@enksochools.com)...');
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      await db.query(
        'INSERT INTO users (username, email, password_hash, salt, balance, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        ['testuser1', 'eddy.etame@enksochools.com', hashedPassword, null, 1000, 'player']
      );
      console.log('✅ Test user 1 created');
    } else {
      console.log('✅ Test user 1 already exists');
    }

    // Create admin user if not exists
    if (user2.rows.length === 0) {
      console.log('4. Creating admin user (etame.eddy01@gmail.com)...');
      const hashedPassword = await bcrypt.hash('AdminPass123!', 10);
      await db.query(
        'INSERT INTO users (username, email, password_hash, salt, balance, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        ['admin', 'etame.eddy01@gmail.com', hashedPassword, null, 10000, 'admin']
      );
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user already exists');
    }

    // Show final user count
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 Total users in database: ${userCount.rows[0].count}`);

    // List all users
    const allUsers = await db.query('SELECT username, email, role FROM users ORDER BY created_at');
    console.log('\n👥 Current users:');
    allUsers.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

cleanDatabase(); 