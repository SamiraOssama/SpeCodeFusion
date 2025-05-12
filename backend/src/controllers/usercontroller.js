const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const axios = require('axios');
const crypto = require('crypto');


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
      isGoogleUser: user.isGoogleUser,
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

// Direct password reset without email verification
exports.sendResetEmail = async (req, res) => {
  const { email, username } = req.body;

  try {
    // Find user by email and username combination
    const user = await User.findOne({ email, username });
    
    if (!user) {
      return res.status(400).json({ 
        message: 'User not found. Please check your email and username.' 
      });
    }

    // Generate a simple reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Update user with reset token
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send token to frontend
    res.json({ 
      message: 'Verification successful',
      resetToken 
    });

  } catch (error) {
    console.error('Reset process error:', error);
    res.status(500).json({ 
      message: 'An error occurred during verification. Please try again.' 
    });
  }
};

// Handle password reset
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired reset token. Please try again.' 
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ 
      message: 'Password successfully reset. You can now login with your new password.' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      message: 'Error resetting password. Please try again.' 
    });
  }
};
exports.changePassword = async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Both fields are required." });
  }

  try {
    const user = await User.findById(userId);
    if (!user || user.isGoogleUser) {
      return res.status(403).json({ message: "Password change not allowed." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
};
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { username, email } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.username = username || user.username;
    user.email = email || user.email;

    const updatedUser = await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture,
        isGoogleUser: updatedUser.isGoogleUser,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.googleCallback = (req, res) => {
  try {
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: req.user.id, 
        email: req.user.email, 
        role: req.user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: "3h" }
    );

    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/google-login-success?token=${token}`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect('http://localhost:5173/login?error=auth_failed');
  }
};