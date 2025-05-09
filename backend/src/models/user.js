const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true},
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function () {
    
      return !this.isGoogleUser;
    },
  },
  role: { type: String, default: "user" },
  isGoogleUser: { type: Boolean, default: false }
});




module.exports = mongoose.model('User', userSchema);
