const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/authMiddleware')

const sliderControler = require('../../app/controllers/sliderControler');

router.get('/edit/:id', sliderControler.edit);

// router.get('/detail/:id', sliderControler.getById);

router.put('/update/:id', authenticateToken, sliderControler.update);

router.delete('/delete/:id', authenticateToken, sliderControler.delete);

router.post('/insert', authenticateToken, sliderControler.save);

router.get('/', sliderControler.index);

module.exports = router;
