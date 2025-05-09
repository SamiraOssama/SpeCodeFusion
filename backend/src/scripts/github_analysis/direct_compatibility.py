#!/usr/bin/env python3
"""
Direct compatibility analysis using code tree + LLM approach.
This script replaces the previous embedding-based approach.
"""
import os
import sys
import json
import csv
import logging
import argparse
from typing import Dict, List, Any, Optional
import time
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import re
import pandas as pd
from datetime import datetime

# Add the directory containing this script to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Import our modules using absolute imports
from code_tree import generate_code_tree, save_code_tree
from file_reader import read_files_from_repo
from openrouter_client import OpenRouterClient

def setup_logging():
    """Configure logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("match.log", mode="w")
        ]
    )

def load_requirements(csv_path: str) -> List[str]:
    """
    Load functional requirements from CSV file.
    
    Args:
        csv_path: Path to CSV file with requirements
        
    Returns:
        List of functional requirements
    """
    try:
        df = pd.read_csv(csv_path)
        
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
        
        logging.info(f"Loaded {len(requirements)} requirements from {csv_path}")
        return requirements

    except Exception as e:
        logging.error(f"Error loading requirements from {csv_path}: {e}")
        raise

def load_source_code_data(json_path: str) -> Dict[str, Any]:
    """
    Load source code data from JSON file.
    This is only used to extract the repository path from the existing file.
    
    Args:
        json_path: Path to source code JSON file
        
    Returns:
        Dictionary with repository path
    """
    try:
        # Check if the file exists
        if not os.path.exists(json_path):
            logging.error(f"Source code file not found at {json_path}")
            # Check the directory contents
            base_dir = os.path.dirname(json_path)
            if os.path.exists(base_dir):
                logging.error(f"Files in directory {base_dir}: {os.listdir(base_dir)}")
            raise FileNotFoundError(f"Source code file not found at {json_path}")
        
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Extract repository path from the data
        repo_path = None
        if 'repo_path' in data:
            repo_path = data['repo_path']
        elif 'repo_url' in data:
            # Extract repo name from URL and find it in uploads directory
            repo_url = data['repo_url']
            repo_name = repo_url.rstrip('/').split('/')[-1]
            if repo_name.endswith('.git'):
                repo_name = repo_name[:-4]
            
            # Check common locations for cloned repositories
            current_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            possible_paths = [
                os.path.join(os.path.dirname(current_dir), 'uploads', repo_name),
                os.path.join(current_dir, 'uploads', repo_name),
                os.path.join(os.path.dirname(os.path.dirname(current_dir)), 'uploads', repo_name)
            ]
            
            for path in possible_paths:
                if os.path.exists(path) and os.path.isdir(path):
                    repo_path = path
                    break
        
        if not repo_path:
            raise ValueError("Could not determine repository path from source code file")
        
        return {'repo_path': repo_path}
    
    except Exception as e:
        logging.error(f"Error loading source code data from {json_path}: {e}")
        raise

def save_analysis_results(results: List[Dict[str, Any]], output_dir: str) -> None:
    """
    Save analysis results to output files.
    
    Args:
        results: List of analysis results
        output_dir: Directory to save output files
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Define output file paths
    report_path = os.path.join(output_dir, "implementation_report.json")
    csv_report_path = os.path.join(output_dir, "implementation_summary.csv")
    
    # Check if all results are errors due to API issues
    api_errors = all(r.get('status') == 'error' and 'Empty response from OpenRouter API' in r.get('error', '') for r in results)
    
    # If all are API errors, create a fallback report
    if api_errors and results:
        logging.warning("All requirements analysis failed due to API issues. Creating fallback report.")
        # Create fallback results with "unknown" status
        for r in results:
            r['status'] = 'unknown'
            r['implementation_details'] = "Could not analyze due to API limitations. Please try again later."
            r['analyzed_files'] = []
    
    # Calculate statistics
    total_reqs = len(results)
    implemented_reqs = sum(1 for r in results if r.get('status') == 'implemented')
    not_implemented_reqs = sum(1 for r in results if r.get('status') == 'not_implemented')
    unknown_reqs = sum(1 for r in results if r.get('status') == 'unknown')
    error_reqs = sum(1 for r in results if r.get('status') == 'error')
    
    output_data = {
        'statistics': {
            'total_requirements': total_reqs,
            'implemented_requirements': implemented_reqs,
            'missing_requirements': not_implemented_reqs,
            'unknown_requirements': unknown_reqs,
            'error_requirements': error_reqs,
            'coverage_percentage': round(implemented_reqs / total_reqs * 100, 2) if total_reqs > 0 else 0
        },
        'requirements': results
    }
    
    # Save JSON report
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
    
    logging.info(f"Analysis results saved to {report_path}")
    
    # Create CSV report
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
    df.to_csv(csv_report_path, index=False)
    
    logging.info(f"CSV report saved to {csv_report_path}")

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Direct compatibility analysis using code tree + LLM approach")
    parser.add_argument("--requirements", required=True, help="Path to requirements CSV file")
    parser.add_argument("--source-code", required=True, help="Path to source code JSON file")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    parser.add_argument("--api-keys", required=False, help="Comma-separated list of OpenRouter API keys")
    parser.add_argument("--model", 
                       default="anthropic/claude-3-haiku",
                       help="OpenRouter model to use (e.g., 'nousresearch/deephermes-3-mistral-24b-preview')")
    
    args = parser.parse_args()
    
    # Configure logging
    setup_logging()
    
    try:
        # Check if the provided source code path exists
        source_code_path = args.source_code
        if not os.path.exists(source_code_path):
            base_dir = os.path.dirname(source_code_path)
            logging.error(f"Source code file not found at {source_code_path}")
            if os.path.exists(base_dir):
                logging.error(f"Files in directory {base_dir}: {os.listdir(base_dir)}")
            raise FileNotFoundError(f"Source code file not found at {source_code_path}")
        
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
        logging.info(f"Using model: {args.model}")
        
        # Step 1: Load requirements
        logging.info(f"Loading requirements from {args.requirements}")
        requirements = load_requirements(args.requirements)
        
        if not requirements:
            raise ValueError("No requirements found in CSV file")
        
        # Step 2: Load source code data to get repository path
        logging.info(f"Loading source code data from {source_code_path}")
        code_data = load_source_code_data(source_code_path)
        repo_path = code_data['repo_path']
        
        logging.info(f"Repository path: {repo_path}")
        
        # Step 3: Generate code tree
        logging.info("Generating code tree...")
        code_tree_data = generate_code_tree(repo_path)
        
        # Save code tree for debugging
        tree_path = os.path.join(args.output_dir, "code_tree.json")
        save_code_tree(code_tree_data, tree_path)
        
        try:
            # Step 4: Initialize OpenRouter client with specified model
            logging.info(f"Initializing OpenRouter client...")
            client = OpenRouterClient(api_keys, default_model=args.model)
            
            # Step 5: Read files from repository
            logging.info("Reading files from repository...")
            all_file_contents = read_files_from_repo(repo_path)
            
            # Step 6: Analyze requirements in parallel
            logging.info(f"Analyzing {len(requirements)} requirements in parallel...")
            results = client.analyze_requirements_in_parallel(
                requirements, code_tree_data["tree"], all_file_contents
            )
        except Exception as e:
            logging.error(f"Error during API analysis: {e}")
            # Create a fallback report with unknown status
            logging.warning("Creating fallback report with unknown status for all requirements")
            results = []
            for req in requirements:
                results.append({
                    "requirement": req,
                    "status": "unknown",
                    "implementation_details": "Could not analyze due to API limitations. Please try again later.",
                    "analyzed_files": []
                })
        
        # Step 7: Save results
        logging.info("Saving analysis results...")
        save_analysis_results(results, args.output_dir)
        
        logging.info("Analysis completed successfully")
        
    except Exception as e:
        logging.error(f"Analysis failed: {e}")
        import traceback
        logging.error(traceback.format_exc())
        exit(1)

if __name__ == "__main__":
    main() 