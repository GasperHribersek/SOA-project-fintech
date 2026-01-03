const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "transactions-db",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "transactionsdb",
  port: 5432
});

module.exports = pool;
