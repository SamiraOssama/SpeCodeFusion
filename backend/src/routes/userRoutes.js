const express = require("express");
const { 
  signup, 
  login, 
  getProfile, 
  deleteProfile, 
  sendResetEmail,
  resetPassword,
  changePassword, 
  updateUserProfile,
  getUsers
} = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);

// Profile routes
router.get("/profile", authenticateUser, getProfile);
router.delete("/profile", authenticateUser, deleteProfile);
router.put("/change-password", authenticateUser, changePassword);
router.put("/profile", authenticateUser, updateUserProfile);

// Password reset routes
router.post('/send-reset-email', sendResetEmail);
router.post('/reset', resetPassword);

module.exports = router;
