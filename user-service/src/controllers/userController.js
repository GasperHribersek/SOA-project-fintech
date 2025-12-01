const { getPool } = require('../config/database');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

// POST: Create user profile (called by auth-service after registration)
exports.createProfile = async (req, res) => {
  try {
    const { userId, username, email, firstName, lastName, phone, address, dateOfBirth } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const pool = getPool();
    
    const [result] = await pool.query(
      `INSERT INTO user_profiles (user_id, username, email, first_name, last_name, phone, address, date_of_birth) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, username || null, email || null, firstName || null, lastName || null, phone || null, address || null, dateOfBirth || null]
    );
    
    // Create default settings for the user
    await pool.query(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );
    
    res.status(201).json({
      message: 'User profile created successfully',
      profileId: result.insertId,
      userId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Profile already exists for this user' });
    }
    res.status(500).json({ error: 'Failed to create profile', details: error.message });
  }
};

// POST: Create user settings
exports.createUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { language, currency, notificationsEnabled, emailNotifications, theme, timezone } = req.body;
    
    const pool = getPool();
    
    // Check if profile exists
    const [profiles] = await pool.query('SELECT user_id FROM user_profiles WHERE user_id = ?', [userId]);
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const [result] = await pool.query(
      `INSERT INTO user_settings (user_id, language, currency, notifications_enabled, email_notifications, theme, timezone) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, language || 'en', currency || 'EUR', notificationsEnabled !== false, emailNotifications !== false, theme || 'light', timezone || 'UTC']
    );
    
    res.status(201).json({
      message: 'User settings created successfully',
      settingsId: result.insertId
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Settings already exist. Use PUT to update.' });
    }
    res.status(500).json({ error: 'Failed to create settings', details: error.message });
  }
};

// GET: Get all user profiles
exports.getAllProfiles = async (req, res) => {
  try {
    const { status } = req.query;
    const pool = getPool();
    
    let query = 'SELECT * FROM user_profiles';
    let params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    const [profiles] = await pool.query(query, params);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profiles', details: error.message });
  }
};

// GET: Get user profile by user ID with settings
exports.getProfileByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();
    
    const [profiles] = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const [settings] = await pool.query(
      'SELECT language, currency, notifications_enabled, email_notifications, theme, timezone FROM user_settings WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      ...profiles[0],
      settings: settings[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
};

// PUT: Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, phone, address, dateOfBirth, status } = req.body;
    
    const pool = getPool();
    const updates = [];
    const values = [];
    
    if (firstName !== undefined) {
      updates.push('first_name = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('last_name = ?');
      values.push(lastName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (dateOfBirth !== undefined) {
      updates.push('date_of_birth = ?');
      values.push(dateOfBirth);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }
    
    values.push(userId);
    
    const [result] = await pool.query(
      `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
};

// PUT: Update user settings
exports.updateUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { language, currency, notificationsEnabled, emailNotifications, theme, timezone } = req.body;
    
    const pool = getPool();
    const updates = [];
    const values = [];
    
    if (language) {
      updates.push('language = ?');
      values.push(language);
    }
    if (currency) {
      updates.push('currency = ?');
      values.push(currency);
    }
    if (notificationsEnabled !== undefined) {
      updates.push('notifications_enabled = ?');
      values.push(notificationsEnabled);
    }
    if (emailNotifications !== undefined) {
      updates.push('email_notifications = ?');
      values.push(emailNotifications);
    }
    if (theme) {
      updates.push('theme = ?');
      values.push(theme);
    }
    if (timezone) {
      updates.push('timezone = ?');
      values.push(timezone);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No settings provided for update' });
    }
    
    values.push(userId);
    
    const [result] = await pool.query(
      `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User settings not found' });
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings', details: error.message });
  }
};

// PUT: Sync credentials from auth-service (called when username/email changes)
exports.syncCredentials = async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email } = req.body;
    
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
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No credentials provided for sync' });
    }
    
    values.push(userId);
    
    const [result] = await pool.query(
      `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );
    
    res.json({ message: 'Credentials synced successfully', updated: result.affectedRows > 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync credentials', details: error.message });
  }
};

// DELETE: Delete user profile
exports.deleteProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { permanent } = req.query;
    const pool = getPool();
    
    if (permanent === 'true') {
      // Permanently delete profile
      const [result] = await pool.query('DELETE FROM user_profiles WHERE user_id = ?', [userId]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      // Notify auth-service to delete credentials
      try {
        await fetch(`${AUTH_SERVICE_URL}/api/auth/sessions/${userId}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.log('Auth service notification failed:', err.message);
      }
      
      res.json({ message: 'Profile permanently deleted' });
    } else {
      // Soft delete - set status to inactive
      const [result] = await pool.query(
        'UPDATE user_profiles SET status = ? WHERE user_id = ?',
        ['inactive', userId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json({ message: 'Profile deactivated successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete profile', details: error.message });
  }
};

// DELETE: Reset user settings to defaults
exports.resetUserSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const pool = getPool();
    
    // Delete existing settings
    const [result] = await pool.query('DELETE FROM user_settings WHERE user_id = ?', [userId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User settings not found' });
    }
    
    // Recreate with defaults
    await pool.query('INSERT INTO user_settings (user_id) VALUES (?)', [userId]);
    
    res.json({ message: 'Settings reset to defaults' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset settings', details: error.message });
  }
};
