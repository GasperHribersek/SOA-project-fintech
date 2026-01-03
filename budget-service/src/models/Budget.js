const createTable = `
  CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    limitAmount NUMERIC NOT NULL,
    spent NUMERIC DEFAULT 0
  );
`;

module.exports = { createTable };
