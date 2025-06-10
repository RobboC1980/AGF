from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
import bcrypt
import os
from datetime import datetime, timedelta
import logging
import secrets
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

from ..database.connection import get_db_connection

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Email Configuration
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@agileforge.com")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3001")

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str) -> str:
    """Create a JWT access token"""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db_connection)
):
    """Get the current authenticated user"""
    payload = verify_token(credentials.credentials)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Fetch user from database
    user = await db.fetchrow(
        "SELECT id, email, name, avatar_url FROM users WHERE id = $1",
        user_id
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return UserResponse(**dict(user))

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db = Depends(get_db_connection)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await db.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            user_data.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user
        user = await db.fetchrow("""
            INSERT INTO users (email, name, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, email, name, avatar_url
        """, user_data.email, user_data.name, hashed_password)
        
        # Create access token
        access_token = create_access_token(str(user['id']), user['email'])
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**dict(user))
        )
        
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db = Depends(get_db_connection)):
    """Login user"""
    try:
        # Fetch user with password
        user = await db.fetchrow("""
            SELECT id, email, name, avatar_url, password_hash
            FROM users WHERE email = $1
        """, login_data.email)
        
        if not user or not verify_password(login_data.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token = create_access_token(str(user['id']), user['email'])
        
        # Remove password from response
        user_data = {k: v for k, v in dict(user).items() if k != 'password_hash'}
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**user_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/password-reset-request")
async def password_reset_request(reset_data: PasswordResetRequest, db = Depends(get_db_connection)):
    """Initiate password reset process"""
    try:
        # Check if user exists
        user = await db.fetchrow(
            "SELECT id, email, name FROM users WHERE email = $1",
            reset_data.email
        )
        
        if not user:
            # For security, don't reveal if email exists or not
            # Always return success message
            return {"message": "If an account with this email exists, you will receive a password reset link."}
        
        # Generate reset token
        reset_token = generate_reset_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Store reset token in database
        await db.execute("""
            INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) 
            DO UPDATE SET token = $2, expires_at = $3, created_at = $4
        """, user['id'], reset_token, expires_at, datetime.utcnow())
        
        # Send reset email
        email_sent = await send_reset_email(user['email'], reset_token)
        
        if not email_sent:
            logger.warning(f"Failed to send password reset email to {user['email']}")
        
        return {"message": "If an account with this email exists, you will receive a password reset link."}
        
    except Exception as e:
        logger.error(f"Password reset request failed: {e}")
        # For security, don't reveal internal errors
        return {"message": "If an account with this email exists, you will receive a password reset link."}

@router.post("/password-reset-confirm")
async def password_reset_confirm(reset_data: PasswordResetConfirm, db = Depends(get_db_connection)):
    """Confirm password reset with token"""
    try:
        # Find reset token
        reset_record = await db.fetchrow("""
            SELECT prt.user_id, prt.expires_at, u.email, u.name
            FROM password_reset_tokens prt
            JOIN users u ON prt.user_id = u.id
            WHERE prt.token = $1 AND prt.expires_at > $2
        """, reset_data.token, datetime.utcnow())
        
        if not reset_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Hash new password
        hashed_password = hash_password(reset_data.new_password)
        
        # Update user password
        await db.execute(
            "UPDATE users SET password_hash = $1 WHERE id = $2",
            hashed_password, reset_record['user_id']
        )
        
        # Delete used reset token
        await db.execute(
            "DELETE FROM password_reset_tokens WHERE user_id = $1",
            reset_record['user_id']
        )
        
        logger.info(f"Password reset successful for user {reset_record['email']}")
        
        return {"message": "Password reset successful. You can now log in with your new password."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset confirmation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/refresh")
async def refresh_token(current_user: UserResponse = Depends(get_current_user)):
    """Refresh access token"""
    access_token = create_access_token(current_user.id, current_user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

def generate_reset_token() -> str:
    """Generate a secure reset token"""
    return secrets.token_urlsafe(32)

async def send_reset_email(email: str, reset_token: str) -> bool:
    """Send password reset email"""
    try:
        # Create reset link
        reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
        
        # Create email content
        subject = "Reset Your AgileForge Password"
        html_body = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your AgileForge account.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
                <p>If you can't click the button, copy and paste this link into your browser:</p>
                <p>{reset_link}</p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <br>
                <p>Best regards,<br>The AgileForge Team</p>
            </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request
        
        You requested a password reset for your AgileForge account.
        
        Click the link below to reset your password:
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request this password reset, please ignore this email.
        
        Best regards,
        The AgileForge Team
        """
        
        # Create message
        msg = MimeMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = email
        
        # Attach text and HTML parts
        text_part = MimeText(text_body, 'plain')
        html_part = MimeText(html_body, 'html')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email (only if SMTP is configured)
        if SMTP_USERNAME and SMTP_PASSWORD:
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            logger.info(f"Password reset email sent to {email}")
        else:
            # For development/demo purposes, just log the reset link
            logger.info(f"Password reset requested for {email}. Reset link: {reset_link}")
            
        return True
        
    except Exception as e:
        logger.error(f"Failed to send reset email to {email}: {e}")
        return False
