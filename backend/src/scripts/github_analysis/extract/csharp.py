import re
import os
from typing import List, Dict, Optional

def extract(filepath: str) -> List[Dict]:
    """Extract code from C# files with full context and hierarchy."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        code = f.read()
        lines = code.splitlines()

    results = []
    
    # Regular expressions for C# parsing
    namespace_pattern = re.compile(r'namespace\s+([A-Za-z0-9_.]+)')
    class_pattern = re.compile(r'(?:public|private|protected|internal)?\s*(?:static|abstract|sealed)?\s+class\s+([A-Za-z0-9_]+)')
    method_pattern = re.compile(r'(?:public|private|protected|internal)?\s*(?:static|abstract|virtual|override|async)?\s+(?:[A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+)\s*\([^)]*\)')
    
    current_namespace = None
    current_class = None
    current_class_doc = None
    
    try:
        # Process the file line by line
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Find namespace
            namespace_match = namespace_pattern.search(line)
            if namespace_match:
                current_namespace = namespace_match.group(1)
                
            # Find class and its documentation
            class_match = class_pattern.search(line)
            if class_match:
                current_class = class_match.group(1)
                
                # Extract class documentation (XML comments)
                class_doc = extract_xml_comments(lines, i)
                current_class_doc = class_doc if class_doc else ""
                
            # Find methods
            method_match = method_pattern.search(line)
            if method_match:
                method_name = method_match.group(1)
                
                # Skip if this is a method-like pattern in a comment or string
                if is_comment_or_string(line):
                    i += 1
                    continue
                
                # Extract method documentation
                method_doc = extract_xml_comments(lines, i)
                
                # Find method boundaries
                start_line = i + 1
                start_brace_line = find_opening_brace(lines, i)
                if start_brace_line == -1:
                    i += 1
                    continue
                    
                end_line = find_matching_closing_brace(lines, start_brace_line)
                if end_line == -1:
                    end_line = start_brace_line + 10  # Default limit if we can't find the end
                    
                # Skip to after the method body
                method_body = "\n".join(lines[i:end_line+1])
                
                # Extract parameters
                params = extract_parameters(line)
                
                # Extract return type
                return_type = extract_return_type(line)
                
                # Build context
                context = []
                if current_namespace:
                    context.append(f"Namespace: {current_namespace}")
                if current_class:
                    context.append(f"Class: {current_class}")
                    if current_class_doc:
                        context.append(f"Class documentation: {current_class_doc}")
                if method_doc:
                    context.append(f"Method documentation: {method_doc}")
                
                results.append({
                    "name": method_name,
                    "file": os.path.basename(filepath),
                    "filepath": filepath,
                    "language": "csharp",
                    "type": "method",
                    "class": current_class,
                    "namespace": current_namespace,
                    "start_line": i + 1,
                    "end_line": end_line,
                    "line_count": end_line - i,
                    "body": method_body.strip(),
                    "context": "\n".join(context),
                    "args": params,
                    "return_type": return_type,
                    "is_async": "async" in line
                })
                
                i = end_line  # Skip to the end of the method
            
            i += 1
            
    except Exception as e:
        import logging
        logging.error(f"Error processing {filepath}: {str(e)}")
        
    return results


def extract_xml_comments(lines, line_idx):
    """Extract XML documentation comments from before the given line index."""
    comments = []
    i = line_idx - 1
    while i >= 0 and i < len(lines):
        line = lines[i].strip()
        if line.startswith("///"):
            # Clean the XML comment
            clean_line = line.replace("///", "").strip()
            comments.insert(0, clean_line)
            i -= 1
        elif line.startswith("//") or not line:
            # Skip regular comments and empty lines
            i -= 1
        else:
            break
    
    return " ".join(comments)


def is_comment_or_string(line):
    """Check if the line is inside a comment or string."""
    line = line.strip()
    return line.startswith("//") or line.startswith("/*") or line.startswith("*")


def find_opening_brace(lines, start_idx):
    """Find the line index of the opening brace for a method."""
    i = start_idx
    while i < len(lines) and i < start_idx + 5:  # Look within a few lines
        if "{" in lines[i]:
            return i
        i += 1
    return -1


def find_matching_closing_brace(lines, open_brace_idx):
    """Find the matching closing brace for an opening brace."""
    brace_count = 0
    for i in range(open_brace_idx, len(lines)):
        line = lines[i]
        brace_count += line.count("{")
        brace_count -= line.count("}")
        if brace_count == 0:
            return i
    return -1


def extract_parameters(method_signature):
    """Extract parameters from a method signature."""
    params = []
    
    # Find the content between the parentheses
    param_match = re.search(r'\(([^)]*)\)', method_signature)
    if not param_match:
        return params
        
    param_str = param_match.group(1)
    if not param_str.strip():
        return params
        
    # Split into individual parameters
    param_parts = param_str.split(',')
    
    for part in param_parts:
        part = part.strip()
        if not part:
            continue
            
        # Handle parameters with types: "int x", "string name", etc.
        parts = part.split()
        if len(parts) >= 2:
            param_type = parts[0]
            param_name = parts[-1].replace(",", "")
            
            # Handle ref/out parameters
            if param_name.startswith("ref ") or param_name.startswith("out "):
                param_name = param_name.split()[1]
                
            params.append({
                "name": param_name,
                "type": param_type
            })
    
    return params


def extract_return_type(method_signature):
    """Extract the return type from a method signature."""
    # Split the signature into words
    parts = method_signature.split()
    
    # Look for the method name with parameters
    for i, part in enumerate(parts):
        if "(" in part:
            # The part before this is likely the return type
            if i > 0:
                return parts[i-1]
            break
    
    return "" 