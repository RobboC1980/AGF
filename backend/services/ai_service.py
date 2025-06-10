import os
import json
import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from openai import AsyncOpenAI
import anthropic
from pydantic import BaseModel, Field
import logging

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
    success: bool
    data: Any
    tokens_used: int
    processing_time: float
    model_used: str
    error: Optional[str] = None

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

# Global AI service instance
ai_service = AIService()
