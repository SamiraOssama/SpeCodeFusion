@echo off
REM Setup script to prepare environment for SpeCodeFusion-3 GitHub analysis on Windows

echo ===== Setting up dependencies for GitHub Analysis =====

REM Determine script directory
set SCRIPT_DIR=%~dp0
cd %SCRIPT_DIR%

echo Script directory: %SCRIPT_DIR%

REM Check Python installation
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python is not installed. Please install Python 3.8+ and try again.
    exit /b 1
)

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Setup NLTK
echo Setting up NLTK resources...
python embed\setup_nltk.py

REM Create necessary directories
echo Creating necessary directories...
mkdir ..\..\..\extracted 2>nul
mkdir ..\..\..\uploads 2>nul

REM Verify Git installation (needed for repo cloning)
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo WARNING: Git not found. Repository cloning may fail. Please install Git.
) else (
    for /f "tokens=*" %%a in ('git --version') do set GIT_VERSION=%%a
    echo Git is installed: %GIT_VERSION%
)

REM Check that everything is ready
echo Performing final checks...

REM Check if Python modules are installed
echo Checking for required Python modules...
python -c "import numpy, faiss, nltk, sklearn, torch" 2>nul

if %ERRORLEVEL% equ 0 (
    echo All required Python modules are installed.
) else (
    echo WARNING: Some Python modules may be missing. Please check requirements.txt
)

echo ===== Setup completed =====
echo Run the following to analyze a GitHub repository:
echo python github_analysis.py --url ^<github_repo_url^> --output ^<output_dir^> --embeddings --report 