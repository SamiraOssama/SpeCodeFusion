#!/bin/bash
# Script to fix permissions and reset problematic repositories
# Run this script if you encounter permission errors during repository cloning

echo "===== SpeCodeFusion Permission Fixer ====="

echo "Stopping any running Node.js processes..."
pkill -f node 2>/dev/null

# Determine the project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"
cd ../..

PROJECT_ROOT="$PWD"
echo "Project root: $PROJECT_ROOT"

# Define key directories
UPLOADS_DIR="$PROJECT_ROOT/src/uploads"
EXTRACTED_DIR="$PROJECT_ROOT/src/extracted"
TEMP_DIR="/tmp/speccodefusion"

echo "Checking for problematic directories..."

# Reset uploads directory
if [ -d "$UPLOADS_DIR" ]; then
    echo "Cleaning up uploads directory..."
    rm -rf "$UPLOADS_DIR"
fi

# Recreate uploads directory
mkdir -p "$UPLOADS_DIR"

# Clean up temporary directories
if [ -d "$TEMP_DIR" ]; then
    echo "Cleaning up temporary directories..."
    rm -rf "$TEMP_DIR"
fi

# Recreate temp directory
mkdir -p "$TEMP_DIR"

# Set appropriate permissions
echo "Setting appropriate permissions..."
chmod -R 777 "$UPLOADS_DIR"
chmod -R 777 "$EXTRACTED_DIR"
chmod -R 777 "$TEMP_DIR"

echo "===== Cleanup Complete ====="
echo "You can now restart the server."
echo "Press Enter to continue..."
read 