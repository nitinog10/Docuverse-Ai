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
            # Note: Language() now requires name parameter in newer versions
            python_lang = Language(tree_sitter_python.language(), "python")
            python_parser = Parser()
            python_parser.set_language(python_lang)
            self._parsers["python"] = {
                "parser": python_parser,
                "queries": self._get_python_queries(),
            }
            
            js_lang = Language(tree_sitter_javascript.language(), "javascript")
            js_parser = Parser()
            js_parser.set_language(js_lang)
            self._parsers["javascript"] = {
                "parser": js_parser,
                "queries": self._get_javascript_queries(),
            }
            
            ts_lang = Language(tree_sitter_typescript.language_typescript(), "typescript")
            ts_parser = Parser()
            ts_parser.set_language(ts_lang)
            self._parsers["typescript"] = {
                "parser": ts_parser,
                "queries": self._get_typescript_queries(),
            }
            
            self._initialized = True
            
        except ImportError as e:
            print(f"Warning: Tree-sitter not fully installed: {e}")
            self._initialized = True  # Mark as initialized to avoid retry
        except Exception as e:
            print(f"Warning: Error initializing tree-sitter parsers: {e}")
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
        nodes = []
        lines = content.split("\n")
        
        def walk_tree(node: Any, depth: int = 0):
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
                
                # Process children
                for child in node.children:
                    child_nodes = walk_tree(child, depth + 1)
                    if child_nodes:
                        ast_node.children.extend(
                            child_nodes if isinstance(child_nodes, list) else [child_nodes]
                        )
                
                nodes.append(ast_node)
                return ast_node
            
            # If not a tracked node type, still walk children
            for child in node.children:
                walk_tree(child, depth)
            
            return None
        
        walk_tree(root_node)
        return nodes
    
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
            "import_statement": NodeType.IMPORT,
            
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

