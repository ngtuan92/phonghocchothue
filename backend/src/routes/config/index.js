const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware')
const configController = require('../../app/controllers/configController');

router.get('/', configController.index);
router.post('/store', authenticateToken, configController.store);
router.put('/update/:key', authenticateToken, configController.update);
router.delete('/delete/:key', authenticateToken, configController.destroy);

module.exports = router;
