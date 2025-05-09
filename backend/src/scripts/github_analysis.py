#!/usr/bin/env python3
"""
Legacy wrapper so NodeJS controller keeps calling:
    python ../scripts/github_analysis.py --url ... --output ...
"""
import sys
import os
import logging

# Add the parent directory to sys.path to allow relative imports
parent_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, parent_dir)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

try:
    # Try importing the module
    from github_analysis.repo_scan import run_cli
    
    if __name__ == "__main__":
        # If successful, run the CLI
        run_cli()
        
except ImportError as e:
    # Show a more descriptive error message
    logging.error(f"Import error: {e}")
    logging.error("Make sure you have all required packages installed:")
    logging.error("  pip install gitpython pandas numpy requests tqdm")
    logging.error("If using OpenRouter for LLM analysis:")
    logging.error("  pip install requests")
    sys.exit(1)
except Exception as e:
    # Handle any other errors
    logging.error(f"Error: {e}")
    sys.exit(1)
