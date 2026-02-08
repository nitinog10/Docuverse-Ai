"""
Documentation Generator Service - Generate comprehensive repo documentation
"""

import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import asyncio

from app.models.schemas import Repository, ASTNode
from app.services.parser import ParserService


class DocumentationGenerator:
    """Generate comprehensive documentation for repositories"""
    
    def __init__(self):
        self.parser = ParserService()
    
    async def generate_repo_documentation(
        self,
        repo: Repository,
        include_private: bool = False
    ) -> Dict[str, Any]:
        """
        Generate full repository documentation
        
        Returns structured documentation with:
        - Overview
        - File structure
        - API/Module documentation
        - Dependencies
        """
        
        if not repo.local_path or not os.path.exists(repo.local_path):
            raise ValueError("Repository not cloned")
        
        print(f"[DOCS] Generating documentation for {repo.name}...")
        
        # Analyze repository structure
        structure = self._analyze_structure(repo.local_path)
        
        # Generate module documentation
        modules = await self._generate_module_docs(repo.local_path, structure)
        
        # Generate README summary
        readme_content = self._extract_readme(repo.local_path)
        
        # Generate API documentation
        api_docs = self._generate_api_docs(modules)
        
        documentation = {
            "repository": {
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "language": repo.language,
            },
            "overview": {
                "readme": readme_content,
                "total_files": structure["total_files"],
                "total_lines": structure["total_lines"],
                "languages": structure["languages"],
            },
            "structure": structure["tree"],
            "modules": modules,
            "api": api_docs,
        }
        
        print(f"[DOCS] Documentation generated successfully!")
        return documentation
    
    def _analyze_structure(self, repo_path: str) -> Dict[str, Any]:
        """Analyze repository file structure"""
        
        total_files = 0
        total_lines = 0
        languages = {}
        tree = []
        
        ignore_dirs = {
            'node_modules', '.git', '__pycache__', 'venv', '.venv',
            'dist', 'build', '.next', 'coverage', '.pytest_cache'
        }
        
        for root, dirs, files in os.walk(repo_path):
            # Filter out ignored directories
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            rel_root = os.path.relpath(root, repo_path)
            if rel_root == '.':
                rel_root = ''
            
            for file in files:
                if file.startswith('.'):
                    continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.join(rel_root, file) if rel_root else file
                
                total_files += 1
                
                # Count lines
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = len(f.readlines())
                        total_lines += lines
                except:
                    pass
                
                # Track languages
                lang = self.parser.detect_language(file)
                if lang and lang != 'text':
                    languages[lang] = languages.get(lang, 0) + 1
        
        return {
            "total_files": total_files,
            "total_lines": total_lines,
            "languages": languages,
            "tree": self._build_tree(repo_path, ignore_dirs),
        }
    
    def _build_tree(self, repo_path: str, ignore_dirs: set) -> List[Dict[str, Any]]:
        """Build file tree structure"""
        
        tree = []
        
        try:
            items = sorted(os.listdir(repo_path))
        except:
            return tree
        
        for item in items:
            if item.startswith('.') or item in ignore_dirs:
                continue
            
            item_path = os.path.join(repo_path, item)
            
            if os.path.isdir(item_path):
                tree.append({
                    "name": item,
                    "type": "directory",
                    "children": self._build_tree(item_path, ignore_dirs),
                })
            else:
                lang = self.parser.detect_language(item)
                tree.append({
                    "name": item,
                    "type": "file",
                    "language": lang,
                })
        
        return tree
    
    async def _generate_module_docs(
        self,
        repo_path: str,
        structure: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate documentation for each module/file"""
        
        modules = []
        
        ignore_dirs = {
            'node_modules', '.git', '__pycache__', 'venv', '.venv',
            'dist', 'build', '.next', 'coverage', '.pytest_cache'
        }
        
        for root, dirs, files in os.walk(repo_path):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in files:
                if file.startswith('.'):
                    continue
                
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, repo_path)
                
                lang = self.parser.detect_language(file)
                if not lang or lang == 'text':
                    continue
                
                # Parse file
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    ast_nodes = self.parser.parse_file(content, lang, rel_path)
                    
                    if ast_nodes:
                        modules.append({
                            "path": rel_path.replace('\\', '/'),
                            "language": lang,
                            "functions": [
                                {
                                    "name": node.name,
                                    "line": node.start_line,
                                    "docstring": node.docstring,
                                    "parameters": node.parameters,
                                }
                                for node in ast_nodes
                                if node.type.value == "function"
                            ],
                            "classes": [
                                {
                                    "name": node.name,
                                    "line": node.start_line,
                                    "docstring": node.docstring,
                                }
                                for node in ast_nodes
                                if node.type.value == "class"
                            ],
                        })
                except Exception as e:
                    print(f"[DOCS] Error parsing {rel_path}: {e}")
                    continue
        
        return modules
    
    def _extract_readme(self, repo_path: str) -> Optional[str]:
        """Extract README content"""
        
        readme_files = ['README.md', 'README.rst', 'README.txt', 'README']
        
        for readme in readme_files:
            readme_path = os.path.join(repo_path, readme)
            if os.path.exists(readme_path):
                try:
                    with open(readme_path, 'r', encoding='utf-8') as f:
                        return f.read()
                except:
                    pass
        
        return None
    
    def _generate_api_docs(self, modules: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate API documentation from modules"""
        
        all_functions = []
        all_classes = []
        
        for module in modules:
            for func in module.get("functions", []):
                all_functions.append({
                    **func,
                    "module": module["path"],
                })
            
            for cls in module.get("classes", []):
                all_classes.append({
                    **cls,
                    "module": module["path"],
                })
        
        return {
            "functions": all_functions,
            "classes": all_classes,
            "total_functions": len(all_functions),
            "total_classes": len(all_classes),
        }
