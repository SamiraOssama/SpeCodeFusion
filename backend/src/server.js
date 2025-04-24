const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../dotenv.env") });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const fs = require("fs");
const csv = require("csv-parser");
const passport = require("./middleware/passport");
const Repo = require("./models/repo"); // ✅ Import Repo model
const codeRoutes = require("./routes/codeRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(passport.initialize());

// ✅ Ensure directories exist
const extractedDir = path.join(__dirname, "extracted");
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(extractedDir)) fs.mkdirSync(extractedDir, { recursive: true });

// ✅ Serve extracted reports as static files
console.log("🛠️ Serving extracted files from:", extractedDir);
app.use("/extracted", express.static(extractedDir));

// ✅ Import Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/repos", require("./routes/repoRoutes"));
app.use("/api/files", require("./routes/fileRoutes"));
app.use("/api", codeRoutes);
// ✅ Fetch Extracted Requirements for a Repository
app.get("/api/repos/:repoId/extracted", async (req, res) => {
  const { repoId } = req.params;

  try {
    // ✅ Fetch repository by ID to get its name
    const repo = await Repo.findById(repoId);
    if (!repo) {
      console.error(`❌ Repository not found for ID: ${repoId}`);
      return res.status(404).json({ message: "Repository not found." });
    }

    // ✅ Construct the extracted file path using the repo name
    const extractedFilePath = path.join(extractedDir, repo.name, "latest_extracted.csv");
    console.log("🔍 Checking extracted file at:", extractedFilePath);

    if (!fs.existsSync(extractedFilePath)) {
      console.warn(`⚠️ Extracted file not found for repo: ${repo.name}`);
      return res.status(404).json({ message: "Extracted file not found." });
    }

    console.log("✅ Extracted file found, reading data...");

    const extractedRequirements = [];
    fs.createReadStream(extractedFilePath)
      .pipe(csv())
      .on("data", (row) => extractedRequirements.push(row))
      .on("end", () => {
        console.log("✅ Extracted Requirements:", extractedRequirements);
        res.json(extractedRequirements);
      })
      .on("error", (error) => {
        console.error("❌ Error reading extracted file:", error);
        res.status(500).json({ message: "Error reading extracted file.", error });
      });

  } catch (error) {
    console.error("❌ Server error fetching extracted requirements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
// Handle access requests
// Handle access requests
app.post('/api/repos/:repoId/request-access', async (req, res) => {
  try {
      const { repoId } = req.params;
      const { userId, userEmail } = req.body;

      // 1. Find the repository
      const repo = await Repository.findById(repoId);
      if (!repo) {
          return res.status(404).json({ message: "Repository not found" });
      }

      // 2. Check if user is already a member
      if (repo.members.includes(userId)) {
          return res.status(400).json({ message: "User is already a member" });
      }

      // 3. Check for existing pending request
      const existingRequest = repo.requests.find(
          req => req.user.toString() === userId && req.status === "pending"
      );
      if (existingRequest) {
          return res.status(400).json({ message: "Request already pending" });
      }

      // 4. Add the new request
      repo.requests.push({
          user: userId,
          email: userEmail,
          status: "pending"
      });

      await repo.save();

      res.status(200).json({ 
          message: "Access request sent successfully",
          request: repo.requests[repo.requests.length - 1]
      });
  } catch (error) {
      console.error("Error requesting access:", error);
      res.status(500).json({ message: error.message });
  }
});
// Handle request approval/rejection

const repoRoutes = require("./routes/repoRoutes");
app.use("/api/repos", repoRoutes);
app.post('/api/repos/:repoId/handle-request', async (req, res) => {
  try {
      const { repoId } = req.params;
      const { requestId, decision } = req.body;

      const repo = await Repository.findById(repoId);
      if (!repo) {
          return res.status(404).json({ message: "Repository not found" });
      }

      const request = repo.requests.id(requestId);
      if (!request) {
          return res.status(404).json({ message: "Request not found" });
      }

      // Update request status
      request.status = decision;
      request.processedAt = new Date();

      // If approved, add user to members
      if (decision === "approved" && !repo.members.includes(request.user)) {
          repo.members.push(request.user);
      }

      await repo.save();

      res.status(200).json({ 
          message: `Request ${decision} successfully`,
          userId: request.user
      });
  } catch (error) {
      console.error("Error handling request:", error);
      res.status(500).json({ message: error.message });
  }
});
app.get('/api/repos/check-request/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const repo = await Repo.findOne({
      "requests.user": userId,
      "requests.status": { $ne: "pending" }
    });

    if (!repo) {
      return res.status(404).json({ status: "pending" });
    }

    const request = repo.requests.find(req => req.user.toString() === userId);
    res.status(200).json({
      status: request.status,
      repoId: repo._id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// routes for notification

// ✅ Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/speccode", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Start Server
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
