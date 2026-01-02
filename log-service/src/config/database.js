const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://analytics_user:analytics_pass@analytics-db:5432/analytics_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Initialize database tables
const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create logs table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL,
        level VARCHAR(20) NOT NULL,
        url VARCHAR(500),
        correlation_id VARCHAR(100),
        service_name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        additional_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_correlation_id ON logs(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_logs_service_name ON logs(service_name);
      CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    `);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  initializeDatabase
};

