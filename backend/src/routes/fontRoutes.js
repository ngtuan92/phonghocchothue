const express = require('express');
const router = express.Router();
const fontController = require('../app/controllers/fontController');

router.get('/', fontController.getFonts);
router.post('/', fontController.addFont);
router.delete('/:id', fontController.deleteFont);

module.exports = router;
