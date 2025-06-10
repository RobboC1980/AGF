from services.ai_service import ai_service
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()
print('OpenAI API Key:', 'Found' if os.getenv('OPENAI_API_KEY') else 'Not found')
print('Anthropic API Key:', 'Found' if os.getenv('ANTHROPIC_API_KEY') else 'Not found')

async def test_ai():
    variables = {
        'user_description': 'Users need to login to access their account',
        'priority_level': 'high',
        'epic_context': '',
        'project_context': '',
        'include_acceptance_criteria': True,
        'include_tags': True
    }
    
    try:
        response = await ai_service.generate_completion('story_generator', variables)
        print('AI Response Success:', response.success)
        if response.success:
            print('AI Response Data:', response.data)
        else:
            print('AI Response Error:', response.error)
    except Exception as e:
        print('Exception:', str(e))

if __name__ == "__main__":
    asyncio.run(test_ai()) 