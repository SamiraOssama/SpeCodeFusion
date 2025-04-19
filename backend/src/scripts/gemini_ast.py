import os
import zipfile
import json
import asyncio
import aiohttp
import logging
import google.generativeai as genai
import ast
import javalang
import re
import argparse
import shutil
from datetime import datetime
from pathlib import Path

# Configure GRPC before other imports to prevent timeout warnings
os.environ['GRPC_DNS_RESOLVER'] = 'native'
os.environ['GRPC_POLL_STRATEGY'] = 'poll'

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)

# Configure Google Generative AI with API Key
genai.configure(api_key='AIzaSyAHBD3jHdaoYE3zikbDAkCx645jlmg2syc')


# Supported file extensions
ALLOWED_EXTENSIONS = {'.py', '.java', '.js', '.cpp', '.c', '.h', '.hpp', '.dart'}
TEMP_EXTRACT_DIR = Path("temp_extracted")

def setup_environment():
    """Ensure required directories exist"""
    TEMP_EXTRACT_DIR.mkdir(exist_ok=True)

def clean_temp_files():
    """Remove temporary extraction directory"""
    if TEMP_EXTRACT_DIR.exists():
        shutil.rmtree(TEMP_EXTRACT_DIR)

def is_relevant_file(file_path):
    """Determine if a file has potential for containing meaningful code functionalities"""
    # Skip files with extensions that are unlikely to contain code functions
    non_function_files = {'.json', '.xml', '.yaml', '.txt', '.md', '.config'}
    if file_path.suffix.lower() in non_function_files:
        return False
    return True

def is_relevant_folder(folder_path):
    """Determine if a folder has potential for containing source code files"""
    irrelevant_folders = {'docs', 'tests', 'assets', 'bin', 'build', 'node_modules'}
    # Skip folders that are in the irrelevant list
    if any(part in irrelevant_folders for part in folder_path.parts):
        return False
    return True

def extract_from_zip(zip_path):
    """Extract and return all relevant source code files from a ZIP archive, ignoring irrelevant files and folders"""
    extracted_files = []
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            extract_folder = TEMP_EXTRACT_DIR / Path(zip_path).stem
            zip_ref.extractall(extract_folder)

            # Traverse the folder and only consider relevant files
            for file in extract_folder.rglob("*"):
                if file.is_file() and is_relevant_file(file) and is_relevant_folder(file.parent):
                    extracted_files.append(file)
                
        return extracted_files
    except zipfile.BadZipFile:
        logging.error(f"Invalid ZIP file: {zip_path}")
        return []

def extract_python_functions(file_content):
    """Extract functions from Python code"""
    try:
        tree = ast.parse(file_content)
        return [node.name for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]
    except Exception as e:
        logging.error(f"Python parsing error: {e}")
        return []

def extract_java_functions(file_content):
    """Extract methods from Java code"""
    try:
        tree = javalang.parse.parse(file_content)
        methods = []
        for class_type in tree.types:
            if isinstance(class_type, javalang.tree.ClassDeclaration):
                methods.extend(method.name for method in class_type.methods)
        return methods
    except Exception as e:
        logging.error(f"Java parsing error: {e}")
        return []

def extract_cpp_functions(file_content):
    """Extract functions from C/C++ code"""
    try:
        pattern = r"(?:(?:inline|static|virtual|explicit)\s+)[\w<>:]+\s+\w+\s\([^)]\)\s(?:const\s*)?\{[^}]*\}"
        return [match.split('(')[0].split()[-1] for match in re.findall(pattern, file_content, re.DOTALL)]
    except Exception as e:
        logging.error(f"C++ parsing error: {e}")
        return []

def extract_js_functions(file_content):
    """Extract functions from JavaScript code"""
    try:
        pattern = r"function\s+(\w+)\s*\("
        return re.findall(pattern, file_content)
    except Exception as e:
        logging.error(f"JavaScript parsing error: {e}")
        return []

def extract_dart_functions(file_content):
    """Extract functions from Dart code"""
    try:
        pattern = r"(\w+)\s*\([^)]\)\s\{"
        return re.findall(pattern, file_content)
    except Exception as e:
        logging.error(f"Dart parsing error: {e}")
        return []

