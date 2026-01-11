const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');

/**
 * @swagger
 * /api/stats/last-called:
 *   get:
 *     summary: Get the last called endpoint
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Last called endpoint information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 5
 *                 endpoint:
 *                   type: string
 *                   example: "/api/users/login"
 *                 call_count:
 *                   type: integer
 *                   example: 42
 *                 last_called:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-01-11T10:30:00.000Z"
 *                 first_called:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No statistics available
 */
router.get('/last-called', statisticsController.getLastCalled);

/**
 * @swagger
 * /api/stats/most-frequent:
 *   get:
 *     summary: Get the most frequently called endpoint
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: Most frequently called endpoint information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 endpoint:
 *                   type: string
 *                   example: "/api/users/profile"
 *                 call_count:
 *                   type: integer
 *                   example: 156
 *                 last_called:
 *                   type: string
 *                   format: date-time
 *                 first_called:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: No statistics available
 */
router.get('/most-frequent', statisticsController.getMostFrequent);

/**
 * @swagger
 * /api/stats/all:
 *   get:
 *     summary: Get call statistics for all endpoints
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [call_count, last_called, endpoint]
 *           default: call_count
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: List of all endpoint statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_endpoints:
 *                   type: integer
 *                   example: 15
 *                 total_calls:
 *                   type: integer
 *                   example: 523
 *                 statistics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       endpoint:
 *                         type: string
 *                       call_count:
 *                         type: integer
 *                       last_called:
 *                         type: string
 *                         format: date-time
 *                       first_called:
 *                         type: string
 *                         format: date-time
 */
router.get('/all', statisticsController.getAllStatistics);

/**
 * @swagger
 * /api/stats/update:
 *   post:
 *     summary: Update statistics for a called endpoint
 *     tags: [Statistics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - klicanaStoritev
 *             properties:
 *               klicanaStoritev:
 *                 type: string
 *                 description: The endpoint that was called
 *                 example: "/api/users/register"
 *     responses:
 *       200:
 *         description: Statistics updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 endpoint:
 *                   type: string
 *                   example: "/api/users/register"
 *                 call_count:
 *                   type: integer
 *                   example: 43
 *                 message:
 *                   type: string
 *                   example: "Statistics updated successfully"
 *       400:
 *         description: Bad request - missing required field
 */
router.post('/update', statisticsController.updateStatistics);

/**
 * @swagger
 * /api/stats/reset:
 *   delete:
 *     summary: Reset all statistics (for testing purposes)
 *     tags: [Statistics]
 *     responses:
 *       200:
 *         description: All statistics reset successfully
 */
router.delete('/reset', statisticsController.resetStatistics);

module.exports = router;
