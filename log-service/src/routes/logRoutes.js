const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// POST /logs - Fetch logs from RabbitMQ and store in database
router.post('/', logController.fetchLogsFromQueue);

// GET /logs/:dateFrom/:dateTo - Get logs between two dates
router.get('/:dateFrom/:dateTo', logController.getLogsByDateRange);

// DELETE /logs - Delete all logs from database
router.delete('/', logController.deleteAllLogs);

module.exports = router;

