"""
Diagram Generator Service - Mermaid.js Integration

Generates visual diagrams from code structure:
- Flowcharts for code execution flow
- Class diagrams for OOP structures
- Sequence diagrams for interaction flows
- Repository architecture diagrams for project structure
- ER diagrams for data relationships
"""

import os
from typing import List, Optional, Dict, Set
import re
from pathlib import Path

from app.models.schemas import ASTNode, NodeType, DiagramType


class DiagramGeneratorService:
    """
    Generates Mermaid.js diagram code from code analysis.
    
    Converts AST structures into visual representations with enhanced
    support for GitHub repository architecture visualization.
    """
    
    # File type to icon mapping for better visualization
    FILE_ICONS = {
        ".py": "🐍",
        ".js": "📜",
        ".ts": "📘",
        ".tsx": "⚛️",
        ".jsx": "⚛️",
        ".java": "☕",
        ".go": "🔷",
        ".rs": "🦀",
        ".cpp": "⚙️",
        ".c": "⚙️",
        ".md": "📝",
        ".json": "📋",
        ".yml": "⚙️",
        ".yaml": "⚙️",
        ".toml": "⚙️",
        ".xml": "📰",
        ".html": "🌐",
        ".css": "🎨",
        ".sql": "🗄️",
        ".sh": "🔧",
        ".dockerfile": "🐳",
    }
    
    # Directory patterns to ignore
    IGNORED_DIRS = {
        "node_modules", ".git", "__pycache__", "venv", ".venv", 
        "env", "dist", "build", ".next", "target", "bin", "obj",
        ".idea", ".vscode", "coverage", ".pytest_cache", ".mypy_cache"
    }
    
    def __init__(self):
        """Initialize the diagram generator service."""
        self.max_diagram_nodes = 50  # Prevent overly complex diagrams
    
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
        
        Creates a high-level view of the codebase structure including:
        - Directory hierarchy
        - File distribution
        - Technology stack visualization
        - Module dependencies
        
        Args:
            repo_path: Path to the repository root
            diagram_type: Type of diagram to generate
            
        Returns:
            Mermaid.js diagram code representing the repository architecture
        """
        if diagram_type == DiagramType.FLOWCHART:
            return await self._generate_enhanced_repo_architecture(repo_path)
        elif diagram_type == DiagramType.CLASS_DIAGRAM:
            return await self._generate_repo_class_diagram(repo_path)
        else:
            return await self._generate_enhanced_repo_architecture(repo_path)
    
    async def generate_github_repo_architecture(
        self,
        repo_path: str,
    ) -> str:
        """
        Generate a comprehensive architecture diagram for a GitHub repository.
        
        This creates a detailed visualization showing:
        - Project structure and organization
        - Main directories and their purposes
        - Technology stack and frameworks used
        - Configuration files
        - Key entry points
        
        Args:
            repo_path: Path to the cloned GitHub repository
            
        Returns:
            Mermaid.js diagram code with enhanced styling
        """
        return await self._generate_enhanced_repo_architecture(repo_path)
    
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
        
        if not classes:
            lines.append("    class NoClassesFound {")
            lines.append("        +No classes detected in this file")
            lines.append("    }")
            lines.append("    note for NoClassesFound \"Try a file containing class definitions\"")
            return "\n".join(lines)
        
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
    
    async def _generate_enhanced_repo_architecture(self, repo_path: str) -> str:
        """
        Generate an enhanced, comprehensive architecture diagram for a repository.
        
        Shows:
        - Directory structure with smart grouping
        - File types and counts
        - Technology indicators
        - Configuration files
        - Entry points and key files
        """
        lines = ["graph TB"]
        lines.append("    %% Repository Architecture Diagram")
        lines.append("")
        
        # Analyze repository structure
        repo_analysis = self._analyze_repository_structure(repo_path)
        
        # Root node
        repo_name = os.path.basename(repo_path) or "Repository"
        root_id = "root"
        lines.append(f"    {root_id}[\"📦 {repo_name}\"]")
        lines.append("    style root fill:#4a90e2,stroke:#2e5c8a,stroke-width:3px,color:#fff")
        lines.append("")
        
        # Add technology stack indicator
        tech_stack = self._detect_technology_stack(repo_path, repo_analysis)
        if tech_stack:
            lines.append(f"    tech[\"🔧 Tech Stack<br/>{', '.join(tech_stack[:4])}\"]")
            lines.append("    style tech fill:#f39c12,stroke:#d68910,color:#fff")
            lines.append(f"    {root_id} -.-> tech")
            lines.append("")
        
        # Process main directories
        node_count = 0
        for dir_name, dir_info in sorted(repo_analysis["directories"].items())[:12]:
            if node_count >= self.max_diagram_nodes:
                break
                
            dir_id = self._sanitize_id(f"dir_{dir_name}")
            icon = self._get_directory_icon(dir_name)
            file_count = dir_info["file_count"]
            
            # Create directory node with file count
            label = f"{icon} {dir_name}"
            if file_count > 0:
                label += f"<br/><small>{file_count} files</small>"
            
            lines.append(f"    {dir_id}[\"{label}\"]")
            lines.append(f"    {root_id} --> {dir_id}")
            
            # Add subdirectories or file type info
            if dir_info["subdirs"]:
                for subdir in sorted(dir_info["subdirs"])[:3]:
                    if node_count >= self.max_diagram_nodes:
                        break
                    sub_id = self._sanitize_id(f"{dir_name}_{subdir}")
                    sub_icon = self._get_directory_icon(subdir)
                    lines.append(f"    {sub_id}[\"{sub_icon} {subdir}\"]")
                    lines.append(f"    {dir_id} --> {sub_id}")
                    node_count += 1
                    
                if len(dir_info["subdirs"]) > 3:
                    more_id = self._sanitize_id(f"{dir_name}_more")
                    lines.append(f"    {more_id}[\"... {len(dir_info['subdirs']) - 3} more\"]")
                    lines.append(f"    {dir_id} -.-> {more_id}")
                    lines.append(f"    style {more_id} fill:#ecf0f1,stroke:#bdc3c7")
            
            # Add file type distribution for important directories
            if dir_info["file_types"] and dir_name in ["src", "app", "lib", "components", "services"]:
                types_str = ", ".join(f"{k} ({v})" for k, v in sorted(dir_info["file_types"].items())[:3])
                if types_str:
                    types_id = self._sanitize_id(f"{dir_name}_types")
                    lines.append(f"    {types_id}[\"📄 {types_str}\"]")
                    lines.append(f"    {dir_id} -.-> {types_id}")
                    lines.append(f"    style {types_id} fill:#e8f5e9,stroke:#66bb6a")
            
            # Color coding based on directory type
            style = self._get_directory_style(dir_name)
            lines.append(f"    style {dir_id} {style}")
            lines.append("")
            node_count += 1
        
        # Add important root files
        important_files = self._get_important_root_files(repo_path)
        if important_files:
            lines.append("    %% Important Configuration Files")
            for file in important_files[:5]:
                file_id = self._sanitize_id(f"file_{file}")
                icon = self._get_file_icon(file)
                lines.append(f"    {file_id}[\"{icon} {file}\"]")
                lines.append(f"    {root_id} --> {file_id}")
                lines.append(f"    style {file_id} fill:#fff3cd,stroke:#ffc107")
            lines.append("")
        
        return "\n".join(lines)
    
    def _analyze_repository_structure(self, repo_path: str) -> Dict:
        """
        Analyze repository structure and gather statistics.
        
        Returns:
            Dictionary containing directory structure, file counts, and types
        """
        analysis = {
            "directories": {},
            "total_files": 0,
            "file_types": {},
        }
        
        try:
            entries = os.listdir(repo_path)
            
            for entry in entries:
                if entry.startswith(".") and entry not in [".github", ".gitlab"]:
                    continue
                    
                full_path = os.path.join(repo_path, entry)
                
                if os.path.isdir(full_path) and entry not in self.IGNORED_DIRS:
                    dir_info = {
                        "file_count": 0,
                        "subdirs": [],
                        "file_types": {},
                    }
                    
                    # Count files and subdirectories
                    try:
                        for item in os.listdir(full_path):
                            item_path = os.path.join(full_path, item)
                            if os.path.isdir(item_path) and item not in self.IGNORED_DIRS:
                                dir_info["subdirs"].append(item)
                            elif os.path.isfile(item_path):
                                dir_info["file_count"] += 1
                                ext = Path(item).suffix.lower()
                                if ext:
                                    dir_info["file_types"][ext] = dir_info["file_types"].get(ext, 0) + 1
                    except PermissionError:
                        pass
                    
                    analysis["directories"][entry] = dir_info
                    analysis["total_files"] += dir_info["file_count"]
                    
                elif os.path.isfile(full_path):
                    ext = Path(entry).suffix.lower()
                    if ext:
                        analysis["file_types"][ext] = analysis["file_types"].get(ext, 0) + 1
                    analysis["total_files"] += 1
                    
        except Exception as e:
            print(f"Error analyzing repository: {e}")
        
        return analysis
    
    def _detect_technology_stack(self, repo_path: str, analysis: Dict) -> List[str]:
        """
        Detect technologies used in the repository based on files and structure.
        
        Returns:
            List of detected technologies/frameworks
        """
        tech_stack = set()
        
        # Check for specific files
        files_to_check = {
            "package.json": "Node.js",
            "requirements.txt": "Python",
            "Pipfile": "Python",
            "pyproject.toml": "Python",
            "Cargo.toml": "Rust",
            "go.mod": "Go",
            "pom.xml": "Java/Maven",
            "build.gradle": "Java/Gradle",
            "Gemfile": "Ruby",
            "composer.json": "PHP",
            "docker-compose.yml": "Docker",
            "Dockerfile": "Docker",
            "next.config.js": "Next.js",
            "nuxt.config.js": "Nuxt.js",
            "angular.json": "Angular",
            "vue.config.js": "Vue.js",
        }
        
        try:
            for file, tech in files_to_check.items():
                if os.path.exists(os.path.join(repo_path, file)):
                    tech_stack.add(tech)
        except Exception:
            pass
        
        # Check for framework indicators in directories
        if "frontend" in analysis["directories"] or "client" in analysis["directories"]:
            tech_stack.add("Frontend")
        if "backend" in analysis["directories"] or "server" in analysis["directories"]:
            tech_stack.add("Backend")
        if "api" in analysis["directories"]:
            tech_stack.add("API")
        if "database" in analysis["directories"] or "db" in analysis["directories"]:
            tech_stack.add("Database")
        
        return sorted(list(tech_stack))
    
    def _get_directory_icon(self, dir_name: str) -> str:
        """Get an appropriate icon for a directory based on its name."""
        icon_map = {
            "src": "📂",
            "app": "⚙️",
            "lib": "📚",
            "components": "🧩",
            "services": "🔧",
            "api": "🔌",
            "backend": "🖥️",
            "frontend": "🎨",
            "server": "🖥️",
            "client": "💻",
            "public": "🌐",
            "static": "📦",
            "assets": "🎭",
            "images": "🖼️",
            "styles": "🎨",
            "css": "🎨",
            "tests": "🧪",
            "test": "🧪",
            "docs": "📚",
            "config": "⚙️",
            "utils": "🛠️",
            "helpers": "🤝",
            "models": "📊",
            "views": "👁️",
            "controllers": "🎮",
            "routes": "🛣️",
            "middleware": "🔀",
            "database": "🗄️",
            "migrations": "🔄",
            "scripts": "📜",
        }
        return icon_map.get(dir_name.lower(), "📁")
    
    def _get_file_icon(self, filename: str) -> str:
        """Get an appropriate icon for a file based on its extension."""
        ext = Path(filename).suffix.lower()
        return self.FILE_ICONS.get(ext, "📄")
    
    def _get_directory_style(self, dir_name: str) -> str:
        """Get Mermaid.js styling for directory based on its type."""
        style_map = {
            "src": "fill:#e3f2fd,stroke:#2196f3,stroke-width:2px",
            "app": "fill:#e3f2fd,stroke:#2196f3,stroke-width:2px",
            "backend": "fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px",
            "frontend": "fill:#fff3e0,stroke:#ff9800,stroke-width:2px",
            "api": "fill:#e8f5e9,stroke:#4caf50,stroke-width:2px",
            "components": "fill:#fce4ec,stroke:#e91e63,stroke-width:2px",
            "services": "fill:#e0f2f1,stroke:#009688,stroke-width:2px",
            "tests": "fill:#fff9c4,stroke:#fbc02d,stroke-width:2px",
            "docs": "fill:#f1f8e9,stroke:#7cb342,stroke-width:2px",
        }
        return style_map.get(dir_name.lower(), "fill:#eceff1,stroke:#607d8b,stroke-width:2px")
    
    def _get_important_root_files(self, repo_path: str) -> List[str]:
        """Get list of important configuration/documentation files in root."""
        important_patterns = [
            "README.md", "README.rst", "README.txt",
            "package.json", "requirements.txt", "Pipfile", "pyproject.toml",
            "docker-compose.yml", "Dockerfile",
            ".env.example", "config.json", "settings.py",
            "LICENSE", "CONTRIBUTING.md",
        ]
        
        found_files = []
        try:
            for file in os.listdir(repo_path):
                if file in important_patterns or file.lower() in [p.lower() for p in important_patterns]:
                    found_files.append(file)
        except Exception:
            pass
        
        return found_files
    
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

