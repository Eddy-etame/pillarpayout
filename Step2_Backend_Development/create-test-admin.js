const bcrypt = require('bcrypt');
const db = require('./db');

async function createTestAdmin() {
  try {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash, role, is_admin, balance, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = $4, is_admin = $5 RETURNING id, username, email',
      ['testadmin', 'testadmin@pillarpayout.com', hash, 'admin', true, 10000, 'active']
    );
    
    console.log('Test admin created:', result.rows[0]);
    console.log('Username: testadmin');
    console.log('Password: admin123');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createTestAdmin();

