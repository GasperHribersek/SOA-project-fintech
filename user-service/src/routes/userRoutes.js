const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST
// createProfile is called by auth-service, so no JWT required
router.post('/profile', userController.createProfile);
router.post('/:userId/settings', verifyToken, userController.createUserSettings);

// GET
router.get('/', verifyToken, userController.getAllProfiles);
router.get('/:userId', verifyToken, userController.getProfileByUserId);

// PUT
router.put('/:userId', verifyToken, userController.updateProfile);
router.put('/:userId/settings', verifyToken, userController.updateUserSettings);
// sync-credentials is called by auth-service, so no JWT required
router.put('/:userId/sync-credentials', userController.syncCredentials);

// DELETE
router.delete('/:userId', verifyToken, userController.deleteProfile);
router.delete('/:userId/settings', verifyToken, userController.resetUserSettings);

module.exports = router;
