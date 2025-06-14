#!/usr/bin/env python3
"""
Enhanced AI Service with Vector Embeddings
Provides intelligent project insights, semantic search, and AI-powered recommendations
"""

from __future__ import annotations

import os
import json
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple
from datetime import datetime, timedelta
from openai import AsyncOpenAI
import anthropic
from pydantic import BaseModel, Field
import logging
from dotenv import load_dotenv
import numpy as np
from supabase import Client
from pathlib import Path

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class AIConfig:
    """AI service configuration"""
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.ai_provider = os.getenv("AI_PROVIDER", "openai")
        self.model = os.getenv("AI_MODEL", "gpt-4o")
        self.anthropic_model = os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229")
        self.max_tokens = int(os.getenv("AI_MAX_TOKENS", "2000"))
        self.temperature = float(os.getenv("AI_TEMPERATURE", "0.7"))
        self.timeout = int(os.getenv("AI_TIMEOUT", "30"))
        
        # Validate API keys
        if not self.openai_api_key and not self.anthropic_api_key:
            logger.warning("No AI API keys found in environment variables")
        
        if self.openai_api_key:
            logger.info("OpenAI API key found")
        if self.anthropic_api_key:
            logger.info("Anthropic API key found")

class PromptTemplate(BaseModel):
    """Reusable prompt template with versioning"""
    name: str
    version: str
    system_prompt: str
    user_prompt_template: str
    variables: List[str]
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None

class AIResponse(BaseModel):
    """Standardized AI response format"""
    model_config = {"protected_namespaces": ()}
    
    success: bool
    data: Any
    tokens_used: int
    processing_time: float
    model_used: str
    error: Optional[str] = None

class VectorSearchResult(BaseModel):
    id: str
    content: str
    similarity: float
    metadata: Dict[str, Any]

class AIInsight(BaseModel):
    type: str
    title: str
    description: str
    confidence: float
    actionable_items: List[str]
    priority: str

class StoryRecommendation(BaseModel):
    title: str
    description: str
    acceptance_criteria: str
    story_points: int
    priority: str
    reasoning: str
    confidence: float

