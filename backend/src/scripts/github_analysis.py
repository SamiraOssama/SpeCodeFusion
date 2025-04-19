import os
import json
import tempfile
from git import Repo
import argparse
import ast
import re
import shutil
import sys
import javalang
import logging
from typing import List, Dict, Optional
import concurrent.futures
import time
import google.generativeai as genai

# Configuration
class Config:
    LLM_ENABLED = False  # Set to True to enable LLM analysis
    LLM_MODEL = "gemini-pro"  # Gemini model to use
    LLM_MAX_TOKENS = 1000  # Max function size to send to LLM
    LLM_MIN_COMPLEXITY = 3  # Only analyze functions with at least this many lines
    MAX_WORKERS = 4  # For parallel processing
    CACHE_FILE = "function_cache.json"  # Cache for LLM results
    SAFETY_SETTINGS = [
        {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_NONE",
        },
        {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_NONE",
        },
        {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_NONE",
        },
        {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_NONE",
        },
    ]
    GENERATION_CONFIG = {
        "temperature": 0.3,
        "max_output_tokens": 200,
    }

def is_code_file(filepath: str) -> bool:
    """Check if file is a code file we want to analyze"""
    code_extensions = ['.py', '.java', '.js', '.jsx', '.ts', '.tsx', '.cpp', '.c', '.h', '.hpp', '.dart']
    non_code_dirs = [
        'migrations', 'venv', 'node_modules', '__pycache__', '.git', '.github',
        'build', '.dart_tool', '.idea', 'android', 'ios', 'web', 'test', 'coverage',
        'dist', 'docs', 'examples', 'vendor', 'bin', 'obj'
    ]
    
    if not any(filepath.endswith(ext) for ext in code_extensions):
        return False
    
    normalized_path = filepath.replace("\\", "/").lower()
    return not any(f"/{dir}/" in normalized_path for dir in non_code_dirs)

