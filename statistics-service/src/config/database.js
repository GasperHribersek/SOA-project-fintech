const mysql = require('mysql2/promise');

// Support Railway's MySQL environment variables
// Railway injects: MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
// We map these to DB_* variables via Railway variable references
const dbHost = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306');
const dbUser = process.env.DB_USER || process.env.MYSQLUSER || 'stats_user';
const dbPassword = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || 'stats_pass';
const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || 'statistics_db';

console.log('Database Configuration:');
console.log(`- Host: ${dbHost}`);
console.log(`- Port: ${dbPort}`);
console.log(`- User: ${dbUser}`);
console.log(`- Database: ${dbName}`);

const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Fix IPv6 issues - force IPv4
  ...(dbHost === 'localhost' && { host: '127.0.0.1' })
});

module.exports = pool;
