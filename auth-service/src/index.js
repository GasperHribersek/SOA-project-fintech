require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const db = require('./config/database');
const { getLogger, correlationMiddleware, loggingMiddleware } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize logger
const logger = getLogger('auth-service');

// Middleware
app.use(cors());
app.use(express.json());
app.use(correlationMiddleware('auth-service'));
app.use(loggingMiddleware(logger));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await db.initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
