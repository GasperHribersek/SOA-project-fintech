const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

class Logger {
    constructor(serviceName) {
        this.serviceName = serviceName;
        this.connection = null;
        this.channel = null;
        this.exchange = 'logs_exchange';
        this.queue = 'logging_queue';
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672';
            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Declare exchange
            await this.channel.assertExchange(this.exchange, 'fanout', { durable: true });

            // Declare queue
            await this.channel.assertQueue(this.queue, { durable: true });

            // Bind queue to exchange
            await this.channel.bindQueue(this.queue, this.exchange, '');

            console.log(`Logger initialized for ${this.serviceName}`);

            // Handle connection close
            this.connection.on('close', () => {
                console.error('RabbitMQ connection closed. Reconnecting...');
                setTimeout(() => this.initialize(), 5000);
            });

            this.connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err.message);
            });

        } catch (error) {
            console.error('Failed to initialize logger:', error.message);
            // Retry connection after 5 seconds
            setTimeout(() => this.initialize(), 5000);
        }
    }

    async log(level, url, correlationId, message, additionalData = {}) {
        try {
            await this.initPromise;

            if (!this.channel) {
                console.error('Logger channel not initialized');
                return;
            }

            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 23);
            const logMessage = `${timestamp} ${level.toUpperCase()} ${url} Correlation: ${correlationId} [${this.serviceName}] - ${message}`;

            const logData = {
                timestamp,
                level: level.toUpperCase(),
                url,
                correlationId,
                serviceName: this.serviceName,
                message,
                ...additionalData
            };

            this.channel.publish(
                this.exchange,
                '',
                Buffer.from(JSON.stringify(logData)),
                { persistent: true }
            );

            // Also log to console
            console.log(logMessage);
        } catch (error) {
            console.error('Failed to send log to RabbitMQ:', error.message);
            // Fallback to console logging
            console.log(`${level.toUpperCase()} ${url} Correlation: ${correlationId} [${this.serviceName}] - ${message}`);
        }
    }

    info(url, correlationId, message, additionalData) {
        return this.log('INFO', url, correlationId, message, additionalData);
    }

    error(url, correlationId, message, additionalData) {
        return this.log('ERROR', url, correlationId, message, additionalData);
    }

    warn(url, correlationId, message, additionalData) {
        return this.log('WARN', url, correlationId, message, additionalData);
    }

    async close() {
        try {
            if (this.channel) await this.channel.close();
            if (this.connection) await this.connection.close();
        } catch (error) {
            console.error('Error closing logger:', error.message);
        }
    }
}

// Singleton instance
let loggerInstance = null;

function getLogger(serviceName) {
    if (!loggerInstance) {
        loggerInstance = new Logger(serviceName);
    }
    return loggerInstance;
}

// Middleware to add correlation ID
function correlationMiddleware(serviceName) {
    return (req, res, next) => {
        // Get correlation ID from header or generate new one
        req.correlationId = req.headers['x-correlation-id'] || uuidv4();

        // Add correlation ID to response headers
        res.setHeader('X-Correlation-Id', req.correlationId);

        next();
    };
}

// Middleware to log requests
function loggingMiddleware(logger) {
    return (req, res, next) => {
        const startTime = Date.now();
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const correlationId = req.correlationId || 'unknown';

        // Log request
        logger.info(url, correlationId, `${req.method} request received`, {
            method: req.method,
            path: req.path,
            query: req.query,
            ip: req.ip
        });

        // Capture response
        const originalSend = res.send;
        res.send = function (data) {
            res.send = originalSend;

            const duration = Date.now() - startTime;
            const level = res.statusCode >= 400 ? 'error' : 'info';

            logger.log(
                level,
                url,
                correlationId,
                `${req.method} request completed - Status: ${res.statusCode} - Duration: ${duration}ms`,
                {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration
                }
            );

            return res.send(data);
        };

        next();
    };
}

module.exports = {
    Logger,
    getLogger,
    correlationMiddleware,
    loggingMiddleware
};

