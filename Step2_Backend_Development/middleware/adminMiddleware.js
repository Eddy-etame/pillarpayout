const adminService = require('../services/adminService');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

// Enhanced rate limiting for admin endpoints
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (more restrictive)
  message: 'Too many admin requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for admin endpoint from IP: ${req.ip}`);
    res.status(429).json({ 
      error: 'Too many admin requests from this IP, please try again later.',
      retryAfter: Math.ceil(15 * 60 / 1000) // 15 minutes in seconds
    });
  }
});

// IP blocking middleware
const ipBlockingMiddleware = async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Check if IP is blocked
    const isBlocked = await adminService.isIPBlocked(clientIP);
    if (isBlocked) {
      logger.warn(`Blocked IP ${clientIP} attempted to access admin endpoint: ${req.path}`);
      return res.status(403).json({ 
        error: 'Access denied from this IP address',
        reason: 'IP address is blocked'
      });
    }

    // Check for suspicious patterns
    await adminService.recordSuspiciousActivity(clientIP, `Admin endpoint access: ${req.path}`);
    
    next();
  } catch (error) {
    logger.error('IP blocking middleware error:', error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
};

// Admin authentication middleware with enhanced security
const adminAuthMiddleware = async (req, res, next) => {
  try {
    console.log('Admin middleware - req.user:', req.user);
    console.log('Admin middleware - req.user.isAdmin:', req.user?.isAdmin);
    
    // Check if user is authenticated
    if (!req.user) {
      console.log('Admin middleware - No user found');
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      console.log(`Admin middleware - User ${req.user.id} is not admin. isAdmin: ${req.user.isAdmin}, role: ${req.user.role}`);
      logger.warn(`Non-admin user ${req.user.id} attempted to access admin endpoint: ${req.path}`);
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'ADMIN_REQUIRED'
      });
    }

    // Check if user account is active (if status exists)
    if (req.user.status && req.user.status !== 'active') {
      logger.warn(`Inactive admin user ${req.user.id} attempted to access admin endpoint: ${req.path}`);
      return res.status(403).json({ 
        error: 'Account is not active',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if admin session is recent (within last 2 hours) - optional check
    if (req.user.last_login) {
      const lastLogin = new Date(req.user.last_login);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      if (lastLogin < twoHoursAgo) {
        logger.warn(`Admin session expired for user ${req.user.id}`);
        return res.status(401).json({ 
          error: 'Admin session expired, please login again',
          code: 'SESSION_EXPIRED'
        });
      }
    }

    // Log admin action for audit trail
    logger.info(`Admin action: User ${req.user.id} (${req.user.username}) accessed ${req.path}`, {
      userId: req.user.id,
      username: req.user.username,
      endpoint: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    next();
  } catch (error) {
    logger.error('Admin auth middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Request logging middleware for admin endpoints
const adminLoggingMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  logger.info(`Admin request started: ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    username: req.user?.username,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.info(`Admin request completed: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      username: req.user?.username,
      timestamp: new Date().toISOString()
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Security headers middleware for admin endpoints
const adminSecurityHeaders = (req, res, next) => {
  // Additional security headers for admin endpoints
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Custom admin security header
  res.setHeader('X-Admin-Access', 'restricted');
  
  next();
};

// Input validation middleware for admin endpoints
const adminInputValidation = (req, res, next) => {
  try {
    // Validate request body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      // Check for potentially dangerous content
      const bodyString = JSON.stringify(req.body);
      
      // Check for SQL injection patterns
      const sqlPatterns = [
        /(\b(select|insert|update|delete|drop|create|alter|exec|execute|union|script)\b)/i,
        /(\b(union|select|insert|update|delete|drop|create|alter)\s+.*\bfrom\b)/i,
        /(\b(union|select|insert|update|delete|drop|create|alter)\s+.*\bwhere\b)/i
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(bodyString)) {
          logger.warn(`Potential SQL injection attempt from IP ${req.ip} in admin endpoint: ${req.path}`);
          return res.status(400).json({ 
            error: 'Invalid input detected',
            code: 'INVALID_INPUT'
          });
        }
      }

      // Check for XSS patterns
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
      ];
      
      for (const pattern of xssPatterns) {
        if (pattern.test(bodyString)) {
          logger.warn(`Potential XSS attempt from IP ${req.ip} in admin endpoint: ${req.path}`);
          return res.status(400).json({ 
            error: 'Invalid input detected',
            code: 'INVALID_INPUT'
          });
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Admin input validation error:', error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
};

// Export all middleware functions
module.exports = {
  adminRateLimit,
  ipBlockingMiddleware,
  adminAuthMiddleware,
  adminLoggingMiddleware,
  adminSecurityHeaders,
  adminInputValidation
};
