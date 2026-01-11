const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST - Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
// POST - Protected routes
router.post('/logout', verifyToken, authController.logout);

// GET - Protected routes
router.get('/validate-token', verifyToken, authController.validateToken);
router.get('/sessions/:userId', verifyToken, authController.getUserSessions);

// PUT - Protected routes
router.put('/password/:userId', verifyToken, authController.updatePassword);
router.put('/credentials/:userId', verifyToken, authController.updateCredentials);

// DELETE - Protected routes
router.delete('/sessions/:userId', verifyToken, authController.deleteUserSessions);
router.delete('/session/:sessionId', verifyToken, authController.deleteSession);

module.exports = router;
