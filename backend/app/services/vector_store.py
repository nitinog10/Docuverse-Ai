"""
Vector Store Service - ChromaDB Integration

Layer 2: Logic Engine component for storing and retrieving code chunks
using semantic similarity search.
"""

import os
from typing import List, Optional, Dict, Any
import uuid

from app.config import get_settings
from app.models.schemas import CodeChunk, NodeType

settings = get_settings()


class VectorStoreService:
    """
    ChromaDB-based vector store for code embeddings.
    
    Enables:
    - Semantic search across codebase
    - Contextual retrieval for documentation
    - Finding related code chunks
    """
    
    def __init__(self):
        self._client = None
        self._collection = None
        self._embedding_function = None
    
    def _initialize(self):
        """Lazy initialization of ChromaDB"""
        if self._client is not None:
            return
        
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            
            # Initialize persistent ChromaDB client
            self._client = chromadb.PersistentClient(
                path=settings.chroma_persist_directory,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                )
            )
            
            # Create or get the code collection
            self._collection = self._client.get_or_create_collection(
                name="docuverse_code",
                metadata={"description": "Code chunks for DocuVerse"},
            )
            
            print("✅ ChromaDB initialized successfully")
            
        except ImportError:
            print("⚠️ ChromaDB not installed, using mock vector store")
            self._client = "mock"
        except Exception as e:
            print(f"⚠️ ChromaDB initialization failed: {e}")
            self._client = "mock"
    
    async def add_code_chunks(
        self, 
        chunks: List[CodeChunk],
        repository_id: str
    ) -> int:
        """
        Add code chunks to the vector store.
        
        Args:
            chunks: List of CodeChunk objects to store
            repository_id: ID of the repository
            
        Returns:
            Number of chunks added
        """
        self._initialize()
        
        if self._client == "mock":
            return len(chunks)
        
        try:
            documents = []
            metadatas = []
            ids = []
            
            for chunk in chunks:
                # Create searchable document
                doc = self._create_document(chunk)
                documents.append(doc)
                
                # Create metadata
                metadata = {
                    "repository_id": repository_id,
                    "file_path": chunk.file_path,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "chunk_type": chunk.chunk_type.value,
                    "name": chunk.name or "",
                }
                metadata.update(chunk.metadata)
                metadatas.append(metadata)
                
                ids.append(chunk.id)
            
            # Add to ChromaDB
            self._collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids,
            )
            
            return len(chunks)
            
        except Exception as e:
            print(f"Error adding chunks to vector store: {e}")
            return 0
    
    def _create_document(self, chunk: CodeChunk) -> str:
        """Create a searchable document from a code chunk"""
        parts = []
        
        if chunk.name:
            parts.append(f"Name: {chunk.name}")
        
        parts.append(f"Type: {chunk.chunk_type.value}")
        parts.append(f"File: {chunk.file_path}")
        parts.append(f"Code:\n{chunk.content}")
        
        return "\n".join(parts)
    
    async def search(
        self,
        query: str,
        repository_id: Optional[str] = None,
        file_path: Optional[str] = None,
        n_results: int = 10,
        chunk_type: Optional[NodeType] = None,
    ) -> List[CodeChunk]:
        """
        Search for relevant code chunks.
        
        Args:
            query: Search query (natural language or code)
            repository_id: Filter by repository
            file_path: Filter by file path
            n_results: Maximum number of results
            chunk_type: Filter by chunk type
            
        Returns:
            List of matching CodeChunk objects
        """
        self._initialize()
        
        if self._client == "mock":
            return []
        
        try:
            # Build filter conditions
            where = {}
            if repository_id:
                where["repository_id"] = repository_id
            if file_path:
                where["file_path"] = file_path
            if chunk_type:
                where["chunk_type"] = chunk_type.value
            
            # Query ChromaDB
            results = self._collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where if where else None,
            )
            
            # Convert results to CodeChunk objects
            chunks = []
            if results and results["ids"] and results["ids"][0]:
                for i, id in enumerate(results["ids"][0]):
                    metadata = results["metadatas"][0][i]
                    document = results["documents"][0][i]
                    
                    # Extract code from document
                    code_start = document.find("Code:\n")
                    code = document[code_start + 6:] if code_start != -1 else document
                    
                    chunk = CodeChunk(
                        id=id,
                        file_path=metadata.get("file_path", ""),
                        content=code,
                        start_line=metadata.get("start_line", 0),
                        end_line=metadata.get("end_line", 0),
                        chunk_type=NodeType(metadata.get("chunk_type", "function")),
                        name=metadata.get("name"),
                        metadata=metadata,
                    )
                    chunks.append(chunk)
            
            return chunks
            
        except Exception as e:
            print(f"Error searching vector store: {e}")
            return []
    
    async def get_related_chunks(
        self,
        chunk_id: str,
        repository_id: str,
        n_results: int = 5,
    ) -> List[CodeChunk]:
        """
        Find chunks related to a given chunk.
        
        Uses the content of the specified chunk to find similar code.
        """
        self._initialize()
        
        if self._client == "mock":
            return []
        
        try:
            # Get the source chunk
            result = self._collection.get(ids=[chunk_id])
            
            if not result or not result["documents"]:
                return []
            
            source_doc = result["documents"][0]
            
            # Search for similar chunks (excluding the source)
            results = self._collection.query(
                query_texts=[source_doc],
                n_results=n_results + 1,  # +1 to account for self-match
                where={"repository_id": repository_id},
            )
            
            # Filter out the source chunk and convert to CodeChunk
            chunks = []
            if results and results["ids"] and results["ids"][0]:
                for i, id in enumerate(results["ids"][0]):
                    if id == chunk_id:
                        continue
                    
                    metadata = results["metadatas"][0][i]
                    document = results["documents"][0][i]
                    
                    code_start = document.find("Code:\n")
                    code = document[code_start + 6:] if code_start != -1 else document
                    
                    chunk = CodeChunk(
                        id=id,
                        file_path=metadata.get("file_path", ""),
                        content=code,
                        start_line=metadata.get("start_line", 0),
                        end_line=metadata.get("end_line", 0),
                        chunk_type=NodeType(metadata.get("chunk_type", "function")),
                        name=metadata.get("name"),
                        metadata=metadata,
                    )
                    chunks.append(chunk)
                    
                    if len(chunks) >= n_results:
                        break
            
            return chunks
            
        except Exception as e:
            print(f"Error getting related chunks: {e}")
            return []
    
    async def delete_repository(self, repository_id: str) -> bool:
        """Delete all chunks for a repository"""
        self._initialize()
        
        if self._client == "mock":
            return True
        
        try:
            # Get all chunk IDs for this repository
            results = self._collection.get(
                where={"repository_id": repository_id}
            )
            
            if results and results["ids"]:
                self._collection.delete(ids=results["ids"])
            
            return True
            
        except Exception as e:
            print(f"Error deleting repository chunks: {e}")
            return False
    
    async def get_file_context(
        self,
        file_path: str,
        repository_id: str,
    ) -> List[CodeChunk]:
        """
        Get all chunks for a file plus related context from dependencies.
        
        This is used for Contextual RAG - when documenting a file,
        we retrieve its dependencies to provide better context.
        """
        self._initialize()
        
        if self._client == "mock":
            return []
        
        try:
            # Get chunks from the file itself
            file_results = self._collection.get(
                where={
                    "$and": [
                        {"repository_id": repository_id},
                        {"file_path": file_path},
                    ]
                }
            )
            
            chunks = []
            if file_results and file_results["ids"]:
                for i, id in enumerate(file_results["ids"]):
                    metadata = file_results["metadatas"][i]
                    document = file_results["documents"][i]
                    
                    code_start = document.find("Code:\n")
                    code = document[code_start + 6:] if code_start != -1 else document
                    
                    chunk = CodeChunk(
                        id=id,
                        file_path=metadata.get("file_path", ""),
                        content=code,
                        start_line=metadata.get("start_line", 0),
                        end_line=metadata.get("end_line", 0),
                        chunk_type=NodeType(metadata.get("chunk_type", "function")),
                        name=metadata.get("name"),
                        metadata=metadata,
                    )
                    chunks.append(chunk)
            
            # Search for related context from other files
            file_content = " ".join(c.content for c in chunks[:3])  # Use first few chunks
            if file_content:
                related = await self.search(
                    query=file_content[:1000],  # Limit query size
                    repository_id=repository_id,
                    n_results=5,
                )
                
                # Add related chunks that aren't from the same file
                for chunk in related:
                    if chunk.file_path != file_path:
                        chunk.metadata["is_context"] = True
                        chunks.append(chunk)
            
            return chunks
            
        except Exception as e:
            print(f"Error getting file context: {e}")
            return []

