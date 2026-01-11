const db = require('../config/database');

// GET - Last called endpoint
exports.getLastCalled = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM api_call_statistics ORDER BY last_called DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No statistics available' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching last called endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET - Most frequently called endpoint
exports.getMostFrequent = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM api_call_statistics ORDER BY call_count DESC LIMIT 1'
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No statistics available' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching most frequent endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET - All statistics with sorting
exports.getAllStatistics = async (req, res) => {
  try {
    const sortBy = req.query.sort_by || 'call_count';
    const order = req.query.order || 'desc';

    // Validate sort_by parameter
    const allowedSortFields = ['call_count', 'last_called', 'endpoint'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'call_count';

    // Validate order parameter
    const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [rows] = await db.query(
      `SELECT * FROM api_call_statistics ORDER BY ${sortField} ${sortOrder}`
    );

    const totalCalls = rows.reduce((sum, stat) => sum + stat.call_count, 0);

    res.json({
      total_endpoints: rows.length,
      total_calls: totalCalls,
      statistics: rows
    });
  } catch (error) {
    console.error('Error fetching all statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST - Update statistics
exports.updateStatistics = async (req, res) => {
  try {
    const { klicanaStoritev } = req.body;

    if (!klicanaStoritev) {
      return res.status(400).json({ error: 'klicanaStoritev is required' });
    }

    const endpoint = klicanaStoritev;
    const now = new Date();

    // Check if endpoint already exists
    const [existing] = await db.query(
      'SELECT * FROM api_call_statistics WHERE endpoint = ?',
      [endpoint]
    );

    if (existing.length > 0) {
      // Update existing record
      await db.query(
        'UPDATE api_call_statistics SET call_count = call_count + 1, last_called = ? WHERE endpoint = ?',
        [now, endpoint]
      );

      // Fetch updated record
      const [updated] = await db.query(
        'SELECT * FROM api_call_statistics WHERE endpoint = ?',
        [endpoint]
      );

      res.json({
        success: true,
        endpoint: endpoint,
        call_count: updated[0].call_count,
        message: 'Statistics updated successfully'
      });
    } else {
      // Insert new record
      await db.query(
        'INSERT INTO api_call_statistics (endpoint, call_count, last_called, first_called) VALUES (?, 1, ?, ?)',
        [endpoint, now, now]
      );

      res.json({
        success: true,
        endpoint: endpoint,
        call_count: 1,
        message: 'Statistics updated successfully'
      });
    }
  } catch (error) {
    console.error('Error updating statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE - Reset all statistics
exports.resetStatistics = async (req, res) => {
  try {
    await db.query('DELETE FROM api_call_statistics');

    res.json({
      success: true,
      message: 'All statistics reset successfully'
    });
  } catch (error) {
    console.error('Error resetting statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
