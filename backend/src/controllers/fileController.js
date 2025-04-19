const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const extractedDir = path.join(__dirname, "../extracted");
const uploadDir = path.join(__dirname, "../uploads");

// ✅ Multer Configuration
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    if (!req.user || !req.user.email) return cb(new Error("Unauthorized: Missing user email."), false);
    const userEmail = req.user.email.replace(/[@.]/g, "_");
    cb(null, `${userEmail}_${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage });

// ✅ Upload & Process File
exports.uploadFile = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded!" });

  const userEmail = req.user.email.replace(/[@.]/g, "_");
  const userFolder = path.join(extractedDir, userEmail);
  if (!fs.existsSync(userFolder)) fs.mkdirSync(userFolder, { recursive: true });

  const extractedFilePath = path.join(userFolder, "latest_extracted.csv");

  console.log(`📂 Saving extracted file to: ${extractedFilePath}`);

  const pythonProcess = spawn("python", [
    path.resolve(__dirname, "../scripts/test_model.py"),
    "--file",
    req.file.path,
    "--output",
    extractedFilePath,
  ]);

  pythonProcess.stderr.on("data", (data) => console.error(`❌ Python Error: ${data.toString()}`));

  pythonProcess.on("close", (code) => {
    if (code === 0) {
      res.json({ success: "File processed successfully!", extractedPath: `/extracted/${userEmail}/latest_extracted.csv` });
    } else {
      res.status(500).json({ error: "Failed to process the file. Check logs." });
    }
  });
};

// ✅ Export Multer Upload Middleware
exports.uploadMiddleware = upload.single("file");
