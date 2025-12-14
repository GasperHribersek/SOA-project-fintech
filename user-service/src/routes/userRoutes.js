const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST
router.post('/profile', userController.createProfile);
router.post('/:userId/settings', userController.createUserSettings);

// GET
router.get('/', userController.getAllProfiles);
router.get('/:userId', userController.getProfileByUserId);

// PUT
router.put('/:userId', userController.updateProfile);
router.put('/:userId/settings', userController.updateUserSettings);
router.put('/:userId/sync-credentials', userController.syncCredentials);

// DELETE
router.delete('/:userId', userController.deleteProfile);
router.delete('/:userId/settings', userController.resetUserSettings);

module.exports = router;
