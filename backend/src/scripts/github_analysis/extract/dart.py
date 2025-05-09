import os
import re
from typing import List, Dict, Optional

def extract(filepath: str) -> List[Dict]:
    """Extract code from Dart files with full context and hierarchy."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            code = f.read()
            lines = code.splitlines()
    except Exception as e:
        print(f"Error reading {filepath}: {str(e)}")
        return []

    results = []
    
    # Extract imports and exports
    imports = extract_imports(code)
    exports = extract_exports(code)
    
    # Find all classes first
    class_pattern = re.compile(
        r"(?P<comment>(///.*\n|/\*\*[\s\S]*?\*/\n)*)"
        r"(?P<modifiers>(?:abstract\s+|final\s+|sealed\s+)*)?"
        r"class\s+(?P<name>[a-zA-Z_][a-zA-Z0-9_]*)"
        r"(?:\s*<[^>]+>)?"  # Generic type parameters
        r"(?:\s+extends\s+(?P<extends>[^{]+))?"
        r"(?:\s+with\s+(?P<with>[^{]+))?"
        r"(?:\s+implements\s+(?P<implements>[^{]+))?\s*{"
    )
    
    classes = []
    for match in class_pattern.finditer(code):
        class_info = extract_class_info(code, match)
        if class_info:
            classes.append(class_info)
    
    # Widget build method pattern - common in Flutter
    widget_pattern = re.compile(
        r"(?P<comment>(///.*\n|/\*\*[\s\S]*?\*/\n)*)"
        r"(?P<annotations>(?:@\w+(?:\([^)]*\))?\s*\n)*)"
        r"(?P<modifiers>(?:static\s+|final\s+|const\s+)*)"
        r"(?P<return>Widget\s+)"
        r"(?P<name>build)\s*"
        r"\((?P<params>[^)]*)\)(?:\s*async\s*)?\s*{"
    )
    
    for match in widget_pattern.finditer(code):
        process_function_match(match, code, classes, imports, exports, results, filepath)
    
    # Function pattern with annotations and modifiers
    func_pattern = re.compile(
        r"(?P<comment>(///.*\n|/\*\*[\s\S]*?\*/\n)*)"
        r"(?P<annotations>(?:@\w+(?:\([^)]*\))?\s*\n)*)"
        r"(?P<modifiers>(?:static\s+|final\s+|const\s+)*)"
        r"(?P<return>[a-zA-Z_][a-zA-Z0-9_<>.]*(?:\?|\s+))?"
        r"(?P<name>[a-zA-Z_][a-zA-Z0-9_]*)\s*"
        r"\((?P<params>[^)]*)\)(?:\s*async\s*)?\s*{"
    )

    for match in func_pattern.finditer(code):
        name = match.group('name')
        if name.lower() in {'build', 'widget', 'container', 'if', 'for', 'while'}:
            continue
        
        process_function_match(match, code, classes, imports, exports, results, filepath)

    # Also look for stateless and stateful widget overrides
    if len(results) == 0:
        # Handle Flutter State classes with createState
        state_pattern = re.compile(
            r"class\s+\w+\s+extends\s+State<[^>]+>\s*{\s*@override\s*Widget\s+build\s*\(\s*BuildContext"
        )
        if state_pattern.search(code):
            # This is likely a Flutter State class with build method
            results.append({
                "name": "build",
                "file": os.path.basename(filepath),
                "filepath": filepath,
                "language": "dart",
                "type": "method",
                "class": "State",
                "start_line": 1,
                "end_line": len(lines),
                "line_count": len(lines),
                "body": "// Flutter State class with build method\n" + code,
                "context": "Flutter StatefulWidget State class with build method",
                "parameters": [{"name": "context", "type": "BuildContext"}],
                "return_type": "Widget",
                "modifiers": ["override"],
                "annotations": ["@override"]
            })

    return results

def process_function_match(match, code, classes, imports, exports, results, filepath):
    """Process a regex match for a function and add it to results."""
    try:
        name = match.group('name')
        start = match.start()
        end = find_balanced_brace(code, match.end() - 1)
        if end == -1:
            return
            
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
                # Handle named parameters {type name}
                is_named = False
                if param.startswith('{'):
                    param = param[1:].rstrip('}')
                    is_named = True
                
                # Handle required/optional parameters
                is_optional = '?' in param or is_named
                param = param.replace('?', '')
                
                # Extract type and name
                parts = param.split()
                if len(parts) >= 2:
                    params.append({
                        'type': parts[0],
                        'name': parts[1].rstrip(',;'),
                        'optional': is_optional
                    })
                elif len(parts) == 1 and parts[0]:
                    # Handle case when only name is provided (type is inferred)
                    params.append({
                        'name': parts[0].rstrip(',;'),
                        'type': 'dynamic',
                        'optional': is_optional
                    })
        
        # Build context
        context = []
        if imports:
            context.append("Imports:\n" + "\n".join(imports))
        if exports:
            context.append("Exports:\n" + "\n".join(exports))
        if class_context:
            context.append(class_context)
        
        # Add documentation
        doc = clean_comment(match.group('comment'))
        if doc:
            context.append(f"Documentation: {doc}")
        
        # Add annotations
        annotations = []
        if 'annotations' in match.groupdict():
            annotations = [a.strip() for a in match.group('annotations').split('\n') if a.strip()]
            if annotations:
                context.append(f"Annotations: {', '.join(annotations)}")
        
        # Get modifiers and return type
        modifiers = []
        if 'modifiers' in match.groupdict():
            modifiers = match.group('modifiers').strip().split()
        
        return_type = 'dynamic'
        if 'return' in match.groupdict() and match.group('return'):
            return_type = match.group('return').strip()
        
        body = code[start:end].strip()
        # Get more context if body is short
        if len(body.splitlines()) < 5 and len(body) < 200:
            # Try to get more context by including lines before/after
            context_lines = []
            line_idx = start_line - 1
            for _ in range(3):  # Get up to 3 lines before
                if line_idx >= 0:
                    context_lines.append(code.splitlines()[line_idx])
                line_idx -= 1
            context_lines.reverse()
            context_lines.append(body)
            for _ in range(3):  # Get up to 3 lines after
                line_idx = end_line
                if line_idx < len(code.splitlines()):
                    context_lines.append(code.splitlines()[line_idx])
                line_idx += 1
            body = "\n".join(context_lines)
        
        results.append({
            "name": name,
            "file": os.path.basename(filepath),
            "filepath": filepath,
            "language": "dart",
            "type": "method" if containing_class else "function",
            "class": containing_class['name'] if containing_class else None,
            "start_line": start_line,
            "end_line": end_line,
            "line_count": end_line - start_line + 1,
            "body": body,
            "context": "\n".join(context),
            "parameters": params,
            "return_type": return_type,
            "modifiers": modifiers,
            "annotations": annotations
        })
    except Exception as e:
        print(f"Error processing function in {filepath}: {str(e)}")

def extract_class_info(code: str, match: re.Match) -> Optional[Dict]:
    """Extract information about a class definition."""
    try:
        start = match.start()
        end = find_balanced_brace(code, match.end() - 1)
        if end == -1:
            return None
            
        name = match.group('name')
        start_line = code[:start].count('\n') + 1
        end_line = code[:end].count('\n') + 1
        
        context = []
        
        # Get class documentation
        doc = clean_comment(match.group('comment'))
        if doc:
            context.append(f"Class documentation: {doc}")
        
        # Get modifiers
        modifiers = (match.group('modifiers') or '').strip().split()
        if modifiers:
            context.append(f"Class modifiers: {', '.join(modifiers)}")
        
        # Get inheritance info
        extends = match.group('extends')
        if extends:
            context.append(f"Extends: {extends.strip()}")
            
        with_mixins = match.group('with')
        if with_mixins:
            mixins = [m.strip() for m in with_mixins.split(',')]
            context.append(f"With: {', '.join(mixins)}")
            
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
    except Exception as e:
        print(f"Error extracting class info: {str(e)}")
        return None

def extract_imports(code: str) -> List[str]:
    """Extract import statements from Dart file."""
    return [m.group(1) for m in re.finditer(r'import\s+[\'"]([^\'"]+)[\'"]', code)]

def extract_exports(code: str) -> List[str]:
    """Extract export statements from Dart file."""
    return [m.group(1) for m in re.finditer(r'export\s+[\'"]([^\'"]+)[\'"]', code)]

def find_balanced_brace(code: str, start_index: int) -> int:
    """Find the position of the closing brace that matches the opening brace."""
    brace_count = 1  # Start with 1 as we've already found the opening brace
    i = start_index + 1  # Start after the opening brace
    while i < len(code):
        if code[i] == '{':
            brace_count += 1
        elif code[i] == '}':
            brace_count -= 1
            if brace_count == 0:
                return i + 1
        i += 1
    return -1

def clean_comment(text: str) -> str:
    """Clean and normalize Dart comments."""
    if not text:
        return ""
    lines = []
    for line in text.strip().splitlines():
        line = re.sub(r'^(///|/\*+|\*+/|\*\s*)', '', line).strip()
        if line:
            lines.append(line)
    return " ".join(lines)

