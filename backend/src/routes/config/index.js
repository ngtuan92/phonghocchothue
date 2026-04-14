const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware')
const configController = require('../../app/controllers/configController');

router.put('/update/:key', authenticateToken, configController.update);

router.get('/', configController.index);

module.exports = router;
