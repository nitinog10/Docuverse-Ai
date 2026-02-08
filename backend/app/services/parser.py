"""
Tree-sitter Parser Service - Layer 1: Ingestion & Parsing Engine

Parses code into Abstract Syntax Trees (AST) to understand:
- Function trees
- Class hierarchies  
- Variable scopes
- Code structure and relationships
"""

import os
from typing import List, Optional, Dict, Any
import uuid

from app.models.schemas import ASTNode, NodeType

# Language extension mappings
LANGUAGE_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cpp": "cpp",
    ".c": "c",
    ".rb": "ruby",
    ".php": "php",
}

# Text/doc file extensions that we can still walk through
TEXT_EXTENSIONS = {
    ".md", ".txt", ".rst", ".json", ".yaml", ".yml",
    ".toml", ".cfg", ".ini", ".csv", ".xml", ".html",
    ".css", ".scss", ".sql", ".sh", ".bash", ".zsh",
    ".dockerfile", ".env", ".gitignore", ".editorconfig",
}


class ParserService:
    """
    Tree-sitter based code parser.
    
    Parses source code into structured AST nodes that can be used for:
    - Documentation generation
    - Dependency analysis
    - Code understanding
    """
    
    def __init__(self):
        self._parsers: Dict[str, Any] = {}
        self._initialized = False
    
    def _initialize_parsers(self):
        """Lazy initialization of Tree-sitter parsers"""
        if self._initialized:
            return
        
        try:
            import tree_sitter_python
            import tree_sitter_javascript
            import tree_sitter_typescript
            from tree_sitter import Language, Parser
            
            # Initialize parsers for each language
            self._parsers["python"] = {
                "parser": Parser(Language(tree_sitter_python.language())),
                "queries": self._get_python_queries(),
            }
            
            self._parsers["javascript"] = {
                "parser": Parser(Language(tree_sitter_javascript.language())),
                "queries": self._get_javascript_queries(),
            }
            
            self._parsers["typescript"] = {
                "parser": Parser(Language(tree_sitter_typescript.language_typescript())),
                "queries": self._get_typescript_queries(),
            }
            
            # Java parser
            try:
                import tree_sitter_java
                self._parsers["java"] = {
                    "parser": Parser(Language(tree_sitter_java.language())),
                    "queries": self._get_java_queries(),
                }
            except ImportError:
                pass  # Java parsing will use fallback
            
            self._initialized = True
            
        except ImportError as e:
            print(f"Warning: Tree-sitter not fully installed: {e}")
            self._initialized = True  # Mark as initialized to avoid retry
    
    def _get_python_queries(self) -> Dict[str, str]:
        """Tree-sitter queries for Python"""
        return {
            "functions": "(function_definition name: (identifier) @name) @function",
            "classes": "(class_definition name: (identifier) @name) @class",
            "imports": "(import_statement) @import",
            "from_imports": "(import_from_statement) @import",
        }
    
    def _get_javascript_queries(self) -> Dict[str, str]:
        """Tree-sitter queries for JavaScript"""
        return {
            "functions": "(function_declaration name: (identifier) @name) @function",
            "arrow_functions": "(arrow_function) @function",
            "classes": "(class_declaration name: (identifier) @name) @class",
            "imports": "(import_statement) @import",
        }
    
    def _get_typescript_queries(self) -> Dict[str, str]:
        """Tree-sitter queries for TypeScript"""
        return {
            "functions": "(function_declaration name: (identifier) @name) @function",
            "arrow_functions": "(arrow_function) @function",
            "classes": "(class_declaration name: (identifier) @name) @class",
            "interfaces": "(interface_declaration name: (type_identifier) @name) @interface",
            "imports": "(import_statement) @import",
            "types": "(type_alias_declaration name: (type_identifier) @name) @type",
        }
    
    def _get_java_queries(self) -> Dict[str, str]:
        """Tree-sitter queries for Java"""
        return {
            "classes": "(class_declaration name: (identifier) @name) @class",
            "methods": "(method_declaration name: (identifier) @name) @method",
            "constructors": "(constructor_declaration name: (identifier) @name) @constructor",
            "imports": "(import_declaration) @import",
        }
    
    def detect_language(self, file_path: str) -> Optional[str]:
        """Detect language from file extension"""
        _, ext = os.path.splitext(file_path.lower())
        lang = LANGUAGE_EXTENSIONS.get(ext)
        if lang:
            return lang
        # Return 'text' for known text file extensions or extensionless files
        if ext in TEXT_EXTENSIONS or ext == "":
            return "text"
        # Also handle files with no extension that might be text
        basename = os.path.basename(file_path).lower()
        if basename in ("dockerfile", "makefile", "gemfile", "rakefile", "procfile", ".env", ".gitignore"):
            return "text"
        return None
    
    def is_text_language(self, language: str) -> bool:
        """Check if the language is a text-based file (not code)"""
        return language == "text"
    
    def parse_text_file(self, content: str, file_path: str) -> List[ASTNode]:
        """Parse a text file into sections (by headings for .md, or by chunks)."""
        import re
        _, ext = os.path.splitext(file_path.lower())
        lines = content.split("\n")
        nodes = []
        
        if ext in (".md", ".rst"):
            # Split markdown by headings
            section_starts = []
            for i, line in enumerate(lines):
                if re.match(r'^#{1,6}\s+', line):
                    section_starts.append(i)
            
            if not section_starts:
                # No headings — treat entire file as one section
                nodes.append(ASTNode(
                    id=f"{file_path}:1:{uuid.uuid4().hex[:6]}",
                    type=NodeType.SECTION,
                    name=os.path.basename(file_path),
                    start_line=1,
                    end_line=len(lines),
                    start_col=0,
                    end_col=0,
                ))
            else:
                for idx, start in enumerate(section_starts):
                    end = section_starts[idx + 1] - 1 if idx + 1 < len(section_starts) else len(lines)
                    heading = lines[start].lstrip('#').strip()
                    nodes.append(ASTNode(
                        id=f"{file_path}:{start + 1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.SECTION,
                        name=heading or f"Section {idx + 1}",
                        start_line=start + 1,
                        end_line=end,
                        start_col=0,
                        end_col=0,
                    ))
        else:
            # For other text files, chunk into ~30-line sections
            chunk_size = 30
            for i in range(0, len(lines), chunk_size):
                end = min(i + chunk_size, len(lines))
                first_nonempty = next(
                    (lines[j].strip() for j in range(i, end) if lines[j].strip()),
                    f"Lines {i + 1}-{end}"
                )
                name = first_nonempty[:60]
                nodes.append(ASTNode(
                    id=f"{file_path}:{i + 1}:{uuid.uuid4().hex[:6]}",
                    type=NodeType.SECTION,
                    name=name,
                    start_line=i + 1,
                    end_line=end,
                    start_col=0,
                    end_col=0,
                ))
        
        return nodes
    
    def parse_file(
        self, 
        content: str, 
        language: str, 
        file_path: str
    ) -> List[ASTNode]:
        """
        Parse file content into AST nodes.
        
        Args:
            content: Source code content
            language: Programming language
            file_path: Path to file (for metadata)
            
        Returns:
            List of ASTNode objects representing code structure
        """
        self._initialize_parsers()
        
        # Fallback to regex-based parsing if Tree-sitter not available
        if language not in self._parsers:
            return self._parse_fallback(content, language, file_path)
        
        try:
            parser_config = self._parsers[language]
            parser = parser_config["parser"]
            
            # Parse the source code
            tree = parser.parse(bytes(content, "utf-8"))
            root_node = tree.root_node
            
            # Extract AST nodes
            nodes = self._extract_nodes(root_node, content, language, file_path)
            
            return nodes
            
        except Exception as e:
            print(f"Error parsing {file_path}: {e}")
            return self._parse_fallback(content, language, file_path)
    
    def _extract_nodes(
        self, 
        root_node: Any, 
        content: str, 
        language: str,
        file_path: str
    ) -> List[ASTNode]:
        """Extract structured nodes from Tree-sitter parse tree"""
        all_nodes = []
        lines = content.split("\n")
        
        def walk_tree(node: Any, depth: int = 0):
            """Walk tree, returning tracked nodes.
            
            Returns a single ASTNode for tracked types, or a list of
            collected descendant ASTNodes for non-tracked container nodes
            (like 'block', 'class_body') so they get properly nested
            as children of their parent tracked node.
            """
            node_type = self._map_node_type(node.type, language)
            
            if node_type:
                # Extract node information
                name = self._extract_node_name(node, language)
                docstring = self._extract_docstring(node, lines, language)
                parameters = self._extract_parameters(node, language)
                return_type = self._extract_return_type(node, language)
                
                ast_node = ASTNode(
                    id=f"{file_path}:{node.start_point[0]}:{uuid.uuid4().hex[:6]}",
                    type=node_type,
                    name=name or f"anonymous_{node.type}",
                    start_line=node.start_point[0] + 1,  # 1-indexed
                    end_line=node.end_point[0] + 1,
                    start_col=node.start_point[1],
                    end_col=node.end_point[1],
                    docstring=docstring,
                    parameters=parameters,
                    return_type=return_type,
                    children=[],
                    metadata={
                        "node_type": node.type,
                        "language": language,
                    }
                )
                
                # Collect children through any intermediate non-tracked nodes
                for child in node.children:
                    child_result = walk_tree(child, depth + 1)
                    if child_result is not None:
                        if isinstance(child_result, list):
                            ast_node.children.extend(child_result)
                        else:
                            ast_node.children.append(child_result)
                
                all_nodes.append(ast_node)
                return ast_node
            
            # Non-tracked node: collect any tracked descendants and bubble up
            collected = []
            for child in node.children:
                child_result = walk_tree(child, depth)
                if child_result is not None:
                    if isinstance(child_result, list):
                        collected.extend(child_result)
                    else:
                        collected.append(child_result)
            
            return collected if collected else None
        
        walk_tree(root_node)
        
        # Post-process: mark functions nested inside classes as METHOD
        # and recursively remove all descendants from the top-level list
        child_ids = set()
        
        def collect_descendant_ids(node, inside_class=False):
            for child in node.children:
                child_ids.add(child.id)
                # Direct children of a CLASS that are FUNCTION → mark as METHOD
                if inside_class and child.type == NodeType.FUNCTION:
                    child.type = NodeType.METHOD
                collect_descendant_ids(child, inside_class=(child.type == NodeType.CLASS))
        
        for node in all_nodes:
            collect_descendant_ids(node, inside_class=(node.type == NodeType.CLASS))
        
        # Return only top-level nodes (children are accessed via .children)
        return [n for n in all_nodes if n.id not in child_ids]
    
    def _map_node_type(self, ts_type: str, language: str) -> Optional[NodeType]:
        """Map Tree-sitter node type to our NodeType enum"""
        type_mappings = {
            # Python
            "function_definition": NodeType.FUNCTION,
            "class_definition": NodeType.CLASS,
            "import_statement": NodeType.IMPORT,
            "import_from_statement": NodeType.IMPORT,
            
            # JavaScript/TypeScript
            "function_declaration": NodeType.FUNCTION,
            "arrow_function": NodeType.FUNCTION,
            "method_definition": NodeType.METHOD,
            "class_declaration": NodeType.CLASS,
            
            # Java
            "method_declaration": NodeType.METHOD,
            "constructor_declaration": NodeType.METHOD,
            "import_declaration": NodeType.IMPORT,
            "field_declaration": NodeType.VARIABLE,
            
            # Common
            "variable_declaration": NodeType.VARIABLE,
            "lexical_declaration": NodeType.VARIABLE,
        }
        
        return type_mappings.get(ts_type)
    
    def _extract_node_name(self, node: Any, language: str) -> Optional[str]:
        """Extract name from AST node"""
        for child in node.children:
            if child.type == "identifier" or child.type == "type_identifier":
                return child.text.decode("utf-8")
            if child.type == "name":
                return child.text.decode("utf-8")
        
        # For arrow functions, look at the parent variable_declarator for the name
        # e.g., const MyComponent = () => { ... }
        if node.type == "arrow_function" and node.parent:
            parent = node.parent
            if parent.type == "variable_declarator":
                for child in parent.children:
                    if child.type == "identifier":
                        return child.text.decode("utf-8")
        
        return None
    
    def _extract_docstring(
        self, 
        node: Any, 
        lines: List[str], 
        language: str
    ) -> Optional[str]:
        """Extract docstring/comment for a node"""
        # Look for string literal immediately after function/class definition
        for child in node.children:
            if child.type in ["string", "expression_statement"]:
                text = child.text.decode("utf-8")
                # Check if it looks like a docstring
                if text.startswith('"""') or text.startswith("'''"):
                    return text.strip('"\' \n')
                if text.startswith("/*") or text.startswith("//"):
                    return text.strip("/* \n")
        return None
    
    def _extract_parameters(self, node: Any, language: str) -> Optional[List[str]]:
        """Extract function parameters"""
        params = []
        for child in node.children:
            if child.type in ["parameters", "formal_parameters"]:
                for param in child.children:
                    if param.type in ["identifier", "typed_parameter", "required_parameter"]:
                        param_name = self._extract_node_name(param, language)
                        if param_name:
                            params.append(param_name)
                        else:
                            params.append(param.text.decode("utf-8"))
        return params if params else None
    
    def _extract_return_type(self, node: Any, language: str) -> Optional[str]:
        """Extract return type annotation"""
        for child in node.children:
            if child.type in ["type_annotation", "return_type"]:
                return child.text.decode("utf-8")
        return None
    
    def _parse_fallback(
        self, 
        content: str, 
        language: str, 
        file_path: str
    ) -> List[ASTNode]:
        """Fallback regex-based parsing when Tree-sitter isn't available"""
        import re
        
        nodes = []
        lines = content.split("\n")
        
        if language == "python":
            # Match Python functions and classes
            func_pattern = r"^(\s*)def\s+(\w+)\s*\((.*?)\).*?:"
            class_pattern = r"^(\s*)class\s+(\w+).*?:"
            import_pattern = r"^(?:from\s+\S+\s+)?import\s+.+"
            
            for i, line in enumerate(lines):
                # Functions
                match = re.match(func_pattern, line)
                if match:
                    indent, name, params = match.groups()
                    end_line = self._find_block_end(lines, i, len(indent))
                    nodes.append(ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.FUNCTION,
                        name=name,
                        start_line=i + 1,
                        end_line=end_line,
                        start_col=len(indent),
                        end_col=len(line),
                        parameters=[p.strip() for p in params.split(",") if p.strip()],
                    ))
                
                # Classes
                match = re.match(class_pattern, line)
                if match:
                    indent, name = match.groups()
                    end_line = self._find_block_end(lines, i, len(indent))
                    nodes.append(ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.CLASS,
                        name=name,
                        start_line=i + 1,
                        end_line=end_line,
                        start_col=len(indent),
                        end_col=len(line),
                    ))
                
                # Imports
                if re.match(import_pattern, line.strip()):
                    nodes.append(ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.IMPORT,
                        name=line.strip(),
                        start_line=i + 1,
                        end_line=i + 1,
                        start_col=0,
                        end_col=len(line),
                    ))
        
        elif language in ["javascript", "typescript"]:
            # Match JS/TS functions and classes
            func_pattern = r"(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[\w]+)\s*=>)"
            class_pattern = r"class\s+(\w+)"
            import_pattern = r"^import\s+.+"
            
            for i, line in enumerate(lines):
                # Functions
                match = re.search(func_pattern, line)
                if match:
                    name = match.group(1) or match.group(2)
                    if name:
                        nodes.append(ASTNode(
                            id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                            type=NodeType.FUNCTION,
                            name=name,
                            start_line=i + 1,
                            end_line=i + 1,
                            start_col=0,
                            end_col=len(line),
                        ))
                
                # Classes
                match = re.search(class_pattern, line)
                if match:
                    nodes.append(ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.CLASS,
                        name=match.group(1),
                        start_line=i + 1,
                        end_line=i + 1,
                        start_col=0,
                        end_col=len(line),
                    ))
                
                # Imports
                if re.match(import_pattern, line.strip()):
                    nodes.append(ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.IMPORT,
                        name=line.strip(),
                        start_line=i + 1,
                        end_line=i + 1,
                        start_col=0,
                        end_col=len(line),
                    ))
        
        elif language == "java":
            # Match Java classes, methods, constructors, and imports
            class_pattern = r"^(\s*)(?:public|private|protected)?\s*(?:abstract\s+|final\s+|static\s+)*class\s+(\w+)"
            method_pattern = r"^(\s+)(?:public|private|protected)\s+(?:static\s+|final\s+|abstract\s+|synchronized\s+)*(?:\w+(?:<[\w<>, ]+>)?)\s+(\w+)\s*\("
            constructor_pattern = r"^(\s+)(?:public|private|protected)\s+(\w+)\s*\("
            import_pattern = r"^import\s+.+"
            
            current_class = None
            class_indent = 0
            
            for i, line in enumerate(lines):
                stripped = line.strip()
                
                # Classes
                match = re.match(class_pattern, line)
                if match:
                    indent, name = match.groups()
                    class_indent = len(indent) if indent else 0
                    current_class = ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.CLASS,
                        name=name,
                        start_line=i + 1,
                        end_line=i + 1,
                        start_col=class_indent,
                        end_col=len(line),
                        children=[],
                    )
                    nodes.append(current_class)
                    continue
                
                # Methods (must be indented inside a class)
                match = re.match(method_pattern, line)
                if match and current_class:
                    indent, name = match.groups()
                    # Extract params from the line
                    paren_match = re.search(r'\(([^)]*)\)', line)
                    params = []
                    if paren_match:
                        raw = paren_match.group(1).strip()
                        if raw:
                            for p in raw.split(','):
                                parts = p.strip().split()
                                if len(parts) >= 2:
                                    params.append(parts[-1])  # param name
                    
                    method_node = ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.METHOD,
                        name=name,
                        start_line=i + 1,
                        end_line=i + 1,
                        start_col=len(indent),
                        end_col=len(line),
                        parameters=params if params else None,
                    )
                    current_class.children.append(method_node)
                    continue
                
                # Constructors
                match = re.match(constructor_pattern, line)
                if match and current_class and match.group(2) == current_class.name:
                    indent, name = match.groups()
                    method_node = ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.METHOD,
                        name=name,
                        start_line=i + 1,
                        end_line=i + 1,
                        start_col=len(indent),
                        end_col=len(line),
                    )
                    current_class.children.append(method_node)
                    continue
                
                # Imports
                if re.match(import_pattern, stripped):
                    nodes.append(ASTNode(
                        id=f"{file_path}:{i+1}:{uuid.uuid4().hex[:6]}",
                        type=NodeType.IMPORT,
                        name=stripped,
                        start_line=i + 1,
                        end_line=i + 1,
                        start_col=0,
                        end_col=len(line),
                    ))
        
        return nodes
    
    def _find_block_end(
        self, 
        lines: List[str], 
        start_line: int, 
        base_indent: int
    ) -> int:
        """Find the end of an indented block (for Python)"""
        for i in range(start_line + 1, len(lines)):
            line = lines[i]
            if line.strip() == "":
                continue
            
            current_indent = len(line) - len(line.lstrip())
            if current_indent <= base_indent:
                return i
        
        return len(lines)
    
    def get_code_chunk(
        self, 
        content: str, 
        start_line: int, 
        end_line: int
    ) -> str:
        """Extract code chunk from content by line numbers"""
        lines = content.split("\n")
        chunk_lines = lines[start_line - 1:end_line]
        return "\n".join(chunk_lines)

