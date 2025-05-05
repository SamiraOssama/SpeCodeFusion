const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const axios = require('axios');



exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password, role } = req.body;

  try {
    
    const response = await axios.get(`https://api.zerobounce.net/v2/validate`, {
      params: {
        api_key: process.env.ZERBOUNCE_API_KEY,
        email: email,
      },
    });

    const validationResult = response.data;
    
    
    if (validationResult.status !== 'valid') {
      return res.status(400).json({
        message: "Invalid email address. Please provide a valid email.",
        reason: validationResult.status  
      });
    }

    
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: "Username already exists" });

    
    user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists with this email" });

    
    const userRole = role || 'user'; 

   
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
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.login = async (req, res) => {
  const { emailOrUsername, password } = req.body;  // Using 'emailOrUsername' instead of 'email'
  
  try {
    // Check if the provided identifier is an email or username
    let user;
    if (emailOrUsername.includes('@')) {  // If the identifier is an email
      user = await User.findOne({ email: emailOrUsername });
    } else {  // If the identifier is a username
      user = await User.findOne({ username: emailOrUsername });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username/email or password" });
    }

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

