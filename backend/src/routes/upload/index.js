const express = require('express');
const router = express.Router();
const uploadController = require('../../app/controllers/uploadController');

// CKEditor upload endpoint - authentication handled in controller
router.post('/image', uploadController.uploadImage);

module.exports = router;

