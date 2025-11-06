"""
JWT Token Management for IdeaFlow Authentication
Handles token creation, verification, and refresh
"""

import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# JWT Configuration
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 1440
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(user_id: str, username: str, role: str) -> str:
    """Create a JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        'sub': user_id,
        'username': username,
        'role': role,
        'exp': expire,
        'iat': datetime.utcnow(),
        'type': 'access'
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    """Create a JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        'sub': user_id,
        'exp': expire,
        'iat': datetime.utcnow(),
        'type': 'refresh'
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify an access token specifically"""
    payload = verify_token(token)
    if payload and payload.get('type') == 'access':
        return payload
    return None

def verify_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a refresh token specifically"""
    payload = verify_token(token)
    if payload and payload.get('type') == 'refresh':
        return payload
    return None

def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """Extract user information from a valid token"""
    payload = verify_access_token(token)
    if payload:
        return {
            'user_id': payload.get('sub'),
            'username': payload.get('username'),
            'role': payload.get('role')
        }
    return None
