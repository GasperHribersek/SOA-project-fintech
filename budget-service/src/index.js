const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = require("./db/pool");
const { createTable } = require("./models/Budget");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Retry dokler DB ne začne sprejemati povezav
async function waitForDB() {
  while (true) {
    try {
      await pool.query("SELECT 1");
      console.log("Postgres ready");
      return;
    } catch (err) {
      console.log("Waiting for Postgres...");
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

async function init() {
  await waitForDB();

  try {
    await pool.query(createTable);
    console.log("Budgets table ready");
  } catch (err) {
    console.error("Error creating table:", err);
  }

  const PORT = process.env.PORT || 3002;
  app.listen(PORT, () => {
    console.log(`Budget service running on port ${PORT}`);
  });
}

init();

// Routes
const budgetRoutes = require("./routes/budgets");
app.use("/budgets", budgetRoutes);
