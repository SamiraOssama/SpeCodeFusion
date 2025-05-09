const path = require('path');
const os = require('os');

/**
 * Sanitizes file paths to be safe for use in both Windows and Unix environments
 * @param {string} filePath - The file path to sanitize
 * @returns {string} - Sanitized file path
 */
function sanitizePath(filePath) {
  if (!filePath) return '';
  
  // Convert to proper OS path format
  let sanitized = path.normalize(filePath);
  
  // Handle Windows specific issues
  if (os.platform() === 'win32') {
    // Ensure path doesn't have invalid Windows characters
    sanitized = sanitized.replace(/[<>:"|?*]/g, '_');
    
    // Ensure we don't have paths that are too long for Windows (260 char limit)
    if (sanitized.length > 250) {
      const ext = path.extname(sanitized);
      const dir = path.dirname(sanitized);
      const base = path.basename(sanitized, ext);
      
      // Shorten the base name while preserving extension
      const shortenedBase = base.substring(0, 20) + '_' + 
                           base.substring(base.length - 20);
      
      sanitized = path.join(dir, shortenedBase + ext);
    }
  }
  
  return sanitized;
}

/**
 * Creates a safe temporary directory for repository cloning
 * @param {string} baseName - Base name for the temporary directory
 * @returns {string} - Path to the created temporary directory
 */
function createTempCloneDir(baseName) {
  const os = require('os');
  const fs = require('fs');
  const crypto = require('crypto');
  
  // Generate a unique hash from the baseName
  const hash = crypto.createHash('md5').update(baseName + Date.now()).digest('hex').substring(0, 8);
  
  // Create a safe name for Windows
  const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_') + '_' + hash;
  
  // Use system temp directory as base
  const tempDir = path.join(os.tmpdir(), 'speccodefusion', safeName);
  
  // Create the directory
  fs.mkdirSync(tempDir, { recursive: true });
  
  return tempDir;
}

/**
 * Checks and fixes path issues that cause problems on Windows
 * @param {string} repoPath - The repository path to check
 * @returns {string} - A safe path for the repository
 */
function getSafeRepoPath(repoPath) {
  // Check if path is too long for Windows
  if (os.platform() === 'win32' && repoPath.length > 250) {
    const tempPath = createTempCloneDir(path.basename(repoPath));
    console.warn(`⚠️ Repository path too long for Windows. Using temp path: ${tempPath}`);
    return tempPath;
  }
  
  return sanitizePath(repoPath);
}

module.exports = {
  sanitizePath,
  createTempCloneDir,
  getSafeRepoPath
}; 