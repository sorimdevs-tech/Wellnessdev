from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
import secrets
from config import settings
from cryptography.fernet import Fernet
import os

# Simple password hashing using SHA-256 with salt
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"sha256:{salt}:{hash_obj.hexdigest()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        method, salt, hash_value = hashed_password.split(":")
        if method != "sha256":
            return False
        expected = hashlib.sha256((plain_password + salt).encode()).hexdigest()
        return secrets.compare_digest(expected, hash_value)
    except:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None

# Encryption utilities - cache the key to ensure consistency
_ENCRYPTION_KEY: Optional[bytes] = None

def get_encryption_key() -> bytes:
    """Get or create encryption key from environment - cached for consistency"""
    global _ENCRYPTION_KEY
    if _ENCRYPTION_KEY is None:
        key = os.getenv('ENCRYPTION_KEY')
        if not key:
            # For development, use a fixed default key (in production, set ENCRYPTION_KEY env var)
            # This ensures consistent encryption/decryption across app restarts
            key = "xJ3mPPVZGn-rbrtxzXGM0FZD06DBoejWke5Bj_3vQNM="
            print(f"⚠️ Using default encryption key. Set ENCRYPTION_KEY env var in production!")
        _ENCRYPTION_KEY = key.encode()
    return _ENCRYPTION_KEY

def encrypt_data(data: str) -> str:
    """Encrypt sensitive data"""
    if not data:
        return data
    f = Fernet(get_encryption_key())
    return f.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    if not encrypted_data:
        return encrypted_data
    try:
        f = Fernet(get_encryption_key())
        return f.decrypt(encrypted_data.encode()).decode()
    except:
        # Return original data if decryption fails
        return encrypted_data
