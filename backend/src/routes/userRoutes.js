const express = require("express");
const { signup, login, getProfile,  deleteProfile } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ Signup & Login
router.post("/signup", signup);
router.post("/login", login);

// ✅ User Profile Management
router.get("/profile", authenticateUser, getProfile);

router.delete("/profile", authenticateUser, deleteProfile);

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
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
  
    if (!token) return res.sendStatus(401);
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user; // contains id and email from token
      next();
    });
  };
  
  
  router.get("/profile", authenticateToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password"); 
  
      if (!user) return res.status(404).json({ message: "User not found" });
  
      res.json(user); // This should include username and email
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

module.exports = router;
