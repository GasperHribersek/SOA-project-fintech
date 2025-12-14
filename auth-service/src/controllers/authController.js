const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3002';

// POST: Register a new user (creates auth credentials)
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const pool = getPool();
    
    const [result] = await pool.query(
      'INSERT INTO auth_credentials (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );
    
    const userId = result.insertId;
    
    // Notify user-service to create user profile
    try {
      await fetch(`${USER_SERVICE_URL}/api/users/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, email })
      });
    } catch (err) {
      console.log('User service notification failed (may not be running):', err.message);
    }
    
    res.status(201).json({
      message: 'User registered successfully',
      userId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Registration failed', details: error.message });
  }
};

// POST: Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM auth_credentials WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Store session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
};

// POST: Logout (invalidate current token)
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const pool = getPool();
    
    await pool.query('DELETE FROM sessions WHERE token = ?', [token]);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed', details: error.message });
  }
};

// GET: Validate token
exports.validateToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ valid: false, error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists and is not expired
    const pool = getPool();
    const [sessions] = await pool.query(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    
    if (sessions.length === 0) {
      return res.status(401).json({ valid: false, error: 'Session expired or invalid' });
    }
    
    res.json({
      valid: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        username: decoded.username
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ valid: false, error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ valid: false, error: 'Invalid token' });
    }
    res.status(500).json({ valid: false, error: 'Token validation failed' });
  }
};

// GET: Get user sessions
exports.getUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();
    
    const [sessions] = await pool.query(
      'SELECT id, created_at, expires_at FROM sessions WHERE user_id = ? AND expires_at > NOW()',
      [userId]
    );
    
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
};

// PUT: Update password
exports.updatePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    const pool = getPool();
    const [users] = await pool.query('SELECT password FROM auth_credentials WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE auth_credentials SET password = ? WHERE id = ?', [hashedPassword, userId]);
    
    // Invalidate all sessions after password change
    await pool.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    
    res.json({ message: 'Password updated successfully. Please login again.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password', details: error.message });
  }
};

// PUT: Update credentials (username/email)
exports.updateCredentials = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email } = req.body;
    
    if (!username && !email) {
      return res.status(400).json({ error: 'Username or email required for update' });
    }
    
    const pool = getPool();
    const updates = [];
    const values = [];
    
    if (username) {
      updates.push('username = ?');
      values.push(username);
    }
    if (email) {
      updates.push('email = ?');
      values.push(email);
    }
    
    values.push(userId);
    
    const [result] = await pool.query(
      `UPDATE auth_credentials SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Notify user-service about credential update
    try {
      await fetch(`${USER_SERVICE_URL}/api/users/${userId}/sync-credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email })
      });
    } catch (err) {
      console.log('User service sync failed:', err.message);
    }
    
    res.json({ message: 'Credentials updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Failed to update credentials', details: error.message });
  }
};

// DELETE: Delete all sessions for a user
exports.deleteUserSessions = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();
    
    const [result] = await pool.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
    
    res.json({
      message: 'All sessions deleted successfully',
      deletedCount: result.affectedRows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete sessions', details: error.message });
  }
};

// DELETE: Delete a specific session
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const pool = getPool();
    
    const [result] = await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session', details: error.message });
  }
};
