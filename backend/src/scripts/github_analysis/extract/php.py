import os
import re
from typing import List, Dict, Optional

def extract(filepath: str) -> List[Dict]:
    """Extract code from PHP files with full context and hierarchy."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            code = f.read()
            lines = code.splitlines()
    except Exception:
        return []

    results = []
    
    # Extract namespace and use statements
    namespace = extract_namespace(code)
    use_statements = extract_use_statements(code)
    
    # Find all classes first
    class_pattern = re.compile(
        r"(?P<comment>/\*\*[\s\S]*?\*/)?\s*"
        r"(?P<modifiers>(?:abstract\s+|final\s+)*)?"
        r"class\s+(?P<name>[a-zA-Z_][a-zA-Z0-9_]*)"
        r"(?:\s+extends\s+(?P<extends>[a-zA-Z_][a-zA-Z0-9_]*))?"
        r"(?:\s+implements\s+(?P<implements>[^{]+))?\s*\{"
    )
    
    classes = []
    for match in class_pattern.finditer(code):
        class_info = extract_class_info(code, match)
        if class_info:
            classes.append(class_info)
    
    # Function pattern with docblock and modifiers
    func_pattern = re.compile(
        r"(?P<comment>/\*\*[\s\S]*?\*/)?\s*"
        r"(?P<modifiers>(?:public\s+|private\s+|protected\s+|static\s+|final\s+)*)"
        r"function\s+(?P<name>[a-zA-Z_][a-zA-Z0-9_]*)\s*\((?P<params>[^)]*)\)\s*"
        r"(?::(?P<return>[^{]+))?\s*\{"
    )

    for match in func_pattern.finditer(code):
        name = match.group('name')
        if name.lower() in {"if", "for", "while", "switch"}:
            continue
            
        start = match.start()
        end = find_balanced_brace(code, match.end())
        if end == -1:
            continue

        start_line = code[:start].count('\n') + 1
        end_line = code[:end].count('\n') + 1
        
        # Find containing class
        containing_class = None
        class_context = ""
        for cls in classes:
            if cls['start_line'] < start_line and cls['end_line'] > end_line:
                containing_class = cls
                class_context = cls['context']
                break
        
        # Parse parameters
        params = []
        for param in match.group('params').split(','):
            param = param.strip()
            if param:
                type_match = re.match(r'(?:([a-zA-Z_][a-zA-Z0-9_]*)\s+)?(\$[a-zA-Z_][a-zA-Z0-9_]*)', param)
                if type_match:
                    params.append({
                        'type': type_match.group(1) or '',
                        'name': type_match.group(2)
                    })
        
        # Build context
        context = []
        if namespace:
            context.append(f"Namespace: {namespace}")
        if use_statements:
            context.append("Use statements:\n" + "\n".join(use_statements))
        if class_context:
            context.append(class_context)
        
        # Add docblock and modifiers
        docblock = clean_comment(match.group('comment') or '')
        if docblock:
            context.append(f"Documentation: {docblock}")
        
        modifiers = match.group('modifiers').strip().split()
        if modifiers:
            context.append(f"Modifiers: {', '.join(modifiers)}")
        
        # Get return type
        return_type = match.group('return')
        if return_type:
            return_type = return_type.strip()
        
        results.append({
            "name": name,
            "file": os.path.basename(filepath),
            "filepath": filepath,
            "language": "php",
            "type": "method" if containing_class else "function",
            "class": containing_class['name'] if containing_class else None,
            "start_line": start_line,
            "end_line": end_line,
            "line_count": end_line - start_line + 1,
            "body": code[start:end].strip(),
            "context": "\n".join(context),
            "parameters": params,
            "return_type": return_type,
            "modifiers": modifiers
        })
        
    return results

def extract_class_info(code: str, match: re.Match) -> Optional[Dict]:
    """Extract information about a class definition."""
    try:
        start = match.start()
        end = find_balanced_brace(code, match.end())
        if end == -1:
            return None
            
        name = match.group('name')
        start_line = code[:start].count('\n') + 1
        end_line = code[:end].count('\n') + 1
        
        context = []
        
        # Get class documentation
        docblock = clean_comment(match.group('comment') or '')
        if docblock:
            context.append(f"Class documentation: {docblock}")
        
        # Get modifiers
        modifiers = (match.group('modifiers') or '').strip().split()
        if modifiers:
            context.append(f"Class modifiers: {', '.join(modifiers)}")
        
        # Get inheritance info
        extends = match.group('extends')
        if extends:
            context.append(f"Extends: {extends}")
            
        implements = match.group('implements')
        if implements:
            interfaces = [i.strip() for i in implements.split(',')]
            context.append(f"Implements: {', '.join(interfaces)}")
            
        return {
            'name': name,
            'start_line': start_line,
            'end_line': end_line,
            'context': "\n".join(context)
        }
    except Exception:
        return None

def extract_namespace(code: str) -> str:
    """Extract namespace from PHP file."""
    match = re.search(r'namespace\s+([^;]+);', code)
    return match.group(1) if match else ""

def extract_use_statements(code: str) -> List[str]:
    """Extract use statements from PHP file."""
    return [m.group(1) for m in re.finditer(r'use\s+([^;]+);', code)]

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

def clean_comment(comment: str) -> str:
    """Clean and normalize PHP comments."""
    if not comment:
        return ""
    lines = comment.strip().splitlines()
    cleaned = []
    for line in lines:
        line = re.sub(r'^(/\*+|\*+/|\*\s*|//+)', '', line).strip()
        if line and not line.startswith('@'):  # Skip PHPDoc annotations
            cleaned.append(line)
    return " ".join(cleaned)