def get_function_source(filepath: str, start_line: int, end_line: int) -> str:
    """Extract the source code of a function"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        return ''.join(lines[start_line-1:end_line])
    except Exception as e:
        logging.error(f"Error reading function source from {filepath}: {e}")
        return ""

def is_complex_function(func: Dict) -> bool:
    """Determine if a function is complex enough to warrant LLM analysis"""
    if not Config.LLM_ENABLED:
        return False
    if 'line_count' in func and func['line_count'] >= Config.LLM_MIN_COMPLEXITY:
        return True
    if 'body' in func and len(func['body'].split('\n')) >= Config.LLM_MIN_COMPLEXITY:
        return True
    return False

class FunctionCache:
    """Simple cache for LLM function analysis results"""
    def __init__(self):
        self.cache = {}
        self.load_cache()
    
    def load_cache(self):
        if os.path.exists(Config.CACHE_FILE):
            try:
                with open(Config.CACHE_FILE, 'r', encoding='utf-8') as f:
                    self.cache = json.load(f)
            except Exception as e:
                logging.error(f"Error loading cache: {e}")
    
    def save_cache(self):
        try:
            with open(Config.CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            logging.error(f"Error saving cache: {e}")
    
    def get(self, func_hash: str) -> Optional[str]:
        return self.cache.get(func_hash)
    
    def set(self, func_hash: str, summary: str):
        self.cache[func_hash] = summary

function_cache = FunctionCache()

def initialize_gemini(api_key: str):
    """Initialize the Gemini API client"""
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(
            model_name=Config.LLM_MODEL,
            safety_settings=Config.SAFETY_SETTINGS,
            generation_config=Config.GENERATION_CONFIG
        )
    except Exception as e:
        logging.error(f"Failed to initialize Gemini: {e}")
        return None

def analyze_with_llm(function_code: str) -> Optional[str]:
    """Call Gemini API to analyze function code and extract underlying meaning."""
    if not Config.LLM_ENABLED:
        return None
    
    # Create a hash of the function code for caching
    func_hash = str(hash(function_code))
    
    # Check cache first
    cached_result = function_cache.get(func_hash)
    if cached_result:
        return cached_result
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel(Config.LLM_MODEL)
        
        # Prepare the prompt to extract underlying meaning
        prompt = f"""Analyze the following function and describe its underlying purpose and core functionality in one concise sentence.
        Focus on what the function fundamentally achieves, not just its implementation details.
        
        Function code:
        {function_code}
        
        Underlying purpose: This function"""
        
        # Call the API
        response = model.generate_content(prompt)
        
        # Process the response
        if response.text:
            summary = "This function " + response.text.strip()
            # Cache the result
            function_cache.set(func_hash, summary)
            return summary
        else:
            logging.warning("Empty response from Gemini")
            return None
            
    except Exception as e:
        logging.error(f"Error calling Gemini API: {e}")
        return None

def summarize_dart_function(func_code: str) -> str:
    """Enhanced heuristic to summarize Dart functions"""
    summary_parts = []
    
    patterns = [
        (r'http\.(get|post|put|delete)\s*\(', 'makes HTTP requests to'),
        (r'jsonDecode\s*\(', 'parses JSON data'),
        (r'(Either|Option|Result)\b', 'uses functional programming patterns'),
        (r'Future<.*?>', 'handles asynchronous operations'),
        (r'Stream<.*?>', 'handles data streams'),
        (r'Provider\.', 'uses state management'),
        (r'Bloc\.', 'implements BLoC pattern'),
        (r'setState\s*\(', 'manages local state'),
        (r'print\s*\(|log\s*\(', 'logs output')
    ]
    
    for pattern, desc in patterns:
        if re.search(pattern, func_code):
            summary_parts.append(desc)
    
    if not summary_parts:
        return "performs business logic operations"
    return ", ".join(summary_parts)

def extract_dart_functions(filepath: str) -> List[Dict]:
    """Improved Dart function extraction that excludes control flow statements"""
    functions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Updated pattern to exclude control flow statements
        pattern = r'''(?x)
            (?:^|\s)                         # Start of line or whitespace
            (?:async\s+)?                    # Optional async
            (?:[\w<>]+\s+)?                  # Return type
            ([a-zA-Z_]\w*)\s*                # Function name (must start with letter/underscore)
            \(([^)]*)\)\s*                  # Parameters
            (?:=>|{)                        # Start of body
        '''

        matches = list(re.finditer(pattern, content))
        
        control_flow_keywords = {'if', 'else', 'for', 'while', 'switch', 'try', 'catch'}
        
        for i, match in enumerate(matches):
            func_name = match.group(1)
            
            # Skip control flow statements
            if func_name in control_flow_keywords:
                continue
                
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(content)
            func_body = content[start_pos:end_pos].strip()
            
            # Calculate line numbers
            start_line = content[:match.start()].count('\n') + 1
            end_line = content[:end_pos].count('\n') + 1
            
            summary = summarize_dart_function(func_body)
            func_data = {
                'name': func_name,
                'file': os.path.basename(filepath),
                'filepath': filepath,
                'language': 'dart',
                'summary': summary,
                'start_line': start_line,
                'end_line': end_line,
                'line_count': end_line - start_line,
                'body': func_body
            }
            
            if is_complex_function(func_data):
                llm_summary = analyze_with_llm(func_body)
                if llm_summary:
                    func_data['llm_summary'] = llm_summary
            
            functions.append(func_data)
    except Exception as e:
        logging.error(f"Error parsing Dart file {filepath}: {str(e)}")
    return functions

def extract_python_functions(filepath: str) -> List[Dict]:
    """Extract Python functions with enhanced meaning extraction."""
    functions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read(), filename=filepath)
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Get function body lines
                start_line = node.lineno
                end_line = node.end_lineno if hasattr(node, 'end_lineno') else start_line
                
                # Get docstring if available
                docstring = ast.get_docstring(node)
                
                func_data = {
                    'name': node.name,
                    'start_line': start_line,
                    'end_line': end_line,
                    'line_count': end_line - start_line,
                    'file': os.path.basename(filepath),
                    'filepath': filepath,
                    'language': 'python',
                    'docstring': docstring,
                    'params': [arg.arg for arg in node.args.args],
                    'returns': ast.unparse(node.returns) if node.returns else None
                }
                
                # Use docstring as the primary source of meaning
                if docstring:
                    func_data['underlying_meaning'] = docstring.split('.')[0]
                elif is_complex_function(func_data):
                    func_body = get_function_source(filepath, start_line, end_line)
                    if func_body:
                        llm_summary = analyze_with_llm(func_body)
                        if llm_summary:
                            func_data['underlying_meaning'] = llm_summary
                else:
                    # Fall back to simple heuristic
                    func_data['underlying_meaning'] = f"performs operations related to {node.name}"
                
                functions.append(func_data)
    except Exception as e:
        logging.error(f"Error parsing {filepath}: {str(e)}")
    return functions

def extract_js_functions(filepath: str) -> List[Dict]:
    """Improved JavaScript/TypeScript function extraction"""
    functions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Patterns for different JS function styles
        patterns = [
            r'function\s+([^\s(]+)\s*\([^)]*\)\s*{',  # function declaration
            r'const\s+([^\s=]+)\s*=\s*\([^)]*\)\s*=>\s*{',  # arrow function
            r'let\s+([^\s=]+)\s*=\s*\([^)]*\)\s*=>\s*{',  # arrow function
            r'export\s+default\s+function\s+([^\s(]+)\s*\([^)]*\)\s*{',  # exported function
            r'export\s+const\s+([^\s=]+)\s*=\s*\([^)]*\)\s*=>\s*{',  # exported arrow
            r'class\s+([^\s{]+)\s*{[\s\S]*?constructor\s*\([^)]*\)\s*{',  # class constructor
            r'([^\s(]+)\s*\([^)]*\)\s*{',  # method shorthand
        ]

        for pattern in patterns:
            for match in re.finditer(pattern, content):
                func_name = match.group(1)
                if func_name:
                    # Estimate line numbers
                    start_pos = match.start()
                    start_line = content[:start_pos].count('\n') + 1
                    
                    # Find end of function (simplistic approach)
                    brace_count = 1
                    end_pos = start_pos + len(match.group(0))
                    while end_pos < len(content) and brace_count > 0:
                        if content[end_pos] == '{':
                            brace_count += 1
                        elif content[end_pos] == '}':
                            brace_count -= 1
                        end_pos += 1
                    
                    end_line = content[:end_pos].count('\n') + 1
                    func_body = content[start_pos:end_pos].strip()
                    
                    func_data = {
                        'name': func_name,
                        'file': os.path.basename(filepath),
                        'filepath': filepath,
                        'language': 'javascript',
                        'start_line': start_line,
                        'end_line': end_line,
                        'line_count': end_line - start_line,
                        'body': func_body
                    }
                    
                    if is_complex_function(func_data):
                        llm_summary = analyze_with_llm(func_body)
                        if llm_summary:
                            func_data['llm_summary'] = llm_summary
                    
                    functions.append(func_data)
    except Exception as e:
        logging.error(f"Error parsing {filepath}: {e}")
    return functions

def extract_java_functions(filepath: str) -> List[Dict]:
    """Enhanced Java method extraction with more details"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            file_content = f.read()
        
        tree = javalang.parse.parse(file_content)
        methods = []

        def process_class(class_node, class_name=None):
            class_name = class_name or class_node.name
            
            for constructor in class_node.constructors:
                method_body = get_java_method_body(file_content, constructor.position.line if constructor.position else None)
                
                method_data = {
                    "name": class_name,
                    "type": "constructor",
                    "parameters": [param.name for param in constructor.parameters],
                    "parameter_types": [str(param.type) for param in constructor.parameters],
                    "file": os.path.basename(filepath),
                    "filepath": filepath,
                    "language": "java",
                    "modifiers": constructor.modifiers,
                    "body": method_body
                }
                
                if is_complex_function(method_data):
                    llm_summary = analyze_with_llm(method_body) if method_body else None
                    if llm_summary:
                        method_data['llm_summary'] = llm_summary
                
                methods.append(method_data)

            for method in class_node.methods:
                method_body = get_java_method_body(file_content, method.position.line if method.position else None)
                
                method_data = {
                    "name": method.name,
                    "type": "method",
                    "parameters": [param.name for param in method.parameters],
                    "parameter_types": [str(param.type) for param in method.parameters],
                    "return_type": str(method.return_type) if method.return_type else "void",
                    "file": os.path.basename(filepath),
                    "filepath": filepath,
                    "language": "java",
                    "modifiers": method.modifiers,
                    "body": method_body
                }
                
                if is_complex_function(method_data):
                    llm_summary = analyze_with_llm(method_body) if method_body else None
                    if llm_summary:
                        method_data['llm_summary'] = llm_summary
                
                methods.append(method_data)

            for nested_class in class_node.body:
                if isinstance(nested_class, javalang.tree.ClassDeclaration):
                    process_class(nested_class, f"{class_name}.{nested_class.name}")

        for class_type in tree.types:
            if isinstance(class_type, javalang.tree.ClassDeclaration):
                process_class(class_type)

        return methods

    except javalang.parser.JavaSyntaxError as e:
        logging.error(f"Java syntax error in {filepath}: {e}")
        return []
    except Exception as e:
        logging.error(f"Java parsing error in {filepath}: {e}")
        return []

