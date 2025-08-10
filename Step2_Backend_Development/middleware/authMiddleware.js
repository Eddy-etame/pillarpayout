const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    // Attach user info to request
    req.user = { 
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    // Check if user exists in database
    const result = await db.query('SELECT id, username, email, role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
