require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logRoutes = require('./routes/logRoutes');
const { initializeDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/logs', logRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'log-service',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'log-service',
        version: '1.0.0',
        description: 'Log management service for RabbitMQ logs',
        endpoints: {
            'POST /logs': 'Fetch logs from RabbitMQ and store in database',
            'GET /logs/:dateFrom/:dateTo': 'Get logs between two dates (YYYY-MM-DD)',
            'DELETE /logs': 'Delete all logs from database',
            'GET /health': 'Health check endpoint'
        },
        examples: {
            fetch: 'POST http://localhost:5002/logs',
            query: 'GET http://localhost:5002/logs/2024-01-01/2024-12-31',
            queryWithFilters: 'GET http://localhost:5002/logs/2024-01-01/2024-12-31?level=ERROR&service=auth-service&correlation_id=abc-123',
            delete: 'DELETE http://localhost:5002/logs'
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

// Initialize database and start server
const startServer = async () => {
    try {
        console.log('Initializing log-service...');

        // Wait a bit for database to be ready
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Initialize database
        await initializeDatabase();

        // Start server
        app.listen(PORT, () => {
            console.log(`Log service running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Service info: http://localhost:${PORT}/`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

