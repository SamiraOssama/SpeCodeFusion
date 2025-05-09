const express = require("express");
const { signup, login, getProfile, deleteProfile, sendResetEmail ,changePassword, updateUserProfile,getUsers } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/user");  // Import your User model for database queries


const router = express.Router();

// ✅ Signup & Login
router.post("/signup", signup);
router.post("/login", login);

// ✅ User Profile Management
router.get("/profile", authenticateUser, getProfile);
router.delete("/profile", authenticateUser, deleteProfile);

// ✅ Google Login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.redirect(`http://localhost:5173/google-login-success?token=${token}`);
  }
);

router.put("/change-password", authenticateUser, changePassword);
router.put("/profile", authenticateUser, updateUserProfile);


// router.post('/send-reset-email', sendResetEmail );
module.exports = router;
