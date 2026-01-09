from fastapi import APIRouter, HTTPException, Depends, status, Header
from datetime import timedelta, datetime
from bson import ObjectId
from database import get_database
from schemas import LoginRequest, UserCreate, UserCreateWithOTP, UserResponse, TokenResponse, UserUpdate, SwitchRoleRequest, OTPSendRequest, OTPVerifyRequest, OTPResponse
from auth import hash_password, verify_password, create_access_token, decode_token
from config import settings
from typing import Optional
from pymongo.errors import ServerSelectionTimeoutError, ConnectionFailure
from email_service import email_service

router = APIRouter(prefix="/auth", tags=["authentication"])

async def get_current_user(authorization: Optional[str] = Header(None)):
    print(f"🔐 AUTH: Received authorization header: {authorization[:20] if authorization else 'None'}...")
    if not authorization:
        print("❌ AUTH: Missing authorization header")
        raise HTTPException(status_code=401, detail="Missing authorization header")

    try:
        scheme, token = authorization.split()
        print(f"🔐 AUTH: Scheme: {scheme}, Token length: {len(token) if token else 0}")
        if scheme.lower() != "bearer":
            print(f"❌ AUTH: Invalid scheme: {scheme}")
            raise HTTPException(status_code=401, detail="Invalid auth scheme")
    except ValueError as e:
        print(f"❌ AUTH: Invalid header format: {e}")
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    payload = decode_token(token)
    if payload is None:
        print("❌ AUTH: Token decode failed - invalid token")
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    print(f"✅ AUTH: Successfully authenticated user: {user_id}")
    return user_id

async def get_current_user_with_role(authorization: Optional[str] = Header(None)):
    """Get current user with role information"""
    user_id = await get_current_user(authorization)
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "user_id": user_id,
        "role": user.get("currentRole", "user"),
        "email": user.get("email")
    }

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    try:
        db = get_database()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {str(e)}"
        )
    
    try:
        # Check if user exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new user
        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "mobile": user_data.mobile,
            "userType": user_data.userType,
            "currentRole": user_data.userType,
            "password": hash_password(user_data.password),
            "createdAt": None
        }
        
        from datetime import datetime
        user_doc["createdAt"] = datetime.utcnow()
        
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        # Create doctor profile if user is a doctor
        if user_data.userType == "doctor":
            doctor_doc = {
                "name": user_data.name,
                "specialization": "General Medicine",  # Default specialization
                "user_id": user_id,
                "createdAt": datetime.utcnow()
            }
            await db.doctors.insert_one(doctor_doc)
            print(f"Created doctor profile for user {user_id}")

        # Send welcome email for doctors
        if user_data.userType == "doctor":
            try:
                email_service.send_welcome_email(user_data.email, user_data.name, "doctor")
            except Exception as e:
                print(f"Warning: Failed to send doctor welcome email: {e}")
                # Don't fail registration if email fails

        # Create token
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user_id, "email": user_data.email},
            expires_delta=access_token_expires
        )

        user_doc["_id"] = user_id
        user_response = UserResponse(**user_doc)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response
        }
    except HTTPException:
        raise
    except (ServerSelectionTimeoutError, ConnectionFailure) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB connection failed. Please ensure MongoDB is running."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database operation failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest):
    db = get_database()
    
    # Find user
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    
    # Create token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user_id, "email": login_data.email},
        expires_delta=access_token_expires
    )
    
    user["_id"] = user_id
    user_response = UserResponse(**user)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(user_id: str = Depends(get_current_user)):
    db = get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["_id"] = str(user["_id"])
    return UserResponse(**user)

@router.post("/switch-role")
async def switch_role(role_data: SwitchRoleRequest, user_id: str = Depends(get_current_user)):
    db = get_database()

    new_role = role_data.new_role.value

    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"currentRole": new_role}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Role switched successfully", "new_role": new_role}

