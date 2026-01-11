require('dotenv').config();
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const db = require('./config/database');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { getLogger, correlationMiddleware, loggingMiddleware } = require('./utils/logger');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize logger
const logger = getLogger('user-service');

// Statistics service URL
const STATISTICS_SERVICE_URL = process.env.STATISTICS_SERVICE_URL || 'http://localhost:5002';

// Middleware
app.use(cors());
app.use(express.json());
app.use(correlationMiddleware('user-service'));
app.use(loggingMiddleware(logger));

// Statistics tracking middleware
app.use((req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      axios.post(`${STATISTICS_SERVICE_URL}/api/stats/update`, { 
        klicanaStoritev: req.path 
      }, { timeout: 3000 })
      .catch(err => console.error('Failed to track endpoint:', err.message));
    }
  });
  next();
});

// Swagger UI - serve OpenAPI spec
// NOTE: register docs BEFORE mounting the router so that paths like '/docs' are not treated
// as dynamic `/:userId` params in the user router (which would trigger auth middleware).
const specPath = path.resolve(__dirname, '..', 'openapi.yaml');
try {
  const userSpec = YAML.load(specPath);
  app.use('/api/users/docs', swaggerUi.serve, swaggerUi.setup(userSpec));
} catch (err) {
  console.warn('Swagger spec for user-service not loaded at startup:', err.message);
  // Fallback: still serve Swagger UI but let it fetch the JSON from /api/users/openapi.json
  app.use('/api/users/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerUrl: '/api/users/openapi.json' }));
}

// Always expose the OpenAPI JSON endpoint (loads file on each request so we can report parse errors)
app.get('/api/users/openapi.json', (req, res) => {
  try {
    const userSpec = YAML.load(specPath);
    res.json(userSpec);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load OpenAPI spec', details: e.message });
  }
});

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
