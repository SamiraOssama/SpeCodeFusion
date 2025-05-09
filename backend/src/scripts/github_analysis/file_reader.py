import os
import logging
from typing import Dict, List, Any, Optional

def is_binary_file(file_path: str) -> bool:
    """Check if a file is binary."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            f.read(1024)  # Read a chunk to check for encoding errors
        return False
    except UnicodeDecodeError:
        return True
    except Exception as e:
        logging.warning(f"Error checking if file is binary: {file_path} - {e}")
        return True

def is_code_file(file_path: str) -> bool:
    """Check if a file is a code file."""
    # List of extensions to consider as code files
    code_extensions = {
        # Web
        '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.php',
        # Python
        '.py', '.pyx', '.pyw',
        # Java/Kotlin
        '.java', '.kt', '.groovy',
        # C-family
        '.c', '.cpp', '.cc', '.h', '.hpp', '.cs',
        # Ruby
        '.rb', '.erb',
        # Go
        '.go',
        # Rust
        '.rs',
        # Swift
        '.swift',
        # Dart/Flutter
        '.dart',
        # Other
        '.sh', '.bat', '.ps1', '.sql'
    }
    
    # Get file extension
    _, ext = os.path.splitext(file_path.lower())
    return ext in code_extensions

def read_files_from_repo(repo_path: str, max_file_size: int = 1024 * 1024) -> Dict[str, str]:
    """
    Read all code files from a repository.
    
    Args:
        repo_path: Path to the repository
        max_file_size: Maximum file size to read in bytes
        
    Returns:
        Dictionary mapping file paths to file contents
    """
    file_contents = {}
    skipped_count = 0
    
    for root, _, files in os.walk(repo_path):
        for file in files:
            file_path = os.path.join(root, file)
            
            # Skip non-code files
            if not is_code_file(file_path):
                continue
            
            # Check file size
            try:
                file_size = os.path.getsize(file_path)
                if file_size > max_file_size:
                    logging.warning(f"Skipping large file: {file_path} ({file_size} bytes)")
                    skipped_count += 1
                    continue
            except Exception as e:
                logging.warning(f"Error checking file size: {file_path} - {e}")
                skipped_count += 1
                continue
            
            # Skip binary files
            if is_binary_file(file_path):
                logging.warning(f"Skipping binary file: {file_path}")
                skipped_count += 1
                continue
            
            # Read file content
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Make the file path relative to the repo root
                rel_path = os.path.relpath(file_path, repo_path)
                # Normalize path separators to forward slashes
                rel_path = rel_path.replace('\\', '/')
                
                file_contents[rel_path] = content
            except Exception as e:
                logging.warning(f"Error reading file: {file_path} - {e}")
                skipped_count += 1
    
    logging.info(f"Read {len(file_contents)} files from repository (skipped {skipped_count})")
    return file_contents

def get_specific_files(repo_path: str, file_paths: List[str]) -> Dict[str, str]:
    """
    Read specific files from a repository.
    
    Args:
        repo_path: Path to the repository
        file_paths: List of file paths to read (relative to repo root)
        
    Returns:
        Dictionary mapping file paths to file contents
    """
    file_contents = {}
    
    for rel_path in file_paths:
        # Normalize path separators
        normalized_path = rel_path.replace('\\', '/')
        abs_path = os.path.join(repo_path, normalized_path)
        
        try:
            if os.path.exists(abs_path) and os.path.isfile(abs_path) and not is_binary_file(abs_path):
                with open(abs_path, 'r', encoding='utf-8') as f:
                    file_contents[normalized_path] = f.read()
            else:
                logging.warning(f"File not found or is binary: {abs_path}")
        except Exception as e:
            logging.warning(f"Error reading file: {abs_path} - {e}")
    
    return file_contents 