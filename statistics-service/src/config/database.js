const mysql = require('mysql2/promise');

// Support Railway's MySQL environment variables
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
  user: process.env.MYSQLUSER || process.env.DB_USER || 'stats_user',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'stats_pass',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'statistics_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

module.exports = pool;
