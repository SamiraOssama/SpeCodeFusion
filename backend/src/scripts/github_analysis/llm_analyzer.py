import os
import sys
import json
import logging
import argparse
import pandas as pd
from typing import Dict, List, Any, Optional
import concurrent.futures

# Add parent directory to sys.path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import our modules
from github_analysis.code_tree import generate_code_tree, save_code_tree
from github_analysis.file_reader import read_files_from_repo, get_specific_files
from github_analysis.openrouter_client import OpenRouterClient

def load_requirements(requirements_csv: str) -> List[str]:
    """
    Load functional requirements from CSV file.
    
    Args:
        requirements_csv: Path to CSV file with requirements
        
    Returns:
        List of functional requirements
    """
    try:
        df = pd.read_csv(requirements_csv)
        
        # Handle different possible column names
        if 'requirement text' in df.columns:
            req_col = 'requirement text'
        elif 'requirement_text' in df.columns:
            req_col = 'requirement_text'
        elif 'requirement' in df.columns:
            req_col = 'requirement'
        else:
            raise ValueError(f"Could not find requirement column in CSV. Available columns: {df.columns}")
        
        # Handle different possible label column names
        if 'label' in df.columns:
            label_col = 'label'
        elif 'type' in df.columns:
            label_col = 'type'
        else:
            label_col = None
            logging.warning("No label column found in CSV, using all requirements")
        
        # Filter for functional requirements if label column exists
        if label_col:
            # Check possible functional requirement label formats
            functional_labels = ['functional', 'Functional', 'FR', 'F']
            
            # Create a mask for functional requirements
            is_functional = df[label_col].isin(functional_labels)
            
            # If no rows match, try more flexible matching
            if not is_functional.any():
                is_functional = df[label_col].str.lower().str.contains('function')
            
            # If still no rows match, warn and use all requirements
            if not is_functional.any():
                logging.warning(f"No functional requirements found with label column '{label_col}'")
                logging.warning(f"Available labels: {df[label_col].unique()}")
                logging.warning("Using all requirements")
                requirements = df[req_col].tolist()
            else:
                requirements = df.loc[is_functional, req_col].tolist()
        else:
            requirements = df[req_col].tolist()
        
        # Filter out empty requirements
        requirements = [req for req in requirements if isinstance(req, str) and req.strip()]
        
        logging.info(f"Loaded {len(requirements)} requirements from {requirements_csv}")
        return requirements
    
    except Exception as e:
        logging.error(f"Error loading requirements from {requirements_csv}: {e}")
        raise

