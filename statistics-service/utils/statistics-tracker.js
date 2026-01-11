const axios = require('axios');

// Statistics service URL - Update this when deployed to Azure
const STATISTICS_SERVICE_URL = process.env.STATISTICS_SERVICE_URL || 'http://localhost:5002';

/**
 * Track an API endpoint call to the statistics service
 * @param {string} endpoint - The endpoint that was called (e.g., "/api/users/register")
 */
async function trackEndpointCall(endpoint) {
    try {
        await axios.post(
            `${STATISTICS_SERVICE_URL}/api/stats/update`,
            { klicanaStoritev: endpoint },
            { timeout: 3000 } // 3 second timeout
        );
    } catch (error) {
        // Silently fail - statistics tracking should not break the main service
        console.error(`Failed to track endpoint call: ${endpoint}`, error.message);
    }
}

/**
 * Express middleware to automatically track all API calls
 * Usage: app.use(trackEndpointMiddleware);
 */
function trackEndpointMiddleware(req, res, next) {
    // Track the endpoint after the response is sent
    res.on('finish', () => {
        // Only track successful responses (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300) {
            // Track the path (e.g., "/api/users/login")
            trackEndpointCall(req.path);
        }
    });
    next();
}

module.exports = {
    trackEndpointCall,
    trackEndpointMiddleware
};
