const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Fix SRS CSV files in all repository folders
 */
async function fixSrsRequirements() {
  try {
    console.log('Starting SRS CSV format fix process...');
    
    // Get the extractedDir
    const extractedDir = path.join(__dirname, '../../extracted');
    
    if (!fs.existsSync(extractedDir)) {
      console.error(`Extracted directory not found: ${extractedDir}`);
      return;
    }
    
    // Get all repository folders
    const repositories = fs.readdirSync(extractedDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
      
    console.log(`Found ${repositories.length} repositories to process`);
    
    // Process each repository
    for (const repo of repositories) {
      const repoDir = path.join(extractedDir, repo);
      
      // Check for CSV files to fix
      const originalCsv = path.join(repoDir, 'latest_extracted.csv');
      const updatedCsv = path.join(repoDir, 'latest_extracted_updated.csv');
      
      if (fs.existsSync(originalCsv)) {
        console.log(`Fixing ${originalCsv}...`);
        await runPythonFormatter(originalCsv);
      }
      
      if (fs.existsSync(updatedCsv)) {
        console.log(`Fixing ${updatedCsv}...`);
        await runPythonFormatter(updatedCsv);
      }
    }
    
    console.log('SRS CSV format fix process completed.');
  } catch (error) {
    console.error('Error fixing SRS requirements:', error);
  }
}

/**
 * Run the Python formatter script on a CSV file
 * @param {string} csvPath - Path to the CSV file to format
 * @returns {Promise<void>}
 */
function runPythonFormatter(csvPath) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'format_srs_csv.py');
    
    if (!fs.existsSync(pythonScript)) {
      reject(new Error(`Python script not found: ${pythonScript}`));
      return;
    }
    
    const args = [
      pythonScript,
      '--input', csvPath
    ];
    
    const pythonProcess = spawn('python', args);
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Python]: ${data.toString().trim()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Python Error]: ${data.toString().trim()}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully formatted: ${csvPath}`);
        resolve();
      } else {
        reject(new Error(`Python process exited with code ${code}`));
      }
    });
    
    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

// Run the fix process
fixSrsRequirements()
  .then(() => console.log('All SRS CSV files have been fixed'))
  .catch(err => console.error('Failed to fix SRS CSV files:', err)); 