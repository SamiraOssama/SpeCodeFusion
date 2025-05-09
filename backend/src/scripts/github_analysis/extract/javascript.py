import os
import re
import logging
from typing import List, Dict, Optional, Tuple

def extract(filepath: str) -> List[Dict]:
    return extract_js_functions(filepath)

def extract_js_functions(filepath: str) -> List[Dict]:
    functions = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.splitlines()

        # Skip very large files or minified files
        line_count = len(lines)
        if line_count > 0 and len(content) / line_count > 200:
            return []

        # Extract file-level JSDoc if present
        file_comment = extract_file_comment(content)
        
        # Find all class definitions
        class_patterns = [
            r'class\s+([^\s{]+)\s*{',  # class Name {
            r'class\s+([^\s]+)\s+extends\s+[^\s{]+\s*{',  # class Name extends Base {
        ]
        
        classes = []
        for pattern in class_patterns:
            for match in re.finditer(pattern, content):
                class_info = extract_class_info(content, match, lines)
                if class_info:
                    classes.append(class_info)
        
        # Function patterns with context
        patterns = [
            (r'(?:export\s+)?(?:async\s+)?function\s+([^\s(]+)\s*\([^)]*\)\s*{', 'function'),  # function name() {
            (r'(?:export\s+)?(?:const|let|var)\s+([^\s=]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*{', 'arrow'),  # const name = () => {
            (r'(?:export\s+)?(?:async\s+)?([^\s(]+)\s*\([^)]*\)\s*{', 'method'),  # name() {
        ]

        for pattern, func_type in patterns:
            for match in re.finditer(pattern, content):
                func_name = match.group(1)
                if func_name in {"if", "for", "while", "switch", "try"}:
                    continue
                    
                # Find function boundaries
                start_pos = match.start()
                end_pos = find_balanced_brace(content, match.end())
                if end_pos == -1:
                    continue

                # Get line numbers
                start_line = content[:start_pos].count('\n') + 1
                end_line = content[:end_pos].count('\n') + 1
                
                # Find containing class
                containing_class = None
                class_context = ""
                for cls in classes:
                    if cls['start_line'] < start_line and cls['end_line'] > end_line:
                        containing_class = cls['name']
                        class_context = cls['context']
                        break
                
                # Extract comments and JSDoc
                leading_comment = extract_leading_comment(content, start_pos)
                jsdoc = extract_jsdoc(content, start_pos)
                
                # Build context
                context = []
                if file_comment:
                    context.append(f"File comment: {file_comment}")
                if class_context:
                    context.append(class_context)
                if jsdoc:
                    context.append(f"JSDoc: {jsdoc}")
                if leading_comment:
                    context.append(f"Comments: {leading_comment}")
                
                # Extract parameters
                params = extract_parameters(content[match.start():match.end()])
                
                functions.append({
                    'name': func_name,
                    'file': os.path.basename(filepath),
                    'filepath': filepath,
                    'language': 'javascript',
                    'type': 'method' if containing_class else func_type,
                    'class': containing_class,
                    'start_line': start_line,
                    'end_line': end_line,
                    'line_count': end_line - start_line + 1,
                    'body': content[start_pos:end_pos].strip(),
                    'context': '\n'.join(context),
                    'parameters': params,
                    'is_async': bool(re.search(r'async\s+', content[max(0, start_pos-10):start_pos])),
                    'is_exported': bool(re.search(r'export\s+', content[max(0, start_pos-10):start_pos]))
                })

    except Exception as e:
        logging.error(f"JS Extract Error in {filepath}: {str(e)}")
    return functions

def extract_class_info(content: str, match: re.Match, lines: List[str]) -> Optional[Dict]:
    """Extract information about a class definition."""
    try:
        start_pos = match.start()
        end_pos = find_balanced_brace(content, match.end())
        if end_pos == -1:
            return None
            
        class_name = match.group(1)
        start_line = content[:start_pos].count('\n') + 1
        end_line = content[:end_pos].count('\n') + 1
        
        # Get class documentation
        jsdoc = extract_jsdoc(content, start_pos)
        leading_comment = extract_leading_comment(content, start_pos)
        
        context = []
        if jsdoc:
            context.append(f"Class JSDoc: {jsdoc}")
        if leading_comment:
            context.append(f"Class comments: {leading_comment}")
            
        return {
            'name': class_name,
            'start_line': start_line,
            'end_line': end_line,
            'context': '\n'.join(context)
        }
    except Exception:
        return None

def extract_parameters(func_header: str) -> List[Dict]:
    """Extract function parameters from function declaration."""
    params = []
    param_match = re.search(r'\((.*?)\)', func_header)
    if param_match:
        param_str = param_match.group(1)
        if param_str.strip():
            for param in param_str.split(','):
                param = param.strip()
                if param:
                    # Handle destructuring and default values
                    name = re.sub(r'=.*$', '', param).strip()  # Remove default value
                    name = re.sub(r'^\.\.\.', '', name)  # Remove rest parameter
                    name = re.sub(r'^{.*}$', 'obj', name)  # Replace destructuring with obj
                    params.append({"name": name, "original": param})
    return params

def find_balanced_brace(code: str, start_index: int) -> int:
    """Find the position of the closing brace that matches the opening brace."""
    brace_count = 0
    i = start_index
    while i < len(code):
        if code[i] == '{':
            brace_count += 1
        elif code[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                return i + 1
        i += 1
    return -1

def extract_leading_comment(code: str, index: int) -> str:
    """Extract non-JSDoc comments preceding a code element."""
    lines = code[:index].splitlines()
    comments = []
    for line in reversed(lines):
        line = line.strip()
        if line.startswith('//'):
            comments.insert(0, line[2:].strip())
        elif line.startswith('/*') and not line.startswith('/**'):
            comment = line[2:].rstrip('*/').strip()
            if comment:
                comments.insert(0, comment)
        elif not line:
            continue
        else:
            break
    return " ".join(comments)

def extract_jsdoc(code: str, index: int) -> str:
    """Extract JSDoc comment block preceding a code element."""
    lines = code[:index].splitlines()
    jsdoc_lines = []
    in_jsdoc = False
    
    for line in reversed(lines):
        line = line.strip()
        if line.endswith('*/'):
            in_jsdoc = True
            line = line[:-2].strip()
            if line:
                jsdoc_lines.insert(0, line)
        elif in_jsdoc:
            if line.startswith('/**'):
                break
            if line.startswith('*'):
                line = line[1:].strip()
            if line:
                jsdoc_lines.insert(0, line)
                
    return " ".join(jsdoc_lines)

def extract_file_comment(content: str) -> str:
    """Extract file-level comment or JSDoc if present at the start of file."""
    lines = content.splitlines()
    comments = []
    in_comment = False
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith('/**'):
            in_comment = True
            line = line[3:].strip()
            if line:
                comments.append(line)
        elif in_comment:
            if line.endswith('*/'):
                in_comment = False
                line = line[:-2].strip()
            elif line.startswith('*'):
                line = line[1:].strip()
            if line:
                comments.append(line)
        elif line.startswith('//'):
            comments.append(line[2:].strip())
        else:
            break
            
    return " ".join(comments)

