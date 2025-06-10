import asyncio
import sys
import os
sys.path.append('backend')
from backend.services.ai_service import ai_service

async def test_ai():
    variables = {
        'user_description': 'reset password online',
        'priority_level': 'medium',
        'epic_context': '',
        'project_context': '',
        'include_acceptance_criteria': True,
        'include_tags': True
    }
    response = await ai_service.generate_completion('story_generator', variables)
    print(f'Success: {response.success}')
    if response.success:
        print(f'Data type: {type(response.data)}')
        print(f'Data: {response.data}')
    else:
        print(f'Error: {response.error}')

if __name__ == "__main__":
    asyncio.run(test_ai()) 