const Repo = require("../models/repo");
const User = require("../models/user");
const Notification = require("../models/notification");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const mongoose = require("mongoose");
const pathUtils = require("../utils/pathUtils"); // Import the new path utilities
const { createNotification } = require('./notificationController');

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
      if (fs.lstatSync(filePath).isDirectory()) {
        // Use rimraf or recursive removal for directories
        const rimraf = (path) => {
          if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file) => {
              const curPath = path + "/" + file;
              if (fs.lstatSync(curPath).isDirectory()) {
                rimraf(curPath);
              } else {
                try {
                  fs.unlinkSync(curPath);
                } catch (err) {
                  console.error(`❌ Error removing file ${curPath}:`, err);
                }
              }
            });
            try {
              fs.rmdirSync(path);
            } catch (err) {
              console.error(`❌ Error removing directory ${path}:`, err);
            }
          }
        };
        
        try {
          rimraf(filePath);
        } catch (err) {
          console.error(`❌ Error cleaning up directory ${filePath}:`, err);
          // If normal cleanup fails, try forcing with child_process
          try {
            if (process.platform === 'win32') {
              require('child_process').execSync(`rd /s /q "${filePath}"`);
            } else {
              require('child_process').execSync(`rm -rf "${filePath}"`);
            }
          } catch (cmdErr) {
            console.error(`❌ Forced directory removal also failed for ${filePath}:`, cmdErr);
          }
        }
      } else {
        // It's a file
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`❌ Error cleaning up file ${filePath}:`, err);
    }
  }
};

