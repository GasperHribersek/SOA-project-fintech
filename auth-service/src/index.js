require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const db = require('./config/database');
const { getLogger, correlationMiddleware, loggingMiddleware } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

//inicializiraj logger
const logger = getLogger('auth-service');

// middleware
app.use(cors());
app.use(express.json());
app.use(correlationMiddleware('auth-service'));
app.use(loggingMiddleware(logger));

//routes
app.use('/api/auth', authRoutes);

//health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'auth-service' });
});

// inicializiraj bazo in startaj server
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
