const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

const getPool = () => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
};

const initializeDatabase = async () => {
  // First connect without database to create it if needed
  const initConfig = { ...dbConfig };
  delete initConfig.database;
  
  const initPool = mysql.createPool(initConfig);
  
  try {
    await initPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'auth_db'}`);
    await initPool.end();
    
    // Now connect to the database and create tables
    const pool = getPool();
    
    // Auth credentials table - stores ONLY authentication data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Sessions table - stores active sessions/tokens
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES auth_credentials(id) ON DELETE CASCADE
      )
    `);
    
    console.log('Auth database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

module.exports = {
  getPool,
  initializeDatabase
};
