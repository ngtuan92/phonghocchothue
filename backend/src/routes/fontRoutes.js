const express = require('express');
const router = express.Router();
const fontController = require('../app/controllers/fontController');
const authenticateToken = require('../middleware/authMiddleware');

// Google Fonts (Legacy/Current)
router.get('/', fontController.getFonts);
router.post('/', authenticateToken, fontController.addFont);
router.delete('/:id', authenticateToken, fontController.deleteFont);

// Local Fonts
router.get('/local', fontController.getAllLocalFonts);
router.post('/local/upload', authenticateToken, fontController.uploadLocalFont);
router.put('/local/:id', authenticateToken, fontController.updateLocalFont);
router.delete('/local/:id', authenticateToken, fontController.deleteLocalFont);

module.exports = router;
