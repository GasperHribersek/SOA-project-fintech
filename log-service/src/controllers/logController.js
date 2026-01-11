const { pool } = require('../config/database');
const amqp = require('amqplib');

// POST /logs - Fetch logs from RabbitMQ and store in database
exports.fetchLogsFromQueue = async (req, res) => {
  let connection;
  let channel;
  
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672';
    
    // Connect to RabbitMQ
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    const queueName = 'logging_queue';
    
    // Ensure queue exists
    await channel.assertQueue(queueName, { durable: true });
    
    let logsFetched = 0;
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Fetch all messages from queue
      while (true) {
        const msg = await channel.get(queueName, { noAck: false });
        
        if (!msg) {
          // No more messages
          break;
        }
        
        try {
          const logData = JSON.parse(msg.content.toString());
          
          // Parse timestamp
          let timestamp;
          const timestampStr = logData.timestamp;
          
          if (timestampStr) {
            // Try parsing the timestamp
            timestamp = new Date(timestampStr.replace(' ', 'T') + 'Z');
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date();
            }
          } else {
            timestamp = new Date();
          }
          
          // Extract additional data
          const additionalData = {};
          ['method', 'path', 'query', 'ip', 'statusCode', 'duration'].forEach(key => {
            if (logData[key]) {
              additionalData[key] = logData[key];
            }
          });
          
          // Insert log into database
          await client.query(
            `INSERT INTO logs (timestamp, level, url, correlation_id, service_name, message, additional_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              timestamp,
              logData.level || 'INFO',
              logData.url || '',
              logData.correlationId || '',
              logData.serviceName || 'unknown',
              logData.message || '',
              Object.keys(additionalData).length > 0 ? JSON.stringify(additionalData) : null
            ]
          );
          
          logsFetched++;
          
          // Acknowledge message
          channel.ack(msg);
        } catch (parseError) {
          console.error('Error parsing log message:', parseError);
          // Reject and requeue the message
          channel.nack(msg, false, true);
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      res.json({
        success: true,
        message: `${logsFetched} logs fetched and stored`,
        count: logsFetched
      });
      
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error fetching logs from RabbitMQ:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    if (channel) await channel.close();
    if (connection) await connection.close();
  }
};

// GET /logs/:dateFrom/:dateTo - Get logs between two dates
exports.getLogsByDateRange = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.params;
    
    // Parse dates
    let startDate, endDate;
    try {
      startDate = new Date(dateFrom);
      endDate = new Date(dateTo);
      
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    // Query parameters for filtering
    const level = req.query.level;
    const service = req.query.service;
    const correlationId = req.query.correlation_id;
    const limit = parseInt(req.query.limit) || 1000;
    const offset = parseInt(req.query.offset) || 0;
    
    // Build query
    let queryText = `
      SELECT id, timestamp, level, url, correlation_id, service_name, message, additional_data, created_at
      FROM logs
      WHERE created_at >= $1 AND created_at <= $2
    `;
    
    const queryParams = [startDate, endDate];
    let paramIndex = 3;
    
    if (level) {
      queryText += ` AND level = $${paramIndex}`;
      queryParams.push(level.toUpperCase());
      paramIndex++;
    }
    
    if (service) {
      queryText += ` AND service_name = $${paramIndex}`;
      queryParams.push(service);
      paramIndex++;
    }
    
    if (correlationId) {
      queryText += ` AND correlation_id = $${paramIndex}`;
      queryParams.push(correlationId);
      paramIndex++;
    }
    
    // Get total count
    const countQuery = queryText.replace(
      'SELECT id, timestamp, level, url, correlation_id, service_name, message, additional_data, created_at',
      'SELECT COUNT(*) as count'
    );
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);
    
    // Add ordering and pagination
    queryText += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    
    // Execute query
    const result = await pool.query(queryText, queryParams);
    
    // Format logs
    const logs = result.rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp.toISOString(),
      level: row.level,
      url: row.url,
      correlationId: row.correlation_id,
      serviceName: row.service_name,
      message: row.message,
      additionalData: row.additional_data,
      createdAt: row.created_at.toISOString()
    }));
    
    res.json({
      success: true,
      logs,
      total,
      limit,
      offset,
      dateFrom,
      dateTo
    });
    
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// DELETE /logs - Delete all logs from database
exports.deleteAllLogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM logs');
    const count = parseInt(result.rows[0].count);
    
    await pool.query('DELETE FROM logs');
    
    res.json({
      success: true,
      message: 'All logs deleted successfully',
      deleted_count: count
    });
    
  } catch (error) {
    console.error('Error deleting logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

