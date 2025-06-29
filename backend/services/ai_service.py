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
    """Core AI service for all SynqForge AI features"""
    
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
                self.anthropic_client = None
        
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
            
            "analytics_insights": PromptTemplate(
                name="analytics_insights",
                version="2.0",
                system_prompt="""You are an expert Agile metrics analyst and data scientist specializing in development team performance analysis.

ANALYTICS EXPERTISE:
- **Velocity Analysis**: Understand story point delivery patterns, capacity planning, and predictive forecasting
- **Cycle Time Optimization**: Identify bottlenecks in development workflow and suggest improvements  
- **Team Performance**: Analyze individual and team productivity patterns
- **Quality Metrics**: Assess defect rates, rework patterns, and quality trends
- **Predictive Analytics**: Forecast delivery dates, identify risks, and recommend optimizations

INSIGHT CATEGORIES:
- **Performance Trends**: Velocity, throughput, cycle time analysis
- **Risk Identification**: Early warning signs of project delays or quality issues
- **Optimization Opportunities**: Process improvements and efficiency gains
- **Capacity Planning**: Resource allocation and sprint planning recommendations
- **Quality Analysis**: Defect patterns, rework reduction strategies""",
                user_prompt_template="""
                Analyze this project data and generate comprehensive insights:
                
                **PROJECT OVERVIEW:**
                Project: {project_name}
                Analysis Period: {analysis_period} days
                Team Size: {team_size} members
                
                **PERFORMANCE METRICS:**
                Current Velocity: {current_velocity} points/sprint
                Historical Velocity: {historical_velocities}
                Completion Rate: {completion_rate}%
                Average Cycle Time: {avg_cycle_time} days
                
                **STORY BREAKDOWN:**
                Total Stories: {total_stories}
                Completed: {completed_stories}
                In Progress: {in_progress_stories}
                Backlog: {backlog_stories}
                
                **QUALITY METRICS:**
                Bug Rate: {bug_rate}%
                Rework Rate: {rework_rate}%
                Priority Distribution: {priority_distribution}
                
                **TEAM PERFORMANCE:**
                {team_performance_data}
                
                **BLOCKERS & ISSUES:**
                {current_blockers}
                
                GENERATE ANALYTICS INSIGHTS:
                
                1. **Performance Analysis**: Velocity trends, cycle time patterns, throughput analysis
                2. **Risk Assessment**: Identify potential delivery risks and quality concerns
                3. **Optimization Recommendations**: Specific actionable improvements
                4. **Predictive Insights**: Forecast delivery timelines and capacity needs
                5. **Team Health**: Workload balance, performance gaps, collaboration patterns
                
                Return ONLY this JSON structure:
                {{
                    "overall_health": "excellent|good|warning|critical",
                    "health_score": 85,
                    "key_insights": [
                        {{
                            "category": "velocity|cycle_time|quality|team_performance|capacity",
                            "insight": "Specific data-driven observation",
                            "impact": "high|medium|low",
                            "trend": "improving|declining|stable",
                            "recommendation": "Specific actionable advice"
                        }}
                    ],
                    "performance_trends": {{
                        "velocity_trend": "increasing|decreasing|stable",
                        "velocity_change": "+12%",
                        "cycle_time_trend": "improving|worsening|stable", 
                        "cycle_time_change": "-2.3 days",
                        "quality_trend": "improving|declining|stable"
                    }},
                    "risk_alerts": [
                        {{
                            "risk_type": "schedule|scope|quality|team",
                            "risk_level": "high|medium|low",
                            "description": "Clear description of the risk",
                            "probability": "high|medium|low",
                            "impact": "high|medium|low",
                            "mitigation": "Specific mitigation strategy",
                            "timeline": "immediate|1-2 weeks|1 month"
                        }}
                    ],
                    "optimization_opportunities": [
                        {{
                            "area": "workflow|planning|quality|team",
                            "opportunity": "Specific improvement opportunity",
                            "potential_impact": "High: +15% velocity improvement",
                            "effort_required": "low|medium|high",
                            "implementation": "Step-by-step implementation plan"
                        }}
                    ],
                    "capacity_forecast": {{
                        "next_sprint_capacity": 42,
                        "recommended_story_points": 38,
                        "confidence_level": "high|medium|low",
                        "capacity_utilization": "90%",
                        "delivery_forecast": "3 weeks for remaining 120 points"
                    }},
                    "team_insights": [
                        {{
                            "insight_type": "performance|workload|collaboration|skills",
                            "description": "Team-specific observation",
                            "affected_members": ["member1", "member2"],
                            "recommendation": "Specific team improvement action"
                        }}
                    ],
                    "actionable_recommendations": [
                        {{
                            "priority": "high|medium|low",
                            "category": "process|team|quality|planning",
                            "action": "Specific action to take",
                            "owner": "team_lead|scrum_master|product_owner|team",
                            "timeline": "immediate|this_sprint|next_sprint",
                            "success_criteria": "How to measure success"
                        }}
                    ],
                    "confidence_score": 0.92
                }}
                """,
                variables=["project_name", "analysis_period", "team_size", "current_velocity", "historical_velocities", 
                         "completion_rate", "avg_cycle_time", "total_stories", "completed_stories", "in_progress_stories", 
                         "backlog_stories", "bug_rate", "rework_rate", "priority_distribution", "team_performance_data", "current_blockers"]
            ),
            
            "velocity_forecasting": PromptTemplate(
                name="velocity_forecasting",
                version="1.0", 
                system_prompt="""You are a predictive analytics expert specializing in Agile team velocity forecasting.
                Use historical data patterns to predict future performance and provide capacity planning insights.""",
                user_prompt_template="""
                Generate velocity forecasting based on this data:
                
                Team: {team_name}
                Historical Velocity: {velocity_history}
                Current Sprint Capacity: {current_capacity} points
                Upcoming Work: {upcoming_work} points
                Team Changes: {team_changes}
                
                External Factors:
                - Holidays/PTO: {pto_periods}
                - New Team Members: {new_members}
                - Technology Changes: {tech_changes}
                
                Provide forecasting analysis:
                
                Return JSON:
                {{
                    "velocity_forecast": {{
                        "next_sprint": {{
                            "predicted_velocity": 35,
                            "confidence_range": "30-40 points",
                            "confidence_level": "high"
                        }},
                        "next_3_sprints": [35, 38, 40],
                        "trend_prediction": "stable_growth"
                    }},
                    "capacity_recommendations": {{
                        "optimal_commitment": 32,
                        "stretch_commitment": 38,
                        "safe_commitment": 28,
                        "rationale": "Based on 85% confidence level"
                    }},
                    "delivery_timeline": {{
                        "remaining_work_weeks": 8.5,
                        "estimated_completion": "2024-03-15",
                        "risk_factors": ["holiday_period", "new_team_member"]
                    }},
                    "influencing_factors": [
                        {{
                            "factor": "team_stability",
                            "impact": "positive|negative|neutral",
                            "magnitude": "high|medium|low",
                            "description": "How this affects velocity"
                        }}
                    ]
                }}
                """,
                variables=["team_name", "velocity_history", "current_capacity", "upcoming_work", "team_changes", "pto_periods", "new_members", "tech_changes"]
            ),
            
            "burndown_analysis": PromptTemplate(
                name="burndown_analysis",
                version="1.0",
                system_prompt="""You are a burndown chart analysis expert who identifies patterns and provides sprint guidance.
                Analyze burndown data to assess sprint health and provide real-time recommendations.""",
                user_prompt_template="""
                Analyze this sprint burndown data:
                
                Sprint: {sprint_name}
                Sprint Length: {sprint_days} days
                Days Remaining: {days_remaining}
                
                Burndown Data:
                {burndown_data}
                
                Ideal vs Actual:
                {ideal_vs_actual}
                
                Story Completion Pattern:
                {story_completion_pattern}
                
                Analyze burndown health and provide recommendations:
                
                Return JSON:
                {{
                    "sprint_health": "on_track|at_risk|behind|ahead",
                    "completion_probability": 85,
                    "burndown_pattern": "healthy|late_start|irregular|frontend_loaded",
                    "key_observations": [
                        "Slow start in first 3 days",
                        "Accelerated completion in middle sprint",
                        "Large stories completed late"
                    ],
                    "risk_assessment": {{
                        "primary_risks": ["scope_creep", "blocking_dependencies"],
                        "risk_level": "medium",
                        "mitigation_actions": [
                            "Focus on completing current stories before starting new ones",
                            "Address blocker in story ABC-123"
                        ]
                    }},
                    "recommendations": {{
                        "immediate_actions": [
                            "Daily focus on story completion",
                            "Identify and resolve blockers"
                        ],
                        "process_improvements": [
                            "Break down large stories earlier",
                            "Improve story estimation accuracy"
                        ]
                    }},
                    "forecast": {{
                        "likely_completion": "95% of sprint goal",
                        "completion_date": "Sprint end - 1 day",
                        "at_risk_stories": ["story1", "story2"]
                    }}
                }}
                """,
                variables=["sprint_name", "sprint_days", "days_remaining", "burndown_data", "ideal_vs_actual", "story_completion_pattern"]
            ),
            
            "team_performance_analysis": PromptTemplate(
                name="team_performance_analysis", 
                version="1.0",
                system_prompt="""You are a team performance analyst who provides insights on individual and team productivity.
                Focus on constructive feedback and growth opportunities while maintaining team morale.""",
                user_prompt_template="""
                Analyze team performance data:
                
                Team: {team_name}
                Analysis Period: {analysis_period}
                
                Individual Performance:
                {individual_metrics}
                
                Team Collaboration Metrics:
                {collaboration_metrics}
                
                Workload Distribution:
                {workload_distribution}
                
                Skill Utilization:
                {skill_utilization}
                
                Provide performance insights and development recommendations:
                
                Return JSON:
                {{
                    "team_health": "high_performing|balanced|needs_attention",
                    "performance_summary": {{
                        "strengths": ["strong_collaboration", "consistent_delivery"],
                        "improvement_areas": ["story_estimation", "testing_coverage"],
                        "overall_trend": "improving|stable|declining"
                    }},
                    "individual_insights": [
                        {{
                            "member_id": "anonymous_1",
                            "strengths": ["technical_skills", "problem_solving"],
                            "development_areas": ["estimation_accuracy"],
                            "recommended_actions": ["pair_programming", "estimation_training"],
                            "support_needed": "medium"
                        }}
                    ],
                    "workload_analysis": {{
                        "distribution_balance": "well_balanced|uneven|concerning",
                        "overloaded_members": 0,
                        "underutilized_members": 1,
                        "rebalancing_suggestions": [
                            "Consider redistributing complex stories"
                        ]
                    }},
                    "collaboration_insights": {{
                        "pair_programming_effectiveness": "high",
                        "knowledge_sharing": "good",
                        "cross_functional_collaboration": "needs_improvement",
                        "recommendations": [
                            "Increase cross-functional story assignments"
                        ]
                    }},
                    "development_recommendations": [
                        {{
                            "focus_area": "technical_skills|soft_skills|process",
                            "recommendation": "Specific development action",
                            "target_audience": "individual|team|leads",
                            "priority": "high|medium|low"
                        }}
                    ]
                }}
                """,
                variables=["team_name", "analysis_period", "individual_metrics", "collaboration_metrics", "workload_distribution", "skill_utilization"]
            ),
            
            "quality_trends_analysis": PromptTemplate(
                name="quality_trends_analysis",
                version="1.0",
                system_prompt="""You are a quality assurance analyst who identifies patterns in defects, rework, and quality metrics.
                Provide insights to improve development quality and reduce technical debt.""",
                user_prompt_template="""
                Analyze quality trends and metrics:
                
                Project: {project_name}
                Time Period: {time_period}
                
                Defect Metrics:
                {defect_metrics}
                
                Rework Patterns:
                {rework_patterns}
                
                Code Quality Metrics:
                {code_quality_metrics}
                
                Testing Coverage:
                {testing_coverage}
                
                User Feedback/Bugs:
                {user_feedback}
                
                Analyze quality trends and provide improvement recommendations:
                
                Return JSON:
                {{
                    "quality_health": "excellent|good|concerning|poor",
                    "quality_score": 82,
                    "defect_analysis": {{
                        "defect_rate_trend": "improving|stable|worsening",
                        "defect_rate": "2.1%",
                        "severity_distribution": {{
                            "critical": 1,
                            "high": 3,
                            "medium": 8,
                            "low": 12
                        }},
                        "common_defect_types": ["UI_bugs", "validation_errors", "integration_issues"]
                    }},
                    "rework_insights": {{
                        "rework_rate": "8%",
                        "rework_trend": "decreasing",
                        "primary_rework_causes": [
                            "changing_requirements",
                            "insufficient_testing",
                            "unclear_acceptance_criteria"
                        ],
                        "cost_impact": "medium"
                    }},
                    "quality_patterns": [
                        {{
                            "pattern": "Higher defect rate in complex features",
                            "impact": "medium",
                            "recommendation": "Increase testing for complex stories"
                        }},
                        {{
                            "pattern": "UI bugs spike after design changes", 
                            "impact": "low",
                            "recommendation": "Implement design review checkpoints"
                        }}
                    ],
                    "improvement_recommendations": [
                        {{
                            "category": "process|tools|training|reviews",
                            "recommendation": "Specific quality improvement action",
                            "expected_impact": "high|medium|low",
                            "implementation_effort": "low|medium|high",
                            "timeline": "immediate|short_term|long_term"
                        }}
                    ],
                    "preventive_measures": [
                        "Implement code review checklists",
                        "Enhance automated testing coverage",
                        "Add integration testing for API changes"
                    ]
                }}
                """,
                variables=["project_name", "time_period", "defect_metrics", "rework_patterns", "code_quality_metrics", "testing_coverage", "user_feedback"]
            ),
            
            "capacity_planning": PromptTemplate(
                name="capacity_planning",
                version="1.0",
                system_prompt="""You are a capacity planning expert who helps teams optimize resource allocation and sprint planning.
                Consider team skills, availability, story complexity, and dependencies.""",
                user_prompt_template="""
                Analyze capacity and provide planning recommendations:
                
                Team Composition:
                {team_composition}
                
                Upcoming Work:
                {upcoming_stories}
                
                Team Availability:
                {team_availability}
                
                Historical Performance:
                {historical_performance}
                
                Dependencies & Constraints:
                {dependencies_constraints}
                
                Skill Requirements:
                {skill_requirements}
                
                Provide capacity planning analysis and recommendations:
                
                Return JSON:
                {{
                    "capacity_analysis": {{
                        "total_available_hours": 320,
                        "estimated_velocity": 38,
                        "capacity_utilization": "85%",
                        "buffer_recommendation": "15%"
                    }},
                    "resource_allocation": [
                        {{
                            "team_member": "developer_1",
                            "allocated_hours": 40,
                            "story_assignments": ["story1", "story2"],
                            "skill_match": "excellent|good|adequate",
                            "workload_level": "optimal|high|low"
                        }}
                    ],
                    "planning_recommendations": {{
                        "sprint_goal_feasibility": "achievable|aggressive|conservative",
                        "recommended_story_points": 35,
                        "story_prioritization": [
                            {{
                                "story_id": "story1",
                                "priority_reason": "critical_dependency",
                                "complexity_factor": "medium",
                                "skill_availability": "high"
                            }}
                        ]
                    }},
                    "risk_mitigation": {{
                        "capacity_risks": [
                            "Single point of failure in frontend skills",
                            "Dependency on external API completion"
                        ],
                        "mitigation_strategies": [
                            "Cross-train team member in frontend",
                            "Create contingency plan for API delay"
                        ]
                    }},
                    "optimization_suggestions": [
                        {{
                            "area": "skill_distribution|workload_balance|story_sizing",
                            "suggestion": "Specific optimization recommendation",
                            "impact": "Improved team efficiency by 15%"
                        }}
                    ]
                }}
                """,
                variables=["team_composition", "upcoming_stories", "team_availability", "historical_performance", "dependencies_constraints", "skill_requirements"]
            ),
            
            "retrospective_insights": PromptTemplate(
                name="retrospective_insights",
                version="1.0",
                system_prompt="""You are a retrospective facilitator who analyzes team feedback and identifies actionable improvements.
                Focus on constructive insights that promote team growth and process optimization.""",
                user_prompt_template="""
                Analyze retrospective feedback and generate insights:
                
                Sprint: {sprint_name}
                Team: {team_name}
                
                Feedback Categories:
                What Went Well: {went_well}
                What Didn't Go Well: {went_poorly}
                Improvement Ideas: {improvement_ideas}
                Action Items from Last Retro: {previous_actions}
                
                Team Sentiment:
                {team_sentiment}
                
                Metrics Context:
                {sprint_metrics}
                
                Generate comprehensive retrospective insights:
                
                Return JSON:
                {{
                    "retrospective_summary": {{
                        "overall_sentiment": "positive|neutral|negative",
                        "key_themes": ["communication", "process_efficiency", "technical_debt"],
                        "improvement_momentum": "strong|moderate|weak"
                    }},
                    "pattern_analysis": [
                        {{
                            "pattern": "Recurring issue pattern identified",
                            "frequency": "3_out_of_5_sprints",
                            "impact": "high|medium|low",
                            "root_cause": "Likely underlying cause",
                            "trend": "increasing|stable|decreasing"
                        }}
                    ],
                    "success_factors": [
                        {{
                            "factor": "What contributed to success",
                            "impact": "Specific positive outcome",
                            "replication_strategy": "How to maintain this success"
                        }}
                    ],
                    "improvement_opportunities": [
                        {{
                            "category": "process|communication|technical|planning",
                            "opportunity": "Specific improvement area",
                            "current_impact": "How this affects the team now",
                            "potential_benefit": "Expected improvement outcome",
                            "effort_required": "low|medium|high"
                        }}
                    ],
                    "action_item_recommendations": [
                        {{
                            "action": "Specific, actionable item",
                            "category": "process|tool|training|communication",
                            "priority": "high|medium|low",
                            "owner": "role_or_team",
                            "timeline": "this_sprint|next_sprint|ongoing",
                            "success_criteria": "How to measure success",
                            "effort_estimate": "hours_or_story_points"
                        }}
                    ],
                    "follow_up_suggestions": {{
                        "check_in_frequency": "weekly|biweekly|next_retro",
                        "metrics_to_track": ["cycle_time", "team_satisfaction"],
                        "experiment_ideas": [
                            "Trial new process for 2 sprints",
                            "Implement daily standup improvements"
                        ]
                    }}
                }}
                """,
                variables=["sprint_name", "team_name", "went_well", "went_poorly", "improvement_ideas", "previous_actions", "team_sentiment", "sprint_metrics"]
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
            
            "epic_generator": PromptTemplate(
                name="epic_generator",
                version="2.0",
                system_prompt="""You are an expert product manager and Agile coach specializing in epic creation.

EPIC DEFINITION: An Epic is a large work item that contains multiple user stories and represents a significant business capability or outcome. Epics are too large to complete in a single sprint and should deliver measurable business value.

EPIC BEST PRACTICES:
- Focus on business outcomes, not technical features
- Should be valuable to end users or the business
- Contains 3-10 user stories typically
- Takes 2-6 sprints to complete
- Has clear success criteria and acceptance criteria
- Aligns with strategic business objectives""",
                user_prompt_template="""
                Generate a comprehensive epic based on this input:
                
                User Description: {user_description}
                Priority Level: {priority_level}
                Project Context: {project_context}
                Business Value: {business_value}
                Include Acceptance Criteria: {include_acceptance_criteria}
                Include Story Breakdown: {include_story_breakdown}
                
                CREATE AN EPIC THAT INCLUDES:
                
                1. **Epic Title**: Clear, outcome-focused title (not feature-focused)
                2. **Business Description**: Explains WHY this epic matters to the business/users
                3. **Success Criteria**: Measurable outcomes that define epic completion
                4. **Acceptance Criteria**: High-level conditions for epic acceptance
                5. **Story Breakdown**: 3-8 potential user stories within this epic
                6. **Epic Sizing**: Total story points (21, 34, 55, 89, 144)
                7. **Business Impact**: Clear value proposition and impact areas
                8. **Implementation Strategy**: Suggested approach and risks
                
                EPIC ACCEPTANCE CRITERIA GUIDELINES:
                - Focus on business outcomes, not technical features
                - Measurable and verifiable conditions
                - Address key user journeys and business processes
                - Include non-functional requirements (performance, security, etc.)
                
                Return ONLY this JSON structure:
                {{
                    "name": "Outcome-focused epic title that describes business value",
                    "description": "Comprehensive description explaining business need, user value, and strategic importance. Include context, current pain points, and desired future state.",
                    "acceptance_criteria": [
                        "Users can successfully complete [key business process] with 95% success rate",
                        "System handles [performance requirement] with [specific metric]",
                        "Business achieves [measurable outcome] within [timeframe]"
                    ],
                    "suggested_stories": [
                        {{
                            "title": "As a [specific user type], I want [specific goal] so that [clear business benefit]",
                            "description": "Brief story description focusing on user value",
                            "story_points": 3,
                            "priority": "high"
                        }}
                    ],
                    "total_story_points": 55,
                    "business_value": "High",
                    "impact_areas": ["user_experience", "operational_efficiency", "revenue"],
                    "success_metrics": [
                        "Reduce [current pain point] by [percentage]",
                        "Increase [business metric] by [target]"
                    ],
                    "confidence": 0.85,
                    "implementation_suggestions": [
                        "Start with core user journey validation",
                        "Consider phased rollout approach",
                        "Identify key integration points early"
                    ],
                    "risks": [
                        "Technical complexity in [area]",
                        "User adoption challenges"
                    ]
                }}""",
                variables=["user_description", "priority_level", "project_context", "business_value", "include_acceptance_criteria", "include_story_breakdown"]
            ),
            
            "story_generator": PromptTemplate(
                name="story_generator",
                version="2.0",
                system_prompt="""You are an expert Agile coach and user story writer specializing in creating INVEST-quality user stories.

USER STORY DEFINITION: A User Story is a brief description of a feature written from the perspective of the end user. It describes the type of user, what they want, and why they want it.

INVEST PRINCIPLES FOR USER STORIES:
- **Independent**: Can be developed and tested independently
- **Negotiable**: Details can be discussed and refined
- **Valuable**: Delivers clear value to users or business
- **Estimable**: Can be estimated for effort and complexity
- **Small**: Fits within a single sprint (1-2 weeks)
- **Testable**: Has clear acceptance criteria

DEFINITION OF READY (DoR):
- Clear user story title and description
- Acceptance criteria defined
- Story points estimated
- Dependencies identified
- Testable and demonstrable""",
                user_prompt_template="""
                Generate a comprehensive user story based on this input:
                
                User Description: {user_description}
                Priority Level: {priority_level}
                Epic Context: {epic_context}
                Project Context: {project_context}
                Include Acceptance Criteria: {include_acceptance_criteria}
                Include Tags: {include_tags}
                
                CREATE A USER STORY THAT INCLUDES:
                
                1. **Story Title**: Perfect "As a [user type], I want [goal] so that [benefit]" format
                2. **Enhanced Description**: Expand input with context, user motivation, and business value
                3. **Acceptance Criteria**: Given/When/Then format, specific and testable
                4. **Story Points**: Fibonacci scale (1, 2, 3, 5, 8, 13) based on complexity
                5. **Tags**: Relevant categorization and search tags
                6. **Definition of Ready**: Ensure story meets DoR criteria
                
                ACCEPTANCE CRITERIA GUIDELINES:
                - Use Given/When/Then format for clarity
                - Make each criterion testable and verifiable
                - Cover happy path, edge cases, and error scenarios
                - Include non-functional requirements when relevant
                - Ensure criteria support the story's goal
                
                STORY POINT ESTIMATION GUIDE:
                - 1 point: Very simple, well-understood work (~2-4 hours)
                - 2 points: Simple work with minimal complexity (~4-8 hours)
                - 3 points: Moderate complexity, some unknowns (~1-2 days)
                - 5 points: Complex work, multiple components (~2-3 days)
                - 8 points: Very complex, high uncertainty (~3-5 days)
                - 13 points: Should be split into smaller stories
                
                Return ONLY this JSON structure:
                {{
                    "title": "As a [specific user type], I want [specific, actionable goal] so that [clear business benefit]",
                    "description": "Enhanced description that expands on the user need, provides context, explains the current pain point, and describes the desired outcome. Include user motivation and business value.",
                    "acceptance_criteria": [
                        "Given [specific context/precondition], when [user action/trigger], then [expected outcome/system response]",
                        "Given [error scenario], when [invalid action], then [appropriate error handling]",
                        "Given [edge case], when [boundary condition], then [expected behavior]"
                    ],
                    "tags": ["domain_area", "feature_type", "user_group", "technical_component"],
                    "story_points": 5,
                    "confidence": 0.9,
                    "improvement_suggestions": [
                        "Consider user experience implications",
                        "Validate with target users before implementation"
                    ],
                    "dependencies": [
                        "List any technical or story dependencies"
                    ],
                    "definition_of_done": [
                        "Feature implemented and tested",
                        "Acceptance criteria verified",
                        "Code reviewed and merged",
                        "Documentation updated"
                    ]
                }}""",
                variables=["user_description", "priority_level", "epic_context", "project_context", "include_acceptance_criteria", "include_tags"]
            ),
            
            "task_generator": PromptTemplate(
                name="task_generator",
                version="1.0",
                system_prompt="""You are an expert Agile coach and technical lead specializing in task decomposition and sprint planning.

TASK DEFINITION: A Task is a specific, actionable work item that represents the actual work needed to complete a user story. Tasks are the smallest unit of work in Agile and should be completable by one person in 4-16 hours.

TASK BEST PRACTICES:
- **Specific**: Clear, actionable work that can be executed
- **Owned**: Assigned to a single person for accountability
- **Timeboxed**: 0.5-2 days of work (4-16 hours)
- **Testable**: Has clear completion criteria
- **Technical**: Focuses on HOW to implement the story
- **Sequential**: May have dependencies on other tasks

TASK TYPES:
- **Development**: Code implementation, API creation, database changes
- **Testing**: Unit tests, integration tests, manual testing
- **Design**: UI/UX design, technical design, architecture
- **Research**: Technical spikes, feasibility studies, investigation
- **DevOps**: Deployment, configuration, infrastructure
- **Documentation**: Technical docs, user guides, API documentation""",
                user_prompt_template="""
                Generate comprehensive tasks to complete this user story:
                
                Story Title: {story_title}
                Story Description: {story_description}
                Story Points: {story_points}
                Acceptance Criteria: {acceptance_criteria}
                Technical Context: {technical_context}
                Team Skills: {team_skills}
                Include Subtasks: {include_subtasks}
                
                CREATE TASKS THAT INCLUDE:
                
                1. **Task Breakdown**: Decompose story into 3-8 specific tasks
                2. **Technical Implementation**: Focus on HOW to build the feature
                3. **Testing Strategy**: Include testing and validation tasks
                4. **Task Dependencies**: Identify task order and dependencies
                5. **Effort Estimation**: Hours-based estimates for each task
                6. **Skill Requirements**: What expertise is needed
                7. **Acceptance Criteria**: Task-specific completion criteria
                
                TASK ESTIMATION GUIDELINES:
                - 0.5-1 hours: Very simple configuration or minor changes
                - 1-2 hours: Simple implementation, basic testing
                - 2-4 hours: Standard development task
                - 4-8 hours: Complex development, integration work
                - 8-16 hours: Major implementation, significant complexity
                - >16 hours: Split into smaller tasks
                
                TASK CATEGORIES TO CONSIDER:
                - Frontend development (UI components, state management)
                - Backend development (APIs, business logic, data models)
                - Database work (schema, migrations, queries)
                - Testing (unit, integration, end-to-end)
                - DevOps (deployment, monitoring, configuration)
                - Documentation (technical, user, API)
                - Research/Investigation (technical spikes, proof of concept)
                
                Return ONLY this JSON structure:
                {{
                    "tasks": [
                        {{
                            "title": "Specific, actionable task title focusing on implementation",
                            "description": "Detailed description of what needs to be done, including technical approach and specific deliverables",
                            "category": "development|testing|design|research|devops|documentation",
                            "estimated_hours": 4.0,
                            "priority": "high|medium|low",
                            "skills_required": ["javascript", "react", "api_design"],
                            "acceptance_criteria": [
                                "Task-specific completion criteria",
                                "Clear definition of done for this task"
                            ],
                            "dependencies": ["task_id_or_description"],
                            "technical_notes": "Implementation hints, patterns to use, gotchas to avoid",
                            "testing_requirements": "How this task should be tested and validated"
                        }}
                    ],
                    "total_estimated_hours": 24.0,
                    "critical_path": ["task1", "task2", "task3"],
                    "risks": [
                        "Technical risks or unknowns that could impact tasks",
                        "Integration challenges or dependencies"
                    ],
                    "implementation_notes": [
                        "Overall implementation strategy",
                        "Key technical decisions or patterns",
                        "Performance or security considerations"
                    ],
                    "confidence": 0.85
                }}""",
                variables=["story_title", "story_description", "story_points", "acceptance_criteria", "technical_context", "team_skills", "include_subtasks"]
            ),
            
            "single_task_generator": PromptTemplate(
                name="single_task_generator",
                version="1.0",
                system_prompt="""You are an expert Agile coach and technical lead specializing in individual task creation and definition.

SINGLE TASK DEFINITION: A Task is a specific, actionable work item that can be completed by one person in 0.5-2 days (4-16 hours). Each task should be self-contained, testable, and directly contribute to story completion.

TASK QUALITY CRITERIA:
- **Actionable**: Clear, specific work that can be immediately started
- **Scoped**: Well-defined boundaries and deliverables
- **Testable**: Clear completion criteria and validation steps
- **Valuable**: Directly contributes to user story goals
- **Estimated**: Accurate effort estimation in hours
- **Categorized**: Properly classified by work type

TASK CATEGORIES:
- **development**: Code implementation, API creation, database changes
- **testing**: Unit tests, integration tests, manual testing, QA
- **design**: UI/UX design, technical design, architecture planning
- **research**: Technical spikes, feasibility studies, investigation
- **devops**: Deployment, configuration, infrastructure setup
- **documentation**: Technical docs, user guides, API documentation""",
                user_prompt_template="""
                Generate a comprehensive single task based on this description:
                
                Task Description: {task_description}
                Story Context: {story_title}
                Story Description: {story_description}
                Story Points: {story_points}
                Acceptance Criteria: {acceptance_criteria}
                Technical Context: {technical_context}
                Priority: {priority}
                Estimated Hours: {estimated_hours}
                Include Subtasks: {include_subtasks}
                Include Acceptance Criteria: {include_acceptance_criteria}
                
                CREATE A SINGLE TASK THAT INCLUDES:
                
                1. **Clear Task Title**: Specific, actionable title describing the work
                2. **Detailed Description**: What needs to be done, how to approach it
                3. **Accurate Estimation**: Hours-based estimate (0.5-16 hours)
                4. **Proper Categorization**: Work type and technical area
                5. **Acceptance Criteria**: Specific completion criteria
                6. **Technical Notes**: Implementation guidance and considerations
                7. **Subtasks**: Optional breakdown into smaller steps
                8. **Testing Requirements**: How to validate the work
                
                ESTIMATION GUIDELINES:
                - 0.5-1 hours: Configuration, minor fixes, simple updates
                - 1-2 hours: Simple features, basic testing, documentation
                - 2-4 hours: Standard development work, moderate complexity
                - 4-8 hours: Complex features, integration work, comprehensive testing
                - 8-16 hours: Major implementations, significant architecture changes
                
                TECHNICAL CONSIDERATIONS:
                - Focus on implementation approach and patterns
                - Consider existing codebase and architecture
                - Include performance and security implications
                - Identify potential risks or dependencies
                - Suggest testing and validation strategies
                
                Return ONLY this JSON structure:
                {{
                    "title": "Specific, actionable task title that clearly describes the work to be done",
                    "description": "Comprehensive description including what needs to be built, technical approach, key requirements, and expected deliverables",
                    "estimated_hours": 4.0,
                    "priority": "high",
                    "category": "development",
                    "technical_notes": "Implementation guidance, patterns to use, architecture considerations, potential gotchas, and integration points",
                    "acceptance_criteria": [
                        "Specific, testable completion criteria",
                        "Clear definition of done for this task",
                        "Validation and testing requirements"
                    ],
                    "subtasks": [
                        "Break down into smaller actionable steps if complex",
                        "Each subtask should be 15-60 minutes of work"
                    ],
                    "tags": ["technical_area", "component", "work_type"],
                    "skills_required": ["javascript", "react", "api_design"],
                    "dependencies": ["Any prerequisite work or external dependencies"],
                    "testing_requirements": "How this task should be tested, validated, and verified for completion",
                    "risks": ["Potential technical risks or unknowns"],
                    "confidence": 0.85
                }}
                """,
                variables=["task_description", "story_title", "story_description", "story_points", "acceptance_criteria", "technical_context", "priority", "estimated_hours", "include_subtasks", "include_acceptance_criteria"]
            ),
            
            "project_generator": PromptTemplate(
                name="project_generator",
                version="1.0",
                system_prompt="""You are an expert project manager and solution architect specializing in strategic project planning and organizational alignment.

PROJECT DEFINITION: A Project is a strategic initiative with defined scope, timeline, and objectives that delivers business value through coordinated work. Projects contain multiple epics and represent major organizational efforts.

PROJECT QUALITY CRITERIA:
- **Strategic**: Aligns with business objectives and provides clear value
- **Scoped**: Well-defined boundaries, deliverables, and success criteria
- **Resourced**: Realistic in terms of team capacity and timeline
- **Measurable**: Clear success metrics and KPIs
- **Feasible**: Technically and organizationally achievable
- **Impactful**: Delivers meaningful business or user outcomes

PROJECT PLANNING ELEMENTS:
- **Vision & Objectives**: Clear purpose and strategic goals
- **Scope & Deliverables**: What will be built and delivered
- **Success Metrics**: How success will be measured
- **Epic Breakdown**: High-level feature groupings
- **Resource Planning**: Team composition and skills needed
- **Timeline & Milestones**: Key dates and deliverables
- **Risk Assessment**: Potential challenges and mitigations""",
                user_prompt_template="""
                Generate a comprehensive project plan based on this description:
                
                Project Description: {user_description}
                Domain/Industry: {domain_context}
                Team Size: {team_size} people
                Timeline Context: {timeline_context}
                Technology Stack: {technology_stack}
                Business Objectives: {business_objectives}
                Priority Level: {priority_level}
                Include Epic Breakdown: {include_epic_breakdown}
                Include Success Metrics: {include_success_metrics}
                
                CREATE A PROJECT PLAN THAT INCLUDES:
                
                1. **Project Vision**: Clear purpose and strategic value
                2. **Scope Definition**: What will be delivered and boundaries
                3. **Success Metrics**: Measurable outcomes and KPIs
                4. **Epic Breakdown**: 3-6 major feature groupings
                5. **Resource Planning**: Team composition and skills
                6. **Timeline & Phases**: Development phases and milestones
                7. **Risk Assessment**: Potential challenges and mitigations
                8. **Technology Strategy**: Technical approach and architecture
                
                PROJECT SCOPE GUIDELINES:
                - Focus on delivering measurable business value
                - Balance ambition with realistic execution
                - Consider team capacity and technical constraints
                - Include user experience and business process improvements
                - Plan for iterative delivery and feedback cycles
                
                EPIC BREAKDOWN PRINCIPLES:
                - Each epic should deliver standalone value
                - 2-6 sprints per epic typically
                - Clear user or business outcomes
                - Logical technical and functional groupings
                - Dependencies and integration points identified
                
                Return ONLY this JSON structure:
                {{
                    "name": "Clear, outcome-focused project name that describes business value",
                    "description": "Comprehensive project description including business need, user value, strategic importance, and expected outcomes",
                    "vision": "Inspiring vision statement that captures the project's strategic purpose and impact",
                    "objectives": [
                        "Specific, measurable business objective",
                        "User experience improvement goal",
                        "Operational efficiency target"
                    ],
                    "scope": {{
                        "included": [
                            "Key deliverable or feature area included in scope",
                            "Important capability to be built"
                        ],
                        "excluded": [
                            "Explicitly excluded item to avoid scope creep",
                            "Future enhancement not in current scope"
                        ],
                        "assumptions": [
                            "Key assumption about resources or constraints",
                            "Technical or business assumption"
                        ]
                    }},
                    "success_metrics": [
                        {{
                            "metric": "User adoption rate",
                            "target": "80% of target users within 3 months",
                            "measurement": "Analytics dashboard tracking"
                        }},
                        {{
                            "metric": "Operational efficiency",
                            "target": "30% reduction in manual processes",
                            "measurement": "Process time tracking"
                        }}
                    ],
                    "suggested_epics": [
                        {{
                            "name": "Epic name focused on user value",
                            "description": "Brief description of epic scope and goals",
                            "estimated_story_points": 89,
                            "priority": "high",
                            "business_value": "Clear business value statement"
                        }}
                    ],
                    "total_estimated_points": 377,
                    "timeline": {{
                        "estimated_duration": "6 months",
                        "phases": [
                            {{
                                "name": "Discovery & Planning",
                                "duration": "2 weeks",
                                "deliverables": ["Requirements analysis", "Technical design"]
                            }},
                            {{
                                "name": "Core Development",
                                "duration": "16 weeks",
                                "deliverables": ["MVP features", "Core functionality"]
                            }}
                        ]
                    }},
                    "team_composition": {{
                        "recommended_size": 7,
                        "roles": [
                            {{
                                "role": "Product Owner",
                                "count": 1,
                                "key_responsibilities": ["Requirements", "Stakeholder management"]
                            }},
                            {{
                                "role": "Full-stack Developer",
                                "count": 3,
                                "key_responsibilities": ["Feature development", "Integration"]
                            }}
                        ]
                    }},
                    "technology_strategy": {{
                        "architecture_approach": "Modern microservices with API-first design",
                        "key_technologies": ["React", "Node.js", "PostgreSQL", "Docker"],
                        "technical_decisions": [
                            "Use existing authentication system",
                            "Implement real-time updates with WebSockets"
                        ]
                    }},
                    "risks": [
                        {{
                            "risk": "Technical complexity in integration",
                            "impact": "medium",
                            "probability": "medium",
                            "mitigation": "Early technical spikes and prototyping"
                        }}
                    ],
                    "dependencies": [
                        "External API availability",
                        "User feedback from initial prototype"
                    ],
                    "confidence": 0.85
                }}
                """,
                variables=["user_description", "domain_context", "team_size", "timeline_context", "technology_stack", "business_objectives", "priority_level", "include_epic_breakdown", "include_success_metrics"]
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
                    
                    # Check if the client has the messages attribute
                    if not hasattr(self.anthropic_client, 'messages'):
                        logger.error("Anthropic client missing 'messages' attribute")
                        raise AttributeError("Anthropic client not properly initialized")
                    
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
                    # Instead of raising, provide fallback response
                    content = await self._generate_fallback_response(template_name, variables)
                    if content:
                        tokens_used = 0
                        model_used = "fallback"
                        logger.info(f"Using fallback response for template: {template_name}")
                    else:
                        raise Exception(f"Both AI providers and fallback failed. Last error: {str(e)}")
            
            # If still no content, try fallback
            if not content:
                content = await self._generate_fallback_response(template_name, variables)
                if content:
                    tokens_used = 0
                    model_used = "fallback"
                    logger.info(f"Using fallback response for template: {template_name}")
                else:
                    raise Exception("No AI providers available and fallback failed")
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Try to parse as JSON if template expects it
            try:
                if template_name in ["sprint_planning", "standup_reporter", "retrospective_summarizer", 
                                   "epic_generator", "story_generator", "task_generator", "single_task_generator",
                                   "project_generator", "story_validator", "backlog_coach", "risk_radar"]:
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
    
    async def _generate_fallback_response(self, template_name: str, variables: Dict[str, Any]) -> Optional[str]:
        """Generate fallback response when AI providers fail"""
        try:
            fallback_responses = {
                "project_generator": json.dumps({
                    "name": f"Generated Project: {variables.get('user_description', 'New Project')[:50]}",
                    "description": f"This project focuses on: {variables.get('user_description', 'achieving project goals')}",
                    "vision": f"To successfully deliver {variables.get('user_description', 'project objectives')}",
                    "objectives": [
                        "Define clear project scope and requirements",
                        "Establish development workflow and processes", 
                        "Deliver high-quality features iteratively",
                        "Maintain project timeline and budget"
                    ],
                    "scope": {
                        "included": ["Core functionality", "Basic user interface", "Essential integrations"],
                        "excluded": ["Advanced features", "Third-party premium services"],
                        "assumptions": ["Team availability", "Stable requirements", "Technology stack chosen"]
                    },
                    "success_metrics": [
                        {"metric": "Feature Completion", "target": "100%", "measurement": "Story completion rate"},
                        {"metric": "Quality", "target": "<5% defect rate", "measurement": "Bug reports"},
                        {"metric": "Timeline", "target": "On schedule", "measurement": "Sprint velocity"}
                    ],
                    "suggested_epics": [
                        {
                            "name": "Foundation Setup",
                            "description": "Establish project infrastructure and core setup",
                            "estimated_story_points": 21,
                            "priority": "high",
                            "business_value": "Enables all future development"
                        },
                        {
                            "name": "Core Features",
                            "description": "Implement primary functionality",
                            "estimated_story_points": 55,
                            "priority": "high",
                            "business_value": "Delivers main user value"
                        }
                    ],
                    "total_estimated_points": 76,
                    "timeline": {
                        "estimated_duration": "3-4 months",
                        "phases": [
                            {"name": "Planning & Setup", "duration": "2 weeks", "deliverables": ["Project plan", "Development environment"]},
                            {"name": "Development", "duration": "8-10 weeks", "deliverables": ["Core features", "Testing"]},
                            {"name": "Launch", "duration": "2 weeks", "deliverables": ["Deployment", "Documentation"]}
                        ]
                    },
                    "team_composition": {
                        "recommended_size": variables.get('team_size', 5),
                        "roles": [
                            {"role": "Project Manager", "count": 1, "key_responsibilities": ["Planning", "Coordination"]},
                            {"role": "Developer", "count": 3, "key_responsibilities": ["Feature development", "Code review"]},
                            {"role": "QA Engineer", "count": 1, "key_responsibilities": ["Testing", "Quality assurance"]}
                        ]
                    },
                    "technology_strategy": {
                        "architecture_approach": "Modular and scalable design",
                        "key_technologies": variables.get('technology_stack', 'Modern web technologies').split(','),
                        "technical_decisions": ["Use proven frameworks", "Implement CI/CD", "Ensure security"]
                    },
                    "risks": [
                        {"risk": "Scope creep", "impact": "medium", "probability": "medium", "mitigation": "Clear requirements and change control"},
                        {"risk": "Technical complexity", "impact": "high", "probability": "low", "mitigation": "Proof of concept and early testing"}
                    ],
                    "dependencies": ["Team availability", "Technology stack approval"],
                    "confidence": 0.7
                }),
                
                "story_generator": json.dumps({
                    "name": f"User Story: {variables.get('user_description', 'Feature Request')[:50]}",
                    "description": f"As a user, I want to {variables.get('user_description', 'use this feature')} so that I can achieve my goals.",
                    "acceptance_criteria": [
                        "Given a user has access to the system",
                        "When they interact with the feature",
                        "Then they should see the expected results"
                    ],
                    "story_points": 5,
                    "priority": variables.get('priority', 'medium'),
                    "tags": ["feature", "user-story"],
                    "business_value": "Improves user experience and satisfaction",
                    "confidence": 0.6
                }),
                
                "epic_generator": json.dumps({
                    "name": f"Epic: {variables.get('user_description', 'Feature Initiative')[:50]}",
                    "description": f"This epic encompasses {variables.get('user_description', 'the development of new capabilities')}",
                    "acceptance_criteria": [
                        "All user stories are completed and tested",
                        "Features meet quality standards",
                        "Documentation is complete"
                    ],
                    "suggested_stories": [
                        {"title": "Core functionality", "description": "Implement basic features", "story_points": 8},
                        {"title": "User interface", "description": "Create user-friendly interface", "story_points": 5},
                        {"title": "Testing & validation", "description": "Ensure quality and reliability", "story_points": 3}
                    ],
                    "total_story_points": 16,
                    "business_value": "Delivers significant value to users and business",
                    "impact_areas": ["User Experience", "Business Goals"],
                    "confidence": 0.6,
                    "implementation_suggestions": [
                        "Start with MVP approach",
                        "Gather user feedback early",
                        "Iterate based on results"
                    ]
                }),
                
                "task_generator": json.dumps({
                    "tasks": [
                        {
                            "title": f"Implement {variables.get('story_title', 'Feature')}",
                            "description": f"Develop the core functionality for {variables.get('story_description', 'the requested feature')}",
                            "category": "Development",
                            "estimated_hours": 6,
                            "priority": "high",
                            "skills_required": ["Programming", "Testing"],
                            "acceptance_criteria": ["Code is written", "Tests pass", "Code review completed"],
                            "dependencies": [],
                            "technical_notes": "Follow coding standards and best practices",
                            "testing_requirements": "Unit tests and integration tests required"
                        },
                        {
                            "title": "Test and validate",
                            "description": "Perform thorough testing of the implemented feature",
                            "category": "Testing",
                            "estimated_hours": 3,
                            "priority": "medium",
                            "skills_required": ["Testing", "Quality Assurance"],
                            "acceptance_criteria": ["All tests pass", "No critical bugs found"],
                            "dependencies": ["Implementation task"],
                            "technical_notes": "Include edge cases and error scenarios",
                            "testing_requirements": "Manual testing and automated tests"
                        }
                    ],
                    "total_estimated_hours": 9,
                    "critical_path": ["Implementation", "Testing"],
                    "risks": ["Technical complexity", "Time constraints"],
                    "implementation_notes": ["Break down into smaller tasks if needed"],
                    "confidence": 0.6
                })
            }
            
            response = fallback_responses.get(template_name)
            if response:
                logger.info(f"Generated fallback response for template: {template_name}")
                return response
            else:
                logger.warning(f"No fallback response available for template: {template_name}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to generate fallback response: {e}")
            return None

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
        # Initialize basic AI service first
        ai_service = AIService()
        logger.info("Basic AI service initialized successfully")
        
        # Initialize enhanced AI service with vector capabilities
        enhanced_ai_service = EnhancedAIService(supabase)
        logger.info("Enhanced AI service initialized successfully")
        
        return enhanced_ai_service
    except Exception as e:
        logger.error(f"Failed to initialize AI service: {e}")
        # Don't raise - allow the app to continue with fallback
        logger.warning("AI service will operate with limited functionality")
        
        # At least initialize the basic service if possible
        try:
            if ai_service is None:
                ai_service = AIService()
                logger.info("Basic AI service initialized as fallback")
        except Exception as fallback_error:
            logger.error(f"Even basic AI service initialization failed: {fallback_error}")
        
        return None

def get_ai_service() -> EnhancedAIService:
    """Get the global enhanced AI service instance"""
    if enhanced_ai_service is None:
        raise RuntimeError("Enhanced AI service not initialized. Call init_ai_service() first or use get_basic_ai_service() for fallback.")
    return enhanced_ai_service

def get_basic_ai_service() -> AIService:
    """Get the basic AI service instance"""
    global ai_service
    if ai_service is None:
        # Try to initialize basic service as fallback
        try:
            ai_service = AIService()
            logger.info("Basic AI service auto-initialized as fallback")
        except Exception as e:
            logger.error(f"Failed to auto-initialize basic AI service: {e}")
            raise RuntimeError("Basic AI service not initialized and auto-initialization failed")
    return ai_service
