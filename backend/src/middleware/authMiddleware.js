const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  let token = req.header("Authorization");

  if (!token) {
    console.log("🚫 No token found in Authorization header");
    return res.status(401).json({ error: "Unauthorized access!" });
  }

  try {
    if (token.startsWith("Bearer ")) {
      token = token.slice(7);
    }
  
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Decoded JWT:", decoded); 
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ JWT verification failed:", error.message);
    return res.status(401).json({ error: "Invalid or expired token." });
  }
  
};


module.exports = authenticateUser;
