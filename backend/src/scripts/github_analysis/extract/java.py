import javalang
import os
from typing import List, Dict, Optional

def extract(filepath: str) -> List[Dict]:
    """Extract code from Java files with full context and hierarchy."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        code = f.read()

    results = []
    try:
        tree = javalang.parse.parse(code)
        lines = code.splitlines()
        
        # Get package info
        package_name = tree.package.name if tree.package else ""
        
        # Track current class context
        current_class = {
            'name': None,
            'doc': None,
            'modifiers': []
        }
        
        # Process all nodes
        for path, node in tree:
            if isinstance(node, javalang.tree.ClassDeclaration):
                current_class = {
                    'name': node.name,
                    'doc': node.documentation or "",
                    'modifiers': [str(m) for m in node.modifiers]
                }
                
            elif isinstance(node, javalang.tree.MethodDeclaration):
                if not node.name or not node.body:
                    continue
                    
                start = node.position.line
                end = start + len(node.body) if node.body else start
                
                # Get method code
                body = "\n".join(lines[start-1:end])
                
                # Build rich context
                context = []
                if package_name:
                    context.append(f"Package: {package_name}")
                if current_class['name']:
                    context.append(f"Class: {current_class['name']}")
                    if current_class['doc']:
                        context.append(f"Class documentation: {current_class['doc']}")
                    if current_class['modifiers']:
                        context.append(f"Class modifiers: {', '.join(current_class['modifiers'])}")
                if node.documentation:
                    context.append(f"Method documentation: {node.documentation}")
                
                # Get method parameters
                params = []
                for param in node.parameters:
                    params.append({
                        'name': param.name,
                        'type': str(param.type)
                    })
                
                results.append({
                    "name": node.name,
                    "file": os.path.basename(filepath),
                    "filepath": filepath,
                    "language": "java",
                    "type": "method" if current_class['name'] else "function",
                    "class": current_class['name'],
                    "start_line": start,
                    "end_line": end,
                    "line_count": end - start + 1,
                    "body": body.strip(),
                    "context": "\n".join(context),
                    "parameters": params,
                    "return_type": str(node.return_type) if node.return_type else "void",
                    "modifiers": [str(m) for m in node.modifiers],
                    "throws": [str(t) for t in node.throws] if node.throws else []
                })
                
    except Exception as e:
        import logging
        logging.error(f"Error processing {filepath}: {str(e)}")
        
    return results