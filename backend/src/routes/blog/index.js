const express = require("express");
const router = express.Router();
const authenticateToken = require("../../middleware/authMiddleware");
const blogController = require("../../app/controllers/blogController");

// Public routes
router.get("/categories", blogController.getCategories);
router.get("/:slug", blogController.show);
router.get("/", blogController.index);

// Admin routes (Protected)
router.post("/", authenticateToken, blogController.store);

router.put("/:id", authenticateToken, blogController.update);
router.delete("/:id", authenticateToken, blogController.destroy);

module.exports = router;