class AIService:
    """Core AI service for all AgileScribe AI features"""
    
    def __init__(self):
        self.config = AIConfig()
        
        # Initialize clients only if API keys are available
        self.openai_client = None
        self.anthropic_client = None
        
        if self.config.openai_api_key:
            try:
                self.openai_client = AsyncOpenAI(api_key=self.config.openai_api_key)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
        
        if self.config.anthropic_api_key:
            try:
                self.anthropic_client = anthropic.AsyncAnthropic(api_key=self.config.anthropic_api_key)
                logger.info("Anthropic client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Anthropic client: {e}")
        
        if not self.openai_client and not self.anthropic_client:
            logger.error("No AI clients available - check your API keys")
        
        self.prompt_templates = self._load_prompt_templates()
    
    def _load_prompt_templates(self) -> Dict[str, PromptTemplate]:
        """Load all prompt templates"""
        return {
            "sprint_planning": PromptTemplate(
                name="sprint_planning",
                version="1.0",
                system_prompt="""You are an expert Agile coach and sprint planning assistant. 
                Analyze user stories, team capacity, and historical velocity to create optimal sprint backlogs.
                Consider story value, risk, dependencies, and team constraints.""",
                user_prompt_template="""
                Plan a sprint with the following inputs:
                
                Team Capacity: {team_capacity} story points
                Historical Velocity: {historical_velocity} points/sprint (last {velocity_sprints} sprints)
                
                Candidate Stories:
                {candidate_stories}
                
                Dependencies:
                {dependencies}
                
                Please provide:
                1. Recommended stories for the sprint (ranked by priority)
                2. Total story points and capacity utilization
                3. Risk assessment and mitigation suggestions
                4. Dependency warnings
                
                Format as JSON with structure:
                {{
                    "recommended_stories": [{{
                        "id": "story_id",
                        "title": "story_title", 
                        "points": number,
                        "priority_score": number,
                        "rationale": "explanation"
                    }}],
                    "total_points": number,
                    "capacity_utilization": percentage,
                    "risks": ["risk1", "risk2"],
                    "dependency_warnings": ["warning1"]
                }}
                """,
                variables=["team_capacity", "historical_velocity", "velocity_sprints", "candidate_stories", "dependencies"]
            ),
            
            "standup_reporter": PromptTemplate(
                name="standup_reporter",
                version="1.0",
                system_prompt="""You are a helpful assistant that creates concise daily standup reports.
                Summarize task updates into Yesterday/Today/Blockers format for individuals and teams.""",
                user_prompt_template="""
                Create standup reports from these task updates:
                
                Team: {team_name}
                Date: {date}
                
                Task Updates:
                {task_updates}
                
                Generate both individual and team summaries in this JSON format:
                {{
                    "team_summary": {{
                        "yesterday": ["completed_item1", "completed_item2"],
                        "today": ["planned_item1", "planned_item2"], 
                        "blockers": ["blocker1", "blocker2"]
                    }},
                    "individual_summaries": [{{
                        "user_id": "user_id",
                        "user_name": "name",
                        "yesterday": ["item1"],
                        "today": ["item1"],
                        "blockers": ["blocker1"]
                    }}]
                }}
                """,
                variables=["team_name", "date", "task_updates"]
            ),
            
            "retrospective_summarizer": PromptTemplate(
                name="retrospective_summarizer", 
                version="1.0",
                system_prompt="""You are an expert facilitator who analyzes retrospective feedback.
                Categorize team reflections and generate actionable improvement items.""",
                user_prompt_template="""
                Analyze this retrospective feedback and categorize it:
                
                Sprint: {sprint_name}
                Team: {team_name}
                
                Raw Feedback:
                {feedback_text}
                
                Categorize into JSON format:
                {{
                    "went_well": ["positive_item1", "positive_item2"],
                    "needs_improvement": ["improvement_area1", "improvement_area2"],
                    "action_items": [{{
                        "title": "action_title",
                        "description": "detailed_description", 
                        "priority": "high|medium|low",
                        "assignee_suggestion": "team_member_or_team",
                        "estimated_effort": "story_points_estimate"
                    }}]
                }}
                """,
                variables=["sprint_name", "team_name", "feedback_text"]
            ),
            
            "story_generator": PromptTemplate(
                name="story_generator",
                version="1.0",
                system_prompt="""You are an expert product manager and user story writer.
                Create detailed, well-structured user stories that follow INVEST principles and include 
                comprehensive acceptance criteria and relevant tags.""",
                user_prompt_template="""
                Generate a comprehensive user story based on this description:
                
                User Description: {user_description}
                Priority Level: {priority_level}
                Epic Context: {epic_context}
                Project Context: {project_context}
                Include Acceptance Criteria: {include_acceptance_criteria}
                Include Tags: {include_tags}
                
                Create a user story that includes:
                1. A clear, concise title following the "As a [user], I want [goal] so that [benefit]" format
                2. A detailed description that expands on the user's needs
                3. Acceptance criteria (if requested) - specific, testable conditions
                4. Relevant tags for categorization (if requested)
                5. Estimated story points (1, 2, 3, 5, 8, 13, 21)
                6. Confidence level and improvement suggestions
                
                Return JSON format:
                {{
                    "title": "As a [user type], I want [functionality] so that [benefit]",
                    "description": "Detailed description expanding on the user need and context",
                    "acceptance_criteria": [
                        "Given [context], when [action], then [outcome]",
                        "Additional criteria as needed"
                    ],
                    "tags": ["tag1", "tag2", "tag3"],
                    "story_points": estimated_number,
                    "confidence": 0.8,
                    "improvement_suggestions": [
                        "suggestion1",
                        "suggestion2"
                    ]
                }}
                """,
                variables=["user_description", "priority_level", "epic_context", "project_context", "include_acceptance_criteria", "include_tags"]
            ),
            
            "story_validator": PromptTemplate(
                name="story_validator",
                version="1.0", 
                system_prompt="""You are a quality assurance expert for user stories.
                Validate stories for clarity, completeness, and adherence to best practices.""",
                user_prompt_template="""
                Validate this user story:
                
                Title: {story_title}
                Description: {story_description}
                Acceptance Criteria: {acceptance_criteria}
                Story Points: {story_points}
                
                Check for:
                1. Clear user persona and goal
                2. Specific acceptance criteria
                3. Appropriate sizing
                4. Missing information
                5. INVEST criteria compliance
                
                Return JSON:
                {{
                    "is_valid": boolean,
                    "score": number_0_to_100,
                    "issues": [{{
                        "type": "error|warning|suggestion",
                        "category": "clarity|criteria|sizing|missing_info|invest",
                        "message": "specific_issue_description",
                        "suggestion": "how_to_fix"
                    }}],
                    "improvements": ["improvement1", "improvement2"]
                }}
                """,
                variables=["story_title", "story_description", "acceptance_criteria", "story_points"]
            ),
            
            "backlog_coach": PromptTemplate(
                name="backlog_coach",
                version="1.0",
                system_prompt="""You are a backlog refinement expert who identifies optimization opportunities.
                Suggest story splitting, merging, and dependency management improvements.""",
                user_prompt_template="""
                Analyze this backlog for refinement opportunities:
                
                Stories:
                {stories_data}
                
                Look for:
                1. Oversized stories that should be split
                2. Duplicate or similar stories to merge
                3. Dependency chains that create risk
                4. Missing stories for complete features
                
                Return JSON:
                {{
                    "split_suggestions": [{{
                        "story_id": "id",
                        "reason": "why_split",
                        "suggested_splits": [{{
                            "title": "new_story_title",
                            "description": "description",
                            "points": estimated_points
                        }}]
                    }}],
                    "merge_suggestions": [{{
                        "story_ids": ["id1", "id2"],
                        "reason": "why_merge",
                        "merged_title": "combined_title"
                    }}],
                    "dependency_warnings": [{{
                        "story_ids": ["id1", "id2"],
                        "risk_level": "high|medium|low", 
                        "mitigation": "suggested_approach"
                    }}],
                    "missing_stories": [{{
                        "title": "suggested_story",
                        "rationale": "why_needed"
                    }}]
                }}
                """,
                variables=["stories_data"]
            ),
            
            "release_notes": PromptTemplate(
                name="release_notes",
                version="1.0",
                system_prompt="""You are a technical writer who creates engaging release notes.
                Transform completed stories into user-friendly release documentation.""",
                user_prompt_template="""
                Generate release notes for:
                
                Release: {release_name}
                Version: {version}
                Date: {release_date}
                
                Completed Stories:
                {completed_stories}
                
                Custom Highlights:
                {custom_highlights}
                
                Create markdown release notes with:
                1. Executive summary
                2. New features (user-facing)
                3. Improvements and fixes
                4. Technical changes (if relevant)
                5. Breaking changes (if any)
                
                Use engaging, user-friendly language. Group related changes together.
                """,
                variables=["release_name", "version", "release_date", "completed_stories", "custom_highlights"]
            ),
            
            "risk_radar": PromptTemplate(
                name="risk_radar",
                version="1.0",
                system_prompt="""You are a project risk analyst who identifies potential issues early.
                Analyze work patterns, estimates, and blockers to predict and mitigate risks.""",
                user_prompt_template="""
                Analyze project risks from this data:
                
                Current Sprint:
                {current_sprint_data}
                
                Historical Blockers:
                {historical_blockers}
                
                Estimate Accuracy:
                {estimate_accuracy}
                
                Team Capacity Trends:
                {capacity_trends}
                
                Identify risks and return JSON:
                {{
                    "schedule_risks": [{{
                        "risk": "risk_description",
                        "probability": "high|medium|low",
                        "impact": "high|medium|low", 
                        "mitigation": "suggested_action",
                        "timeline": "when_to_act"
                    }}],
                    "scope_risks": [{{
                        "risk": "risk_description",
                        "probability": "high|medium|low",
                        "impact": "high|medium|low",
                        "mitigation": "suggested_action"
                    }}],
                    "team_risks": [{{
                        "risk": "risk_description", 
                        "indicators": ["warning_sign1", "warning_sign2"],
                        "mitigation": "suggested_action"
                    }}],
                    "overall_health": "green|yellow|red",
                    "priority_actions": ["action1", "action2"]
                }}
                """,
                variables=["current_sprint_data", "historical_blockers", "estimate_accuracy", "capacity_trends"]
            ),
            
            "velocity_insights": PromptTemplate(
                name="velocity_insights",
                version="1.0",
                system_prompt="""You are a velocity analysis expert who provides insights on team performance trends.
                Analyze velocity data and provide actionable recommendations for improvement.""",
                user_prompt_template="""
                Analyze velocity trends for team: {team_name}
                
                Velocity History: {velocity_history}
                Current Capacity: {current_capacity}
                Upcoming Work: {upcoming_work} story points
                
                Provide insights on:
                1. Velocity trends and patterns
                2. Capacity vs demand analysis
                3. Forecasting for upcoming work
                4. Recommendations for improvement
                
                Return concise analysis focusing on actionable insights.
                """,
                variables=["team_name", "velocity_history", "current_capacity", "upcoming_work"]
            )
        }
    
    async def generate_completion(
        self, 
        template_name: str, 
        variables: Dict[str, Any],
        custom_config: Optional[Dict[str, Any]] = None
    ) -> AIResponse:
        """Generate AI completion using a prompt template with fallback support"""
        start_time = datetime.now()
        
        try:
            template = self.prompt_templates.get(template_name)
            if not template:
                raise ValueError(f"Template '{template_name}' not found")
            
            # Validate variables
            missing_vars = set(template.variables) - set(variables.keys())
            if missing_vars:
                raise ValueError(f"Missing variables: {missing_vars}")
            
            # Format prompts
            user_prompt = template.user_prompt_template.format(**variables)
            
            # Apply custom config
            config = {
                "model": self.config.model,
                "max_tokens": template.max_tokens or self.config.max_tokens,
                "temperature": template.temperature or self.config.temperature
            }
            if custom_config:
                config.update(custom_config)
            
            # Try OpenAI first, then fallback to Anthropic
            response = None
            model_used = None
            tokens_used = 0
            content = None
            
            # Try OpenAI first
            if self.openai_client:
                try:
                    logger.info(f"Attempting OpenAI completion for template: {template_name}")
                    response = await self.openai_client.chat.completions.create(
                        model=config["model"],
                        messages=[
                            {"role": "system", "content": template.system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        max_tokens=config["max_tokens"],
                        temperature=config["temperature"]
                    )
                    
                    content = response.choices[0].message.content
                    tokens_used = response.usage.total_tokens
                    model_used = config["model"]
                    logger.info(f"OpenAI completion successful for template: {template_name}")
                    
                except Exception as e:
                    logger.warning(f"OpenAI failed for template {template_name}: {str(e)}")
                    content = None
            
            # Fallback to Anthropic if OpenAI failed or unavailable
            if not content and self.anthropic_client:
                try:
                    logger.info(f"Attempting Anthropic completion for template: {template_name}")
                    
                    # Combine system and user prompts for Anthropic
                    combined_prompt = f"{template.system_prompt}\n\nUser Request:\n{user_prompt}"
                    
                    anthropic_response = await self.anthropic_client.messages.create(
                        model=self.config.anthropic_model,
                        max_tokens=config["max_tokens"],
                        temperature=config["temperature"],
                        messages=[
                            {"role": "user", "content": combined_prompt}
                        ]
                    )
                    
                    content = anthropic_response.content[0].text
                    tokens_used = anthropic_response.usage.input_tokens + anthropic_response.usage.output_tokens
                    model_used = self.config.anthropic_model
                    logger.info(f"Anthropic completion successful for template: {template_name}")
                    
                except Exception as e:
                    logger.error(f"Anthropic also failed for template {template_name}: {str(e)}")
                    raise Exception(f"Both OpenAI and Anthropic failed. Last error: {str(e)}")
            
            if not content:
                raise Exception("No AI providers available or all failed")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Try to parse as JSON if template expects it
            try:
                if template_name in ["sprint_planning", "standup_reporter", "retrospective_summarizer", 
                                   "story_generator", "story_validator", "backlog_coach", "risk_radar"]:
                    data = json.loads(content)
                else:
                    data = content
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON response for template {template_name}, returning raw content")
                data = content
            
            return AIResponse(
                success=True,
                data=data,
                tokens_used=tokens_used,
                processing_time=processing_time,
                model_used=model_used
            )
            
        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.error(f"AI generation failed for template {template_name}: {str(e)}")
            
            return AIResponse(
                success=False,
                data=None,
                tokens_used=0,
                processing_time=processing_time,
                model_used="none",
                error=str(e)
            )
    
    async def batch_generate(
        self, 
        requests: List[Dict[str, Any]]
    ) -> List[AIResponse]:
        """Generate multiple completions concurrently"""
        tasks = []
        for req in requests:
            task = self.generate_completion(
                req["template_name"],
                req["variables"], 
                req.get("custom_config")
            )
            tasks.append(task)
        
        return await asyncio.gather(*tasks)

class EnhancedAIService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
    async def initialize_vector_tables(self):
        """Initialize vector tables for semantic search"""
        try:
            # Create vector extension if not exists
            self.supabase.rpc('create_vector_extension').execute()
            
            # Create embeddings table for stories
            create_embeddings_sql = """
            CREATE TABLE IF NOT EXISTS story_embeddings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                embedding vector(1536),
                metadata JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            CREATE INDEX IF NOT EXISTS story_embeddings_vector_idx 
            ON story_embeddings USING ivfflat (embedding vector_cosine_ops);
            
            CREATE TABLE IF NOT EXISTS project_insights (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                insight_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                confidence FLOAT NOT NULL,
                actionable_items JSONB,
                priority TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE
            );
            """
            
            self.supabase.rpc('execute_sql', {'sql': create_embeddings_sql}).execute()
            logger.info("Vector tables initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector tables: {e}")
            
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return []
    
    async def store_story_embedding(self, story_id: str, story_data: Dict[str, Any]):
        """Store story embedding for semantic search"""
        try:
            # Combine story content for embedding
            content_parts = [
                story_data.get('name', ''),
                story_data.get('description', ''),
                story_data.get('acceptance_criteria', ''),
                ' '.join(story_data.get('tags', []))
            ]
            content = ' '.join(filter(None, content_parts))
            
            if not content.strip():
                return
                
            embedding = await self.generate_embedding(content)
            if not embedding:
                return
                
            # Store embedding
            self.supabase.table('story_embeddings').upsert({
                'story_id': story_id,
                'content': content,
                'embedding': embedding,
                'metadata': {
                    'priority': story_data.get('priority'),
                    'status': story_data.get('status'),
                    'story_points': story_data.get('story_points'),
                    'epic_id': story_data.get('epic_id')
                }
            }, on_conflict='story_id').execute()
            
            logger.info(f"Stored embedding for story {story_id}")
            
        except Exception as e:
            logger.error(f"Failed to store story embedding: {e}")
    
    async def semantic_search_stories(self, query: str, project_id: str, limit: int = 10) -> List[VectorSearchResult]:
        """
        Perform semantic search on stories using vector embeddings
        """
        try:
            # Generate embedding for the search query
            query_embedding = await self.generate_embedding(query)
            
            # Perform vector similarity search
            # Note: This requires pgvector extension in PostgreSQL
            search_query = f"""
            SELECT 
                s.id,
                s.name as content,
                s.description,
                1 - (s.embedding <=> '{query_embedding}') as similarity,
                json_build_object(
                    'epic_name', e.name,
                    'project_id', e.project_id,
                    'story_points', s.story_points,
                    'status', s.status
                ) as metadata
            FROM stories s
            JOIN epics e ON s.epic_id = e.id
            WHERE e.project_id = '{project_id}'
            AND s.embedding IS NOT NULL
            ORDER BY s.embedding <=> '{query_embedding}'
            LIMIT {limit};
            """
            
            result = self.supabase.rpc('execute_sql', {'query': search_query}).execute()
            
            search_results = []
            for row in result.data:
                search_results.append(VectorSearchResult(
                    id=row['id'],
                    content=row['content'],
                    similarity=row['similarity'],
                    metadata=row['metadata']
                ))
            
            return search_results
            
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            # Fallback to text search
            return await self._fallback_text_search(query, project_id, limit)
    
    async def _fallback_text_search(self, query: str, project_id: str, limit: int) -> List[VectorSearchResult]:
        """Fallback text search when vector search fails"""
        try:
            result = self.supabase.table('stories').select(
                '*, epics!inner(project_id, name)'
            ).eq('epics.project_id', project_id).or_(
                f'name.ilike.%{query}%,description.ilike.%{query}%'
            ).limit(limit).execute()
            
            search_results = []
            for story in result.data:
                search_results.append(VectorSearchResult(
                    id=story['id'],
                    content=story['name'],
                    similarity=0.5,  # Default similarity for text search
                    metadata={
                        'epic_name': story['epics']['name'],
                        'project_id': story['epics']['project_id'],
                        'story_points': story.get('story_points', 0),
                        'status': story.get('status', 'backlog')
                    }
                ))
            
            return search_results
            
        except Exception as e:
            logger.error(f"Fallback text search failed: {e}")
            return []

    async def generate_intelligent_story_recommendations(self, epic_id: str, project_context: str) -> List[StoryRecommendation]:
        """
        Generate intelligent story recommendations based on epic context and similar projects
        """
        try:
            # Get epic information
            epic_result = self.supabase.table('epics').select('*, projects(*)').eq('id', epic_id).execute()
            if not epic_result.data:
                raise ValueError(f"Epic {epic_id} not found")
            
            epic = epic_result.data[0]
            
            # Get existing stories in the epic for context
            existing_stories = self.supabase.table('stories').select('name, description').eq('epic_id', epic_id).execute()
            
            # Prepare context for AI
            context = {
                "epic_name": epic['name'],
                "epic_description": epic.get('description', ''),
                "project_name": epic['projects']['name'],
                "project_context": project_context,
                "existing_stories": [
                    {"name": s['name'], "description": s.get('description', '')}
                    for s in existing_stories.data
                ]
            }
            
            # Generate recommendations using AI
            basic_ai = get_basic_ai_service()
            
            variables = {
                "epic_name": context["epic_name"],
                "epic_description": context["epic_description"],
                "project_context": context["project_context"],
                "existing_stories": json.dumps(context["existing_stories"], indent=2)
            }
            
            ai_response = await basic_ai.generate_completion("story_generator", variables)
            
            if not ai_response.success:
                logger.error(f"AI story generation failed: {ai_response.error}")
                return []
            
            # Parse AI response and create recommendations
            recommendations = []
            try:
                ai_data = json.loads(ai_response.data) if isinstance(ai_response.data, str) else ai_response.data
                
                if isinstance(ai_data, list):
                    for item in ai_data:
                        recommendations.append(StoryRecommendation(
                            title=item.get('title', 'Generated Story'),
                            description=item.get('description', ''),
                            acceptance_criteria=item.get('acceptance_criteria', ''),
                            story_points=item.get('story_points', 3),
                            priority=item.get('priority', 'medium'),
                            reasoning=item.get('reasoning', 'AI generated recommendation'),
                            confidence=item.get('confidence', 0.7)
                        ))
                else:
                    # Single recommendation
                    recommendations.append(StoryRecommendation(
                        title=ai_data.get('title', 'Generated Story'),
                        description=ai_data.get('description', ''),
                        acceptance_criteria=ai_data.get('acceptance_criteria', ''),
                        story_points=ai_data.get('story_points', 3),
                        priority=ai_data.get('priority', 'medium'),
                        reasoning=ai_data.get('reasoning', 'AI generated recommendation'),
                        confidence=ai_data.get('confidence', 0.7)
                    ))
                    
            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"Failed to parse AI recommendations: {e}")
                # Create a fallback recommendation
                recommendations.append(StoryRecommendation(
                    title=f"Story for {epic['name']}",
                    description=f"Generated story based on {project_context}",
                    acceptance_criteria="To be defined",
                    story_points=3,
                    priority="medium",
                    reasoning="Fallback recommendation due to AI parsing error",
                    confidence=0.3
                ))
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Story recommendation generation failed: {e}")
            return []

    async def analyze_project_health(self, project_id: str) -> List[AIInsight]:
        """
        Analyze project health and provide AI-powered insights
        """
        try:
            # Get project analytics data
            project_data = await self._get_project_analytics_data(project_id)
            
            insights = []
            
            # Analyze different aspects of project health
            velocity_insight = await self._analyze_velocity_trends(project_data)
            if velocity_insight:
                insights.append(velocity_insight)
            
            quality_insight = await self._analyze_quality_metrics(project_data)
            if quality_insight:
                insights.append(quality_insight)
            
            resource_insight = await self._analyze_resource_allocation(project_data)
            if resource_insight:
                insights.append(resource_insight)
            
            risk_insight = await self._analyze_project_risks(project_data)
            if risk_insight:
                insights.append(risk_insight)
            
            # Store insights in database for future reference
            for insight in insights:
                await self._store_project_insight(project_id, insight)
            
            return insights
            
        except Exception as e:
            logger.error(f"Project health analysis failed: {e}")
            return []

    async def _get_project_analytics_data(self, project_id: str) -> Dict[str, Any]:
        """Get comprehensive project data for analysis"""
        try:
            # Get project details
            project_result = self.supabase.table('projects').select('*').eq('id', project_id).execute()
            project = project_result.data[0] if project_result.data else {}
            
            # Get epics and stories
            epics_result = self.supabase.table('epics').select('*').eq('project_id', project_id).execute()
            epics = epics_result.data
            
            stories_result = self.supabase.table('stories').select('*, epics!inner(project_id)').eq('epics.project_id', project_id).execute()
            stories = stories_result.data
            
            # Get team members (simplified - would need proper team association)
            team_members_result = self.supabase.table('users').select('*').limit(10).execute()
            team_members = team_members_result.data
            
            # Get recent activity (last 30 days)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            recent_stories = [s for s in stories if s.get('updated_at', '') >= thirty_days_ago]
            
            return {
                'project': project,
                'epics': epics,
                'stories': stories,
                'recent_stories': recent_stories,
                'team_members': team_members,
                'total_story_points': sum(s.get('story_points', 0) for s in stories if s.get('story_points')),
                'completed_story_points': sum(s.get('story_points', 0) for s in stories if s.get('status') == 'done' and s.get('story_points'))
            }
            
        except Exception as e:
            logger.error(f"Failed to get project analytics data: {e}")
            return {}
    
    async def _analyze_velocity_trends(self, project_data: Dict[str, Any]) -> Optional[AIInsight]:
        """Analyze velocity trends and provide insights"""
        try:
            stories = project_data.get('stories', [])
            recent_stories = project_data.get('recent_stories', [])
            
            if len(stories) < 5:
                return None
            
            # Calculate velocity metrics
            completed_stories = [s for s in stories if s.get('status') == 'done']
            recent_completed = [s for s in recent_stories if s.get('status') == 'done']
            
            total_points = sum(s.get('story_points', 0) for s in completed_stories if s.get('story_points'))
            recent_points = sum(s.get('story_points', 0) for s in recent_completed if s.get('story_points'))
            
            # Analyze trends
            if len(completed_stories) > 0:
                avg_velocity = total_points / max(len(completed_stories), 1)
                recent_velocity = recent_points / max(len(recent_completed), 1) if recent_completed else 0
                
                if recent_velocity < avg_velocity * 0.8:
                    return AIInsight(
                        type="velocity",
                        title="Velocity Decline Detected",
                        description=f"Team velocity has decreased by {((avg_velocity - recent_velocity) / avg_velocity * 100):.1f}% in recent sprints.",
                        confidence=0.85,
                        actionable_items=[
                            "Review team capacity and workload distribution",
                            "Identify and address blockers in current sprint",
                            "Consider story point estimation accuracy",
                            "Schedule team retrospective to identify improvement areas"
                        ],
                        priority="high"
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to analyze velocity trends: {e}")
            return None
    
    async def _analyze_quality_metrics(self, project_data: Dict[str, Any]) -> Optional[AIInsight]:
        """Analyze quality metrics and provide insights"""
        try:
            stories = project_data.get('stories', [])
            
            if not stories:
                return None
            
            # Analyze story quality indicators
            stories_without_acceptance_criteria = [s for s in stories if not s.get('acceptance_criteria')]
            stories_without_points = [s for s in stories if not s.get('story_points')]
            high_point_stories = [s for s in stories if s.get('story_points', 0) > 13]
            
            quality_issues = []
            if len(stories_without_acceptance_criteria) > len(stories) * 0.3:
                quality_issues.append(f"{len(stories_without_acceptance_criteria)} stories lack acceptance criteria")
            
            if len(stories_without_points) > len(stories) * 0.2:
                quality_issues.append(f"{len(stories_without_points)} stories are not estimated")
            
            if len(high_point_stories) > len(stories) * 0.1:
                quality_issues.append(f"{len(high_point_stories)} stories are too large (>13 points)")
            
            if quality_issues:
                return AIInsight(
                    type="quality",
                    title="Story Quality Issues Detected",
                    description=f"Quality analysis found several areas for improvement: {', '.join(quality_issues)}",
                    confidence=0.9,
                    actionable_items=[
                        "Add acceptance criteria to stories without them",
                        "Estimate unestimated stories in next planning session",
                        "Break down large stories into smaller, manageable pieces",
                        "Establish story definition of ready checklist"
                    ],
                    priority="medium"
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to analyze quality metrics: {e}")
            return None
    
    async def _analyze_resource_allocation(self, project_data: Dict[str, Any]) -> Optional[AIInsight]:
        """Analyze resource allocation and provide insights"""
        try:
            stories = project_data.get('stories', [])
            team_members = project_data.get('team_members', [])
            
            # Analyze workload distribution
            assignee_workload = {}
            unassigned_stories = []
            
            for story in stories:
                if story.get('status') not in ['done', 'cancelled']:
                    assignee_id = story.get('assignee_id')
                    if assignee_id:
                        if assignee_id not in assignee_workload:
                            assignee_workload[assignee_id] = 0
                        assignee_workload[assignee_id] += story.get('story_points', 0)
                    else:
                        unassigned_stories.append(story)
            
            # Check for workload imbalance
            if len(assignee_workload) > 1:
                workloads = list(assignee_workload.values())
                max_workload = max(workloads)
                min_workload = min(workloads)
                
                if max_workload > min_workload * 2:
                    return AIInsight(
                        type="resource_allocation",
                        title="Workload Imbalance Detected",
                        description=f"Significant workload imbalance detected. Highest assigned: {max_workload} points, lowest: {min_workload} points. {len(unassigned_stories)} stories remain unassigned.",
                        confidence=0.8,
                        actionable_items=[
                            "Redistribute work to balance team workload",
                            "Assign unassigned stories to available team members",
                            "Consider team capacity in future sprint planning",
                            "Review team member availability and skills"
                        ],
                        priority="medium"
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to analyze resource allocation: {e}")
            return None
    
    async def _analyze_project_risks(self, project_data: Dict[str, Any]) -> Optional[AIInsight]:
        """Analyze project risks and provide insights"""
        try:
            stories = project_data.get('stories', [])
            epics = project_data.get('epics', [])
            
            # Identify potential risks
            risks = []
            
            # Check for blocked stories
            blocked_stories = [s for s in stories if s.get('status') == 'blocked']
            if len(blocked_stories) > 0:
                risks.append(f"{len(blocked_stories)} stories are currently blocked")
            
            # Check for overdue stories
            overdue_stories = [s for s in stories if s.get('status') in ['in_progress', 'review'] and s.get('updated_at')]
            if len(overdue_stories) > len(stories) * 0.2:
                risks.append(f"{len(overdue_stories)} stories may be overdue")
            
            # Check for incomplete epics near deadline
            incomplete_epics = [e for e in epics if e.get('status') != 'completed']
            if len(incomplete_epics) > len(epics) * 0.8:
                risks.append(f"{len(incomplete_epics)} epics are still incomplete")
            
            if risks:
                return AIInsight(
                    type="risk",
                    title="Project Risks Identified",
                    description=f"Risk analysis identified potential issues: {', '.join(risks)}",
                    confidence=0.75,
                    actionable_items=[
                        "Address blocked stories immediately",
                        "Review and update story statuses",
                        "Reassess epic timelines and scope",
                        "Implement daily standups to track progress"
                    ],
                    priority="high"
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to analyze project risks: {e}")
            return None
    
    async def _store_project_insight(self, project_id: str, insight: AIInsight):
        """Store project insight in database"""
        try:
            self.supabase.table('project_insights').insert({
                'project_id': project_id,
                'insight_type': insight.type,
                'title': insight.title,
                'description': insight.description,
                'confidence': insight.confidence,
                'actionable_items': insight.actionable_items,
                'priority': insight.priority,
                'is_active': True,
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Failed to store project insight: {e}")

# Global AI service instance
ai_service: Optional[AIService] = None
enhanced_ai_service: Optional[EnhancedAIService] = None

def init_ai_service(supabase: Client) -> EnhancedAIService:
    """Initialize the global AI service instance"""
    global ai_service, enhanced_ai_service
    
    try:
        # Initialize basic AI service
        ai_service = AIService()
        logger.info("Basic AI service initialized")
        
        # Initialize enhanced AI service with vector capabilities
        enhanced_ai_service = EnhancedAIService(supabase)
        logger.info("Enhanced AI service initialized")
        
        return enhanced_ai_service
    except Exception as e:
        logger.error(f"Failed to initialize AI service: {e}")
        raise

def get_ai_service() -> EnhancedAIService:
    """Get the global enhanced AI service instance"""
    if enhanced_ai_service is None:
        raise RuntimeError("AI service not initialized. Call init_ai_service() first.")
    return enhanced_ai_service

def get_basic_ai_service() -> AIService:
    """Get the basic AI service instance"""
    if ai_service is None:
        raise RuntimeError("Basic AI service not initialized. Call init_ai_service() first.")
    return ai_service
