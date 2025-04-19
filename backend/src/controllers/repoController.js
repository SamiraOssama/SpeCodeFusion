const Repo = require("../models/repo");
const User = require("../models/user");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const mongoose = require("mongoose");

// =============================================
// HELPER FUNCTIONS
// =============================================

const isValidSourceCodeFile = (filename) => {
  const allowedExtensions = ['.py', '.java', '.js', '.cpp', '.c', '.h', '.hpp', '.zip'];
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
};

const cleanupOnError = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`❌ Error cleaning up file ${filePath}:`, err);
    }
  }
};
async function handlePythonProcess(process, res, { success, failure }) {
  let stdout = '';
  let stderr = '';

  process.stdout.on('data', (data) => {
    stdout += data.toString();
    console.log(`🐍 Python Output: ${data}`);
  });

  process.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error(`❌ Python Error: ${data}`);
  });

  return new Promise((resolve) => {
    process.on('close', async (code) => {
      try {
        if (code === 0) {
          const result = await success();
          res.status(200).json(result);
        } else {
          const errorObj = new Error(stderr || "Process exited with error");
          res.status(500).json(failure(errorObj));
        }
      } catch (err) {
        console.error("❌ Error handling process result:", err);
        res.status(500).json(failure(err));
      }
      resolve();
    });
  });
}

// =============================================
// REPOSITORY CRUD OPERATIONS
// =============================================

