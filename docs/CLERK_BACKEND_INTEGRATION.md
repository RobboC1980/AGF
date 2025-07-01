# Clerk Backend Integration Guide

This guide explains how to update your FastAPI backend to work with Clerk authentication tokens.

## Overview

Your backend needs to be updated to:
1. Verify Clerk JWT tokens instead of custom tokens
2. Extract user information from Clerk tokens
3. Handle Clerk user IDs in your database

## 1. Install Required Dependencies

Add these to your `backend/requirements.txt`:

```txt
PyJWT[crypto]==2.8.0
cryptography==41.0.7
requests==2.31.0
```

Then install:
```bash
cd backend
pip install PyJWT[crypto] cryptography requests
```

## 2. Create Clerk Token Verification

Create a new file `backend/auth/clerk_auth.py`:

```python
import jwt
import requests
import os
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from functools import lru_cache

logger = logging.getLogger(__name__)

class ClerkTokenVerifier:
    def __init__(self):
        self.clerk_domain = os.getenv("CLERK_DOMAIN", "your-domain.clerk.accounts.dev")
        self.jwks_url = f"https://{self.clerk_domain}/.well-known/jwks.json"
        self.issuer = f"https://{self.clerk_domain}"
        
    @lru_cache(maxsize=1)
    def get_jwks(self) -> Dict[str, Any]:
        """Fetch JWKS (JSON Web Key Set) from Clerk"""
        try:
            response = requests.get(self.jwks_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service unavailable"
            )
    
    def get_signing_key(self, token: str) -> str:
        """Get the signing key for the token"""
        try:
            # Decode header without verification to get key ID
            header = jwt.get_unverified_header(token)
            key_id = header.get("kid")
            
            if not key_id:
                raise ValueError("Token missing key ID")
            
            # Get JWKS and find the matching key
            jwks = self.get_jwks()
            
            for key in jwks.get("keys", []):
                if key.get("kid") == key_id:
                    # Convert JWK to PEM format
                    from jwt import PyJWK
                    jwk = PyJWK(key)
                    return jwk.key
            
            raise ValueError(f"No key found for kid: {key_id}")
            
        except Exception as e:
            logger.error(f"Failed to get signing key: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format"
            )
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode Clerk JWT token"""
        try:
            # Get signing key
            signing_key = self.get_signing_key(token)
            
            # Verify and decode token
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                issuer=self.issuer,
                # Add audience verification if you set one in Clerk
                # audience="your-audience"
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )

# Global verifier instance
clerk_verifier = ClerkTokenVerifier()

def verify_clerk_token(token: str) -> Dict[str, Any]:
    """Verify Clerk token and return payload"""
    return clerk_verifier.verify_token(token)
```

## 3. Update Authentication Dependencies

Update `backend/auth/dependencies.py`:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .clerk_auth import verify_clerk_token

security = HTTPBearer()

class ClerkUser:
    """User model from Clerk token"""
    def __init__(self, payload: dict):
        self.id = payload.get("sub")  # Clerk user ID
        self.email = payload.get("email")
        self.first_name = payload.get("given_name")
        self.last_name = payload.get("family_name")
        self.full_name = payload.get("name")
        # Custom metadata from Clerk
        self.user_metadata = payload.get("user_metadata", {})
        self.app_metadata = payload.get("app_metadata", {})

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> ClerkUser:
    """Get current user from Clerk token"""
    try:
        token = credentials.credentials
        payload = verify_clerk_token(token)
        return ClerkUser(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# For compatibility with existing code
get_current_active_user = get_current_user
```

## 4. Update Your API Endpoints

Update your API endpoints to use the new Clerk authentication:

```python
# Example: backend/api/stories.py
from fastapi import APIRouter, Depends, HTTPException, status
from ..auth.dependencies import get_current_user, ClerkUser
from ..database.supabase_client import get_supabase

router = APIRouter()

@router.get("/stories")
async def get_stories(
    current_user: ClerkUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Get all stories for the current user"""
    try:
        # Query stories using Supabase with RLS policies
        result = supabase.table("stories").select("*").execute()
        
        return {
            "success": True,
            "data": {"stories": result.data}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stories: {str(e)}"
        )

@router.post("/stories")
async def create_story(
    story_data: dict,
    current_user: ClerkUser = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Create a new story"""
    try:
        # Add the Clerk user ID to the story
        story_data["created_by"] = current_user.id
        
        result = supabase.table("stories").insert(story_data).execute()
        
        return {
            "success": True,
            "data": result.data[0] if result.data else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create story: {str(e)}"
        )
```

## 5. Update Supabase RLS Policies

Update your Supabase Row Level Security policies to work with Clerk user IDs:

```sql
-- Update RLS policies to use Clerk user IDs
-- Example for stories table
DROP POLICY IF EXISTS "Users can only see their own stories" ON stories;

CREATE POLICY "Users can only see their own stories" ON stories
    FOR ALL USING (
        auth.jwt() ->> 'sub' = created_by::text
    );

-- Update other tables similarly
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;

CREATE POLICY "Users can manage their own projects" ON projects
    FOR ALL USING (
        auth.jwt() ->> 'sub' = created_by::text
    );
```

## 6. Environment Variables

Add these to your backend's environment variables:

```env
# Clerk Configuration
CLERK_DOMAIN=shining-killdeer-54.clerk.accounts.dev
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Keep existing Supabase variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

## 7. Update Main Application

Update `backend/main.py` to use the new auth system:

```python
from fastapi import FastAPI, Depends
from .auth.dependencies import get_current_user, ClerkUser
from .api import stories, epics, projects, users  # Your API routers

app = FastAPI(title="AgileForge API", version="1.0.0")

# Include your routers
app.include_router(stories.router, prefix="/api", tags=["stories"])
app.include_router(epics.router, prefix="/api", tags=["epics"])
app.include_router(projects.router, prefix="/api", tags=["projects"])
app.include_router(users.router, prefix="/api", tags=["users"])

@app.get("/api/me")
async def get_current_user_info(current_user: ClerkUser = Depends(get_current_user)):
    """Get current user information from Clerk token"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.full_name,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
    }
```

## 8. Testing the Integration

1. **Start your backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **Test with a Clerk token:**
   ```bash
   # Get a token from your frontend and test
   curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
        http://localhost:8000/api/me
   ```

3. **Verify Supabase RLS:**
   - Ensure data is properly filtered by user
   - Test that users can only see their own data

## 9. Migration Strategy

1. **Backup your data** before making changes
2. **Create a mapping** between existing user IDs and Clerk user IDs
3. **Update existing records** to use Clerk user IDs
4. **Test thoroughly** with the new authentication

## 10. Troubleshooting

### Common Issues:

1. **JWKS fetch errors:**
   - Check your Clerk domain configuration
   - Ensure network connectivity to Clerk

2. **Token verification failures:**
   - Verify the JWT template in Clerk
   - Check the issuer and audience claims

3. **RLS policy issues:**
   - Test policies with the service role key
   - Ensure Clerk user IDs are properly formatted

### Debug Tips:

```python
# Add logging to see token contents
import logging
logging.basicConfig(level=logging.DEBUG)

# In your verification function:
logger.debug(f"Token payload: {payload}")
```

## Next Steps

1. Update all your API endpoints to use `get_current_user`
2. Update database schemas if needed
3. Test the full authentication flow
4. Deploy the updated backend

This integration ensures your backend properly authenticates users with Clerk while maintaining compatibility with your existing Supabase setup. 