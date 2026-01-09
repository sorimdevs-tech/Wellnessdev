#!/usr/bin/env python3
"""
Development version of main.py that doesn't require MongoDB
For testing OTP functionality without MongoDB setup
"""
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel
import traceback
import random
import string
from datetime import datetime, timedelta
from typing import Optional
from email_service import email_service

class OTPSendRequest(BaseModel):
    email: str

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

app = FastAPI(
    title="Wellness API - Development Mode",
    description="Healthcare and Wellness Management API (Development Mode - No MongoDB)",
    version="1.0.0"
)

# Global exception handler (excludes HTTPException which FastAPI handles)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc  # Let FastAPI handle HTTPException
    error_detail = str(exc)
    traceback_str = traceback.format_exc()
    print(f"Unhandled exception: {error_detail}")
    print(f"Traceback: {traceback_str}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": error_detail,
            "type": type(exc).__name__
        }
    )

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for development
otp_storage = {}

@app.post("/auth/send-otp")
async def send_otp_dev(request: OTPSendRequest):
    """Send OTP for development (no database required)"""
    email = request.email
    # Generate OTP
    otp = email_service.generate_otp()

    # Store in memory
    otp_storage[email] = {
        "otp": otp,
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
        "used": False,
        "attempts": 0
    }

    # Send email (will log to console)
    success = email_service.send_otp_email(email, otp)

    if success:
        return {
            "message": "OTP sent successfully",
            "otp_id": f"dev_{email}",
            "expires_in": 600
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to send OTP")

@app.post("/auth/verify-otp")
async def verify_otp_dev(request: OTPVerifyRequest):
    """Verify OTP for development"""
    email = request.email
    otp = request.otp

    if email not in otp_storage:
        raise HTTPException(status_code=400, detail="No OTP found for this email")

    stored_otp = otp_storage[email]

    # Check if expired
    if datetime.utcnow() > stored_otp["expires_at"]:
        del otp_storage[email]
        raise HTTPException(status_code=400, detail="OTP has expired")

    # Check if used
    if stored_otp["used"]:
        raise HTTPException(status_code=400, detail="OTP has already been used")

    # Check attempts
    if stored_otp["attempts"] >= 5:
        raise HTTPException(status_code=400, detail="Too many failed attempts")

    # Verify OTP
    if stored_otp["otp"] != otp:
        stored_otp["attempts"] += 1
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # Mark as used
    stored_otp["used"] = True

    # Create a mock user response
    user_data = {
        "id": f"user_{email.replace('@', '_').replace('.', '_')}",
        "name": email.split("@")[0],
        "email": email,
        "userType": "user",
        "currentRole": "user"
    }

    return {
        "access_token": f"dev_token_{user_data['id']}",
        "token_type": "bearer",
        "user": user_data
    }

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Wellness API - Development Mode (No MongoDB)",
        "version": "1.0.0",
        "status": "running",
        "mode": "development"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "mode": "development"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Wellness API in DEVELOPMENT MODE")
    print("📝 No MongoDB required - using in-memory storage")
    print("🔐 OTP codes will be logged to console")
    uvicorn.run(app, host="0.0.0.0", port=8000)
