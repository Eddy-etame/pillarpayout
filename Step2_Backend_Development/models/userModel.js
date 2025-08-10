const db = require('../db');
const logger = require('../utils/logger');

class UserModel {
  async createUser(userData) {
    try {
      const { username, email, password_hash, balance, role } = userData;
      
      const result = await db.query(
        'INSERT INTO users (username, email, password_hash, salt, balance, role, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, username, email, balance, role, created_at',
        [username, email, password_hash, null, balance, role]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async findByUsername(username) {
    try {
      const result = await db.query(
        'SELECT id, username, email, password_hash, balance, role, created_at FROM users WHERE username = $1',
        [username]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  async findByEmail(email) {
    try {
      const result = await db.query(
        'SELECT id, username, email, password_hash, balance, role, created_at FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const result = await db.query(
        'SELECT id, username, email, password_hash, balance, role, created_at FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async updateBalance(userId, newBalance) {
    try {
      const result = await db.query(
        'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2 RETURNING id, balance',
        [newBalance, userId]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user balance:', error);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      const { username, email, role } = updateData;
      
      const result = await db.query(
        'UPDATE users SET username = COALESCE($1, username), email = COALESCE($2, email), role = COALESCE($3, role), updated_at = NOW() WHERE id = $4 RETURNING id, username, email, balance, role, created_at',
        [username, email, role, userId]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId) {
    try {
      const result = await db.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [userId]
      );
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getAllUsers(limit = 100, offset = 0) {
    try {
      const result = await db.query(
        'SELECT id, username, email, balance, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  async getUsersByRole(role, limit = 100, offset = 0) {
    try {
      const result = await db.query(
        'SELECT id, username, email, balance, role, created_at FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [role, limit, offset]
      );
      
      return result.rows;
    } catch (error) {
      logger.error('Error getting users by role:', error);
      throw error;
    }
  }

  async getUserStats() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN role = 'player' THEN 1 END) as player_count,
          SUM(balance) as total_balance,
          AVG(balance) as avg_balance
        FROM users
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }
}

module.exports = new UserModel(); 