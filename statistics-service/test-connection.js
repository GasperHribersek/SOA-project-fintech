const mysql = require('mysql2/promise');

async function test() {
  try {
    console.log('Testing connection to MySQL...');
    console.log('Host: localhost');
    console.log('Port: 3307');
    console.log('User: stats_user');
    console.log('Database: statistics_db\n');
    
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'stats_user',
      password: 'stats_pass',
      database: 'statistics_db'
    });
    
    console.log('✅ Connected successfully!');
    
    const [rows] = await connection.query('SELECT 1 as test');
    console.log('✅ Query successful:', rows);
    
    await connection.end();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('\nFull error:', error);
  }
}

test();
