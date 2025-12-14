const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

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

    // Call auth-service to verify token
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/validate-token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(401).json({ error: errorData.error || 'Invalid token' });
    }

    const data = await response.json();
    if (!data.valid) {
      return res.status(401).json({ error: data.error || 'Invalid token' });
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
