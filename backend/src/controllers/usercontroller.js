const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");



exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    // Set the role to 'user' if it's not provided
    const userRole = role || 'user'; // Default role is 'user'

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, email, password: hashedPassword, role: userRole });
    await user.save();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET, 
      { expiresIn: "3h" }
    );

    res.status(201).json({ token, message: "Signup successful", user: { username, email, role: userRole } });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.googleCallback = async (req, res) => {
  const user = req.user;

  if (user.isGoogleUser && !user.username) {

    user.username = user.email.split("@")[0]; 
    await user.save(); 
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET, 
    { expiresIn: "3h" }
  );
  
  res.redirect(`http://localhost:5173/google-login-success?token=${token}`);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET, 
      { expiresIn: "3h" }
    );

    const responseData = {
      message: "Login successful",
      token,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,  
      }
    };

    res.json(responseData); 
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};



exports.getProfile = async (req, res) => {
  try {
    console.log("🔎 Fetching profile for user ID:", req.user.id); 

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      username: user.username, 
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture || null,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (user) {
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      profilePicture: updatedUser.profilePicture,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});


exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("username email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

