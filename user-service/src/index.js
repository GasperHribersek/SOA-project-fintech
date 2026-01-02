require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const db = require('./config/database');
const { getLogger, correlationMiddleware, loggingMiddleware } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize logger
const logger = getLogger('user-service');

// Middleware
app.use(cors());
app.use(express.json());
app.use(correlationMiddleware('user-service'));
app.use(loggingMiddleware(logger));

// Routes
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'user-service' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await db.initializeDatabase();
    app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