const validateGithubUrl = async (url) => {
  // Extract owner and repo name from GitHub URL
  let repoRegex = /github\.com\/([^\/]+)\/([^\/\.]+)/;
  let match = url.match(repoRegex);
  
  if (!match) {
    throw new Error("Invalid GitHub repository URL format. Expected format: https://github.com/owner/repo");
  }
  
  let [, owner, repo] = match;
  
  // Check if repository exists and is accessible using GitHub API
  try {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      console.log(`🔍 Checking GitHub repository: ${apiUrl}`);
      
      const options = {
        headers: {
          'User-Agent': 'SpeCodeFusion-3'
        }
      };
      
      const req = https.get(apiUrl, options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const repoInfo = JSON.parse(data);
              resolve({
                valid: true,
                owner,
                repo,
                size: repoInfo.size,
                default_branch: repoInfo.default_branch,
                visibility: repoInfo.visibility,
                message: "Repository is accessible"
              });
            } catch (err) {
              reject(new Error(`Failed to parse GitHub API response: ${err.message}`));
            }
          } else if (res.statusCode === 404) {
            reject(new Error("Repository not found or is private"));
          } else {
            reject(new Error(`GitHub API returned status code: ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', (err) => {
        reject(new Error(`Error checking GitHub repository: ${err.message}`));
      });
      
      req.end();
    });
  } catch (err) {
    throw new Error(`Failed to validate GitHub URL: ${err.message}`);
  }
};

async function handlePythonProcess(process, res, { success, failure }) {
  let stdout = '';
  let stderr = '';
  let hasResponded = false;

  process.stdout.on('data', (data) => {
    stdout += data.toString();
    console.log(`🐍 Python Output: ${data}`);
  });

  process.stderr.on('data', (data) => {
    stderr += data.toString();
    console.error(`❌ Python Error: ${data}`);
    
    // Check for common Windows permission errors
    if (data.toString().includes('Access is denied') || data.toString().includes('WinError 5')) {
      console.error('🔒 Windows permission error detected, process may fail');
    }
  });

  // Handle unexpected process termination
  process.on('exit', (code) => {
    if (code !== 0 && !hasResponded) {
      console.error(`⚠️ Python process exited unexpectedly with code ${code}`);
    }
  });

  return new Promise((resolve) => {
    process.on('close', async (code) => {
      try {
        if (!hasResponded) {
          if (code === 0) {
            const result = await success();
            res.status(200).json(result);
          } else {
            console.error(`❌ Python process exited with code ${code}`);
            const errorObj = new Error(stderr || `Process exited with code ${code}`);
            res.status(500).json(failure(errorObj));
          }
          hasResponded = true;
        }
      } catch (err) {
        console.error("❌ Error handling process result:", err);
        if (!hasResponded) {
          res.status(500).json(failure(err));
          hasResponded = true;
        }
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
    
    // First find the user to ensure they exist
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find repositories and populate owner data
    const repos = await Repo.find({ 
      $or: [{ owner: userId }, { members: userId }] 
    }).populate({
      path: 'owner',
      select: 'username email'
    });

    console.log("Found repositories:", repos.map(repo => ({
      name: repo.name,
      owner: repo.owner
    })));

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
    console.log("👤 Authenticated user:", req.user);

    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({ message: "Invalid repository ID format." });
    }

    const repo = await Repo.findById(repoId).populate("owner", "username email organization");
    console.log("📦 Found repository:", {
      id: repo?._id,
      name: repo?.name,
      owner: repo?.owner?._id
    });

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    if (!repo.owner) {
      return res.status(404).json({ message: "Owner details not found" });
    }

    const ownerData = {
      _id: repo.owner._id,
      name: repo.owner.username || "N/A",
      email: repo.owner.email || "N/A",
      organization: repo.owner.organization || "N/A",
    };
    
    console.log("👑 Returning owner data:", ownerData);
    res.status(200).json(ownerData);
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

    const sourceCodePath = pathUtils.getSafeRepoPath(path.join(repoUploadDir, "github_clone"));

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
      // Validate GitHub URL first
      try {
        const validationResult = await validateGithubUrl(githubUrl);
        console.log(`✅ GitHub repository validation successful: ${validationResult.message}`);
        
        // Warning for large repositories (size is in KB)
        if (validationResult.size > 100000) { // 100MB
          console.warn(`⚠️ Large repository detected (${Math.round(validationResult.size/1024)}MB)`);
        }
      } catch (validationError) {
        console.error("❌ GitHub repository validation failed:", validationError.message);
        return res.status(400).json({ 
          message: `GitHub repository validation failed: ${validationError.message}`,
          error: validationError.message
        });
      }

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
      const pythonProcess = spawn("python", [
        path.resolve(__dirname, "../scripts/github_analysis.py"),
        "--url", githubUrl,
        "--output", path.join(repoExtractedDir),
        "--clone-dir", sourceCodePath
      ], {
        windowsHide: true,
        cwd: process.cwd(),
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUNBUFFERED: '1'
        }
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

      // Set a reasonable timeout for the process (10 minutes)
      const timeout = setTimeout(() => {
        console.error('❌ Python process timed out after 10 minutes');
        pythonProcess.kill();
        cleanupOnError(sourceCodePath);
        return res.status(500).json({
          message: "Repository analysis timed out. Try again with a smaller repository.",
          error: "Process exceeded time limit (10 minutes)"
        });
      }, 10 * 60 * 1000);

      await handlePythonProcess(pythonProcess, res, {
        success: async () => {
          clearTimeout(timeout);
          const extractedJsonPath = path.join(repoExtractedDir, "sourcecode.json");
          const reportPath = path.join(repoExtractedDir, "compatibility_report.csv");
          
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

          // Prepare response with report information if available
          const responseData = {
            message: "GitHub repository analyzed successfully!",
            repo,
            analysis: {
              filesAnalyzed: analysisData.files_analyzed || 0,
              functionsFound: analysisData.functions_found || 0,
              functions: analysisData.functions || [],
              summary: `Analyzed ${analysisData.files_analyzed || 0} files with ${analysisData.functions_found || 0} functions`
            }
          };

          // Add report information if it was generated
          if (fs.existsSync(reportPath)) {
            responseData.report = {
              path: reportPath,
              exists: true,
              message: "Compatibility report generated successfully"
            };
          }

          return responseData;
        },
        failure: (error) => {
          clearTimeout(timeout);
          return {
            message: "GitHub analysis failed",
            error: error.message,
            logs: "Check Python script logs for details"
          };
        }
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

        const srsExtractProcess = spawn("python", [
          path.resolve(__dirname, "../scripts/test_model.py"),
          "--file", filePath,
          "--output", extractedFilePath
        ]);

        await handlePythonProcess(srsExtractProcess, res, {
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

        const codeAnalysisProcess = spawn("python", [
          path.resolve(__dirname, "../scripts/gemini_ast.py"),
          "--file", filePath,
          "--output", extractedJsonPath
        ]);

        await handlePythonProcess(codeAnalysisProcess, res, {
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

exports.uploadCSVFile = async (req, res) => {
  try {
    const { repoId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Read the file to validate its contents before saving
    const fileContent = fs.readFileSync(file.path, 'utf8');
    
    // Check if the file has content
    if (!fileContent || fileContent.trim().length === 0) {
      return res.status(400).json({ message: "The uploaded file is empty" });
    }
    
    // Split by newline and filter out empty lines
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return res.status(400).json({ 
        message: "The CSV file is empty. Please upload a file with actual content."
      });
    }
    
    if (lines.length === 1) {
      return res.status(400).json({ 
        message: "The CSV file contains only headers. Please upload a file with actual requirements."
      });
    }

    // Parse the header row
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Check if the file appears to be in CSV format
    if (headers.length <= 1) {
      return res.status(400).json({ 
        message: "The file does not appear to be in a valid CSV format. Please ensure it's properly formatted with comma-separated values."
      });
    }
    
    // Determine which column has the requirement text
    const reqTextColIndex = headers.findIndex(h => 
      h.toLowerCase().includes('requirement') || 
      h.toLowerCase().includes('text') || 
      h.toLowerCase().includes('description')
    );
    
    // If no appropriate column was found, alert the user
    if (reqTextColIndex < 0) {
      return res.status(400).json({ 
        message: "The CSV file does not appear to have a column for requirement text. Please ensure your CSV has a column with 'requirement', 'text', or 'description' in the header."
      });
    }
    
    // Check if there are any non-empty requirements
    let validRequirementsCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      
      // Skip rows that don't have enough columns
      if (values.length <= reqTextColIndex) continue;
      
      // Count rows with non-empty requirement text
      if (values[reqTextColIndex] && values[reqTextColIndex].trim().length > 0) {
        validRequirementsCount++;
      }
    }
    
    if (validRequirementsCount === 0) {
      return res.status(400).json({ 
        message: "The CSV file contains no valid requirements. Please check the file format and content."
      });
    }

    // Ensure extracted directory exists
    const extractedDir = path.join(__dirname, "../extracted", repo.name);
    if (!fs.existsSync(extractedDir)) {
      fs.mkdirSync(extractedDir, { recursive: true });
    }

    // Save the validated file
    const savedFilePath = path.join(extractedDir, "latest_extracted_updated.csv");
    fs.copyFileSync(file.path, savedFilePath);

    // Clean up the temp file
    fs.unlinkSync(file.path);

    res.status(200).json({ 
      message: `CSV file uploaded successfully with ${validRequirementsCount} valid requirements`,
      repo: repo.name,
      file: savedFilePath,
      validRequirementsCount
    });
  } catch (error) {
    console.error("Error uploading CSV file:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
    
    // Try the updated file first if requested, or if not specified, try both
    let filePath;
    if (useUpdated) {
      filePath = path.join(extractedDir, "latest_extracted_updated.csv");
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          message: "Updated requirements file not found. Please process the SRS file first." 
        });
      }
    } else {
      // Try updated file first, then fall back to original
      const updatedPath = path.join(extractedDir, "latest_extracted_updated.csv");
      const originalPath = path.join(extractedDir, "latest_extracted.csv");
      
      if (fs.existsSync(updatedPath)) {
        filePath = updatedPath;
      } else if (fs.existsSync(originalPath)) {
        filePath = originalPath;
      } else {
        return res.status(404).json({ 
          message: "No extracted requirements file found. Please upload and process an SRS document first." 
        });
      }
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines
    
    // Don't skip the first line - it could be valid data without headers
    let headerLine = 0;
    let result = [];
    
    // Check if the first line looks like headers
    const firstLine = lines[0].split(',');
    const hasHeaders = firstLine.some(header => 
      header.trim().toLowerCase().includes('requirement') || 
      header.trim().toLowerCase().includes('text') || 
      header.trim().toLowerCase().includes('type')
    );
    
    // Use first line as headers if it has header-like text, otherwise use default headers
    let headers;
    if (hasHeaders) {
      headers = firstLine;
      headerLine = 1; // Skip the header line when processing data
    } else {
      // If no headers found, create default headers based on column count
      const columnCount = firstLine.length;
      headers = [];
      if (columnCount >= 1) headers.push('Requirement Text');
      if (columnCount >= 2) headers.push('Type');
      if (columnCount >= 3) headers.push('Source');
      // Add generic column names for any additional columns
      for (let i = 3; i < columnCount; i++) {
        headers.push(`Column${i+1}`);
      }
    }
    
    // Determine which column has the requirement text
    const reqTextColIndex = headers.findIndex(h => 
      h.trim().toLowerCase().includes('requirement') || 
      h.trim().toLowerCase().includes('text') || 
      h.trim().toLowerCase().includes('description')
    );
    
    // If no appropriate column header found, use the first column as a fallback
    const textColumnIndex = reqTextColIndex >= 0 ? reqTextColIndex : 0;

    // Process all lines from data start (after header if there is one)
    for (let i = headerLine; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj = {};
      
      // Only add the requirement if there's actual text in the requirement text column
      const hasRequirementText = textColumnIndex < values.length && 
                                values[textColumnIndex] && 
                                values[textColumnIndex].trim().length > 0;
      
      if (hasRequirementText) {
        headers.forEach((header, j) => {
          if (j < values.length) {
            obj[header.trim().replace(/"/g, '')] = values[j]?.trim().replace(/"/g, '');
          }
        });
        result.push(obj);
      }
    }

    // Check if we found any valid requirements
    if (result.length === 0) {
      return res.status(422).json({ 
        message: "The requirements file exists but contains no valid requirements. Please check the SRS file format.",
        file: filePath
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching extracted requirements:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.renameRepository = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    console.log('Rename request received:', { repoId, name, userId });

    // Validate input
    if (!name || name.trim() === '') {
      console.log('Invalid name provided');
      return res.status(400).json({ message: "Repository name cannot be empty" });
    }

    // Find the repository
    const repo = await Repo.findById(repoId);
    if (!repo) {
      console.log('Repository not found:', repoId);
      return res.status(404).json({ message: "Repository not found" });
    }

    // Check if user has permission (must be owner or member)
    const isOwner = repo.owner.toString() === userId;
    const isMember = repo.members.includes(userId);
    
    console.log('Permission check:', { isOwner, isMember, userId, repoOwner: repo.owner });

    if (!isMember && !isOwner) {
      console.log('Permission denied for user:', userId);
      return res.status(403).json({ message: "You don't have permission to rename this repository" });
    }

    // Check if the new name is already taken
    const existingRepo = await Repo.findOne({ 
      name: name.trim(),
      _id: { $ne: repoId } // Exclude current repo from check
    });
    
    if (existingRepo) {
      console.log('Name already taken:', name);
      return res.status(400).json({ message: "A repository with this name already exists" });
    }

    // Update repository name
    const oldName = repo.name;
    repo.name = name.trim();
    
    // Add to history
    repo.sourceCodeHistory.push({
      user: userId,
      action: "Modified Source Code",
      file: repo.sourceCodeFile || "N/A",
      timestamp: new Date(),
      metadata: {
        name: "Repository Rename",
        description: `Repository renamed from ${oldName} to ${name.trim()}`
      }
    });

    await repo.save();
    console.log('Repository renamed successfully:', { oldName, newName: name.trim() });

    res.status(200).json({
      message: "Repository renamed successfully",
      repo: {
        id: repo._id,
        name: repo.name
      }
    });
  } catch (error) {
    console.error("Error in renameRepository:", error);
    res.status(500).json({ 
      message: "Failed to rename repository",
      error: error.message 
    });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // Search for users whose username or email matches the query (case-insensitive)
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
    .select('username email _id') // Only return necessary fields
    .limit(5); // Limit results to 5 users

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
};

exports.getCollaborators = async (req, res) => {
  try {
    const { repoId } = req.params;
    const repo = await Repo.findById(repoId)
      .populate('members', 'username email _id')
      .populate('invitations.user', 'username email')
      .populate('invitations.invitedBy', 'username email');

    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Format response to include both members and invitations with their status
    const response = {
      members: repo.members,
      pendingInvitations: repo.invitations.filter(inv => inv.status === "pending"),
      acceptedInvitations: repo.invitations.filter(inv => inv.status === "accepted"),
      rejectedInvitations: repo.invitations.filter(inv => inv.status === "rejected")
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    res.status(500).json({ message: "Failed to fetch collaborators" });
  }
};

exports.inviteCollaborator = async (req, res) => {
  try {
    const { repoId } = req.params;
    const { userId } = req.body;
    const inviterId = req.user.id;

    const repo = await Repo.findById(repoId).populate('owner', 'username');
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Check if trying to invite the owner
    if (repo.owner._id.toString() === userId) {
      return res.status(400).json({ message: "Cannot invite the repository owner as they already have access" });
    }

    // Check if user is already a member
    const isMember = repo.members.some(memberId => memberId.toString() === userId);
    if (isMember) {
      return res.status(400).json({ message: "User is already a collaborator" });
    }

    // Check if there's already a pending invitation
    const existingInvitation = repo.invitations.find(
      inv => inv.user.toString() === userId && inv.status === "pending"
    );
    if (existingInvitation) {
      return res.status(400).json({ message: "User already has a pending invitation" });
    }

    // Create new invitation
    const newInvitation = {
      user: userId,
      invitedBy: inviterId,
      status: "pending",
      invitedAt: new Date()
    };
    repo.invitations.push(newInvitation);

    await repo.save();

    // Get the saved invitation with its generated _id
    const savedInvitation = repo.invitations[repo.invitations.length - 1];

    // Create notification for the invited user
    await createNotification(
      userId,
      'repo_invitation',
      `You have been invited to collaborate on repository: ${repo.name}`,
      repo._id,
      {
        invitationId: savedInvitation._id.toString(),
        invitedBy: inviterId.toString(),
        repoName: repo.name
      }
    );

    // Populate the invitation details for response
    const populatedRepo = await Repo.findById(repoId)
      .populate('invitations.user', 'username email')
      .populate('invitations.invitedBy', 'username email');

    const invitation = populatedRepo.invitations[populatedRepo.invitations.length - 1];

    res.status(200).json({
      message: "Invitation sent successfully",
      invitation
    });
  } catch (error) {
    console.error("Error inviting collaborator:", error);
    res.status(500).json({ message: "Failed to invite collaborator" });
  }
};

exports.handleInvitation = async (req, res) => {
  try {
    const { repoId, invitationId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'rejected'" });
    }

    const repo = await Repo.findById(repoId).populate('owner', 'username');
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Check if the user is the owner
    if (repo.owner.toString() === userId) {
      return res.status(403).json({ message: "Repository owners cannot handle invitations" });
    }

    // Find the pending invitation
    const invitation = repo.invitations.id(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Verify the user is the invitee
    if (invitation.user.toString() !== userId) {
      return res.status(403).json({ message: "You can only respond to your own invitations" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "This invitation has already been processed" });
    }

    // Update invitation status
    invitation.status = status;
    invitation.respondedAt = new Date();

    // If accepted, add user to members
    if (status === "accepted" && !repo.members.includes(userId)) {
      repo.members.push(userId);
    }

    await repo.save();

    // Create notification for the repository owner
    const user = await User.findById(userId).select('username email');
    const notificationMessage = status === "accepted"
      ? `${user.username || user.email} has accepted your invitation to collaborate on repository: ${repo.name}`
      : `${user.username || user.email} has declined your invitation to collaborate on repository: ${repo.name}`;

    await createNotification(
      repo.owner._id,
      'request_response',
      notificationMessage,
      repo._id,
      {
        responderId: userId,
        responderName: user.username || user.email,
        response: status
      }
    );

    res.status(200).json({
      message: `Invitation ${status} successfully`,
      status,
      invitation
    });
  } catch (error) {
    console.error("Error handling invitation:", error);
    res.status(500).json({ message: "Failed to handle invitation" });
  }
};

exports.removeCollaborator = async (req, res) => {
  try {
    const { repoId, userId } = req.params;
    const currentUserId = req.user.id;

    // Get repo with owner details
    const repo = await Repo.findById(repoId)
      .populate('owner', 'username email')
      .populate('members', 'username email');
      
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Check if the current user is the owner
    const isOwner = repo.owner._id.toString() === currentUserId;

    // Check if trying to remove the owner
    if (repo.owner._id.toString() === userId) {
      return res.status(403).json({ message: "Cannot remove the repository owner" });
    }

    // Only owner can remove collaborators
    if (!isOwner) {
      return res.status(403).json({ message: "Only the repository owner can remove collaborators" });
    }

    // Get the user being removed for the notification
    const removedUser = repo.members.find(member => member._id.toString() === userId);
    if (!removedUser) {
      return res.status(400).json({ message: "User is not a collaborator" });
    }

    // Remove user from members
    repo.members = repo.members.filter(member => member._id.toString() !== userId);

    // Also remove any pending invitations for this user
    repo.invitations = repo.invitations.filter(inv => inv.user.toString() !== userId);

    await repo.save();

    // Create notification for the removed user
    const notificationData = {
      user: userId,
      type: 'request_response',
      message: `You have been removed from the repository "${repo.name}" by ${repo.owner.username || repo.owner.email}`,
      repoId: repo._id,
      metadata: {
        response: 'removed',
        responderId: currentUserId,
        responderName: repo.owner.username || repo.owner.email,
        repoName: repo.name
      }
    };

    const notification = new Notification(notificationData);
    await notification.save();

    res.status(200).json({ 
      message: "Collaborator removed successfully",
      removedUserId: userId
    });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    res.status(500).json({ message: "Failed to remove collaborator" });
  }
};

exports.getPendingInvitations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all repositories where the user has pending invitations
    const repos = await Repo.find({
      'invitations': {
        $elemMatch: {
          user: userId,
          status: "pending"
        }
      }
    })
    .populate('owner', 'username email')
    .populate('invitations.invitedBy', 'username email');

    const pendingInvitations = repos.map(repo => ({
      repoId: repo._id,
      repoName: repo.name,
      owner: repo.owner,
      invitation: repo.invitations.find(inv => 
        inv.user.toString() === userId && inv.status === "pending"
      )
    }));

    res.status(200).json(pendingInvitations);
  } catch (error) {
    console.error("Error fetching pending invitations:", error);
    res.status(500).json({ message: "Failed to fetch pending invitations" });
  }
};

exports.cancelInvitation = async (req, res) => {
  try {
    const { repoId, invitationId } = req.params;
    const userId = req.user.id;

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Check if the user is the owner
    if (repo.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only repository owners can cancel invitations" });
    }

    // Find and remove the invitation
    const invitation = repo.invitations.id(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    invitation.remove();
    await repo.save();

    res.json({ message: "Invitation cancelled successfully" });
  } catch (error) {
    console.error('Error in cancelInvitation:', error);
    res.status(500).json({ message: "Failed to cancel invitation" });
  }
};

exports.deletePendingRequest = async (req, res) => {
  try {
    const { repoId, requestId } = req.params;
    const userId = req.user.id;

    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    // Check if the user is the owner
    if (repo.owner.toString() !== userId) {
      return res.status(403).json({ message: "Only repository owners can delete requests" });
    }

    // Find the request
    const request = repo.requests.id(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be deleted" });
    }

    // Remove the request
    request.remove();
    await repo.save();

    // Create notification for the user whose request was deleted
    await createNotification(
      request.user,
      'request_response',
      `Your access request for repository "${repo.name}" has been deleted by the owner`,
      repo._id,
      {
        response: 'deleted',
        responderId: userId,
        repoName: repo.name
      }
    );

    res.status(200).json({ 
      message: "Request deleted successfully",
      requestId: requestId
    });
  } catch (error) {
    console.error("Error deleting request:", error);
    res.status(500).json({ message: "Failed to delete request" });
  }
};
