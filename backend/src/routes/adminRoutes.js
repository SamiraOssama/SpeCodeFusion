const express = require("express");
const router = express.Router();
const User = require("../models/user");
const { performance } = require("perf_hooks"); // Import performance API

// GET system performance metrics
router.get("/performance", async (req, res) => {
  try {
    const startTime = performance.now(); // Start measuring response time

    const userCount = await User.countDocuments(); // Get the total number of users
    const reportsCompleted = 450; // Replace with a real query if reports are stored in DB
    const systemHealth = 98; // Replace with real system health data if available
    const uptime = "99.95%"; // Replace with real uptime monitoring data

    const endTime = performance.now(); // End measuring response time
    const responseTime = `${Math.round(endTime - startTime)}ms`; // Calculate actual response time

    const performanceData = {
      uptime,
      responseTime, // Real response time from MongoDB query execution
      activeUsers: userCount, // Total users from MongoDB
      systemHealth,
      reportsCompleted,
    };

    res.json(performanceData);
  } catch (error) {
    console.error("Error fetching performance data:", error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// GET all users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "username email"); // Fetch username & email only
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a user by ID
router.delete("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
