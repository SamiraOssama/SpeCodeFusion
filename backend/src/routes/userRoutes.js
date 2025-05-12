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
  getUsers,
  googleCallback
} = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const router = express.Router();

// Auth routes
router.post("/signup", signup);
router.post("/login", login);

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }), 
  googleCallback
);

// Profile routes
router.get("/profile", authenticateUser, getProfile);
router.delete("/profile", authenticateUser, deleteProfile);
router.put("/change-password", authenticateUser, changePassword);
router.put("/profile", authenticateUser, updateUserProfile);

// Password reset routes
router.post('/send-reset-email', sendResetEmail);
router.post('/reset', resetPassword);

// Get all users for collaborator search
router.get("/all", authenticateUser, async (req, res) => {
  try {
    console.log("Fetching all users for collaborator search");
    const users = await User.find({})
      .select('username email _id')
      .limit(50);
    
    console.log(`Found ${users.length} users`);
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
});

// Search users by username
router.get("/search", authenticateUser, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Search for users whose username or email matches the query (case-insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username email _id') // Only return necessary fields
    .limit(5); // Limit results to 5 users

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
});

module.exports = router;
