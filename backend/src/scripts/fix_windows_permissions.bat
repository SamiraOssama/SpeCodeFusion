@echo off
REM Script to fix Windows permissions and reset problematic repositories
REM Run this as administrator if you encounter "Access is denied" errors

echo ===== SpeCodeFusion Windows Permission Fixer =====

echo Stopping any running Node.js processes...
taskkill /f /im node.exe >nul 2>&1

REM Determine the project root directory
set SCRIPT_DIR=%~dp0
cd %SCRIPT_DIR%
cd ..\..

set PROJECT_ROOT=%CD%
echo Project root: %PROJECT_ROOT%

REM Define key directories
set UPLOADS_DIR=%PROJECT_ROOT%\src\uploads
set EXTRACTED_DIR=%PROJECT_ROOT%\src\extracted
set TEMP_DIR=%TEMP%\speccodefusion

echo Checking for problematic directories...

REM Reset uploads directory
if exist "%UPLOADS_DIR%" (
    echo Cleaning up uploads directory...
    rd /s /q "%UPLOADS_DIR%" 2>nul
    if %ERRORLEVEL% neq 0 (
        echo Could not remove uploads directory. Will try to remove individual repository directories.
        for /d %%d in ("%UPLOADS_DIR%\*") do (
            rd /s /q "%%d" 2>nul
        )
    )
)

REM Recreate uploads directory
mkdir "%UPLOADS_DIR%" 2>nul

REM Clean up temporary directories
if exist "%TEMP_DIR%" (
    echo Cleaning up temporary directories...
    rd /s /q "%TEMP_DIR%" 2>nul
)

REM Recreate temp directory
mkdir "%TEMP_DIR%" 2>nul

REM Set appropriate permissions
echo Setting appropriate permissions...
icacls "%UPLOADS_DIR%" /grant Everyone:(OI)(CI)F /T
icacls "%EXTRACTED_DIR%" /grant Everyone:(OI)(CI)F /T
icacls "%TEMP_DIR%" /grant Everyone:(OI)(CI)F /T

echo ===== Cleanup Complete =====
echo You can now restart the server.
pause 