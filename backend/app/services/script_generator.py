"""
Script Generator Service - LangChain + GPT-4o Integration

Generates natural language walkthrough scripts from code analysis.
This is the core AI component that creates the "Senior Engineer" narration.
"""

import os
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

from app.config import get_settings
from app.models.schemas import (
    WalkthroughScript,
    ScriptSegment,
    ASTNode,
    ViewMode,
    Repository,
    NodeType,
)

settings = get_settings()


class ScriptGeneratorService:
    """
    Generates walkthrough scripts using LangChain and GPT-4o.
    
    Creates:
    - Developer Mode: Technical explanations with inputs/outputs/complexity
    - Manager Mode: High-level business summaries
    """
    
    def __init__(self):
        self._llm = None
        self._chain = None
    
    def _initialize(self):
        """Lazy initialization of LangChain components"""
        if self._llm is not None:
            return
        
        try:
            from langchain_openai import ChatOpenAI
            from langchain.prompts import ChatPromptTemplate
            from langchain.output_parsers import PydanticOutputParser
            
            self._llm = ChatOpenAI(
                model="gpt-4o",
                temperature=0.3,
                api_key=settings.openai_api_key,
            )
            
            print("✅ LangChain initialized with GPT-4o")
            
        except ImportError:
            print("⚠️ LangChain not installed, using mock generator")
            self._llm = "mock"
        except Exception as e:
            print(f"⚠️ LangChain initialization failed: {e}")
            self._llm = "mock"
    
    async def generate_script(
        self,
        file_path: str,
        content: str,
        ast_nodes: List[ASTNode],
        view_mode: ViewMode,
        repository: Repository,
    ) -> WalkthroughScript:
        """
        Generate a complete walkthrough script for a file.
        
        Args:
            file_path: Path to the source file
            content: Source code content
            ast_nodes: Parsed AST nodes
            view_mode: Developer or Manager mode
            repository: Repository information
            
        Returns:
            WalkthroughScript with all segments
        """
        self._initialize()
        
        script_id = f"wt_{uuid.uuid4().hex[:12]}"
        lines = content.split("\n")
        
        # Generate segments based on AST structure
        segments = []
        
        # Add file overview segment
        overview = await self._generate_overview(
            file_path, content, ast_nodes, view_mode
        )
        segments.append(overview)
        
        # Generate segments for each major code block
        for node in ast_nodes:
            if node.type in [NodeType.FUNCTION, NodeType.CLASS, NodeType.METHOD]:
                segment = await self._generate_node_segment(
                    node, lines, view_mode, len(segments)
                )
                segments.append(segment)
        
        # Add conclusion segment
        conclusion = await self._generate_conclusion(
            file_path, ast_nodes, view_mode, len(segments)
        )
        segments.append(conclusion)
        
        # Calculate total duration
        total_duration = sum(s.duration_estimate for s in segments)
        
        # Generate summary
        summary = await self._generate_summary(file_path, ast_nodes, view_mode)
        
        return WalkthroughScript(
            id=script_id,
            file_path=file_path,
            title=f"Walkthrough: {os.path.basename(file_path)}",
            summary=summary,
            view_mode=view_mode,
            segments=segments,
            total_duration=total_duration,
            metadata={
                "repository_id": repository.id,
                "repository_name": repository.name,
                "language": repository.language,
            }
        )
    
    async def _generate_overview(
        self,
        file_path: str,
        content: str,
        ast_nodes: List[ASTNode],
        view_mode: ViewMode,
    ) -> ScriptSegment:
        """Generate the opening overview segment"""
        self._initialize()
        
        # Count code elements
        functions = [n for n in ast_nodes if n.type == NodeType.FUNCTION]
        classes = [n for n in ast_nodes if n.type == NodeType.CLASS]
        imports = [n for n in ast_nodes if n.type == NodeType.IMPORT]
        
        if self._llm == "mock":
            if view_mode == ViewMode.DEVELOPER:
                text = (
                    f"Welcome to the walkthrough of {os.path.basename(file_path)}. "
                    f"This file contains {len(functions)} functions, {len(classes)} classes, "
                    f"and {len(imports)} import statements. "
                    f"Let me walk you through the key components and their implementation details."
                )
            else:
                text = (
                    f"Let's explore {os.path.basename(file_path)}. "
                    f"This module handles key functionality in the system. "
                    f"I'll explain what it does at a high level and how it fits into the larger picture."
                )
        else:
            prompt = self._get_overview_prompt(
                file_path, content[:2000], ast_nodes, view_mode
            )
            text = await self._call_llm(prompt)
        
        return ScriptSegment(
            id=f"seg_{uuid.uuid4().hex[:8]}",
            order=0,
            text=text,
            start_line=1,
            end_line=min(10, len(content.split("\n"))),
            highlight_lines=list(range(1, min(10, len(content.split("\n"))) + 1)),
            duration_estimate=self._estimate_duration(text),
        )
    
    async def _generate_node_segment(
        self,
        node: ASTNode,
        lines: List[str],
        view_mode: ViewMode,
        order: int,
    ) -> ScriptSegment:
        """Generate a segment for a specific AST node"""
        self._initialize()
        
        # Extract the code for this node
        node_code = "\n".join(lines[node.start_line - 1:node.end_line])
        
        if self._llm == "mock":
            if view_mode == ViewMode.DEVELOPER:
                if node.type == NodeType.FUNCTION:
                    params_str = ", ".join(node.parameters) if node.parameters else "no parameters"
                    text = (
                        f"Now let's look at the function '{node.name}'. "
                        f"It takes {params_str}. "
                        f"This function is responsible for handling specific logic. "
                        f"The implementation spans from line {node.start_line} to {node.end_line}."
                    )
                elif node.type == NodeType.CLASS:
                    text = (
                        f"Here we have the class '{node.name}'. "
                        f"This class encapsulates related functionality and data. "
                        f"Let's examine its structure and methods."
                    )
                else:
                    text = f"Let's examine {node.name} which is defined here."
            else:
                text = (
                    f"The {node.type.value} '{node.name}' provides important business functionality. "
                    f"It's a key component that enables the system's core features."
                )
        else:
            prompt = self._get_node_prompt(node, node_code, view_mode)
            text = await self._call_llm(prompt)
        
        return ScriptSegment(
            id=f"seg_{uuid.uuid4().hex[:8]}",
            order=order,
            text=text,
            start_line=node.start_line,
            end_line=node.end_line,
            highlight_lines=list(range(node.start_line, node.end_line + 1)),
            duration_estimate=self._estimate_duration(text),
            code_context=node_code[:500],
        )
    
    async def _generate_conclusion(
        self,
        file_path: str,
        ast_nodes: List[ASTNode],
        view_mode: ViewMode,
        order: int,
    ) -> ScriptSegment:
        """Generate the closing conclusion segment"""
        if view_mode == ViewMode.DEVELOPER:
            text = (
                f"That concludes our walkthrough of {os.path.basename(file_path)}. "
                f"We've covered the main components and their implementations. "
                f"For deeper understanding, consider exploring the related files and dependencies."
            )
        else:
            text = (
                f"To summarize, this file is a crucial part of the system. "
                f"Understanding its role helps in grasping the overall architecture. "
                f"Feel free to explore related modules for a complete picture."
            )
        
        return ScriptSegment(
            id=f"seg_{uuid.uuid4().hex[:8]}",
            order=order,
            text=text,
            start_line=1,
            end_line=1,
            highlight_lines=[],
            duration_estimate=self._estimate_duration(text),
        )
    
    async def _generate_summary(
        self,
        file_path: str,
        ast_nodes: List[ASTNode],
        view_mode: ViewMode,
    ) -> str:
        """Generate a brief summary of the file"""
        functions = [n for n in ast_nodes if n.type == NodeType.FUNCTION]
        classes = [n for n in ast_nodes if n.type == NodeType.CLASS]
        
        if view_mode == ViewMode.DEVELOPER:
            return (
                f"Technical walkthrough of {os.path.basename(file_path)} covering "
                f"{len(functions)} functions and {len(classes)} classes with implementation details."
            )
        else:
            return (
                f"Business overview of {os.path.basename(file_path)} explaining "
                f"key functionality and its role in the system."
            )
    
    def _get_overview_prompt(
        self,
        file_path: str,
        content_preview: str,
        ast_nodes: List[ASTNode],
        view_mode: ViewMode,
    ) -> str:
        """Generate prompt for file overview"""
        if view_mode == ViewMode.DEVELOPER:
            return f"""You are a senior software engineer explaining code to a fellow developer.
            
Generate an engaging opening narration for a code walkthrough video of this file.

File: {file_path}
Code Preview:
```
{content_preview}
```

Code Structure:
- Functions: {len([n for n in ast_nodes if n.type == NodeType.FUNCTION])}
- Classes: {len([n for n in ast_nodes if n.type == NodeType.CLASS])}
- Imports: {len([n for n in ast_nodes if n.type == NodeType.IMPORT])}

Requirements:
- Be conversational and engaging
- Mention the file name and its apparent purpose
- Preview what the viewer will learn
- Keep it to 2-3 sentences
- Focus on technical aspects"""
        else:
            return f"""You are explaining code to a business stakeholder or manager.

Generate an opening narration for a high-level code overview of this file.

File: {file_path}

Requirements:
- Use non-technical language
- Focus on what the code DOES, not HOW
- Explain business value
- Keep it to 2-3 sentences"""
    
    def _get_node_prompt(
        self,
        node: ASTNode,
        code: str,
        view_mode: ViewMode,
    ) -> str:
        """Generate prompt for a specific code node"""
        if view_mode == ViewMode.DEVELOPER:
            return f"""You are a senior software engineer explaining code.

Explain this {node.type.value} named '{node.name}':

```
{code[:1500]}
```

Requirements:
- Explain what it does and how
- Mention parameters/inputs if applicable: {node.parameters}
- Note any important implementation details
- Keep it to 3-4 sentences
- Be technically accurate"""
        else:
            return f"""Explain this code component to a business stakeholder:

Component: {node.name} ({node.type.value})

Requirements:
- Use simple, non-technical language
- Focus on business purpose
- Keep it to 2 sentences"""
    
    async def _call_llm(self, prompt: str) -> str:
        """Call the LLM to generate text"""
        try:
            from langchain.schema import HumanMessage
            
            messages = [HumanMessage(content=prompt)]
            response = await self._llm.ainvoke(messages)
            
            return response.content
            
        except Exception as e:
            print(f"LLM call failed: {e}")
            return "This section contains important code logic."
    
    def _estimate_duration(self, text: str) -> float:
        """Estimate speech duration in seconds (average 150 words per minute)"""
        words = len(text.split())
        return (words / 150) * 60

