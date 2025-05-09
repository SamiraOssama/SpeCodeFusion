const express = require("express");
const router = express.Router();
const User = require("../models/user");
const Repo = require("../models/repo");
// const { performance } = require("perf_hooks"); 
const { getPerformanceStats, deleteRepository } = require("../controllers/adminController");

const { signup, login, getProfile, updateProfile, deleteProfile } = require("../controllers/usercontroller");
const authenticateUser = require("../middleware/authMiddleware");
const { getAllUsers, deleteUser, createUser, getUserById,updateUser,getAllRepositories,getAdmins} = require("../controllers/adminController");



router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}, "username email"); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get("/users/:id", async (req, res) => {
  const { id } = req.params; 
  try {
    const user = await User.findById(id); 
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user); 
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});


router.get("/users/:id", getUserById);


router.post("/users", createUser);


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


router.put("/users/:id", updateUser);
router.get("/repositories", getAllRepositories);
router.delete('/repositories/:id', deleteRepository);

router.get('/admins', getAdmins);



module.exports = router;
