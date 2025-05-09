import os
import json
import logging
from typing import Dict, List, Any

def is_ignored_dir(dir_name: str) -> bool:
    """Check if a directory should be ignored in the code tree."""
    ignored_dirs = {
        'node_modules', '.git', '__pycache__', 'venv', 'env', 
        'dist', 'build', '.idea', '.vscode', '.gradle', 'target',
        'bin', 'obj', 'out', 'coverage', '.next', '.nuxt'
    }
    return dir_name in ignored_dirs

def is_ignored_file(file_name: str) -> bool:
    """Check if a file should be ignored in the code tree."""
    ignored_patterns = {
        '.pyc', '.class', '.o', '.so', '.a', '.dll', '.exe',
        '.jar', '.war', '.ear', '.zip', '.tar', '.gz', '.rar',
        '.log', '.tmp', '.swp', '.DS_Store', 'Thumbs.db'
    }
    return any(file_name.endswith(pattern) for pattern in ignored_patterns)

def generate_code_tree(repo_path: str) -> Dict[str, Any]:
    """
    Generate a JSON representation of the code structure tree.
    
    Args:
        repo_path: Path to the repository root
        
    Returns:
        Dictionary with the code structure tree
    """
    logging.info(f"Generating code tree for repository at: {repo_path}")
    
    if not os.path.exists(repo_path):
        raise FileNotFoundError(f"Repository path not found: {repo_path}")
    
    tree = {
        "name": os.path.basename(repo_path),
        "type": "directory",
        "path": "",
        "children": []
    }
    
    file_count = 0
    dir_count = 0
    
    def build_tree(directory: str, parent_path: str, node: Dict[str, Any]) -> None:
        nonlocal file_count, dir_count
        
        try:
            items = os.listdir(directory)
        except PermissionError:
            logging.warning(f"Permission denied for directory: {directory}")
            return
        except Exception as e:
            logging.warning(f"Error reading directory {directory}: {e}")
            return
            
        # Process directories first
        dirs = [item for item in items if os.path.isdir(os.path.join(directory, item)) and not is_ignored_dir(item)]
        dirs.sort()
        
        for dir_name in dirs:
            dir_path = os.path.join(directory, dir_name)
            rel_path = os.path.join(parent_path, dir_name)
            
            dir_node = {
                "name": dir_name,
                "type": "directory",
                "path": rel_path,
                "children": []
            }
            
            build_tree(dir_path, rel_path, dir_node)
            
            # Only add directories that have content
            if dir_node["children"]:
                node["children"].append(dir_node)
                dir_count += 1
        
        # Then process files
        files = [item for item in items if os.path.isfile(os.path.join(directory, item)) and not is_ignored_file(item)]
        files.sort()
        
        for file_name in files:
            file_path = os.path.join(directory, file_name)
            rel_path = os.path.join(parent_path, file_name)
            
            # Get file extension
            _, ext = os.path.splitext(file_name)
            ext = ext.lower()
            
            file_node = {
                "name": file_name,
                "type": "file",
                "path": rel_path,
                "extension": ext
            }
            
            node["children"].append(file_node)
            file_count += 1
    
    # Start building the tree from the repository root
    build_tree(repo_path, "", tree)
    
    logging.info(f"Code tree generated with {dir_count} directories and {file_count} files")
    
    return {
        "tree": tree,
        "stats": {
            "directories": dir_count,
            "files": file_count
        }
    }

def save_code_tree(tree: Dict[str, Any], output_path: str) -> None:
    """Save the code tree to a JSON file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(tree, f, indent=2)
    
    logging.info(f"Code tree saved to: {output_path}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate code structure tree")
    parser.add_argument("--repo-path", required=True, help="Path to repository")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    
    args = parser.parse_args()
    
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    
    try:
        tree_data = generate_code_tree(args.repo_path)
        save_code_tree(tree_data, args.output)
        print(f"Code tree generated successfully and saved to {args.output}")
    except Exception as e:
        logging.error(f"Error generating code tree: {e}")
        exit(1) 