@router.delete("/delete-account")
async def delete_account(user_id: str = Depends(get_current_user)):
    """Delete user account and all associated data"""
    db = get_database()

    # Get user info first to check role
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_role = user.get("currentRole", "user")

    try:
        # Delete related data based on user role
        if user_role == "doctor":
            # For doctors, delete their doctor profile and related appointments
            await db.doctors.delete_many({"user_id": user_id})

        # Delete all appointments where user is patient or doctor
        await db.appointments.delete_many({
            "$or": [
                {"patient_id": user_id},
                {"doctor_id": user_id}  # In case they were a doctor
            ]
        })

        # Delete medical records (as patient)
        await db.medical_records.delete_many({"patient_id": user_id})

        # Delete notifications
        await db.notifications.delete_many({"user_id": user_id})

        # Delete settings
        await db.settings.delete_many({"user_id": user_id})

        # Delete OTP records
        await db.otp.delete_many({"email": user.get("email")})

        # Finally, delete the user account
        result = await db.users.delete_one({"_id": ObjectId(user_id)})

        if result.deleted_count == 0:
            raise HTTPException(status_code=400, detail="Failed to delete account")

        return {"message": "Account deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")

@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(otp_data: OTPSendRequest):
    """Send OTP to email for authentication"""
    db = get_database()

    # Generate OTP
    otp = email_service.generate_otp()

    # Calculate expiration time (10 minutes from now)
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    try:
        # Delete any existing unused OTPs for this email
        await db.otp.delete_many({
            "email": otp_data.email,
            "used": {"$ne": True},
            "expiresAt": {"$gt": datetime.utcnow()}
        })

        # Insert new OTP record
        otp_doc = {
            "email": otp_data.email,
            "otp": otp,
            "expiresAt": expires_at,
            "createdAt": datetime.utcnow(),
            "used": False,
            "attempts": 0
        }

        result = await db.otp.insert_one(otp_doc)
        otp_id = str(result.inserted_id)

        # Send OTP email
        if email_service.send_otp_email(otp_data.email, otp):
            return OTPResponse(
                message="OTP sent successfully to your email",
                otp_id=otp_id,
                expires_in=600  # 10 minutes in seconds
            )
        else:
            # Delete the OTP record if email failed
            await db.otp.delete_one({"_id": ObjectId(otp_id)})
            raise HTTPException(status_code=500, detail="Failed to send OTP email")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send OTP: {str(e)}"
        )

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(verify_data: OTPVerifyRequest):
    """Verify OTP and authenticate user"""
    print(f"DEBUG: verify_otp called with data: email={verify_data.email}, userType={verify_data.userType}, name={verify_data.name}")
    db = get_database()

    # Find the OTP record
    otp_record = await db.otp.find_one({
        "email": verify_data.email,
        "otp": verify_data.otp,
        "used": False,
        "expiresAt": {"$gt": datetime.utcnow()}
    })

    if not otp_record:
        # Check if OTP exists but is expired or already used
        existing_otp = await db.otp.find_one({
            "email": verify_data.email,
            "otp": verify_data.otp
        })

        if existing_otp:
            if existing_otp.get("used", False):
                raise HTTPException(status_code=400, detail="OTP has already been used")
            elif existing_otp["expiresAt"] <= datetime.utcnow():
                raise HTTPException(status_code=400, detail="OTP has expired")
            else:
                # Increment attempts
                await db.otp.update_one(
                    {"_id": otp_record["_id"]},
                    {"$inc": {"attempts": 1}}
                )
                raise HTTPException(status_code=400, detail="Invalid OTP")
        else:
            raise HTTPException(status_code=400, detail="Invalid OTP")

    # Check attempts limit (max 5 attempts)
    if otp_record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=400, detail="Too many failed attempts. Please request a new OTP")

    # Find or create user
    user = await db.users.find_one({"email": verify_data.email})

    if not user:
        # Auto-register user if they don't exist
        user_doc = {
            "name": verify_data.name or verify_data.email.split("@")[0],  # Use provided name or email prefix
            "email": verify_data.email,
            "mobile": verify_data.mobile,
            "userType": verify_data.userType,
            "currentRole": verify_data.userType,
            "createdAt": datetime.utcnow()
        }

        result = await db.users.insert_one(user_doc)
        user = user_doc
        user["_id"] = result.inserted_id

        # Create doctor profile if user is a doctor
        if verify_data.userType == "doctor":
            doctor_doc = {
                "name": verify_data.name or verify_data.email.split("@")[0],
                "specialization": "General Medicine",  # Default specialization
                "user_id": str(result.inserted_id),
                "createdAt": datetime.utcnow()
            }
            await db.doctors.insert_one(doctor_doc)
            print(f"Created doctor profile for user {result.inserted_id}")

    # Mark OTP as used
    await db.otp.update_one(
        {"_id": otp_record["_id"]},
        {"$set": {"used": True}}
    )

    # Send welcome email for newly registered users (doctors get special welcome)
    user_type = user.get("userType", "user")
    if user_type == "doctor":
        try:
            email_service.send_welcome_email(verify_data.email, user.get("name", verify_data.email.split("@")[0]), "doctor")
        except Exception as e:
            print(f"Warning: Failed to send doctor welcome email: {e}")
    else:
        # Send welcome email for regular users too
        try:
            email_service.send_welcome_email(verify_data.email, user.get("name", verify_data.email.split("@")[0]), "user")
        except Exception as e:
            print(f"Warning: Failed to send welcome email: {e}")

    # Create access token
    user_id = str(user["_id"])
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user_id, "email": verify_data.email},
        expires_delta=access_token_expires
    )

    user["_id"] = user_id
    user_response = UserResponse(**user)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@router.post("/register-with-otp", response_model=TokenResponse)
