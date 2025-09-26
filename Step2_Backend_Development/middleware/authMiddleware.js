const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }
  const token = authHeader.split(' ')[1];
  
  console.log('Auth middleware - Token received:', token.substring(0, 20) + '...');
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('Auth middleware - Token decoded successfully:', decoded);
    // Attach user info to request
    req.user = { 
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    // Check if user exists in database and get is_admin status
    try {
      const result = await db.query('SELECT id, username, email, role, is_admin, status, created_at FROM users WHERE id = $1', [decoded.id]);
      console.log('Auth middleware - Database query result:', result.rows[0]);
      
      if (result.rows.length === 0) {
        console.log('Auth middleware - User not found in database');
        return res.status(401).json({ error: 'User not found' });
      }
      
      // Set isAdmin property based on role or is_admin field
      req.user.isAdmin = result.rows[0].is_admin || result.rows[0].role === 'admin';
      // Set additional properties that admin middleware expects
      req.user.status = result.rows[0].status;
      req.user.created_at = result.rows[0].created_at;
      console.log('Auth middleware - User object set:', req.user);
      console.log('Auth middleware - isAdmin set to:', req.user.isAdmin);
      next();
    } catch (dbError) {
      console.error('Auth middleware - Database error:', dbError);
      return res.status(500).json({ error: 'Database error during authentication' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
