require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const db = require('./config/database');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const { getLogger, correlationMiddleware, loggingMiddleware } = require('./utils/logger');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

//inicializiraj logger
const logger = getLogger('auth-service');

// Statistics service URL - Railway deployment
const STATISTICS_SERVICE_URL = process.env.STATISTICS_SERVICE_URL || 'https://selfless-perception-production.up.railway.app';

// middleware
app.use(cors());
app.use(express.json());
app.use(correlationMiddleware('auth-service'));
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
// Register docs before routes to avoid accidental route collisions
const authSpecPath = path.resolve(__dirname, '..', 'openapi.yaml');
try {
  const authSpec = YAML.load(authSpecPath);
  app.use('/api/auth/docs', swaggerUi.serve, swaggerUi.setup(authSpec));
} catch (err) {
  console.warn('Swagger spec for auth-service not loaded at startup:', err.message);
  app.use('/api/auth/docs', swaggerUi.serve, swaggerUi.setup(null, { swaggerUrl: '/api/auth/openapi.json' }));
}

// Always expose the OpenAPI JSON endpoint
app.get('/api/auth/openapi.json', (req, res) => {
  try {
    const authSpec = YAML.load(authSpecPath);
    res.json(authSpec);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load OpenAPI spec', details: e.message });
  }
});

// Routes
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
