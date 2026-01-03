const createTable = `
  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL,
    category VARCHAR(255),
    note TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

module.exports = { createTable };
