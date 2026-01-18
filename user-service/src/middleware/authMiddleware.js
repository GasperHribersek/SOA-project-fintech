const jwt = require('jsonwebtoken');
const { getLogger } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

// Get logger instance
let loggerInstance = null;
try {
  loggerInstance = getLogger('user-service');
  console.log('Logger initialized in authMiddleware:', typeof loggerInstance, loggerInstance ? 'OK' : 'NULL');
} catch (error) {
  console.error('Failed to initialize logger in authMiddleware:', error.message);
}

/**
 * Middleware to verify JWT token from Authorization header
 * Can verify locally (if secret is shared) or by calling auth-service
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT locally using shared secret
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Attach user info to request
      req.user = {
        userId: decoded.sub || decoded.userId,
        sub: decoded.sub,
        name: decoded.name,
        email: decoded.email
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      throw error;
    }
  } catch (error) {
    res.status(500).json({ error: 'Token verification failed', details: error.message });
  }
};

/**
 * Alternative: Verify token by calling auth-service (if secret is not shared)
 */
const verifyTokenViaService = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Call auth-service to verify token - propagate correlation ID
    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // Propagate correlation ID if present
    const correlationId = req.correlationId || 'no-correlation-id';
    if (req.correlationId) {
      headers['X-Correlation-Id'] = req.correlationId;
    }

    // LOG: Calling auth-service for token validation
    if (loggerInstance && loggerInstance.info) {
      await loggerInstance.info(
        `${AUTH_SERVICE_URL}/api/auth/validate-token`,
        correlationId,
        'Calling auth-service to validate token',
        { action: 'validate_token_request', targetService: 'auth-service' }
      );
    }

    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/validate-token`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (loggerInstance && loggerInstance.warn) {
        await loggerInstance.warn(
          `${AUTH_SERVICE_URL}/api/auth/validate-token`,
          correlationId,
          'Auth-service token validation failed',
          { action: 'validate_token_failed', status: response.status }
        );
      }
      return res.status(401).json({ error: errorData.error || 'Invalid token' });
    }

    const data = await response.json();
    if (!data.valid) {
      if (loggerInstance && loggerInstance.warn) {
        await loggerInstance.warn(
          `${AUTH_SERVICE_URL}/api/auth/validate-token`,
          correlationId,
          'Auth-service returned invalid token',
          { action: 'validate_token_invalid' }
        );
      }
      return res.status(401).json({ error: data.error || 'Invalid token' });
    }

    // LOG: Token validated successfully
    if (loggerInstance && loggerInstance.info) {
      await loggerInstance.info(
        `${AUTH_SERVICE_URL}/api/auth/validate-token`,
        correlationId,
        'Token validated successfully by auth-service',
        { action: 'validate_token_success', userId: data.user?.userId }
      );
    }

    // Attach user info to request
    req.user = data.user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Token verification failed', details: error.message });
  }
};

module.exports = {
  verifyToken,
  verifyTokenViaService
};
