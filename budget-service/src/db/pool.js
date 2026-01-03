const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "budget-db",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "budgetdb",
  port: 5432
});

module.exports = pool;
