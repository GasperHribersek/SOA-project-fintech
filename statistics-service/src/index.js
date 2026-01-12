require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const db = require('./config/database');
const statisticsRoutes = require('./routes/statisticsRoutes');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for deployed service
  credentials: false
}));
app.use(express.json());

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Statistics Service',
      version: '1.0.0',
      description: 'Service for tracking API endpoint call statistics',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/stats', statisticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
const startServer = async (retries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting to connect to database (attempt ${attempt}/${retries})...`);
      
      // Test database connection
      await db.query('SELECT 1');
      console.log('✅ Database connected successfully');

      // Create table if not exists
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS api_call_statistics (
          id INT AUTO_INCREMENT PRIMARY KEY,
          endpoint VARCHAR(500) NOT NULL UNIQUE,
          call_count INT DEFAULT 0 NOT NULL,
          last_called DATETIME NOT NULL,
          first_called DATETIME NOT NULL,
          INDEX idx_endpoint (endpoint),
          INDEX idx_last_called (last_called),
          INDEX idx_call_count (call_count)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      
      await db.query(createTableQuery);
      console.log('✅ Database table verified/created');

      app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n🚀 Statistics service running on port ${PORT}`);
        console.log(`📊 Swagger documentation: http://localhost:${PORT}/swagger`);
        console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
      });
      
      return; // Success, exit function
      
    } catch (error) {
      console.error(`❌ Connection attempt ${attempt} failed:`, error.message);
      
      if (attempt < retries) {
        console.log(`⏳ Retrying in ${delay/1000} seconds...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('\n❌ Failed to start server after multiple attempts');
        console.error('   Please ensure MySQL is running:');
        console.error('   docker-compose up -d statistics-db');
        process.exit(1);
      }
    }
  }
};

startServer();
