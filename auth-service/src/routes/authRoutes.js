const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// GET
router.get('/validate-token', authController.validateToken);
router.get('/sessions/:userId', authController.getUserSessions);

// PUT
router.put('/password/:userId', authController.updatePassword);
router.put('/credentials/:userId', authController.updateCredentials);

// DELETE
router.delete('/sessions/:userId', authController.deleteUserSessions);
router.delete('/session/:sessionId', authController.deleteSession);

module.exports = router;
