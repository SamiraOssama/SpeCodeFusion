const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function() {
      return !this.isGoogleUser; // Password is not required for Google users
    }
  },
  role: { type: String, default: "user" },
  isGoogleUser: { type: Boolean, default: false },
  googleId: { type: String }, // Add googleId field
  avatar: { type: String }, // Add avatar field
  isVerified: { type: Boolean, default: false }, // Add isVerified field
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
});

module.exports = mongoose.model('User', userSchema);
