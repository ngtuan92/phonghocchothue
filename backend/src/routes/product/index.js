const express = require("express");
const router = express.Router();
const authenticateToken = require("../../middleware/authMiddleware");

const productController = require("../../app/controllers/productController");

router.get("/edit/:id", productController.edit);

router.get("/detail/:id", productController.getById);

router.put("/update/:id", authenticateToken, productController.update);

router.delete("/delete/:id", authenticateToken, productController.delete);

router.post("/insert", authenticateToken, productController.save);

router.get("/", productController.index);

module.exports = router;
