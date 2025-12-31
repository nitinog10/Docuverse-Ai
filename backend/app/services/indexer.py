"""
Indexer Service - Repository Indexing

Coordinates the full indexing pipeline:
1. Parse all files with Tree-sitter
2. Build dependency graph
3. Store code chunks in vector database
"""

import os
from datetime import datetime
from typing import List, Optional
import uuid

from app.config import get_settings
from app.models.schemas import Repository, CodeChunk, NodeType
from app.services.parser import ParserService
from app.services.vector_store import VectorStoreService
from app.services.dependency_analyzer import DependencyAnalyzer

settings = get_settings()


class IndexerService:
    """
    Coordinates repository indexing.
    
    Parses code, analyzes dependencies, and stores in vector database.
    """
    
    def __init__(self):
        self.parser = ParserService()
        self.vector_store = VectorStoreService()
        self.dependency_analyzer = DependencyAnalyzer()
    
    async def index_repository(self, repo: Repository) -> bool:
        """
        Index a repository for AI-powered documentation.
        
        Args:
            repo: Repository to index
            
        Returns:
            True if successful
        """
        if not repo.local_path or not os.path.exists(repo.local_path):
            print(f"Repository path not found: {repo.local_path}")
            return False
        
        print(f"🔍 Starting indexing of {repo.name}...")
        
        try:
            # Step 1: Analyze dependencies
            print("  📊 Analyzing dependencies...")
            dep_graph = self.dependency_analyzer.analyze_repository(repo.local_path)
            print(f"     Found {len(dep_graph.nodes)} files, {len(dep_graph.edges)} dependencies")
            
            # Step 2: Parse and chunk all source files
            print("  🌳 Parsing source files...")
            chunks = await self._parse_and_chunk_files(repo)
            print(f"     Created {len(chunks)} code chunks")
            
            # Step 3: Store in vector database
            print("  💾 Storing in vector database...")
            count = await self.vector_store.add_code_chunks(chunks, repo.id)
            print(f"     Stored {count} chunks")
            
            # Step 4: Update repository status
            repo.is_indexed = True
            repo.indexed_at = datetime.utcnow()
            
            print(f"✅ Indexing complete for {repo.name}")
            return True
            
        except Exception as e:
            print(f"❌ Indexing failed for {repo.name}: {e}")
            return False
    
    async def _parse_and_chunk_files(
        self, 
        repo: Repository
    ) -> List[CodeChunk]:
        """Parse all source files and create code chunks"""
        chunks = []
        
        # File extensions to process
        supported_extensions = {
            ".py", ".js", ".jsx", ".ts", ".tsx",
            ".java", ".go", ".rs", ".cpp", ".c",
        }
        
        # Directories to skip
        skip_dirs = {
            "node_modules", ".git", "__pycache__", "venv", "env",
            "dist", "build", ".next", ".nuxt", "coverage",
        }
        
        for root, dirs, files in os.walk(repo.local_path):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext not in supported_extensions:
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, repo.local_path)
                
                try:
                    file_chunks = await self._process_file(
                        file_path, 
                        relative_path, 
                        repo.id
                    )
                    chunks.extend(file_chunks)
                except Exception as e:
                    print(f"     ⚠️ Error processing {relative_path}: {e}")
                    continue
        
        return chunks
    
    async def _process_file(
        self,
        file_path: str,
        relative_path: str,
        repository_id: str,
    ) -> List[CodeChunk]:
        """Process a single file and create code chunks"""
        chunks = []
        
        # Read file content
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            return []  # Skip binary files
        
        # Skip very large files
        if len(content) > 100000:  # 100KB
            return []
        
        # Detect language
        language = self.parser.detect_language(relative_path)
        if not language:
            return []
        
        # Parse to AST
        ast_nodes = self.parser.parse_file(content, language, relative_path)
        
        # Create chunks from AST nodes
        for node in ast_nodes:
            if node.type in [NodeType.FUNCTION, NodeType.CLASS, NodeType.METHOD]:
                code = self.parser.get_code_chunk(
                    content, 
                    node.start_line, 
                    node.end_line
                )
                
                chunk = CodeChunk(
                    id=f"chunk_{uuid.uuid4().hex[:12]}",
                    file_path=relative_path,
                    content=code,
                    start_line=node.start_line,
                    end_line=node.end_line,
                    chunk_type=node.type,
                    name=node.name,
                    metadata={
                        "repository_id": repository_id,
                        "language": language,
                        "docstring": node.docstring,
                        "parameters": node.parameters,
                        "return_type": node.return_type,
                    }
                )
                chunks.append(chunk)
        
        # Also create a file-level chunk for context
        file_chunk = CodeChunk(
            id=f"file_{uuid.uuid4().hex[:12]}",
            file_path=relative_path,
            content=content[:5000],  # First 5000 chars
            start_line=1,
            end_line=len(content.split("\n")),
            chunk_type=NodeType.MODULE,
            name=os.path.basename(relative_path),
            metadata={
                "repository_id": repository_id,
                "language": language,
                "is_file_chunk": True,
            }
        )
        chunks.append(file_chunk)
        
        return chunks
    
    async def reindex_file(
        self,
        repo: Repository,
        file_path: str,
    ) -> bool:
        """Reindex a single file after changes"""
        full_path = os.path.join(repo.local_path, file_path)
        
        if not os.path.exists(full_path):
            return False
        
        try:
            # Remove existing chunks for this file
            # (In production, implement chunk deletion by file_path)
            
            # Process the file
            chunks = await self._process_file(full_path, file_path, repo.id)
            
            # Add new chunks
            await self.vector_store.add_code_chunks(chunks, repo.id)
            
            return True
            
        except Exception as e:
            print(f"Error reindexing {file_path}: {e}")
            return False
    
    async def get_indexing_status(self, repo: Repository) -> dict:
        """Get the current indexing status for a repository"""
        return {
            "repository_id": repo.id,
            "is_indexed": repo.is_indexed,
            "indexed_at": repo.indexed_at.isoformat() if repo.indexed_at else None,
            "status": "indexed" if repo.is_indexed else "pending",
        }

