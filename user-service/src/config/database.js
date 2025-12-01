const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'user_db',
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
    await initPool.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'user_db'}`);
    await initPool.end();
    
    // Now connect to the database and create tables
    const pool = getPool();
    
    // User profiles table - stores ONLY profile information (NOT auth data)
    // user_id references the ID from auth-service
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        username VARCHAR(255),
        email VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        phone VARCHAR(50),
        address VARCHAR(500),
        date_of_birth DATE,
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // User settings table - stores user preferences
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        language VARCHAR(10) DEFAULT 'en',
        currency VARCHAR(3) DEFAULT 'EUR',
        notifications_enabled BOOLEAN DEFAULT TRUE,
        email_notifications BOOLEAN DEFAULT TRUE,
        theme VARCHAR(20) DEFAULT 'light',
        timezone VARCHAR(50) DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
      )
    `);
    
    console.log('User database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

module.exports = {
  getPool,
  initializeDatabase
};
