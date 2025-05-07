const User = require("../models/user");
const Repo = require("../models/repo");
const bcrypt = require("bcryptjs");


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

   

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!role) {
      return res.status(400).json({ error: "Role is required when an admin adds a user" });
    }

  
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    
    const newUser = new User({ username, email, password, role });
    await newUser.save();

    res.status(201).json({ message: "User added successfully", user: newUser });
  } catch (error) {
    console.error("❌ Error adding user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};






exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params; 
  try {
    const user = await User.findById(id); 
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user); 
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};



exports.getPerformanceStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const repoCount = await Repo.countDocuments();

    res.json({
      userCount,
      repoCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching statistics" });
  }
};



exports.getAllRepos = async (req, res) => {
  try {
    const repos = await Repo.find(); 
    res.json(repos);
  } catch (err) {
    console.error("Error fetching all repos:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { username, email } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { username, email },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllRepositories = async (req, res) => {
  try {
    const repos = await Repo.find().populate("owner", "username email");
    res.status(200).json(repos);
  } catch (error) {
    console.error("Error fetching all repositories:", error);
    res.status(500).json({ message: "Failed to fetch repositories." });
  }
};



exports.deleteRepository = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedRepo = await Repo.findByIdAndDelete(id);
    if (!deletedRepo) {
      return res.status(404).json({ message: "Repository not found" });
    }
    res.status(200).json({ message: "Repository deleted successfully" });
  } catch (error) {
    console.error("Error deleting repository:", error);
    res.status(500).json({ message: "Server error" });
  }
};


