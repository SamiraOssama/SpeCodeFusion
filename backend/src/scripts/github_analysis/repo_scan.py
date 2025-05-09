import tempfile, shutil, os, json, time, logging, concurrent.futures
from git import Repo
from tqdm import tqdm
from .config import Config
from .utils import is_code_file, is_build_function, BUILD_PATTERNS
from .extract import EXT_MAP
from .requirements import make_requirements
from .code_tree import generate_code_tree, save_code_tree
from .file_reader import read_files_from_repo

# -------------------------------------------------
def _process_file(fp):
    ext = os.path.splitext(fp)[1].lower()
    extractor = EXT_MAP.get(ext)
    if not extractor:
        logging.warning("WARNING: No extractor found for file: " + fp)
        return []

    try:
        logging.info("INFO: Extracting from: " + fp)
        funcs = extractor(fp)
        
        # Filter out build-related functions
        filtered_funcs = []
        for func in funcs:
            if 'name' in func and is_build_function(func['name']):
                logging.info(f"INFO: Filtered out build function: {func['name']} from {fp}")
                continue
            
            # Also check the path for build patterns
            if 'file_path' in func:
                filepath = func['file_path'].replace('\\', '/')
                is_build_path = False
                for pattern in BUILD_PATTERNS:
                    if pattern in filepath:
                        is_build_path = True
                        break
                        
                if is_build_path:
                    logging.info(f"INFO: Filtered out function in build path: {func.get('name', 'unknown')} from {filepath}")
                    continue
            
            filtered_funcs.append(func)
        
        logging.info(f"SUCCESS: {len(filtered_funcs)} function(s) extracted from {fp} (filtered out {len(funcs) - len(filtered_funcs)} build functions)")
        return filtered_funcs
    except Exception as e:
        logging.error("ERROR: Error extracting from " + fp + ": " + str(e))
        return []

