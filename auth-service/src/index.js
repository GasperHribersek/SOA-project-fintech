require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const db = require('./config/database');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
