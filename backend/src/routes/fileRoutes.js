const express = require("express");
const { uploadMiddleware, uploadFile } = require("../controllers/fileController");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/upload", authenticateUser, uploadMiddleware, uploadFile);

module.exports = router;
