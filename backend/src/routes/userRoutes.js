const express = require("express");
const { signup, login, getProfile, updateProfile, deleteProfile } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Signup & Login
router.post("/signup", signup);
router.post("/login", login);

// ✅ User Profile Management
router.get("/profile", authenticateUser, getProfile);
router.put("/profile", authenticateUser, updateProfile);
router.delete("/profile", authenticateUser, deleteProfile);

module.exports = router;