def save_analysis_results(results: List[Dict[str, Any]], output_path: str) -> None:
    """
    Save analysis results to a JSON file.
    
    Args:
        results: List of analysis results
        output_path: Path to save JSON file
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Calculate statistics
    total_reqs = len(results)
    implemented_reqs = sum(1 for r in results if r.get('status') == 'implemented')
    not_implemented_reqs = sum(1 for r in results if r.get('status') == 'not_implemented')
    error_reqs = sum(1 for r in results if r.get('status') == 'error')
    
    output_data = {
        'statistics': {
            'total_requirements': total_reqs,
            'implemented_requirements': implemented_reqs,
            'missing_requirements': not_implemented_reqs,
            'error_requirements': error_reqs,
            'coverage_percentage': round(implemented_reqs / total_reqs * 100, 2) if total_reqs > 0 else 0
        },
        'requirements': results
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
    
    logging.info(f"Analysis results saved to {output_path}")

def create_csv_report(results: List[Dict[str, Any]], output_path: str) -> None:
    """
    Create a CSV report from analysis results.
    
    Args:
        results: List of analysis results
        output_path: Path to save CSV file
    """
    rows = []
    
    for req in results:
        requirement = req.get('requirement', '')
        status = req.get('status', '')
        details = req.get('implementation_details', '')
        
        # Get file information
        files = []
        for file_info in req.get('analyzed_files', []):
            file_path = file_info.get('file_path', '')
            confidence = file_info.get('prediction_confidence', 0)
            reasoning = file_info.get('prediction_reasoning', '')
            
            analysis = file_info.get('analysis', {})
            implements = analysis.get('implements_requirement', False)
            
            if implements:
                files.append(f"{file_path} (Confidence: {confidence}%)")
        
        file_list = "; ".join(files)
        
        rows.append({
            'Requirement': requirement,
            'Status': status.capitalize(),
            'Implementation Files': file_list,
            'Details': details
        })
    
    # Create DataFrame and save to CSV
    df = pd.DataFrame(rows)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    logging.info(f"CSV report saved to {output_path}")

def analyze_repo(repo_path: str, requirements_csv: str, output_dir: str, api_keys: List[str]) -> Dict[str, Any]:
    """
    Analyze a repository using the code tree + LLM approach.
    
    Args:
        repo_path: Path to the repository
        requirements_csv: Path to CSV file with requirements
        output_dir: Directory to save output files
        api_keys: List of OpenRouter API keys
        
    Returns:
        Dictionary with analysis results
    """
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Define output file paths
    tree_path = os.path.join(output_dir, "code_tree.json")
    report_path = os.path.join(output_dir, "implementation_report.json")
    csv_report_path = os.path.join(output_dir, "implementation_summary.csv")
    
    # Step 1: Generate code tree
    logging.info("Generating code tree...")
    code_tree_data = generate_code_tree(repo_path)
    save_code_tree(code_tree_data, tree_path)
    
    # Step 2: Load requirements
    logging.info("Loading requirements...")
    requirements = load_requirements(requirements_csv)
    
    if not requirements:
        raise ValueError("No requirements found in CSV file")
    
    # Step 3: Initialize OpenRouter client
    logging.info(f"Initializing OpenRouter client with {len(api_keys)} API keys...")
    client = OpenRouterClient(api_keys)
    
    # Step 4: Process each requirement
    logging.info("Processing requirements...")
    
    # First, analyze the structure to predict files for each requirement
    results = []
    
    # Get all file contents for later analysis
    logging.info("Reading files from repository...")
    all_file_contents = read_files_from_repo(repo_path)
    
    # Analyze requirements in parallel
    logging.info(f"Analyzing {len(requirements)} requirements in parallel...")
    results = client.analyze_requirements_in_parallel(
        requirements, code_tree_data["tree"], all_file_contents
    )
    
    # Step 5: Save results
    logging.info("Saving analysis results...")
    save_analysis_results(results, report_path)
    create_csv_report(results, csv_report_path)
    
    return {
        'total_requirements': len(requirements),
        'analyzed_requirements': len(results),
        'output_files': {
            'tree': tree_path,
            'report': report_path,
            'csv_report': csv_report_path
        }
    }

def run_cli():
    """Run the command-line interface."""
    parser = argparse.ArgumentParser(description="Analyze repository using code tree + LLM approach")
    parser.add_argument("--repo-path", required=True, help="Path to repository")
    parser.add_argument("--requirements", required=True, help="Path to requirements CSV file")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    parser.add_argument("--api-keys", required=False, help="Comma-separated list of OpenRouter API keys")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"],
                        help="Logging level")
    
    args = parser.parse_args()
    
    # Configure logging
    numeric_level = getattr(logging, args.log_level.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f"Invalid log level: {args.log_level}")
    
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler()
        ]
    )
    
    # Parse API keys
    api_keys = []
    if args.api_keys:
        api_keys = [key.strip() for key in args.api_keys.split(',') if key.strip()]
    
    # If no API keys provided via CLI, check environment variables
    if not api_keys:
        # Check for OPENROUTER_API_KEY_0, OPENROUTER_API_KEY_1, etc.
        for i in range(10):
            key_var = f"OPENROUTER_API_KEY_{i}"
            if key_var in os.environ and os.environ[key_var]:
                api_keys.append(os.environ[key_var])
        
        # Also check for generic OPENROUTER_API_KEY
        if "OPENROUTER_API_KEY" in os.environ and os.environ["OPENROUTER_API_KEY"]:
            if os.environ["OPENROUTER_API_KEY"] not in api_keys:
                api_keys.append(os.environ["OPENROUTER_API_KEY"])
    
    if not api_keys:
        logging.error("No OpenRouter API keys provided")
        exit(1)
    
    logging.info(f"Using {len(api_keys)} OpenRouter API keys")
    
    try:
        # Run analysis
        result = analyze_repo(
            args.repo_path, 
            args.requirements, 
            args.output_dir,
            api_keys
        )
        
        logging.info("Analysis completed successfully")
        logging.info(f"Analyzed {result['analyzed_requirements']} of {result['total_requirements']} requirements")
        logging.info(f"Output files: {result['output_files']}")
        
    except Exception as e:
        logging.error(f"Analysis failed: {e}")
        exit(1)

if __name__ == "__main__":
    run_cli() 