const path = require("path");
const { spawn } = require("child_process");

const uploadCode = (req, res) => {
    console.log("📥 Received a ZIP file for code analysis...");

    if (!req.file) {
        console.error("❌ No file received! Check the frontend.");
        return res.status(400).json({ error: "No file uploaded." });
    }

    console.log(`✅ ZIP File uploaded: ${req.file.path}`);

    // Spawn the Python process for code analysis
    const pythonProcess = spawn("python", [
        path.resolve(__dirname, "../scripts/gemini_ast.py"),
        "--file",
        req.file.path
    ]);

    let outputData = "";
    pythonProcess.stdout.on("data", (data) => {
        outputData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
        console.error(`❌ Python Error: ${data.toString()}`);
    });

    pythonProcess.on("close", (code) => {
        if (code === 0) {
            console.log("✅ Analysis complete.");
            res.json({ success: "File processed successfully!", output: outputData });
        } else {
            console.error("❌ Analysis failed.");
            res.status(500).json({ error: "Failed to process the file." });
        }
    });
};

module.exports = { uploadCode };