exports.createRepo = async (req, res) => {
  try {
    console.log("Received request to create repo:", req.body);
    const { name } = req.body;
    const owner = req.user.id;

    if (!name) return res.status(400).json({ message: "Repo name is required" });

    const existingRepo = await Repo.findOne({ name });
    if (existingRepo) return res.status(400).json({ message: "Repo name already exists" });

    const repo = new Repo({ name, owner, members: [owner], srsHistory: [], sourceCodeHistory: [] });
    await repo.save();

    res.status(201).json({ message: "Repository created successfully!", repo });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getUserRepositories = async (req, res) => {
  try {
    console.log("🔍 Request from User ID:", req.user?.id);

    if (!req.user?.id) {
      return res.status(400).json({ message: "Invalid User ID in Token" });
    }

    const userId = req.user.id;
    const repos = await Repo.find({ $or: [{ owner: userId }, { members: userId }] });

    res.status(200).json(repos);
  } catch (error) {
    console.error("❌ Error fetching user repositories:", error);
    res.status(500).json({ message: "Failed to fetch repositories." });
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

exports.getRepoDetails = async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log("🔍 Fetching details for repoId:", repoId);

    const repo = await Repo.findById(repoId);
    if (!repo) {
      console.error("❌ Repository not found:", repoId);
      return res.status(404).json({ message: "Repository not found." });
    }

    const extractedDir = path.join(__dirname, "../extracted", repo.name);
    const extractedFilePath = `/extracted/${repo.name}/latest_extracted_updated.csv`;
    const initialExtractedPath = `/extracted/${repo.name}/latest_extracted.csv`;

    // Check if updated file exists, fall back to initial if not
    let displayPath = extractedFilePath;
    if (!fs.existsSync(path.join(extractedDir, "latest_extracted_updated.csv"))) {
      displayPath = initialExtractedPath;
    }

    console.log("📂 Extracted File Path Sent to Frontend:", displayPath);

    res.status(200).json({
      repo,
      commits: (repo.srsHistory?.length || 0) + (repo.sourceCodeHistory?.length || 0),
      extractedReport: displayPath,
      latest_extracted_updated: extractedFilePath,
      latest_extracted: initialExtractedPath
    });
  } catch (error) {
    console.error("❌ Server Error Fetching Repo Details:", error);
    res.status(500).json({ message: "Failed to fetch repository details." });
  }
};

exports.getRepoOwner = async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log("🔍 Fetching owner for repoId:", repoId);

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ message: "Invalid repository ID format." });
    }

    const repo = await Repo.findById(repoId).populate("owner", "username email organization");

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    if (!repo.owner) {
      return res.status(404).json({ message: "Owner details not found" });
    }

    res.status(200).json({
      _id: repo.owner._id,
      name: repo.owner.username || "N/A",
      email: repo.owner.email || "N/A",
      organization: repo.owner.organization || "N/A",
    });
  } catch (error) {
    console.error("❌ Error fetching repository owner:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// =============================================
// ACCESS CONTROL & REQUESTS
// =============================================

exports.requestAccess = async (req, res) => {
  try {
    console.log("Request access received:", {
      params: req.params,
      body: req.body,
      user: req.user
    });

    const { repoId } = req.params;
    const { userId, userEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ message: "Invalid repository ID" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    if (repo.members.some(member => member.equals(userId))) {
      return res.status(400).json({ message: "User is already a member" });
    }

    const existingRequest = repo.requests.find(request => 
      request.user.equals(userId) && request.status === "pending"
    );

    if (existingRequest) {
      return res.status(400).json({ message: "Request already pending" });
    }

    const newRequest = {
      user: userId,
      email: userEmail,
      status: "pending",
      requestedAt: new Date()
    };

    repo.requests.push(newRequest);
    await repo.save();

    res.status(200).json({ 
      message: "Access request sent successfully",
      request: newRequest
    });
  } catch (error) {
    console.error("Error in requestAccess:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.manageAccess = async (req, res) => {
  try {
    const { repoId, userId, action } = req.body;
    const repo = await Repo.findById(repoId);
    if (!repo) return res.status(404).json({ message: "Repository not found" });

    if (repo.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the repo owner can manage access" });
    }

    if (action === "approve") {
      repo.members.push(userId);
    }
    repo.requests = repo.requests.filter((reqUserId) => reqUserId.toString() !== userId);

    await repo.save();
    res.status(200).json({ message: `User ${action}d successfully` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.handleAccessRequest = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { requestId, decision } = req.body;
    const ownerId = req.user.id;

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Invalid decision value" });
    }

    const repo = await Repo.findOne({
      _id: repoId,
      owner: ownerId,
      "requests._id": requestId
    });

    if (!repo) {
      return res.status(404).json({ message: "Repository or request not found" });
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
      userId: request.user,
      requestId: request._id
    });
  } catch (error) {
    console.error("Error handling access request:", error);
    res.status(500).json({ 
      message: "Server error processing request",
      error: error.message 
    });
  }
};

exports.getRepoRequests = async (req, res) => {
  try {
    const { repoId } = req.params;
    const ownerId = req.user.id;

    console.log("🔍 Fetching requests for repo:", repoId);
    console.log("👤 Authenticated Owner ID:", ownerId);

    const repo = await Repo.findById(repoId).populate("requests", "username email");

    if (!repo) {
      console.error("❌ Repository not found:", repoId);
      return res.status(404).json({ message: "Repository not found" });
    }

    if (repo.owner.toString() !== ownerId) {
      console.error("❌ Access denied. Owner ID mismatch:", { expected: repo.owner.toString(), found: ownerId });
      return res.status(403).json({ message: "Access denied. Only the owner can view requests." });
    }

    console.log("✅ Requests found:", repo.requests);
    res.status(200).json(repo.requests);
  } catch (error) {
    console.error("❌ Error fetching requests:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getReposWithRequests = async (req, res) => {
  try {
    console.log("🔍 Request from User ID:", req.user?.id);

    if (!req.user?.id) {
      return res.status(400).json({ message: "Invalid User ID in Token" });
    }

    const userId = req.user.id;
    const repos = await Repo.find({ $or: [{ owner: userId }, { members: userId }] })
      .populate("requests", "username email");

    console.log("✅ Repositories with populated requests:", repos);
    res.status(200).json(repos);
  } catch (error) {
    console.error("❌ Error fetching repositories with requests:", error);
    res.status(500).json({ message: "Failed to fetch repositories." });
  }
};
exports.handleRequest = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { userId, action } = req.body;
    const ownerId = req.user.id;

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    if (repo.owner.toString() !== ownerId) {
      return res.status(403).json({ message: "Only the owner can approve or reject requests" });
    }

    if (!repo.requests.includes(userId)) {
      return res.status(400).json({ message: "Request not found" });
    }

    if (action === "approve") {
      repo.members.push(userId);
    }
    repo.requests = repo.requests.filter((reqUserId) => reqUserId.toString() !== userId);

    await repo.save();
    res.status(200).json({ message: `User ${action}d successfully` });
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// =============================================
// FILE UPLOAD & PROCESSING
// =============================================

exports.uploadFile = async (req, res) => {
  let filePath;
  try {
    console.log("📩 Received file upload request:", req.body);
    console.log("📂 Uploaded file details:", req.file);

    const { fileType, githubUrl } = req.body;
    const repoId = req.params.repoId;
    const userId = req.user.id;

    // Validate input
    if (!req.file && !githubUrl) {
      return res.status(400).json({ message: "No file or GitHub URL provided!" });
    }

    if (githubUrl && fileType !== "sourceCode") {
      return res.status(400).json({ message: "GitHub URL can only be used for source code upload" });
    }

    if (githubUrl && !githubUrl.includes("github.com")) {
      return res.status(400).json({ message: "Please provide a valid GitHub repository URL" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) {
      if (req.file) cleanupOnError(req.file.path);
      return res.status(404).json({ message: "Repository not found" });
    }

    if (!repo.members.includes(userId)) {
      if (req.file) cleanupOnError(req.file.path);
      return res.status(403).json({ message: "Access denied" });
    }

    // Create necessary directories
    const repoUploadDir = path.join(__dirname, "../uploads", repo.name);
    const repoExtractedDir = path.join(__dirname, "../extracted", repo.name);

    const sourceCodePath = path.join(repoUploadDir, "github_clone");

// Ensure the directory exists
if (!fs.existsSync(sourceCodePath)) {
  fs.mkdirSync(sourceCodePath, { recursive: true });
}
    [repoUploadDir, repoExtractedDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    let historyEntry;
  
    if (githubUrl) {
      // Handle GitHub URL
      historyEntry = {
        user: userId,
        action: "Uploaded from GitHub",
        file: githubUrl,
        timestamp: new Date(),
        metadata: {
          filesAnalyzed: 0,
          functionsFound: 0
        }
      };

      // Save the GitHub URL as the source code file
      repo.sourceCodeHistory.push(historyEntry);
      repo.sourceCodeFile = githubUrl;
      await repo.save();

      // Run GitHub analysis
      const extractedJsonPath = path.join(repoExtractedDir, "sourcecode.json");
      console.log(`📂 Running GitHub analysis to: ${extractedJsonPath}`);
// In the GitHub URL handling section of uploadFile:
// In the GitHub URL handling section of uploadFile:
const pythonProcess = spawn("python", [
  path.resolve(__dirname, "../scripts/github_analysis.py"),
  "--url", githubUrl,
  "--output", extractedJsonPath,
  "--clone-dir", sourceCodePath  // This will now work
], {
  windowsHide: true,
  cwd: process.cwd()
});

// Add error handling for spawn
pythonProcess.on('error', (err) => {
  console.error('❌ Failed to start Python process:', err);
  cleanupOnError(sourceCodePath);
  return res.status(500).json({ 
      message: "Failed to start analysis process",
      error: err.message 
  });
});

await handlePythonProcess(pythonProcess, res, {
  success: async () => {
    if (!fs.existsSync(extractedJsonPath)) {
      throw new Error("Analysis completed but output file not found");
    }

    let analysisData;
    try {
      analysisData = JSON.parse(fs.readFileSync(extractedJsonPath, 'utf8'));
    } catch (e) {
      throw new Error(`Invalid analysis output: ${e.message}`);
    }

    // Update the repository with analysis results
    if (repo.sourceCodeHistory.length > 0) {
      const lastEntry = repo.sourceCodeHistory[repo.sourceCodeHistory.length - 1];
      lastEntry.metadata = {
        filesAnalyzed: analysisData.files_analyzed || 0,
        functionsFound: analysisData.functions_found || 0,
        functions: analysisData.functions || []
      };
      await repo.save();
    }

    return {
      message: "GitHub repository analyzed successfully!",
      repo,
      extractedJsonPath,
      analysis: {
        filesAnalyzed: analysisData.files_analyzed || 0,
        functionsFound: analysisData.functions_found || 0,
        functions: analysisData.functions || [],
        summary: `Analyzed ${analysisData.files_analyzed || 0} files with ${analysisData.functions_found || 0} functions`
      }
    };
  },
  failure: (error) => ({
    message: "GitHub analysis failed",
    error: error.message,
    logs: "Check Python script logs for details"
  })
});
    } else {
      // Handle file upload (existing code)
      if (fileType === "sourceCode" && !isValidSourceCodeFile(req.file.originalname)) {
        cleanupOnError(req.file.path);
        return res.status(400).json({ 
          message: "Invalid file type for source code upload",
          allowed: "Python, Java, JavaScript, C/C++ files or ZIP archives"
        });
      }

      const fileExt = path.extname(req.file.originalname);
      const fileName = fileType === "srs" ? `SRS${fileExt}` : `SourceCode${fileExt}`;
      filePath = path.join(repoUploadDir, fileName);

      fs.renameSync(req.file.path, filePath);

      historyEntry = {
        user: userId,
        action: fileType === "srs" ? "Uploaded SRS" : "Uploaded Source Code",
        file: filePath,
        timestamp: new Date(),
      };

      if (fileType === "srs") {
        repo.srsHistory.push(historyEntry);
        repo.srsFile = filePath;

        const extractedFilePath = path.join(repoExtractedDir, "latest_extracted.csv");
        console.log(`📂 Running SRS extraction to: ${extractedFilePath}`);

        const pythonProcess = spawn("python", [
          path.resolve(__dirname, "../scripts/test_model.py"),
          "--file", filePath,
          "--output", extractedFilePath
        ]);

        await handlePythonProcess(pythonProcess, res, {
          success: () => ({
            message: "SRS uploaded and processed successfully, validated with Gemini!",
            repo,
            extractedFilePath,
            requirementType: "Functional Only"
          }),
          failure: (error) => ({
            message: "SRS extraction failed",
            error: error.message,
            logs: "Check Python script logs for details"
          })
        });
      } else if (fileType === "sourceCode") {
        repo.sourceCodeHistory.push(historyEntry);
        repo.sourceCodeFile = filePath;

        const extractedJsonPath = path.join(repoExtractedDir, "sourcecode.json");
        console.log(`📂 Running source code analysis to: ${extractedJsonPath}`);

        const pythonProcess = spawn("python", [
          path.resolve(__dirname, "../scripts/gemini_ast.py"),
          "--file", filePath,
          "--output", extractedJsonPath
        ]);

        await handlePythonProcess(pythonProcess, res, {
          success: async () => {
            if (!fs.existsSync(extractedJsonPath)) {
              throw new Error("Analysis completed but output file not found");
            }

            let analysisData;
            try {
              analysisData = JSON.parse(fs.readFileSync(extractedJsonPath, 'utf8'));
            } catch (e) {
              throw new Error(`Invalid analysis output: ${e.message}`);
            }

            // Update the history entry with analysis results
            if (repo.sourceCodeHistory.length > 0) {
              const lastEntry = repo.sourceCodeHistory[repo.sourceCodeHistory.length - 1];
              lastEntry.metadata = {
                filesAnalyzed: analysisData.files_analyzed || 0,
                functionsFound: analysisData.functions_found || 0
              };
              await repo.save();
            }

            return {
              message: "Source code analyzed successfully!",
              repo,
              extractedJsonPath,
              analysis: {
                filesAnalyzed: analysisData.files_analyzed || 0,
                functionsFound: analysisData.functions_found || 0,
                summary: `Analyzed ${analysisData.files_analyzed || 0} files with ${analysisData.functions_found || 0} functions`
              }
            };
          },
          failure: (error) => ({
            message: "Source code analysis failed",
            error: error.message,
            logs: "Check Python script logs for details"
          })
        });
      }
    }

    await repo.save();
  } catch (error) {
    console.error("❌ Server Error:", error);
    cleanupOnError(filePath);
    res.status(500).json({ 
      message: "Server error during file processing",
      error: error.message 
    });
  }
};

// =============================================
// HISTORY & COMPARISON
// =============================================

exports.getRepoHistory = async (req, res) => {
  try {
    const { repoId } = req.params;
    console.log("🔍 Fetching history for repo:", repoId);

    const repo = await Repo.findById(repoId)
      .populate("srsHistory.user", "username email")
      .populate("sourceCodeHistory.user", "username email");

    if (!repo) {
      console.error("❌ Repository not found:", repoId);
      return res.status(404).json({ message: "Repository not found" });
    }

    res.status(200).json({
      srsHistory: repo.srsHistory || [],
      sourceCodeHistory: repo.sourceCodeHistory || [],
    });
  } catch (error) {
    console.error("❌ Error fetching history:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add this to repoController.js
exports.compareRequirementsWithCode = async (req, res) => {
  try {
    const { repoId } = req.params;
    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const extractedDir = path.join(__dirname, "../extracted", repo.name);
    const requirementsPath = path.join(extractedDir, "latest_extracted_updated.csv");
    const sourceCodePath = path.join(extractedDir, "sourcecode.json");
    const resultsPath = path.join(extractedDir, "latest_extracted_updated_comparison_results.json");

    // Check if files exist
    if (!fs.existsSync(requirementsPath)) {
      return res.status(404).json({ message: "Requirements file not found" });
    }
    if (!fs.existsSync(sourceCodePath)) {
      return res.status(404).json({ message: "Source code analysis file not found" });
    }

    const pythonProcess = spawn("python", [
      path.resolve(__dirname, "../scripts/compare_requirements.py"),
      "--requirements", requirementsPath,
      "--sourcecode", sourceCodePath,
      "--output", resultsPath
    ]);

    await handlePythonProcess(pythonProcess, res, {
      success: async () => {
        if (!fs.existsSync(resultsPath)) {
          throw new Error("Comparison completed but results file not found");
        }

        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        
        // Format the results for the frontend
        return {
          message: "Comparison completed successfully",
          stats: results.stats || {
            coveragePercentage: results.coverage_percentage || 0,
            implementedRequirements: results.implemented_requirements?.length || 0,
            missingRequirements: results.missing_requirements?.length || 0,
            undocumentedFunctions: results.undocumented_functions?.length || 0
          },
          missingRequirements: results.missing_requirements || [],
          undocumentedFunctions: results.undocumented_functions || [],
          implementedRequirements: results.implemented_requirements || []
        };
      },
      failure: (error) => ({
        message: "Comparison failed",
        error: error.message,
        logs: "Check Python script logs for details"
      })
    });
  } catch (error) {
    console.error("Comparison error:", error);
    res.status(500).json({ 
      message: "Error during comparison", 
      error: error.message 
    });
  }
};

exports.getExtractedRequirements = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { useUpdated } = req.query;
    
    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const extractedDir = path.join(__dirname, "../extracted", repo.name);
    const filePath = useUpdated 
      ? path.join(extractedDir, "latest_extracted_updated.csv")
      : path.join(extractedDir, "latest_extracted.csv");

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Extracted requirements file not found" });
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    const headers = lines[0].split(',');
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i]) continue;
      
      const values = lines[i].split(',');
      const obj = {};
      headers.forEach((header, j) => {
        obj[header.trim().replace(/"/g, '')] = values[j]?.trim().replace(/"/g, '');
      });
      result.push(obj);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching extracted requirements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



