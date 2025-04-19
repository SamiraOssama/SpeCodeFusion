const express = require("express");
const multer = require("multer");
const { uploadCode } = require("../controllers/codeController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload/code", upload.single("file"), uploadCode);

module.exports = router;