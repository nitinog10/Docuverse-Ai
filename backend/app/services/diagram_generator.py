"""
Diagram Generator Service - Mermaid.js Integration

Generates visual diagrams from code structure:
- Flowcharts
- Class diagrams
- Sequence diagrams
- ER diagrams
"""

import os
from typing import List, Optional
import re

from app.models.schemas import ASTNode, NodeType, DiagramType


class DiagramGeneratorService:
    """
    Generates Mermaid.js diagram code from code analysis.
    
    Converts AST structures into visual representations.
    """
    
    def __init__(self):
        pass
    
    def generate_file_diagram(
        self,
        file_path: str,
        content: str,
        ast_nodes: List[ASTNode],
        diagram_type: DiagramType,
    ) -> str:
        """
        Generate a Mermaid diagram for a single file.
        
        Args:
            file_path: Path to the source file
            content: File content
            ast_nodes: Parsed AST nodes
            diagram_type: Type of diagram to generate
            
        Returns:
            Mermaid.js diagram code
        """
        if diagram_type == DiagramType.FLOWCHART:
            return self._generate_flowchart(file_path, ast_nodes)
        elif diagram_type == DiagramType.CLASS_DIAGRAM:
            return self._generate_class_diagram(file_path, ast_nodes, content)
        elif diagram_type == DiagramType.SEQUENCE:
            return self._generate_sequence_diagram(file_path, ast_nodes)
        else:
            return self._generate_flowchart(file_path, ast_nodes)
    
    async def generate_repository_diagram(
        self,
        repo_path: str,
        diagram_type: DiagramType,
    ) -> str:
        """
        Generate a diagram for the entire repository.
        
        Creates a high-level view of the codebase structure.
        """
        if diagram_type == DiagramType.FLOWCHART:
            return self._generate_repo_structure_diagram(repo_path)
        elif diagram_type == DiagramType.CLASS_DIAGRAM:
            return await self._generate_repo_class_diagram(repo_path)
        else:
            return self._generate_repo_structure_diagram(repo_path)
    
    def _generate_flowchart(
        self,
        file_path: str,
        ast_nodes: List[ASTNode],
    ) -> str:
        """Generate a flowchart showing code flow"""
        file_name = os.path.basename(file_path)
        sanitized_name = self._sanitize_id(file_name)
        
        lines = ["flowchart TD"]
        
        # Add file as root node
        lines.append(f"    {sanitized_name}[{file_name}]")
        
        # Group nodes by type
        classes = [n for n in ast_nodes if n.type == NodeType.CLASS]
        functions = [n for n in ast_nodes if n.type == NodeType.FUNCTION]
        
        # Add classes
        for cls in classes:
            cls_id = self._sanitize_id(cls.name)
            lines.append(f"    {sanitized_name} --> {cls_id}[({cls.name})]")
            
            # Add methods if available
            for child in cls.children:
                if child.type == NodeType.METHOD:
                    method_id = self._sanitize_id(f"{cls.name}_{child.name}")
                    lines.append(f"    {cls_id} --> {method_id}[{child.name}]")
        
        # Add standalone functions
        for func in functions:
            func_id = self._sanitize_id(func.name)
            lines.append(f"    {sanitized_name} --> {func_id}[{func.name}]")
            
            # Add parameters as notes
            if func.parameters:
                params = ", ".join(func.parameters[:3])
                if len(func.parameters) > 3:
                    params += "..."
                lines.append(f"    {func_id} -.- params_{func_id}[/{params}/]")
        
        # Add styling
        lines.append("")
        lines.append("    classDef classNode fill:#e1f5fe,stroke:#01579b")
        lines.append("    classDef funcNode fill:#f3e5f5,stroke:#4a148c")
        
        for cls in classes:
            lines.append(f"    class {self._sanitize_id(cls.name)} classNode")
        
        for func in functions:
            lines.append(f"    class {self._sanitize_id(func.name)} funcNode")
        
        return "\n".join(lines)
    
    def _generate_class_diagram(
        self,
        file_path: str,
        ast_nodes: List[ASTNode],
        content: str,
    ) -> str:
        """Generate a class diagram showing classes and relationships"""
        lines = ["classDiagram"]
        
        classes = [n for n in ast_nodes if n.type == NodeType.CLASS]
        
        for cls in classes:
            lines.append(f"    class {cls.name} {{")
            
            # Extract class content
            class_lines = content.split("\n")[cls.start_line - 1:cls.end_line]
            
            # Add methods
            for child in cls.children:
                if child.type in [NodeType.METHOD, NodeType.FUNCTION]:
                    params = ", ".join(child.parameters) if child.parameters else ""
                    lines.append(f"        +{child.name}({params})")
            
            # Try to extract attributes from __init__ or constructor
            attributes = self._extract_class_attributes(class_lines, file_path)
            for attr in attributes:
                lines.append(f"        -{attr}")
            
            lines.append("    }")
        
        # Add relationships between classes
        for cls in classes:
            # Look for inheritance in class definition
            parent = self._extract_parent_class(content, cls)
            if parent and parent in [c.name for c in classes]:
                lines.append(f"    {parent} <|-- {cls.name}")
        
        return "\n".join(lines)
    
    def _generate_sequence_diagram(
        self,
        file_path: str,
        ast_nodes: List[ASTNode],
    ) -> str:
        """Generate a sequence diagram showing function call flow"""
        lines = ["sequenceDiagram"]
        
        # Add participants
        functions = [n for n in ast_nodes if n.type in [NodeType.FUNCTION, NodeType.METHOD]]
        
        if not functions:
            lines.append("    Note right of User: No functions found")
            return "\n".join(lines)
        
        lines.append("    participant User")
        for i, func in enumerate(functions[:5]):  # Limit to 5 functions
            lines.append(f"    participant {self._sanitize_id(func.name)} as {func.name}")
        
        # Create a simple sequence
        prev_func = "User"
        for func in functions[:5]:
            func_id = self._sanitize_id(func.name)
            params = ", ".join(func.parameters[:2]) if func.parameters else ""
            lines.append(f"    {prev_func}->>+{func_id}: call({params})")
            lines.append(f"    {func_id}-->>-{prev_func}: result")
        
        return "\n".join(lines)
    
    def _generate_repo_structure_diagram(self, repo_path: str) -> str:
        """Generate a diagram showing repository structure"""
        lines = ["flowchart TD"]
        
        # Get top-level structure
        lines.append("    root[Repository]")
        
        try:
            entries = os.listdir(repo_path)
            dirs = sorted([e for e in entries if os.path.isdir(os.path.join(repo_path, e)) and not e.startswith(".")])
            files = sorted([e for e in entries if os.path.isfile(os.path.join(repo_path, e)) and not e.startswith(".")])
            
            # Add directories
            for i, dir_name in enumerate(dirs[:10]):
                dir_id = self._sanitize_id(dir_name)
                lines.append(f"    root --> {dir_id}[📁 {dir_name}]")
                
                # Add subdirectories
                subpath = os.path.join(repo_path, dir_name)
                try:
                    subentries = os.listdir(subpath)
                    subdirs = [e for e in subentries if os.path.isdir(os.path.join(subpath, e)) and not e.startswith(".")]
                    subfiles = [e for e in subentries if os.path.isfile(os.path.join(subpath, e))]
                    
                    for sub in subdirs[:3]:
                        sub_id = self._sanitize_id(f"{dir_name}_{sub}")
                        lines.append(f"    {dir_id} --> {sub_id}[📁 {sub}]")
                    
                    if subfiles:
                        files_id = self._sanitize_id(f"{dir_name}_files")
                        lines.append(f"    {dir_id} --> {files_id}[📄 {len(subfiles)} files]")
                        
                except PermissionError:
                    pass
            
            # Add root files
            if files:
                lines.append(f"    root --> rootfiles[📄 {len(files)} files]")
                
        except Exception as e:
            lines.append(f"    root --> error[Error: {str(e)[:30]}]")
        
        return "\n".join(lines)
    
    async def _generate_repo_class_diagram(self, repo_path: str) -> str:
        """Generate a class diagram for the repository"""
        from app.services.parser import ParserService
        
        parser = ParserService()
        lines = ["classDiagram"]
        classes_found = []
        
        # Walk through Python files and extract classes
        for root, dirs, files in os.walk(repo_path):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", "__pycache__", "venv"}]
            
            for file in files:
                if not file.endswith(".py"):
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, repo_path)
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    ast_nodes = parser.parse_file(content, "python", relative_path)
                    
                    for node in ast_nodes:
                        if node.type == NodeType.CLASS:
                            classes_found.append((node, relative_path))
                            
                except Exception:
                    continue
                
                if len(classes_found) >= 20:  # Limit for readability
                    break
            
            if len(classes_found) >= 20:
                break
        
        # Generate class definitions
        for cls, path in classes_found:
            lines.append(f"    class {cls.name} {{")
            lines.append(f"        <<{os.path.basename(path)}>>")
            
            for child in cls.children[:5]:
                if child.type in [NodeType.METHOD, NodeType.FUNCTION]:
                    lines.append(f"        +{child.name}()")
            
            lines.append("    }")
        
        if not classes_found:
            lines.append("    class NoClassesFound {")
            lines.append("        No Python classes found")
            lines.append("    }")
        
        return "\n".join(lines)
    
    def _sanitize_id(self, name: str) -> str:
        """Sanitize a name for use as a Mermaid ID"""
        # Remove special characters and spaces
        sanitized = re.sub(r"[^a-zA-Z0-9_]", "_", name)
        # Ensure it starts with a letter
        if sanitized and sanitized[0].isdigit():
            sanitized = "n" + sanitized
        return sanitized or "unknown"
    
    def _extract_class_attributes(
        self,
        class_lines: List[str],
        file_path: str,
    ) -> List[str]:
        """Extract class attributes from class definition"""
        attributes = []
        
        # Look for self.x = assignments in __init__
        for line in class_lines:
            match = re.search(r"self\.(\w+)\s*=", line)
            if match:
                attr = match.group(1)
                if attr not in attributes and not attr.startswith("_"):
                    attributes.append(attr)
        
        return attributes[:10]  # Limit number of attributes
    
    def _extract_parent_class(
        self,
        content: str,
        cls: ASTNode,
    ) -> Optional[str]:
        """Extract parent class from class definition"""
        lines = content.split("\n")
        if cls.start_line <= len(lines):
            class_line = lines[cls.start_line - 1]
            match = re.search(r"class\s+\w+\s*\(\s*(\w+)\s*\)", class_line)
            if match:
                return match.group(1)
        return None

