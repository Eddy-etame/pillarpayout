const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authorization header missing or malformed',
        code: 'MISSING_AUTH_HEADER'
      });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      } else {
        console.error('JWT verification error:', jwtError);
        return res.status(500).json({ 
          success: false,
          error: 'Token verification error',
          code: 'JWT_ERROR'
        });
      }
    }
    
    // Attach user info to request
    req.user = { 
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    
    // Check if user exists in database and get is_admin status
    let result;
    try {
      result = await db.query(
        'SELECT id, username, email, role, is_admin, status, created_at FROM users WHERE id = $1', 
        [decoded.id]
      );
    } catch (dbError) {
      console.error('Database error in auth middleware:', dbError);
      return res.status(500).json({ 
        success: false,
        error: 'Database error during authentication',
        code: 'DATABASE_ERROR'
      });
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found in database',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const userData = result.rows[0];
    
    // Check if user account is active
    if (userData.status && userData.status !== 'active') {
      return res.status(401).json({ 
        success: false,
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    // Set isAdmin property based on role or is_admin field
    req.user.isAdmin = userData.is_admin || userData.role === 'admin';
    // Set additional properties that admin middleware expects
    req.user.status = userData.status;
    req.user.created_at = userData.created_at;
    
    next();
  } catch (error) {
    console.error('Unexpected error in auth middleware:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = authMiddleware;
