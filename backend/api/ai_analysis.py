#!/usr/bin/env python3
"""
AI Analysis API
Provides AI-powered insights for sprint management
"""

import uuid
import logging
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import openai
import os

try:
    from ..api.auth import get_current_user_supabase, UserResponse
    from ..database.supabase_client import get_supabase
except ImportError:
    from api.auth import get_current_user_supabase, UserResponse
    from database.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

class AIAnalysisRequest(BaseModel):
    feature_id: str = Field(..., description="AI feature to run")
    project_id: Optional[str] = None
    sprint_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class AIAnalysisResponse(BaseModel):
    feature_id: str
    status: str
    result: Dict[str, Any]
    confidence: float
    tokens_used: int
    timestamp: datetime

@router.post("/analyze", response_model=AIAnalysisResponse)
async def run_ai_analysis(
    request: AIAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user_supabase),
    supabase = Depends(get_supabase)
):
    """Run AI analysis for a specific feature"""
    try:
        logger.info(f"Running AI analysis for feature: {request.feature_id}")
        
        # Get context data based on the feature
        context_data = await get_analysis_context(
            request.feature_id, 
            request.project_id, 
            request.sprint_id, 
            supabase
        )
        
        # Route to appropriate AI analysis
        if request.feature_id == 'resource-prediction':
            result = await analyze_resource_prediction(context_data)
        elif request.feature_id == 'story-estimation':
            result = await analyze_story_estimation(context_data)
        elif request.feature_id == 'delay-detection':
            result = await analyze_delay_detection(context_data)
        elif request.feature_id == 'sprint-optimizer':
            result = await analyze_sprint_optimizer(context_data)
        elif request.feature_id == 'team-analysis':
            result = await analyze_team_performance(context_data)
        else:
            raise HTTPException(status_code=400, detail="Unknown AI feature")

        return AIAnalysisResponse(
            feature_id=request.feature_id,
            status='success',
            result=result['analysis'],
            confidence=result['confidence'],
            tokens_used=result['tokens_used'],
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"AI analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

async def get_analysis_context(
    feature_id: str, 
    project_id: Optional[str], 
    sprint_id: Optional[str], 
    supabase
) -> Dict[str, Any]:
    """Gather context data for AI analysis"""
    context = {}
    
    try:
        # Get project data
        if project_id:
            project_result = supabase.table('projects').select('*').eq('id', project_id).single().execute()
            if project_result.data:
                context['project'] = project_result.data
        
        # Get sprint data
        if sprint_id:
            sprint_result = supabase.table('sprints').select('*').eq('id', sprint_id).single().execute()
            if sprint_result.data:
                context['sprint'] = sprint_result.data
        
        # Get team data
        if project_id:
            # Get team members from project assignments
            team_result = supabase.table('stories').select('''
                assignee_id,
                assignee:users!assignee_id(id, name, email)
            ''').eq('project_id' if 'project_id' in supabase.table('stories').select('*').limit(1).execute().data[0] else 'epic_id', project_id).execute()
            
            unique_members = {}
            for story in team_result.data or []:
                if story.get('assignee'):
                    unique_members[story['assignee']['id']] = story['assignee']
            
            context['team_members'] = list(unique_members.values())
        
        # Get historical sprint data for velocity calculation
        if project_id:
            historical_sprints = supabase.table('sprints').select('*').eq(
                'project_id', project_id
            ).eq('status', 'completed').order('created_at', desc=True).limit(5).execute()
            context['historical_sprints'] = historical_sprints.data or []
        
        # Get current stories
        if sprint_id:
            stories_result = supabase.table('stories').select('''
                *,
                assignee:users!assignee_id(id, name, email),
                epic:epics(id, name, color)
            ''').eq('sprint_id', sprint_id).execute()
            context['stories'] = stories_result.data or []
        elif project_id:
            # Get backlog stories for sprint optimization
            backlog_result = supabase.table('stories').select('''
                *,
                assignee:users!assignee_id(id, name, email),
                epic:epics(id, name, color)
            ''').is_('sprint_id', 'null').limit(20).execute()
            context['backlog_stories'] = backlog_result.data or []
        
        return context
        
    except Exception as e:
        logger.error(f"Failed to get analysis context: {e}")
        return context

async def analyze_resource_prediction(context: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze team resource allocation and predict shortfalls"""
    
    prompt = f"""
    Analyze team resource allocation and predict potential shortfalls.
    
    Context:
    - Team members: {len(context.get('team_members', []))}
    - Historical sprints: {len(context.get('historical_sprints', []))}
    - Current sprint stories: {len(context.get('stories', []))}
    
    Historical velocity data:
    {json.dumps([{
        'sprint': s.get('name', 'Unknown'),
        'planned_points': s.get('planned_story_points', 0),
        'completed_points': s.get('completed_story_points', 0),
        'velocity': s.get('velocity', 0)
    } for s in context.get('historical_sprints', [])], indent=2)}
    
    Team composition:
    {json.dumps([{
        'name': m.get('name', 'Unknown'),
        'id': m.get('id')
    } for m in context.get('team_members', [])], indent=2)}
    
    Analyze and provide:
    1. Resource adequacy score (0-100)
    2. Predicted shortfall timeframe
    3. Specific recommendations
    4. Confidence level
    
    Respond in JSON format with these exact keys:
    - adequacy_score: number
    - status: "good" | "warning" | "critical"
    - prediction: string
    - shortfall_date: string or null
    - recommendations: array of strings
    - confidence: number (0-100)
    """
    
    try:
        response = await call_openai_api(prompt)
        tokens_used = response.get('usage', {}).get('total_tokens', 0)
        
        # Parse the AI response
        ai_result = json.loads(response['choices'][0]['message']['content'])
        
        return {
            'analysis': ai_result,
            'confidence': ai_result.get('confidence', 85),
            'tokens_used': tokens_used
        }
        
    except Exception as e:
        logger.error(f"Resource prediction analysis failed: {e}")
        # Return fallback analysis
        return {
            'analysis': {
                'adequacy_score': 80,
                'status': 'warning',
                'prediction': 'Unable to complete full analysis. Team appears adequately sized but monitoring recommended.',
                'shortfall_date': None,
                'recommendations': [
                    'Monitor team velocity trends',
                    'Review upcoming project requirements',
                    'Consider cross-training initiatives'
                ],
                'confidence': 60
            },
            'confidence': 60,
            'tokens_used': 0
        }

async def analyze_story_estimation(context: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze story complexity and provide estimation recommendations"""
    
    stories = context.get('stories', [])
    historical_sprints = context.get('historical_sprints', [])
    
    # Calculate historical estimation accuracy
    historical_accuracy = []
    for sprint in historical_sprints:
        if sprint.get('planned_story_points') and sprint.get('completed_story_points'):
            accuracy = (sprint['completed_story_points'] / sprint['planned_story_points']) * 100
            historical_accuracy.append(min(accuracy, 150))  # Cap at 150%
    
    avg_accuracy = sum(historical_accuracy) / len(historical_accuracy) if historical_accuracy else 100
    
    prompt = f"""
    Analyze story estimation patterns and provide recommendations.
    
    Context:
    - Current stories: {len(stories)}
    - Historical estimation accuracy: {avg_accuracy:.1f}%
    - Team velocity trend: {context.get('velocity_trend', 'stable')}
    
    Current sprint stories:
    {json.dumps([{
        'title': s.get('title', 'Unknown'),
        'story_points': s.get('story_points', 0),
        'status': s.get('status', 'todo'),
        'complexity': s.get('description', '')[:100] + '...' if s.get('description') else ''
    } for s in stories], indent=2)}
    
    Historical accuracy data:
    {json.dumps([{
        'sprint': s.get('name', 'Unknown'),
        'planned': s.get('planned_story_points', 0),
        'completed': s.get('completed_story_points', 0),
        'accuracy': (s.get('completed_story_points', 0) / max(s.get('planned_story_points', 1), 1)) * 100
    } for s in historical_sprints], indent=2)}
    
    Provide estimation analysis with:
    1. Overall estimation accuracy assessment
    2. Recommended adjustments for current stories
    3. Risk factors to watch
    4. Confidence level
    
    Respond in JSON format:
    - current_estimate: number (total current story points)
    - recommended_points: number (adjusted recommendation)
    - confidence: number (0-100)
    - adjustment: "up" | "down" | "none"
    - reasoning: string
    - risk_factors: array of strings
    - similar_stories: array of objects with title, points, actual
    """
    
    try:
        response = await call_openai_api(prompt)
        tokens_used = response.get('usage', {}).get('total_tokens', 0)
        
        ai_result = json.loads(response['choices'][0]['message']['content'])
        
        return {
            'analysis': ai_result,
            'confidence': ai_result.get('confidence', 85),
            'tokens_used': tokens_used
        }
        
    except Exception as e:
        logger.error(f"Story estimation analysis failed: {e}")
        total_points = sum(s.get('story_points', 0) for s in stories)
        return {
            'analysis': {
                'current_estimate': total_points,
                'recommended_points': int(total_points * 0.9),  # Suggest 10% reduction
                'confidence': 70,
                'adjustment': 'down',
                'reasoning': 'Based on historical patterns, estimates tend to be optimistic. Consider 10% reduction.',
                'risk_factors': ['Limited historical data', 'New team members', 'Complex requirements'],
                'similar_stories': []
            },
            'confidence': 70,
            'tokens_used': 0
        }

async def analyze_delay_detection(context: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze sprint progress and predict potential delays"""
    
    sprint = context.get('sprint', {})
    stories = context.get('stories', [])
    
    # Calculate current progress
    total_points = sum(s.get('story_points', 0) for s in stories)
    completed_points = sum(s.get('story_points', 0) for s in stories if s.get('status') == 'done')
    in_progress_points = sum(s.get('story_points', 0) for s in stories if s.get('status') == 'in_progress')
    
    # Calculate days into sprint
    start_date = datetime.fromisoformat(sprint.get('start_date', datetime.now().isoformat()))
    end_date = datetime.fromisoformat(sprint.get('end_date', datetime.now().isoformat()))
    now = datetime.now()
    
    sprint_duration = (end_date - start_date).days
    days_elapsed = (now - start_date).days
    days_remaining = (end_date - now).days
    
    progress_percentage = (completed_points / max(total_points, 1)) * 100
    expected_progress = (days_elapsed / max(sprint_duration, 1)) * 100
    
    prompt = f"""
    Analyze sprint progress and predict potential delays.
    
    Sprint Context:
    - Sprint: {sprint.get('name', 'Current Sprint')}
    - Duration: {sprint_duration} days
    - Days elapsed: {days_elapsed}
    - Days remaining: {days_remaining}
    - Total story points: {total_points}
    - Completed points: {completed_points}
    - In progress points: {in_progress_points}
    - Current progress: {progress_percentage:.1f}%
    - Expected progress: {expected_progress:.1f}%
    
    Story Status Breakdown:
    {json.dumps([{
        'title': s.get('title', 'Unknown'),
        'points': s.get('story_points', 0),
        'status': s.get('status', 'todo'),
        'assignee': s.get('assignee', {}).get('name', 'Unassigned') if s.get('assignee') else 'Unassigned'
    } for s in stories], indent=2)}
    
    Analyze and predict:
    1. Delay probability (0-100%)
    2. Expected delay duration
    3. Root causes
    4. Mitigation strategies
    5. Affected stories
    
    Respond in JSON format:
    - delay_probability: number (0-100)
    - expected_delay: string
    - risk_level: "low" | "medium" | "high"
    - causes: array of strings
    - mitigations: array of strings
    - affected_stories: array of story IDs
    - confidence: number (0-100)
    """
    
    try:
        response = await call_openai_api(prompt)
        tokens_used = response.get('usage', {}).get('total_tokens', 0)
        
        ai_result = json.loads(response['choices'][0]['message']['content'])
        
        return {
            'analysis': ai_result,
            'confidence': ai_result.get('confidence', 85),
            'tokens_used': tokens_used
        }
        
    except Exception as e:
        logger.error(f"Delay detection analysis failed: {e}")
        
        # Calculate basic delay risk
        delay_risk = max(0, min(100, (expected_progress - progress_percentage) * 2))
        
        return {
            'analysis': {
                'delay_probability': int(delay_risk),
                'expected_delay': f'{max(0, int(delay_risk / 20))} days' if delay_risk > 20 else 'On track',
                'risk_level': 'high' if delay_risk > 60 else 'medium' if delay_risk > 30 else 'low',
                'causes': [
                    f'Progress behind schedule ({progress_percentage:.1f}% vs {expected_progress:.1f}% expected)',
                    f'{len([s for s in stories if not s.get("assignee")])} unassigned stories',
                    f'{in_progress_points} points in progress'
                ],
                'mitigations': [
                    'Assign unassigned stories to team members',
                    'Focus on completing in-progress work',
                    'Consider scope reduction if needed'
                ],
                'affected_stories': [s.get('id') for s in stories if s.get('status') in ['todo', 'in_progress']],
                'confidence': 75
            },
            'confidence': 75,
            'tokens_used': 0
        }

async def analyze_sprint_optimizer(context: Dict[str, Any]) -> Dict[str, Any]:
    """Optimize story selection for maximum sprint success"""
    
    backlog_stories = context.get('backlog_stories', [])
    team_members = context.get('team_members', [])
    historical_sprints = context.get('historical_sprints', [])
    
    # Calculate average team velocity
    velocities = [s.get('velocity', 0) for s in historical_sprints if s.get('velocity')]
    avg_velocity = sum(velocities) / len(velocities) if velocities else 20
    
    prompt = f"""
    Optimize story selection for upcoming sprint to maximize success probability.
    
    Team Context:
    - Team size: {len(team_members)}
    - Average velocity: {avg_velocity:.1f} points
    - Historical success rate: {len([s for s in historical_sprints if (s.get('completed_story_points', 0) / max(s.get('planned_story_points', 1), 1)) >= 0.8]) / max(len(historical_sprints), 1) * 100:.1f}%
    
    Available Stories:
    {json.dumps([{
        'id': s.get('id'),
        'title': s.get('title', 'Unknown'),
        'story_points': s.get('story_points', 0),
        'priority': s.get('priority', 'medium'),
        'complexity': len(s.get('description', '')) > 200,
        'assignee': s.get('assignee', {}).get('name') if s.get('assignee') else None
    } for s in backlog_stories[:15]], indent=2)}
    
    Team Members:
    {json.dumps([{
        'name': m.get('name', 'Unknown'),
        'id': m.get('id')
    } for m in team_members], indent=2)}
    
    Historical Sprint Performance:
    {json.dumps([{
        'name': s.get('name'),
        'planned': s.get('planned_story_points', 0),
        'completed': s.get('completed_story_points', 0),
        'velocity': s.get('velocity', 0)
    } for s in historical_sprints], indent=2)}
    
    Optimize story selection for maximum success probability:
    1. Select stories that fit team velocity
    2. Balance priorities and complexity
    3. Consider team member skills
    4. Minimize dependencies
    
    Respond in JSON format:
    - recommended_stories: array of objects with id, title, points, priority
    - total_points: number
    - team_capacity: number (estimated)
    - success_probability: number (0-100)
    - recommendations: array of strings
    - alternatives: array of objects with combination, points, success
    - confidence: number (0-100)
    """
    
    try:
        response = await call_openai_api(prompt)
        tokens_used = response.get('usage', {}).get('total_tokens', 0)
        
        ai_result = json.loads(response['choices'][0]['message']['content'])
        
        return {
            'analysis': ai_result,
            'confidence': ai_result.get('confidence', 85),
            'tokens_used': tokens_used
        }
        
    except Exception as e:
        logger.error(f"Sprint optimizer analysis failed: {e}")
        
        # Simple fallback optimization
        high_priority = [s for s in backlog_stories if s.get('priority') == 'high'][:3]
        medium_priority = [s for s in backlog_stories if s.get('priority') == 'medium'][:4]
        
        recommended = high_priority + medium_priority
        total_points = sum(s.get('story_points', 0) for s in recommended)
        
        return {
            'analysis': {
                'recommended_stories': [{
                    'id': s.get('id'),
                    'title': s.get('title'),
                    'points': s.get('story_points', 0),
                    'priority': s.get('priority')
                } for s in recommended],
                'total_points': total_points,
                'team_capacity': int(avg_velocity),
                'success_probability': 85,
                'recommendations': [
                    'Focus on high-priority stories first',
                    'Ensure stories are well-defined before sprint start',
                    'Consider team member availability'
                ],
                'alternatives': [
                    {'combination': 'Conservative', 'points': int(total_points * 0.8), 'success': 95},
                    {'combination': 'Aggressive', 'points': int(total_points * 1.2), 'success': 70}
                ],
                'confidence': 80
            },
            'confidence': 80,
            'tokens_used': 0
        }

async def analyze_team_performance(context: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze team performance and identify improvement opportunities"""
    
    team_members = context.get('team_members', [])
    historical_sprints = context.get('historical_sprints', [])
    stories = context.get('stories', [])
    
    # Calculate team metrics
    completed_stories = [s for s in stories if s.get('status') == 'done']
    in_progress_stories = [s for s in stories if s.get('status') == 'in_progress']
    
    prompt = f"""
    Analyze team performance and identify improvement opportunities.
    
    Team Context:
    - Team size: {len(team_members)}
    - Current sprint stories: {len(stories)}
    - Completed stories: {len(completed_stories)}
    - In progress stories: {len(in_progress_stories)}
    
    Historical Performance:
    {json.dumps([{
        'sprint': s.get('name'),
        'planned_points': s.get('planned_story_points', 0),
        'completed_points': s.get('completed_story_points', 0),
        'velocity': s.get('velocity', 0),
        'success_rate': (s.get('completed_story_points', 0) / max(s.get('planned_story_points', 1), 1)) * 100
    } for s in historical_sprints], indent=2)}
    
    Current Sprint Status:
    {json.dumps([{
        'title': s.get('title'),
        'status': s.get('status'),
        'points': s.get('story_points', 0),
        'assignee': s.get('assignee', {}).get('name') if s.get('assignee') else 'Unassigned',
        'days_in_progress': 2 if s.get('status') == 'in_progress' else 0
    } for s in stories], indent=2)}
    
    Team Members:
    {json.dumps([{
        'name': m.get('name'),
        'assigned_stories': len([s for s in stories if s.get('assignee', {}).get('id') == m.get('id')])
    } for m in team_members], indent=2)}
    
    Analyze team performance and provide:
    1. Overall performance score
    2. Key bottlenecks
    3. Improvement recommendations
    4. Team health indicators
    
    Respond in JSON format:
    - performance_score: number (0-100)
    - trend: "improving" | "stable" | "declining"
    - bottlenecks: array of objects with area, impact, delay
    - recommendations: array of strings
    - health_indicators: object with collaboration, workload, satisfaction, productivity scores
    - confidence: number (0-100)
    """
    
    try:
        response = await call_openai_api(prompt)
        tokens_used = response.get('usage', {}).get('total_tokens', 0)
        
        ai_result = json.loads(response['choices'][0]['message']['content'])
        
        return {
            'analysis': ai_result,
            'confidence': ai_result.get('confidence', 85),
            'tokens_used': tokens_used
        }
        
    except Exception as e:
        logger.error(f"Team analysis failed: {e}")
        
        # Calculate basic performance metrics
        if historical_sprints:
            avg_success_rate = sum(
                (s.get('completed_story_points', 0) / max(s.get('planned_story_points', 1), 1)) * 100
                for s in historical_sprints
            ) / len(historical_sprints)
        else:
            avg_success_rate = 75
        
        return {
            'analysis': {
                'performance_score': int(avg_success_rate),
                'trend': 'stable',
                'bottlenecks': [
                    {'area': 'Story Assignment', 'impact': 'medium', 'delay': '1 day avg'},
                    {'area': 'Testing Phase', 'impact': 'low', 'delay': '0.5 days avg'}
                ],
                'recommendations': [
                    'Improve story assignment process',
                    'Consider pair programming for complex stories',
                    'Regular team retrospectives'
                ],
                'health_indicators': {
                    'collaboration': 80,
                    'workload': 75,
                    'satisfaction': 85,
                    'productivity': int(avg_success_rate)
                },
                'confidence': 75
            },
            'confidence': 75,
            'tokens_used': 0
        }

async def call_openai_api(prompt: str) -> Dict[str, Any]:
    """Call OpenAI API with the given prompt"""
    if not openai.api_key:
        raise Exception("OpenAI API key not configured")
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert agile project management consultant. Provide detailed, actionable insights based on the data provided. Always respond in valid JSON format."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        return response
        
    except Exception as e:
        logger.error(f"OpenAI API call failed: {e}")
        raise e 