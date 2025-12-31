"""
Dependency Analyzer Service - DAG Construction

Analyzes imports and file relationships to build a Dependency
Directed Acyclic Graph (DAG). This helps understand:
- Why code exists (context)
- How files interact
- Impact of changes
"""

import os
import re
from typing import List, Dict, Set, Optional
from collections import defaultdict

import networkx as nx

from app.models.schemas import DependencyGraph, DependencyEdge


class DependencyAnalyzer:
    """
    Analyzes code dependencies and builds a DAG.
    
    Helps understand:
    - File relationships
    - Import chains
    - Module dependencies
    """
    
    def __init__(self):
        self._graph = None
    
    def analyze_repository(self, repo_path: str) -> DependencyGraph:
        """
        Analyze all files in a repository and build dependency graph.
        
        Args:
            repo_path: Path to the repository root
            
        Returns:
            DependencyGraph with nodes and edges
        """
        self._graph = nx.DiGraph()
        
        # File extension to language mapping
        lang_extensions = {
            ".py": "python",
            ".js": "javascript",
            ".jsx": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
        }
        
        # Find all source files
        source_files: Dict[str, str] = {}  # path -> language
        
        for root, dirs, files in os.walk(repo_path):
            # Skip common ignored directories
            dirs[:] = [
                d for d in dirs 
                if d not in {"node_modules", ".git", "__pycache__", "venv", "env", "dist", "build", ".next"}
            ]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in lang_extensions:
                    file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(file_path, repo_path)
                    source_files[relative_path] = lang_extensions[ext]
        
        # Add all files as nodes
        for path in source_files:
            self._graph.add_node(path)
        
        # Analyze each file for imports
        edges: List[DependencyEdge] = []
        
        for file_path, language in source_files.items():
            full_path = os.path.join(repo_path, file_path)
            
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                file_imports = self._extract_imports(content, language)
                
                for import_name in file_imports:
                    # Try to resolve import to a file in the repo
                    resolved = self._resolve_import(
                        import_name, 
                        file_path, 
                        source_files,
                        language
                    )
                    
                    if resolved:
                        edge = DependencyEdge(
                            source=file_path,
                            target=resolved,
                            import_name=import_name,
                            is_external=False,
                        )
                        edges.append(edge)
                        self._graph.add_edge(file_path, resolved, import_name=import_name)
                    else:
                        # External dependency
                        edge = DependencyEdge(
                            source=file_path,
                            target=import_name,
                            import_name=import_name,
                            is_external=True,
                        )
                        edges.append(edge)
                        
            except Exception as e:
                print(f"Error analyzing {file_path}: {e}")
                continue
        
        return DependencyGraph(
            nodes=list(source_files.keys()),
            edges=edges,
        )
    
    def _extract_imports(self, content: str, language: str) -> List[str]:
        """Extract import statements from source code"""
        imports = []
        
        if language == "python":
            # Match: import x, from x import y
            import_pattern = r"^import\s+([\w.]+)"
            from_pattern = r"^from\s+([\w.]+)\s+import"
            
            for line in content.split("\n"):
                line = line.strip()
                
                match = re.match(import_pattern, line)
                if match:
                    imports.append(match.group(1))
                    continue
                
                match = re.match(from_pattern, line)
                if match:
                    imports.append(match.group(1))
                    
        elif language in ["javascript", "typescript"]:
            # Match: import x from 'y', import { x } from 'y', require('y')
            es_import_pattern = r"import\s+.*?\s+from\s+['\"](.+?)['\"]"
            require_pattern = r"require\s*\(\s*['\"](.+?)['\"]\s*\)"
            
            for match in re.finditer(es_import_pattern, content):
                imports.append(match.group(1))
            
            for match in re.finditer(require_pattern, content):
                imports.append(match.group(1))
        
        return imports
    
    def _resolve_import(
        self,
        import_name: str,
        source_file: str,
        source_files: Dict[str, str],
        language: str,
    ) -> Optional[str]:
        """Try to resolve an import to a file in the repository"""
        
        if language == "python":
            # Convert module path to file path
            # e.g., "app.services.parser" -> "app/services/parser.py"
            module_path = import_name.replace(".", os.sep)
            
            # Try direct file
            for ext in [".py", "/__init__.py"]:
                candidate = module_path + ext
                if candidate in source_files:
                    return candidate
            
            # Try relative to source file
            source_dir = os.path.dirname(source_file)
            relative_path = os.path.join(source_dir, module_path)
            
            for ext in [".py", "/__init__.py"]:
                candidate = relative_path + ext
                if candidate in source_files:
                    return candidate
                    
        elif language in ["javascript", "typescript"]:
            # Handle relative imports
            if import_name.startswith("."):
                source_dir = os.path.dirname(source_file)
                resolved = os.path.normpath(os.path.join(source_dir, import_name))
                
                # Try with different extensions
                for ext in ["", ".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.ts"]:
                    candidate = resolved + ext
                    if candidate in source_files:
                        return candidate
        
        return None
    
    def get_file_dependencies(self, file_path: str) -> List[str]:
        """Get all files that a file depends on (imports)"""
        if self._graph is None:
            return []
        
        if file_path not in self._graph:
            return []
        
        return list(self._graph.successors(file_path))
    
    def get_file_dependents(self, file_path: str) -> List[str]:
        """Get all files that depend on (import) a file"""
        if self._graph is None:
            return []
        
        if file_path not in self._graph:
            return []
        
        return list(self._graph.predecessors(file_path))
    
    def get_dependency_chain(
        self, 
        file_path: str, 
        max_depth: int = 5
    ) -> Dict[str, List[str]]:
        """
        Get the chain of dependencies for a file.
        
        Returns a dict mapping depth level to list of files.
        """
        if self._graph is None or file_path not in self._graph:
            return {}
        
        chain = {}
        visited = {file_path}
        current_level = [file_path]
        
        for depth in range(1, max_depth + 1):
            next_level = []
            
            for f in current_level:
                for dep in self._graph.successors(f):
                    if dep not in visited:
                        visited.add(dep)
                        next_level.append(dep)
            
            if next_level:
                chain[f"level_{depth}"] = next_level
                current_level = next_level
            else:
                break
        
        return chain
    
    def get_impact_analysis(self, file_path: str) -> Dict[str, any]:
        """
        Analyze the impact of changes to a file.
        
        Returns information about what files would be affected.
        """
        if self._graph is None or file_path not in self._graph:
            return {"error": "File not in graph"}
        
        # Get all files that directly or indirectly depend on this file
        affected = set()
        to_check = [file_path]
        
        while to_check:
            current = to_check.pop()
            for dependent in self._graph.predecessors(current):
                if dependent not in affected:
                    affected.add(dependent)
                    to_check.append(dependent)
        
        return {
            "file": file_path,
            "direct_dependents": list(self._graph.predecessors(file_path)),
            "total_affected": len(affected),
            "affected_files": list(affected)[:20],  # Limit for display
        }
    
    def find_circular_dependencies(self) -> List[List[str]]:
        """Find any circular dependencies in the codebase"""
        if self._graph is None:
            return []
        
        try:
            cycles = list(nx.simple_cycles(self._graph))
            return cycles[:10]  # Limit number of cycles returned
        except Exception:
            return []
    
    def get_most_imported_files(self, limit: int = 10) -> List[tuple]:
        """Get files that are imported the most (highest in-degree)"""
        if self._graph is None:
            return []
        
        in_degrees = [(node, self._graph.in_degree(node)) for node in self._graph.nodes()]
        sorted_files = sorted(in_degrees, key=lambda x: x[1], reverse=True)
        
        return sorted_files[:limit]
    
    def get_graph_stats(self) -> Dict[str, any]:
        """Get statistics about the dependency graph"""
        if self._graph is None:
            return {}
        
        return {
            "total_files": self._graph.number_of_nodes(),
            "total_dependencies": self._graph.number_of_edges(),
            "is_dag": nx.is_directed_acyclic_graph(self._graph),
            "connected_components": nx.number_weakly_connected_components(self._graph),
        }

