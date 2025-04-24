const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../dotenv.env") });

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

console.log("🔐 GOOGLE_CLIENT_ID from env:", process.env.GOOGLE_CLIENT_ID);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/users/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;  // Fetch email from Google profile

        let user = await User.findOne({ email });
        if (!user) {
          user = new User({
            email,
            username: profile.displayName, 
            isGoogleUser: true,
            role: "user",
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


module.exports = passport;
