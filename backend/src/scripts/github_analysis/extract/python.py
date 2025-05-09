import ast
import os
from typing import List, Dict, Optional

def extract(filepath: str) -> List[Dict]:
    """Extract code from Python files with full context and hierarchy."""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        code = f.read()
        lines = code.splitlines()

    results = []
    try:
        tree = ast.parse(code)
        module_doc = ast.get_docstring(tree) or ""
        
        class SmartVisitor(ast.NodeVisitor):
            def __init__(self):
                self.current_class = None
                self.current_class_doc = None
                
            def get_preceding_comments(self, node) -> str:
                """Get comments above the node."""
                comments = []
                if hasattr(node, 'lineno'):
                    i = node.lineno - 2
                    while i >= 0 and i < len(lines):
                        line = lines[i].strip()
                        if line.startswith('#'):
                            comments.insert(0, line[1:].strip())
                        elif not line:
                            i -= 1
                            continue
                        else:
                            break
                        i -= 1
                return ' '.join(comments)
            
            def visit_ClassDef(self, node):
                """Visit class definitions to maintain hierarchy."""
                prev_class = self.current_class
                prev_doc = self.current_class_doc
                
                self.current_class = node.name
                self.current_class_doc = ast.get_docstring(node) or ""
                class_comments = self.get_preceding_comments(node)
                
                # Process all methods in the class
                for item in node.body:
                    if isinstance(item, ast.FunctionDef):
                        self.visit_FunctionDef(item)
                
                self.current_class = prev_class
                self.current_class_doc = prev_doc
            
            def visit_FunctionDef(self, node):
                """Visit function definitions with full context."""
                start_line = node.lineno
                end_line = max(getattr(node, 'end_lineno', node.lineno), start_line)
                
                # Get function code
                func_code = "\n".join(lines[start_line-1:end_line])
                
                # Get docstring and comments
                docstring = ast.get_docstring(node) or ""
                comments = self.get_preceding_comments(node)
                
                # Build rich context
                context = []
                if module_doc:
                    context.append(f"Module docstring: {module_doc}")
                if self.current_class:
                    context.append(f"Class: {self.current_class}")
                    if self.current_class_doc:
                        context.append(f"Class docstring: {self.current_class_doc}")
                if docstring:
                    context.append(f"Function docstring: {docstring}")
                if comments:
                    context.append(f"Function comments: {comments}")
                
                # Get function arguments
                args = []
                for arg in node.args.args:
                    arg_name = arg.arg
                    arg_type = ""
                    if hasattr(arg, 'annotation') and isinstance(arg.annotation, ast.Name):
                        arg_type = arg.annotation.id
                    args.append({"name": arg_name, "type": arg_type})
                
                # Get return type if specified
                return_type = ""
                if hasattr(node, 'returns') and isinstance(node.returns, ast.Name):
                    return_type = node.returns.id
                
                results.append({
                    "name": node.name,
                    "file": os.path.basename(filepath),
                    "filepath": filepath,
                    "language": "python",
                    "type": "method" if self.current_class else "function",
                    "class": self.current_class,
                    "start_line": start_line,
                    "end_line": end_line,
                    "line_count": end_line - start_line + 1,
                    "body": func_code.strip(),
                    "context": "\n".join(context),
                    "args": args,
                    "return_type": return_type,
                    "is_async": isinstance(node, ast.AsyncFunctionDef),
                    "decorators": [d.id for d in node.decorator_list if isinstance(d, ast.Name)]
                })
        
        SmartVisitor().visit(tree)
        
    except Exception as e:
        import logging
        logging.error(f"Error processing {filepath}: {str(e)}")
        
    return results