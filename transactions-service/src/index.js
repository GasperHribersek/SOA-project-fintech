const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = require("./db/pool");
const { createTable } = require("./models/Transaction");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");


app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
console.log("Swagger middleware registered");


// Retry dokler DB ni pripravljen
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

  // Ustvari tabelo
  try {
    await pool.query(createTable);
    console.log("Transactions table ready");
  } catch (err) {
    console.error("Error creating table:", err);
  }

  // Zaženi strežnik
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Transactions service running on port ${PORT}`);
  });
}

init();

// Rute
const transactionRoutes = require("./routes/transactions");
app.use("/transactions", transactionRoutes);
