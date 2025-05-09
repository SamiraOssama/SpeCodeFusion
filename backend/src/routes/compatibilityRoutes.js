const express = require("express");
const router = express.Router();
const authenticateUser = require("../middleware/authMiddleware");
const { 
  matchRequirementsToCode,
  getCompatibilityReport 
} = require("../controllers/compatibilityController");

// Match requirements with code and generate report
router.post("/:repoId/match", authenticateUser, matchRequirementsToCode);

// Get compatibility report
router.get("/:repoId/report", authenticateUser, getCompatibilityReport);

module.exports = router; 