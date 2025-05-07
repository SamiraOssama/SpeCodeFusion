const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Repo = require("../models/repo");
// const { performance } = require("perf_hooks"); 
const { getPerformanceStats, deleteRepository } = require("../controllers/adminController");

const { signup, login, getProfile, updateProfile, deleteProfile } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const { getAllUsers, deleteUser, createUser, getUserById } = require("../controllers/adminController");



router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "username email"); // Fetch username & email only
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/users/:id", async (req, res) => {
  const { id } = req.params; // Retrieve the `id` from the route parameters
  try {
    const user = await User.findById(id); // Fetch user by ID
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user); // Send user details as the response
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});




// Create new user
router.post("/users", createUser);

// Delete user by ID
router.delete("/users/:id", deleteUser);

router.get('/performance-stats', async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const repoCount = await Repo.countDocuments();

    res.json({ userCount, repoCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching stats' });
  }
});

module.exports = router;