async def register_with_otp(user_data: UserCreateWithOTP):
    """Register new user after OTP verification (passwordless registration)"""
    try:
        db = get_database()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {str(e)}"
        )

    try:
        # Check if user already exists
        existing_user = await db.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Verify OTP
        otp_record = await db.otp.find_one({
            "email": user_data.email,
            "otp": user_data.otp,
            "used": False
        })

        if not otp_record:
            raise HTTPException(status_code=400, detail="Invalid OTP")

        if otp_record.get("expiresAt") and otp_record["expiresAt"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="OTP has expired")

        # Mark OTP as used
        await db.otp.update_one(
            {"_id": otp_record["_id"]},
            {"$set": {"used": True}}
        )

        # Create user document (no password for OTP registration)
        import secrets
        random_password = secrets.token_urlsafe(32)  # Generate random password for security
        
        user_doc = {
            "name": user_data.name,
            "email": user_data.email,
            "mobile": user_data.mobile,
            "userType": user_data.userType,
            "currentRole": user_data.userType,
            "password": hash_password(random_password),  # Random password (user uses OTP to login)
            "createdAt": datetime.utcnow(),
            "email_verified": True,  # Email is verified via OTP
            "date_of_birth": user_data.dob,
            "gender": user_data.gender,
            "registration_number": user_data.registration_number if user_data.userType == "doctor" else None  # Store medical registration number for doctors
        }

        # Insert user
        result = await db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        # Create doctor profile if user is a doctor
        if user_data.userType == "doctor":
            doctor_doc = {
                "name": user_data.name,
                "specialization": "General Medicine",  # Default specialization
                "user_id": user_id,
                "registration_number": user_data.registration_number,  # Store registration number in doctor profile
                "license_number": user_data.registration_number,  # Also set as license_number for enrollment
                "createdAt": datetime.utcnow()
            }
            await db.doctors.insert_one(doctor_doc)
            print(f"Created doctor profile for user {user_id} with registration number: {user_data.registration_number}")

        # Generate access token for the new user
        access_token = create_access_token(data={"sub": user_id})

        # Return response with token
        user_doc["_id"] = user_id
        user_response = UserResponse(**user_doc)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_response,
            "message": "Registration successful!"
        }

    except HTTPException:
        raise
    except (ServerSelectionTimeoutError, ConnectionFailure) as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MongoDB connection failed. Please ensure MongoDB is running."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )
