const express = require("express");
const router = express.Router();
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
  compareRequirementsWithCode,
  renameRepository,
  getExtractedRequirements,
  getCollaborators,
  inviteCollaborator,
  removeCollaborator,
  handleInvitation,
  cancelInvitation,
  deletePendingRequest,
  deleteRepository
} = require("../controllers/repoController");

const { getUserById } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const Repo = require("../models/repo");

// Configure multer for file uploads
const upload = multer({ 
  dest: path.join(__dirname, "../uploads/"), 
  limits: { fileSize: 20 * 1024 * 1024 } 
});

// =============================================
// REPOSITORY CRUD OPERATIONS
// =============================================

// Get all repositories (public)
router.get("/all", getAllRepositories);

// Get repositories for current user
router.get("/my-repos", authenticateUser, getUserRepositories);

// Get repositories with requests
router.get("/with-requests", authenticateUser, getReposWithRequests);

// Create new repository
router.post("/create", authenticateUser, createRepo);

// =============================================
// REPOSITORY-SPECIFIC OPERATIONS
// =============================================

// These routes must come after non-parameterized routes
router.get("/:repoId/details", authenticateUser, getRepoDetails);
router.get("/:repoId/owner", authenticateUser, getRepoOwner);
router.get("/:repoId/history", authenticateUser, getRepoHistory);
router.get("/:repoId/requests", authenticateUser, getRepoRequests);
router.get("/:repoId/collaborators", authenticateUser, getCollaborators);
router.post("/:repoId/invite", authenticateUser, inviteCollaborator);
router.put("/:repoId/invitations/:invitationId", authenticateUser, handleInvitation);
router.delete("/:repoId/invitations/:invitationId", authenticateUser, cancelInvitation);
router.delete("/:repoId/collaborators/:userId", authenticateUser, removeCollaborator);
router.post("/:repoId/request-access", authenticateUser, requestAccess);
router.post("/:repoId/handle-request", authenticateUser, handleAccessRequest);
router.post("/:repoId/upload", authenticateUser, upload.single("file"), uploadFile);
router.post("/:repoId/compare", authenticateUser, compareRequirementsWithCode);
router.patch("/:repoId/rename", authenticateUser, renameRepository);

// Delete a pending request
router.delete("/:repoId/requests/:requestId", authenticateUser, deletePendingRequest);

// Delete repository
router.delete("/:repoId", authenticateUser, deleteRepository);

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

// =============================================
// USER MANAGEMENT
// =============================================

// Get user details by ID
router.get("/users/:id", getUserById);

// Get extracted requirements
router.get("/:repoId/extracted", authenticateUser, getExtractedRequirements);

module.exports = router;