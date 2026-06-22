const { Pool } = require('pg');

// Render ponudi DATABASE_URL (interna povezava na managed PostgreSQL).
// Lokalno uporabimo posamezne DB_* spremenljivke.
const connectionString = process.env.DATABASE_URL;

// SSL vklopimo le, kadar je izrecno zahtevan (Render interni URL ga ne potrebuje).
const ssl =
  process.env.PGSSL === 'require'
    ? { rejectUnauthorized: false }
    : false;

const pool = connectionString
  ? new Pool({ connectionString, ssl })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'stats_user',
      password: process.env.DB_PASSWORD || 'stats_pass',
      database: process.env.DB_NAME || 'statistics_db',
    });

console.log('Database Configuration:');
console.log(`- Driver: PostgreSQL`);
console.log(`- Mode: ${connectionString ? 'DATABASE_URL' : 'DB_* spremenljivke'}`);

// Pretvori MySQL-style "?" v PostgreSQL "$1, $2, ..."
function toPgPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Ovoj, združljiv z mysql2/promise: db.query(sql, params) -> [rows, fields]
 * Tako ostane controller koda nespremenjena (uporablja "?" in `const [rows] = ...`).
 */
module.exports = {
  query: async (sql, params = []) => {
    const text = toPgPlaceholders(sql);
    const res = await pool.query(text, params);
    return [res.rows, res.fields];
  },
  pool,
};
