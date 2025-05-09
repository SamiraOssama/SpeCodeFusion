const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

/**
 * Initialize the application by setting up required dependencies
 */
async function initialize() {
  console.log('🚀 Initializing application...');
  
  // Check if NLTK data is already downloaded
  const nltkDataPath = path.join(__dirname, 'github_analysis/embed/nltk_data');
  const nltkSetupScript = path.join(__dirname, 'github_analysis/embed/setup_nltk.py');
  
  if (!fs.existsSync(nltkDataPath) || !fs.existsSync(path.join(nltkDataPath, 'tokenizers/punkt'))) {
    console.log('📚 Setting up NLTK resources...');
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [nltkSetupScript]);
      
      pythonProcess.stdout.on('data', (data) => {
        console.log(`📋 NLTK Setup: ${data}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        console.error(`❌ NLTK Setup Error: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ NLTK setup completed successfully');
          resolve();
        } else {
          console.error(`❌ NLTK setup failed with code ${code}`);
          resolve(); // Resolve anyway to allow the app to start
        }
      });
    });
  } else {
    console.log('✅ NLTK resources already set up');
  }
}

module.exports = { initialize }; 