def extract_functions_from_file(file_path):
    """Extract functions from a relevant source code file"""
    try:
        ext = Path(file_path).suffix.lower()

        # Skip non-source code files early
        if ext not in ALLOWED_EXTENSIONS:
            logging.info(f"Skipping non-code file: {file_path}")
            return []

        # Skip files that don't have potential for functionalities
        if not is_relevant_file(file_path):
            logging.info(f"Skipping irrelevant file (non-function): {file_path}")
            return []

        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

            # Process file content based on its extension
            if ext == '.py':
                return extract_python_functions(content)
            elif ext == '.java':
                return extract_java_functions(content)
            elif ext in {'.cpp', '.c', '.h', '.hpp'}:
                return extract_cpp_functions(content)
            elif ext == '.js':
                return extract_js_functions(content)
            elif ext == '.dart':
                return extract_dart_functions(content)
            else:
                logging.warning(f"Unsupported file type: {file_path}")
                return []
    except Exception as e:
        logging.error(f"Error processing {file_path}: {e}")
        return []

async def analyze_with_gemini(session, functions, filename):
    """Analyze code functions using Gemini API"""
    if not functions:
        logging.warning(f"No functions found in {filename}")
        return {"error": "No functions found"}

    prompt = f"""
    Analyze the following code file '{filename}' and provide detailed documentation:
    
    For each function, include:
    - Function name
    - Description
    - Parameters (name, type, description)
    - Return value (type, description)
    - Related functions
    - Usage examples
    
    Functions to analyze:
    {json.dumps(functions, indent=2)}
    """

    models = ["gemini-1.5-flash", "gemini-1.5-pro"]
    retry_attempts = 3
    delay = 3

    for model_name in models:
        for attempt in range(retry_attempts):
            try:
                model = genai.GenerativeModel(model_name)
                response = await asyncio.to_thread(model.generate_content, prompt)

                if response and response.text:
                    return {
                        "filename": filename,
                        "functions": functions,
                        "analysis": response.text,
                        "model_used": model_name
                    }

                raise Exception(f"Empty response from {model_name}")
            except Exception as e:
                logging.error(f"{model_name} error (attempt {attempt+1}): {e}")
                if "Resource has been exhausted" in str(e):
                    delay *= 2
                await asyncio.sleep(delay)

    return {"error": "All models failed after retries"}

async def process_source_files(file_paths):
    """Process multiple source files and return analysis results"""
    async with aiohttp.ClientSession() as session:
        results = []
        semaphore = asyncio.Semaphore(3)  # Limit concurrent requests

        async def process_file(file_path):
            async with semaphore:
                functions = extract_functions_from_file(file_path)
                if functions:
                    result = await analyze_with_gemini(session, functions, Path(file_path).name)
                    results.append(result)
                else:
                    logging.warning(f"No functions extracted from {file_path}")

        tasks = [process_file(fp) for fp in file_paths]
        await asyncio.gather(*tasks)
        return results

async def analyze_source_code(input_path, output_path):
    """Main analysis function that handles both files and ZIP archives"""
    setup_environment()
    input_path = Path(input_path)
    output_path = Path(output_path)

    try:
        if not input_path.exists():
            logging.error(f"Input path does not exist: {input_path}")
            return False

        # Handle ZIP files
        if input_path.suffix.lower() == '.zip':
            source_files = extract_from_zip(input_path)
            if not source_files:
                logging.error("No valid source files found in ZIP")
                return False
        else:
            # Handle single file
            if input_path.suffix.lower() not in ALLOWED_EXTENSIONS:
                logging.error(f"Unsupported file type: {input_path}")
                return False
            source_files = [input_path]

        # Process all source files
        analysis_results = await process_source_files(source_files)
        
        # Save results
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                "source": input_path.name,
                "timestamp": datetime.now().isoformat(),
                "files_analyzed": len(source_files),
                "results": analysis_results
            }, f, indent=2)

        logging.info(f"Analysis successfully saved to {output_path}")
        return True

    except Exception as e:
        logging.error(f"Analysis failed: {e}")
        return False
    finally:
        clean_temp_files()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze source code using Gemini AI")
    parser.add_argument("--file", required=True, help="Path to source file or ZIP archive")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    
    args = parser.parse_args()
    
    try:
        success = asyncio.run(analyze_source_code(args.file, args.output))
        exit(0 if success else 1)
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        exit(1)