def get_java_method_body(file_content: str, start_line: int) -> Optional[str]:
    """Extract method body from Java file based on starting line"""
    if not start_line:
        return None
    
    lines = file_content.split('\n')
    if start_line > len(lines):
        return None
    
    # Find the opening brace after the method signature
    current_line = start_line - 1
    brace_count = 0
    start_pos = -1
    
    while current_line < len(lines):
        line = lines[current_line]
        if '{' in line and start_pos == -1:
            start_pos = current_line
            brace_count = 1
        elif '{' in line and start_pos != -1:
            brace_count += 1
        elif '}' in line and start_pos != -1:
            brace_count -= 1
            if brace_count == 0:
                return '\n'.join(lines[start_pos:current_line+1])
        current_line += 1
    
    return None

def generate_functional_requirements(functions: List[Dict]) -> List[Dict]:
    """Generate functional requirements with priority to underlying meaning"""
    requirements = []
    for func in functions:
        # Start with the most authoritative source of meaning
        if 'underlying_meaning' in func:
            requirement_text = f"The system shall include a function '{func['name']}' that {func['underlying_meaning']}."
            source = 'meaning'
        elif 'llm_summary' in func:
            requirement_text = f"The system shall include a function '{func['name']}' that {func['llm_summary']}."
            source = 'llm'
        elif 'docstring' in func and func['docstring']:
            clean_docstring = func['docstring'].split('.')[0].strip()
            requirement_text = f"The system shall include a function '{func['name']}' that {clean_docstring}."
            source = 'docstring'
        elif 'summary' in func:
            requirement_text = f"The system shall include a function '{func['name']}' that {func['summary']}."
            source = 'heuristic'
        else:
            # Fallback for functions with no metadata
            requirement_text = f"The system shall include a function '{func['name']}' whose purpose needs to be documented."
            source = 'unknown'
        
        # Ensure the requirement ends with a period and doesn't have double periods
        requirement_text = requirement_text.rstrip('.') + '.'
        
        requirements.append({
            'requirement': requirement_text,
            'source': source,
            'file': func['file'],
            'language': func['language'],
            'function': func['name'],
            'location': f"{func['filepath']}:{func['start_line']}-{func['end_line']}"
        })
    
    return requirements