# -------------------------------------------------
def analyze_repository(url, out_dir, clone_dir=None):
    """
    Analyze a GitHub repository and generate reports.
    
    Args:
        url: GitHub repository URL
        out_dir: Directory to save output files
        clone_dir: Optional directory to clone the repo into
    
    Returns:
        Dictionary with analysis results
    """
    # Ensure output directory exists
    os.makedirs(out_dir, exist_ok=True)
    
    # Define output file paths
    json_output = os.path.join(out_dir, "sourcecode.json")
    code_tree_path = os.path.join(out_dir, "code_tree.json")
    
    res = {
        "repo_url": url,
        "files_analyzed": 0,
        "functions_found": 0,
        "files_by_type": {},
        "functions": [],
        "start_time": time.time(),
        "status": "success",
        "output_files": {
            "json": json_output,
            "code_tree": code_tree_path
        }
    }

    # ---------- Clone ----------

    if clone_dir:
        target = clone_dir
    else:
        # Extract repo name from URL
        repo_name = url.rstrip('/').split('/')[-1]
        if repo_name.endswith('.git'):
            repo_name = repo_name[:-4]
        
        # Use a relative path from the current script's location
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        uploads_dir = os.path.join(current_dir, 'uploads')
        target = os.path.join(uploads_dir, repo_name)
        os.makedirs(target, exist_ok=True)

    logging.info(f"INFO: Cloning repository: {url} to {target}")
    try:
        # Check for a .git directory to determine if it's a valid repo
        git_dir = os.path.join(target, '.git')
        force_clone = True

        # If directory exists and has content, check if it's a valid git repo
        if os.path.exists(git_dir) and os.path.isdir(git_dir):
            try:
                # Try to open the repo and verify it's the same one
                existing_repo = Repo(target)
                remote_url = ""
                for remote in existing_repo.remotes:
                    if remote.name == 'origin':
                        remote_url = next(remote.urls)
                        break
                
                # Check if it's the same repository
                if url in remote_url or remote_url in url:
                    logging.info(f"INFO: Using existing git repository at {target}")
                    # Pull latest changes to ensure it's up to date
                    logging.info("INFO: Pulling latest changes...")
                    existing_repo.git.pull('origin')
                    force_clone = False
                else:
                    logging.warning(f"WARNING: Directory contains a different repository. Will reclone.")
                    # Clean the directory to prepare for fresh clone
                    try:
                        shutil.rmtree(target)
                        os.makedirs(target, exist_ok=True)
                    except PermissionError as pe:
                        # Handle Windows permission errors
                        logging.warning(f"WARNING: Permission error when cleaning directory: {str(pe)}")
                        # Try a different approach with a new directory
                        target = tempfile.mkdtemp(prefix='gh_new_')
                        logging.info(f"INFO: Using new directory for clone: {target}")
            except Exception as e:
                logging.warning(f"WARNING: Found .git directory but couldn't verify repo: {str(e)}. Will reclone.")
                # Clean the directory to prepare for fresh clone
                try:
                    shutil.rmtree(target)
                    os.makedirs(target, exist_ok=True)
                except PermissionError as pe:
                    # Handle Windows permission errors
                    logging.warning(f"WARNING: Permission error when cleaning directory: {str(pe)}")
                    # Use a different directory
                    target = tempfile.mkdtemp(prefix='gh_new_')
                    logging.info(f"INFO: Using new directory for clone: {target}")
        
        # Clone if needed
        if force_clone:
            logging.info(f"INFO: Cloning fresh repository...")
            try:
                Repo.clone_from(url, target)
            except Exception as clone_error:
                # If the clone fails, try a different location
                logging.warning(f"WARNING: Clone failed: {str(clone_error)}. Trying alternative location...")
                target = tempfile.mkdtemp(prefix='gh_alt_')
                logging.info(f"INFO: Attempting clone to alternative location: {target}")
                Repo.clone_from(url, target)
            
        # Verify clone was successful
        if not os.path.exists(os.path.join(target, '.git')):
            raise Exception("Repository clone appears to be incomplete - .git directory missing")
            
    except Exception as e:
        logging.error(f"ERROR: Failed to clone repository: {str(e)}")
        res["status"] = "clone_error"
        res["error_details"] = str(e)
        json.dump(res, open(json_output, 'w', encoding='utf-8'), indent=2)
        return res

    # ---------- File Walk ----------
    files = []
    skipped_count = 0
    total_count = 0
    file_types = {}
    
    for r, _, fs in os.walk(target):
        for f in fs:
            total_count += 1
            file_path = os.path.join(r, f)
            ext = os.path.splitext(file_path)[1].lower()
            
            # Count file types
            if ext:
                file_types[ext] = file_types.get(ext, 0) + 1
            
            if is_code_file(file_path):
                files.append(file_path)
            else:
                skipped_count += 1

    # Log file type statistics
    logging.info("INFO: File type distribution:")
    for ext, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True):
        if count > 5:  # Only show file types with more than 5 files
            logging.info(f"  {ext}: {count} files")
    
    res["files_by_type"] = file_types
    
    logging.info("INFO: Found " + str(len(files)) + " code files to scan (skipped " + 
                str(skipped_count) + " out of " + str(total_count) + " total files)")

    if not files:
        logging.warning("WARNING: No files matched filter criteria. Check file extensions or `is_code_file()`. ")
        res["status"] = "no_code_files"
        json.dump(res, open(json_output, 'w', encoding='utf-8'), indent=2)
        return res

    # ---------- Parallel Scan ----------
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as exe:
            futures = [exe.submit(_process_file, file_path) for file_path in files]
            
            for future in tqdm(concurrent.futures.as_completed(futures), total=len(futures), desc="Processing files"):
                flist = future.result()
                if flist:
                    res['files_analyzed'] += 1
                    res['functions_found'] += len(flist)
                    res['functions'].extend(flist)
    except Exception as e:
        logging.error("ERROR: Error during parallel scanning: " + str(e))
        res["status"] = "scan_error"
        json.dump(res, open(json_output, 'w', encoding='utf-8'), indent=2)
        return res

    # Special handling for repositories with few functions
    if res['functions_found'] < 5 and '.dart' in file_types and file_types['.dart'] > 5:
        logging.warning("WARNING: Found Dart/Flutter project with few functions. This may be due to limitations in the Dart function extractor.")
        
    logging.info(f"INFO: Extracted {res['functions_found']} functions from {res['files_analyzed']} files")
    
    # Group functions by language for analysis
    functions_by_language = {}
    for func in res['functions']:
        lang = func.get('language', 'unknown')
        if lang not in functions_by_language:
            functions_by_language[lang] = []
        functions_by_language[lang].append(func)
    
    # Log function language distribution
    logging.info("INFO: Function language distribution:")
    for lang, funcs in sorted(functions_by_language.items(), key=lambda x: len(x[1]), reverse=True):
        logging.info(f"  {lang}: {len(funcs)} functions")

    # ---------- Generate Code Tree ----------
    logging.info("INFO: Generating code tree...")
    try:
        code_tree_data = generate_code_tree(target)
        save_code_tree(code_tree_data, code_tree_path)
        logging.info(f"INFO: Code tree saved to {code_tree_path}")
    except Exception as e:
        logging.error(f"ERROR: Failed to generate code tree: {str(e)}")
        res["status"] = "tree_generation_error"
        res["error_details"] = str(e)

    # ---------- Save Results ----------
    res["repo_path"] = target
    res["end_time"] = time.time()
    res["duration"] = res["end_time"] - res["start_time"]
    
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(res, f, indent=2)
    
    logging.info(f"INFO: Analysis completed in {res['duration']:.2f}s")
    logging.info(f"INFO: Results saved to {json_output}")
    
    return res

# -------------------------------------------------
def _cli_parser():
    import argparse
    parser = argparse.ArgumentParser(description='Analyze GitHub repository')
    parser.add_argument('--url', required=True, help='GitHub repository URL')
    parser.add_argument('--output', required=True, help='Output directory')
    parser.add_argument('--clone-dir', help='Directory to clone the repository into')
    # Keep these arguments for backward compatibility, but they will be ignored
    parser.add_argument('--embeddings', action='store_true', help='[Deprecated] Generate embeddings (ignored)')
    parser.add_argument('--report', action='store_true', help='[Deprecated] Generate compatibility report (ignored)')
    parser.add_argument('--max-workers', type=int, default=4, help='Number of threads for scanning')
    return parser

# -------------------------------------------------
def run_cli():
    parser = _cli_parser()
    args = parser.parse_args()
    
    # Set runtime config
    Config.MAX_WORKERS = args.max_workers
    
    analyze_repository(args.url, args.output, args.clone_dir)
