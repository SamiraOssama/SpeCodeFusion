#!/bin/bash
# Setup script to prepare environment for SpeCodeFusion-3 GitHub analysis

echo "===== Setting up dependencies for GitHub Analysis ====="

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Script directory: $SCRIPT_DIR"

# Check Python installation
if ! command -v python &> /dev/null; then
    echo "ERROR: Python is not installed. Please install Python 3.8+ and try again."
    exit 1
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Setup NLTK
echo "Setting up NLTK resources..."
python embed/setup_nltk.py

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p ../../../extracted
mkdir -p ../../../uploads

# Verify Git installation (needed for repo cloning)
if ! command -v git &> /dev/null; then
    echo "WARNING: Git not found. Repository cloning may fail. Please install Git."
else
    echo "Git is installed: $(git --version)"
fi

# Check that everything is ready
echo "Performing final checks..."

# Check if Python modules are installed
echo "Checking for required Python modules..."
python -c "import numpy, faiss, nltk, sklearn, torch" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "All required Python modules are installed."
else
    echo "WARNING: Some Python modules may be missing. Please check requirements.txt"
fi

echo "===== Setup completed ====="
echo "Run the following to analyze a GitHub repository:"
echo "python github_analysis.py --url <github_repo_url> --output <output_dir> --embeddings --report" 