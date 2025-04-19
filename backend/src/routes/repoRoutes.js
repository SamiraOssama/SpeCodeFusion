const express = require("express");
const {
  createRepo,
  getUserRepositories,
  getRepoDetails,
  requestAccess,
  handleAccessRequest,
  uploadFile,
  getReposWithRequests,
  getAllRepositories,
  getRepoOwner,
  getRepoRequests,
  getRepoHistory,
  compareRequirementsWithCode 
} = require("../controllers/repoController");

const { getUserById } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const fs = require("fs");
const csv = require("csv-parser");
const Repo = require("../models/repo");
const repoController=require("../controllers/repoController");

const router = express.Router();

// =============================================
// REPOSITORY CRUD OPERATIONS
// =============================================

// Create a new repository
router.post("/create", authenticateUser, createRepo);

// Get all repositories (public)
router.get("/all", getAllRepositories);

// Get repository details
router.get("/:repoId/details", authenticateUser, getRepoDetails);

// Get repository owner information
router.get("/owner/:repoId", getRepoOwner);

// Get repository history (SRS and Source Code)
router.get("/:repoId/history", authenticateUser, getRepoHistory);

// =============================================
// USER REPOSITORIES
// =============================================

// Get repositories for current user (owned or member)
router.get("/my-repos", authenticateUser, getUserRepositories);
// In repoRoutes.js, ensure you have:
router.get("/with-requests", authenticateUser, getReposWithRequests);
// Get repositories with pending requests (for owners)
router.get("/myrepos", authenticateUser, getReposWithRequests);
router.get("/owner/:repoId",getRepoOwner);
// =============================================
// ACCESS CONTROL & REQUESTS
// =============================================

// Request access to a repository
router.post("/:repoId/request-access", authenticateUser, requestAccess);

// Get all requests for a specific repository (owner only)
router.get("/:repoId/requests", authenticateUser, getRepoRequests);

// Handle access request (approve/reject)
router.post("/:repoId/handle-request", authenticateUser, handleAccessRequest);

// =============================================
// FILE OPERATIONS & COMPARISON
// =============================================

// File upload configuration
const upload = multer({ 
  dest: path.join(__dirname, "../uploads/"), 
  limits: { fileSize: 20 * 1024 * 1024 } // 10MB limit
});

// Upload SRS or Source Code files
router.post("/:repoId/upload", authenticateUser, upload.single("file"), uploadFile);

// Compare SRS and Source Code
router.post("/:repoId/compare", authenticateUser, compareRequirementsWithCode);

// =============================================
// USER MANAGEMENT
// =============================================

// Get user details by ID
router.get("/users/:id", getUserById);
// Add this route
router.get("/:repoId/extracted", authenticateUser, async (req, res) => {
  try {
    const { repoId } = req.params;
    const { useUpdated } = req.query;
    
    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const fileName = useUpdated ? "latest_extracted_updated.csv" : "latest_extracted.csv";
    const filePath = path.join(__dirname, "../extracted", repo.name, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Extracted file not found" });
    }

    // Read and parse the CSV
    const data = await parseCSV(filePath);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching extracted requirements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Helper function to parse CSV
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}
router.get('/:repoId/extracted', authenticateUser, repoController.getExtractedRequirements);

module.exports = router;