def process_file(filepath: str) -> Optional[List[Dict]]:
    """Process a single file and return its functions"""
    if not is_code_file(filepath):
        return None
    
    try:
        if filepath.endswith('.py'):
            return extract_python_functions(filepath)
        elif filepath.endswith(('.js', '.jsx', '.ts', '.tsx')):
            return extract_js_functions(filepath)
        elif filepath.endswith('.java'):
            return extract_java_functions(filepath)
        elif filepath.endswith('.dart'):
            return extract_dart_functions(filepath)
    except Exception as e:
        logging.error(f"Error processing {filepath}: {e}")
    return None

def analyze_repository(repo_url: str, output_path: str, clone_dir: Optional[str] = None, gemini_api_key: Optional[str] = None) -> Dict:
    """Enhanced repository analysis with parallel processing"""
    analysis_result = {
        'repo_url': repo_url,
        'files_analyzed': 0,
        'functions_found': 0,
        'functions': [],
        'functional_requirements': [],
        'start_time': time.time(),
        'status': 'success'
    }

    try:
        # Initialize Gemini if enabled
        if Config.LLM_ENABLED and gemini_api_key:
            initialize_gemini(gemini_api_key)

        # Clone repository
        if clone_dir:
            target_dir = clone_dir
            if os.path.exists(target_dir):
                shutil.rmtree(target_dir)
            os.makedirs(target_dir, exist_ok=True)
        else:
            target_dir = tempfile.mkdtemp(prefix='github_analysis_')

        logging.info(f"Cloning {repo_url} to {target_dir}")
        Repo.clone_from(repo_url, target_dir)

        # Collect all files to process
        files_to_process = []
        for root, _, files in os.walk(target_dir):
            for file in files:
                filepath = os.path.join(root, file)
                if is_code_file(filepath):
                    files_to_process.append(filepath)

        # Process files in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
            future_to_file = {executor.submit(process_file, filepath): filepath for filepath in files_to_process}
            
            for future in concurrent.futures.as_completed(future_to_file):
                filepath = future_to_file[future]
                try:
                    functions = future.result()
                    if functions:
                        analysis_result['files_analyzed'] += 1
                        analysis_result['functions_found'] += len(functions)
                        analysis_result['functions'].extend(functions)
                except Exception as e:
                    logging.error(f"Error processing {filepath}: {e}")

        # Generate requirements
        analysis_result['functional_requirements'] = generate_functional_requirements(analysis_result['functions'])
        analysis_result['processing_time'] = time.time() - analysis_result['start_time']

        # Save results
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(analysis_result, f, indent=2)

    except Exception as e:
        analysis_result['status'] = 'error'
        analysis_result['error'] = str(e)
        logging.error(f"Error during analysis: {str(e)}")
    finally:
        # Save cache before exiting
        if Config.LLM_ENABLED:
            function_cache.save_cache()
        
        # Clean up
        if not clone_dir and 'target_dir' in locals():
            try:
                shutil.rmtree(target_dir, ignore_errors=True)
            except Exception as e:
                logging.error(f"Error cleaning up: {str(e)}")

    return analysis_result

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('github_analysis.log'),
            logging.StreamHandler()
        ]
    )

    parser = argparse.ArgumentParser(description='Analyze GitHub repository')
    parser.add_argument('--url', required=True, help='GitHub repository URL')
    parser.add_argument('--output', required=True, help='Output JSON file path')
    parser.add_argument('--clone-dir', help='Permanent directory to clone repository to')
    parser.add_argument('--enable-llm', action='store_true', help='Enable LLM analysis')
    parser.add_argument('--gemini-api-key', help='Gemini API key (required if LLM enabled)')
    parser.add_argument('--max-workers', type=int, default=4, help='Max parallel workers')

    args = parser.parse_args()

    # Update config based on arguments
    Config.LLM_ENABLED = args.enable_llm
    Config.MAX_WORKERS = args.max_workers

    if Config.LLM_ENABLED and not args.gemini_api_key:
        logging.error("Gemini API key is required when LLM analysis is enabled")
        sys.exit(1)

    result = analyze_repository(args.url, args.output, args.clone_dir, args.gemini_api_key)

    if result['status'] == 'error':
        logging.error(f"Analysis failed: {result.get('error')}")
        sys.exit(1)
    else:
        logging.info(f"Analysis completed successfully. Results saved to {args.output}")
        logging.info(f"Stats: {result['files_analyzed']} files, {result['functions_found']} functions")
        sys.exit(0)