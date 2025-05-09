# SRS to Code Matching Tool

This tool matches Software Requirements Specification (SRS) requirements to code functions using AI embeddings.

## Setup

1. Install dependencies:
```
pip install -r requirements.txt
```

2. Prepare input data:
   - SRS requirements in JSON format
   - Code functions in JSON format 

## Usage

Run the script with:
```
python match_srs_to_code.py --srs_file /path/to/srs.json --code_file /path/to/code_functions.json --output_path /path/to/output.json --threshold 0.5
```

Parameters:
- `--srs_file`: Path to SRS requirements JSON file
- `--code_file`: Path to code functions JSON file
- `--output_path`: (Optional) Path to save matching results (default: backend/src/results/srs_code_matches.json)
- `--threshold`: (Optional) Similarity threshold for matches (default: 0.4)

## Input Format

### SRS JSON format:
```json
[
  {
    "id": "REQ-001",
    "description": "The system shall allow users to login with username and password."
  },
  ...
]
```

### Code Functions JSON format:
```json
[
  {
    "id": "func-001",
    "name": "login",
    "file_path": "src/auth/login.py",
    "code": "def login(username, password):\n    # Function code here\n    pass",
    "comments": "Login function to authenticate users"
  },
  ...
]
```

## Output

The script generates a JSON file with matches between SRS requirements and code functions, including similarity scores. 

# GitHub Repository Analysis Module

This module handles cloning, analyzing, and processing GitHub repositories for the SpeCodeFusion system.

## Common Issues and Solutions

### Windows "Access is denied" Errors

If you encounter the error `[WinError 5] Access is denied` when trying to clone or analyze a repository, follow these steps:

1. Close the SpeCodeFusion server if it's running
2. Run the `fix_windows_permissions.bat` script as Administrator from the `backend/src/scripts` directory
3. Restart the SpeCodeFusion server
4. Try uploading the GitHub repository again

### Repository Not Being Fully Cloned

If you notice that repositories are not being fully cloned, check the following:

1. Ensure the GitHub URL is correct and accessible (public repository)
2. Check if Windows Defender or antivirus software is blocking Git or Python
3. Verify that Git is properly installed and available in the system PATH
4. Try running the repository analysis manually using:
   ```
   cd backend/src/scripts/github_analysis
   python github_analysis.py --url https://github.com/username/repo --output ./output --embeddings
   ```

### Build Functions Being Extracted

The system now filters out build-related functions that are not relevant to the SRS compatibility analysis. This is done through:

1. Filename and path filtering (see `utils.py` - `is_code_file()` function)
2. Function name pattern matching (see `utils.py` - `is_build_function()` function)
3. Exclusion of specific directories like 'build', 'dist', 'test', etc.

If you still see build functions being extracted, you can customize the filtering:

1. Edit `backend/src/scripts/github_analysis/utils.py` file
2. Add more patterns to `SKIP_DIRS`, `SKIP_FILES`, or `BUILD_PATTERNS` variables
3. Update the `BUILD_FUNCTION_PATTERNS` regular expressions to match your specific needs

## Setup and Dependencies

Make sure all dependencies are properly installed:

1. Run the appropriate setup script:
   - Windows: `setup.bat`
   - Linux/macOS: `setup.sh`
   
2. Ensure Git is installed and available in your PATH
3. Make sure Python (3.8+) is installed with all required packages

## Troubleshooting

### Repository Cloning Fails

1. Check if the repository exists and is public
2. Verify your internet connection
3. Try cloning the repository manually using Git to see if there are specific errors
4. Check if the path is too long (Windows has a 260 character path limit)
5. Make sure you have proper file permissions

### Analysis Is Incomplete

1. Check the logs in the `backend/src/scripts/github_analysis/embed` directory
2. Verify that all required NLTK resources are downloaded by running `setup_nltk.py`
3. Ensure all dependencies listed in `requirements.txt` are installed

### Windows-Specific Issues

Windows has some specific limitations:

1. Path length limit of 260 characters
2. File permission issues, especially with `.git` directory
3. Issues with certain special characters in paths

The system now automatically handles these by:

1. Using shorter, sanitized paths 
2. Using system temporary directories when needed
3. Implementing better error handling and recovery

If problems persist, run the `fix_windows_permissions.bat` script as Administrator. 