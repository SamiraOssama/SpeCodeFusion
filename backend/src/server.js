const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../dotenv.env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const csv = require("csv-parser");
const passport = require('passport');
require('./config/passport');
const Repo = require("./models/repo");
const codeRoutes = require("./routes/codeRoutes");
const compatibilityRoutes = require("./routes/compatibilityRoutes");
const { initialize } = require("./scripts/init");
const { execSync } = require('child_process');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(passport.initialize());

// Run the NLTK setup script to ensure NLP resources are available
const setupNltkPath = path.join(__dirname, 'scripts', 'github_analysis', 'embed', 'setup_nltk.py');

console.log("🔧 Setting up NLTK resources...");
try {
  const setupOutput = execSync(`python "${setupNltkPath}"`, { encoding: 'utf-8' });
  console.log("✅ NLTK setup completed successfully.");
} catch (error) {
  console.warn("⚠️ NLTK setup encountered issues, but server will continue:");
  console.warn(error.message);
}

// Create necessary directories if they don't exist
const extractedDir = path.join(__dirname, 'extracted');
const uploadDir = path.join(__dirname, 'uploads');

[extractedDir, uploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`📁 Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ✅ Serve extracted reports as static files
console.log("🛠️ Serving extracted files from:", extractedDir);
app.use("/extracted", express.static(extractedDir));

// ✅ Import Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/repos", require("./routes/repoRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));
app.use("/api/compatibility", compatibilityRoutes);
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api", codeRoutes);
app.use('/api/notifications', notificationRoutes);

// ✅ Connect to MongoDB and start server
async function startServer() {
  try {
    // Initialize required resources
    await initialize();
    
    // Connect to MongoDB
    await mongoose.connect("mongodb://127.0.0.1:27017/speccode", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");
    
    // Start server
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
