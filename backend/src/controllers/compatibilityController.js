const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const Repo = require("../models/repo");

// Helper function to handle Python process execution
async function handlePythonProcess(process, { success, failure }) {
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
          const result = await success(stdout);
          resolve(result);
        } else {
          resolve(failure(stderr || `Process exited with code ${code}`));
        }
      } catch (err) {
        console.error("❌ Error handling process result:", err);
        resolve(failure(err.message));
      }
    });
  });
}

exports.matchRequirementsToCode = async (req, res) => {
  try {
    const { repoId } = req.params;
    
    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ success: false, message: "Repository not found" });
    }

    const extractedDir = path.join(__dirname, "../extracted", repo.name);
    const requirementsPath = path.join(extractedDir, "latest_extracted_updated.csv");
    const sourceCodePath = path.join(extractedDir, "sourcecode.json");
    const reportPath = path.join(extractedDir, "implementation_report.json");

    console.log("🔍 Debug Info:");
    console.log(`Repository: ${repo.name}`);
    console.log(`Extracted Directory: ${extractedDir}`);
    console.log(`Requirements Path: ${requirementsPath} (Exists: ${fs.existsSync(requirementsPath)})`);
    console.log(`Source Code Path: ${sourceCodePath} (Exists: ${fs.existsSync(sourceCodePath)})`);

    // Make sure the extracted directory exists
    if (!fs.existsSync(extractedDir)) {
      fs.mkdirSync(extractedDir, { recursive: true });
    }

    // Check if required files exist
    if (!fs.existsSync(requirementsPath)) {
      return res.status(400).json({ 
        success: false, 
        message: "Requirements file not found. Please upload and process an SRS document first." 
      });
    }
    
    // Add more detailed debugging for the source code file
    console.log("🔍 Looking for source code file:");
    console.log(`Checking path: ${sourceCodePath}`);
    
    // Check for files in the extracted directory
    console.log(`Listing all files in directory: ${extractedDir}`);
    try {
      const files = fs.readdirSync(extractedDir);
      console.log("Files found:", files);
      
      // Check if any file might be the source code file with a different name
      const possibleSourceCodeFiles = files.filter(file => 
        file.includes('sourcecode') || 
        file.includes('code') || 
        file.endsWith('.json')
      );
      
      if (possibleSourceCodeFiles.length > 0) {
        console.log("Possible source code files:", possibleSourceCodeFiles);
        
        // If sourcecode.json doesn't exist but we found an alternative, use it
        if (!fs.existsSync(sourceCodePath) && possibleSourceCodeFiles.length > 0) {
          const altPath = path.join(extractedDir, possibleSourceCodeFiles[0]);
          console.log(`Using alternative source code file: ${altPath}`);
          sourceCodePath = altPath;
        }
      }
    } catch (err) {
      console.error(`❌ Error reading directory: ${err.message}`);
    }
    
    if (!fs.existsSync(sourceCodePath)) {
      return res.status(400).json({ 
        success: false, 
        message: "Repository source code file not found. Please upload and process a GitHub repository first." 
      });
    } else {
      console.log(`✅ Found source code file: ${sourceCodePath}`);
    }

    // Generate compatibility report using OpenRouter
    const pythonScriptPath = path.resolve(__dirname, "../scripts/github_analysis/direct_compatibility.py");
    console.log(`Python Script Path: ${pythonScriptPath} (Exists: ${fs.existsSync(pythonScriptPath)})`);
    
    // Collect all available API keys
    const collectApiKeys = () => {
      const keys = [];
      // Check for OPENROUTER_API_KEY_0, OPENROUTER_API_KEY_1, etc.
      for (let i = 0; i < 10; i++) {
        const key = process.env[`OPENROUTER_API_KEY_${i}`];
        if (key) {
          keys.push(key);
        }
      }
      
      // Also check for a generic OPENROUTER_API_KEY
      const genericKey = process.env.OPENROUTER_API_KEY;
      if (genericKey && !keys.includes(genericKey)) {
        keys.push(genericKey);
      }
      
      return keys;
    };
    
    const apiKeys = collectApiKeys();
    console.log(`Found ${apiKeys.length} API keys for parallel processing`);
    
    const analysisArgs = [
      pythonScriptPath,
      "--requirements", requirementsPath,
      "--source-code", sourceCodePath,
      "--output-dir", extractedDir
    ];
    
    // Add API keys as command-line argument if available
    if (apiKeys.length > 0) {
      analysisArgs.push("--api-keys");
      analysisArgs.push(apiKeys.join(','));
    }
    
    console.log("Python Command Args:", analysisArgs.map(arg => 
      arg.includes("OPENROUTER") || arg.includes("sk-") ? "[API KEYS REDACTED]" : arg
    ));
    
    try {
      const analysisProcess = spawn("python", analysisArgs, {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUNBUFFERED: '1',
          OPENROUTER_API_KEY_0: process.env.OPENROUTER_API_KEY_0,
          OPENROUTER_API_KEY_1: process.env.OPENROUTER_API_KEY_1,
          OPENROUTER_API_KEY_2: process.env.OPENROUTER_API_KEY_2,
          OPENROUTER_API_KEY_3: process.env.OPENROUTER_API_KEY_3,
          OPENROUTER_API_KEY_4: process.env.OPENROUTER_API_KEY_4,
          // Set PYTHONPATH to include the github_analysis directory for module imports
          PYTHONPATH: path.resolve(__dirname, "../scripts") + path.delimiter + path.resolve(__dirname, "../scripts/github_analysis")
        }
      });

      // Add error handler for the spawn process itself
      analysisProcess.on('error', (err) => {
        console.error(`❌ Failed to start Python process: ${err.message}`);
        res.status(500).json({
          success: false,
          message: `Failed to start compatibility analysis process: ${err.message}`
        });
      });

      const result = await handlePythonProcess(analysisProcess, {
        success: async (stdout) => {
          console.log("✅ Python process completed successfully");
          if (!fs.existsSync(reportPath)) {
            console.error(`❌ Report file not found at: ${reportPath}`);
            throw new Error("Analysis completed but report file not found");
          }
          console.log(`📄 Reading report from: ${reportPath}`);
          try {
            const reportContent = fs.readFileSync(reportPath, 'utf8');
            console.log(`📄 Report file size: ${reportContent.length} bytes`);
            if (reportContent.trim().length === 0) {
              throw new Error("Empty report file generated");
            }
            return JSON.parse(reportContent);
          } catch (readError) {
            console.error(`❌ Error reading report: ${readError.message}`);
            throw new Error(`Failed to read report: ${readError.message}`);
          }
        },
        failure: (error) => {
          console.error(`❌ Python process failed: ${error}`);
          throw new Error(`Failed to generate compatibility report: ${error}`);
        }
      });

      // Send response with analysis results
      res.json({
        success: true,
        message: "Compatibility analysis completed successfully",
        statistics: result.statistics,
        requirements: result.requirements.map(req => ({
          requirement: req.requirement,
          status: req.status,
          details: req.implementation_details
        }))
      });
    } catch (scriptError) {
      console.error("❌ Error running Python script:", scriptError);
      res.status(500).json({ 
        success: false, 
        message: "Error running compatibility analysis script: " + scriptError.message
      });
    }

  } catch (error) {
    console.error("Error analyzing requirements:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during compatibility analysis: " + error.message
    });
  }
};

exports.getCompatibilityReport = async (req, res) => {
  try {
    const { repoId } = req.params;
    
    const repo = await Repo.findById(repoId);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const extractedDir = path.join(__dirname, "../extracted", repo.name);
    const reportPath = path.join(extractedDir, "implementation_report.json");
    const summaryPath = path.join(extractedDir, "implementation_summary.csv");

    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ message: "Report not found. Please generate the report first." });
    }

    const report = require(reportPath);
    res.json({
      success: true,
      report: report,
      summaryPath: summaryPath
    });
  } catch (error) {
    console.error("Error fetching compatibility report:", error);
    res.status(500).json({ message: "Server error fetching report" });
  }
}; 