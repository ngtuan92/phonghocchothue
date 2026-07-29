const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware');
const orderController = require('../../app/controllers/orderController');

router.post('/', orderController.insert);

router.get('/', authenticateToken, orderController.index);

router.delete('/:id', authenticateToken, orderController.delete);

module.exports = router;
