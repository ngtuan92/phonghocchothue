const express = require('express');
const router = express.Router();
const redirectController = require('../../app/controllers/redirectController');

// API cho frontend middleware: GET /api/redirect?path=/phong/san-pham-1
router.get('/', redirectController.getRedirect);

// API cho trang admin:
router.get('/list', redirectController.getAllRedirects);
router.post('/', redirectController.createRedirect);
router.put('/:id', redirectController.updateRedirect);
router.delete('/:id', redirectController.deleteRedirect);

module.exports = router;

