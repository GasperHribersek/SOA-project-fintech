const pool = require("./pool");

const createTableSQL = `
  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL,
    category VARCHAR(255),
    note TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

async function migrate() {
  try {
    await pool.query(createTableSQL);
    console.log("Transactions table created or already exists.");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

module.exports = migrate;
