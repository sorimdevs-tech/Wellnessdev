from fastapi import APIRouter, HTTPException, Depends, Body, Request
from bson import ObjectId
from datetime import datetime
from typing import List
from database import get_database
from schemas import DoctorCreate, DoctorUpdate, DoctorResponse
from routes.auth import get_current_user, get_current_user_with_role

router = APIRouter(prefix="/doctors", tags=["doctors"])

@router.post("/", response_model=DoctorResponse)
async def create_doctor(doctor_data: DoctorCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    doctor_doc = doctor_data.dict()
    doctor_doc["createdAt"] = datetime.utcnow()
    
    result = await db.doctors.insert_one(doctor_doc)
    doctor_doc["_id"] = str(result.inserted_id)
    
    return DoctorResponse(**doctor_doc)

@router.get("/", response_model=List[DoctorResponse])
async def list_doctors(include_unverified: bool = False):
    """
    List all doctors. By default, only verified doctors are shown to protect patient safety.
    Set include_unverified=True for admin purposes.
    """
    db = get_database()

    # By default, only show verified doctors to patients
    query = {} if include_unverified else {"verified": True}
    doctors = await db.doctors.find(query).to_list(length=100)

    for doctor in doctors:
        doctor["_id"] = str(doctor["_id"])
        # Ensure qualifications is a list for DoctorResponse schema
        if doctor and "qualifications" in doctor and isinstance(doctor["qualifications"], str):
            doctor["qualifications"] = [q.strip() for q in doctor["qualifications"].replace("\n", ",").split(",") if q.strip()]

    return [DoctorResponse(**d) for d in doctors]

@router.get("/me", response_model=DoctorResponse)
async def get_my_doctor_profile(current_user: str = Depends(get_current_user)):
    db = get_database()

    doctor = await db.doctors.find_one({"user_id": current_user})

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Ensure qualifications is a list for DoctorResponse schema
    if doctor and "qualifications" in doctor and isinstance(doctor["qualifications"], str):
        doctor["qualifications"] = [q.strip() for q in doctor["qualifications"].replace("\n", ",").split(",") if q.strip()]

    doctor["_id"] = str(doctor["_id"])
    return DoctorResponse(**doctor)

@router.get("/enrollment-status")
async def get_enrollment_status(current_user: str = Depends(get_current_user)):
    """Check if doctor is already enrolled at a hospital and return current enrollment details"""
    db = get_database()
    
    doctor = await db.doctors.find_one({"user_id": current_user})
    
    if not doctor or not doctor.get("hospital_id"):
        return {
            "enrolled": False,
            "current_hospital": None,
            "verified": False
        }
    
    # Get current hospital details
    hospital = await db.hospitals.find_one({"_id": ObjectId(doctor["hospital_id"])})
    
    return {
        "enrolled": True,
        "current_hospital": {
            "id": doctor.get("hospital_id"),
            "name": hospital.get("name") if hospital else "Unknown Hospital"
        },
        "verified": doctor.get("verified", False),
        "is_active": doctor.get("is_active", False),
        "doctor_id": str(doctor["_id"])
    }

# NOTE: /enroll endpoints MUST be defined BEFORE /{doctor_id} routes to avoid route conflicts
@router.put("/enroll-debug")
async def enroll_debug(request: Request):
    """Debug endpoint without auth dependency"""
    print(f"\n🧪 ENROLL DEBUG ENDPOINT CALLED", flush=True)
    try:
        body = await request.body()
        print(f"📦 Raw body length: {len(body)} bytes", flush=True)
        print(f"📦 Raw body: {body[:500] if body else 'EMPTY'}", flush=True)
        return {"status": "ok", "body_length": len(body), "body_preview": body[:200].decode() if body else "EMPTY"}
    except Exception as e:
        print(f"❌ Debug endpoint error: {e}", flush=True)
        return {"error": str(e)}

@router.put("/enroll")
async def enroll_doctor_profile(request: Request, current_user_info: dict = Depends(get_current_user_with_role)):
    import sys
    
    print(f"\n🔄 DOCTOR ENROLLMENT API CALL STARTED", flush=True)
    
    user_id = current_user_info["user_id"]
    user_role = current_user_info["role"]

    print(f"📋 User ID: {user_id} (Role: {user_role})", flush=True)

    try:
        # Get raw body first for debugging
        raw_body = await request.body()
        print(f"📦 Raw body length: {len(raw_body)} bytes", flush=True)
        print(f"📦 Raw body preview: {raw_body[:500] if raw_body else 'EMPTY'}", flush=True)
        
        if not raw_body:
            raise HTTPException(status_code=400, detail="Request body is empty")
        
        # Parse JSON
        import json
        doctor_data = json.loads(raw_body)
        print(f"📝 Received Data Keys: {list(doctor_data.keys()) if doctor_data else 'None'}", flush=True)
        print(f"📝 Received Data: {doctor_data}", flush=True)
        sys.stdout.flush()
    except json.JSONDecodeError as e:
        print(f"❌ JSON DECODE ERROR: {e}", flush=True)
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ FAILED TO PARSE REQUEST BODY: {e}", flush=True)
        raise HTTPException(status_code=400, detail=f"Invalid request body: {str(e)}")

    db = get_database()

    # Get user info to populate name if creating new profile
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        print(f"❌ USER NOT FOUND: {user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    print(f"✅ USER FOUND: {user.get('name', 'Unknown')} ({user.get('userType', 'unknown')}")

    # Add the user's name to the data if not provided
    if "name" not in doctor_data or not doctor_data["name"]:
        doctor_data["name"] = user.get("name", "")

    # Validate the data with our schema
    try:
        validated_data = DoctorUpdate(**doctor_data)
        print(f"✅ DoctorUpdate validation PASSED")
    except Exception as e:
        print(f"❌ DoctorUpdate validation FAILED: {e}")
        raise HTTPException(status_code=422, detail=str(e))

    # Check if doctor profile exists
    existing_doctor = await db.doctors.find_one({"user_id": user_id})
    print(f"🔍 EXISTING DOCTOR PROFILE: {'Found' if existing_doctor else 'Not Found'}")

    update_dict = {k: v for k, v in doctor_data.items() if v is not None}
    print(f"🔧 PROCESSED UPDATE DATA: {update_dict}")
    print(f"📋 ALL FIELDS FROM REQUEST: {list(update_dict.keys())}")

    # Convert string numbers to integers
    if "experience_years" in update_dict and isinstance(update_dict["experience_years"], str):
        try:
            update_dict["experience_years"] = int(update_dict["experience_years"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid experience years format")

    if "consultation_fee" in update_dict and isinstance(update_dict["consultation_fee"], str):
        try:
            update_dict["consultation_fee"] = int(update_dict["consultation_fee"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid consultation fee format")

    # Validate required fields for doctor enrollment
    if not update_dict.get("specialization"):
        raise HTTPException(status_code=400, detail="Specialization is required")

    # Handle qualifications - convert string to list if needed
    if "qualifications" in update_dict:
        if isinstance(update_dict["qualifications"], str):
            # Split by common delimiters and clean up
            quals = [q.strip() for q in update_dict["qualifications"].replace("\n", ",").split(",") if q.strip()]
            update_dict["qualifications"] = quals
        elif isinstance(update_dict["qualifications"], list):
            # Already a list, ensure all items are strings
            update_dict["qualifications"] = [str(q).strip() for q in update_dict["qualifications"] if q]

    # Handle available_days - convert string to list if needed
    if "available_days" in update_dict:
        if isinstance(update_dict["available_days"], str):
            days = [d.strip() for d in update_dict["available_days"].split(",") if d.strip()]
            update_dict["available_days"] = days

    hospital_id = update_dict.get("hospital_id")
    print(f"🏥 HOSPITAL ID: {hospital_id}")

    # Check if doctor is switching hospitals
    previous_hospital = None
    previous_hospital_name = None
    is_switching_hospitals = False
    
    if existing_doctor and existing_doctor.get("hospital_id") and hospital_id:
        if existing_doctor.get("hospital_id") != hospital_id:
            is_switching_hospitals = True
            previous_hospital = await db.hospitals.find_one({"_id": ObjectId(existing_doctor.get("hospital_id"))})
            previous_hospital_name = previous_hospital.get("name") if previous_hospital else "Previous Hospital"
            print(f"🔄 HOSPITAL SWITCH DETECTED: {previous_hospital_name} -> new hospital")

    if hospital_id:
        # Validate hospital exists
        hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
        if not hospital:
            print(f"❌ HOSPITAL NOT FOUND: {hospital_id}")
            raise HTTPException(status_code=404, detail="Hospital not found")
        print(f"✅ HOSPITAL FOUND: {hospital.get('name', 'Unknown')}")

    # Set enrollment timestamp and status
    update_dict["enrolledAt"] = datetime.utcnow()
    update_dict["verified"] = False  # Requires admin verification
    update_dict["is_active"] = False  # Not active until verified
    update_dict["user_id"] = user_id

    # If switching hospitals, send unenrollment notifications BEFORE updating
    if is_switching_hospitals:
        print(f"📨 SENDING UNENROLLMENT NOTIFICATIONS for hospital switch")
        
        # Send unenrollment notification to doctor
        unenroll_doctor_notification = {
            "user_id": user_id,
            "user_type": "doctor",
            "type": "hospital_unenrollment",
            "title": "🏥 Hospital Unenrollment",
            "message": f"You have been unenrolled from {previous_hospital_name}. Your enrollment at {hospital.get('name', 'the new hospital')} is now pending verification.",
            "read": False,
            "createdAt": datetime.utcnow()
        }
        await db.notifications.insert_one(unenroll_doctor_notification)
        print(f"📨 UNENROLLMENT NOTIFICATION SENT TO DOCTOR")
        
        # Send unenrollment notification to all clinical admins
        admin_users = await db.users.find({"userType": "clinical_admin"}).to_list(length=100)
        for admin in admin_users:
            unenroll_admin_notification = {
                "user_id": str(admin["_id"]),
                "user_type": "clinical_admin",
                "type": "doctor_hospital_switch",
                "title": "🔄 Doctor Hospital Switch",
                "message": f"Dr. {user.get('name', 'Unknown')} has unenrolled from {previous_hospital_name} and is now enrolling at {hospital.get('name', 'a new hospital')}. New verification required.",
                "read": False,
                "createdAt": datetime.utcnow(),
                "doctor_id": str(existing_doctor["_id"]),
                "previous_hospital_id": existing_doctor.get("hospital_id"),
                "new_hospital_id": hospital_id
            }
            await db.notifications.insert_one(unenroll_admin_notification)
            print(f"📨 UNENROLLMENT NOTIFICATION SENT TO ADMIN: {admin.get('name', 'Unknown')}")

    if existing_doctor:
        # Update existing profile
        print(f"🔄 UPDATING EXISTING DOCTOR PROFILE")
        result = await db.doctors.update_one(
            {"_id": existing_doctor["_id"]},
            {"$set": update_dict}
        )
        doctor = await db.doctors.find_one({"_id": existing_doctor["_id"]})
    else:
        # Create new profile
        print(f"✨ CREATING NEW DOCTOR PROFILE")
        result = await db.doctors.insert_one(update_dict)
        doctor = await db.doctors.find_one({"_id": result.inserted_id})

    # Also update user's type to doctor and set verified status
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"userType": "doctor", "doctorVerified": False}}
    )
    print(f"✅ USER TYPE UPDATED TO DOCTOR")

    # Send notification to doctor about pending verification
    doctor_notification = {
        "user_id": user_id,
        "user_type": "doctor",
        "type": "verification_pending",
        "title": "⏳ Profile Pending Verification",
        "message": f"Your doctor profile at {hospital.get('name', 'the hospital') if hospital_id else 'the platform'} is pending verification by our Clinical Admin team. You'll receive a notification once approved.",
        "read": False,
        "createdAt": datetime.utcnow()
    }
    await db.notifications.insert_one(doctor_notification)
    print(f"📨 NOTIFICATION SENT TO DOCTOR: Pending Verification")

    # Send notification to all clinical admins
    admin_users = await db.users.find({"userType": "clinical_admin"}).to_list(length=100)
    for admin in admin_users:
        admin_notification = {
            "user_id": str(admin["_id"]),
            "user_type": "clinical_admin",
            "type": "new_doctor_enrollment",
            "title": "🩺 New Doctor Enrollment",
            "message": f"Dr. {user.get('name', 'Unknown')} has enrolled at {hospital.get('name', 'a hospital') if hospital_id else 'the platform'} and is awaiting verification.",
            "read": False,
            "createdAt": datetime.utcnow(),
            "doctor_id": str(doctor["_id"]),
            "hospital_id": hospital_id
        }
        await db.notifications.insert_one(admin_notification)
        print(f"📨 NOTIFICATION SENT TO ADMIN: {admin.get('name', 'Unknown')}")

    # Create a verification record in doctor_verifications collection
    verification_record = {
        "doctor_id": str(doctor["_id"]),
        "user_id": user_id,
        "hospital_id": hospital_id,
        "status": "pending",
        "submitted_at": datetime.utcnow(),
        "doctor_name": user.get("name", ""),
        "specialization": update_dict.get("specialization", ""),
        "license_number": update_dict.get("license_number", "")
    }
    await db.doctor_verifications.insert_one(verification_record)
    print(f"📋 VERIFICATION RECORD CREATED in doctor_verifications")

    # Also create a record in background_verifications (used by admin panel)
    background_verification = {
        "entity_type": "doctor",
        "entity_id": str(doctor["_id"]),
        "status": "pending",
        "documents_required": ["Medical License", "Qualification Certificates", "ID Proof"],
        "documents_submitted": [],
        "notes": f"Doctor enrollment at {hospital.get('name', 'hospital') if hospital_id else 'platform'}",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    await db.background_verifications.insert_one(background_verification)
    print(f"📋 BACKGROUND VERIFICATION RECORD CREATED")

    doctor["_id"] = str(doctor["_id"])

    # Ensure qualifications is a list for DoctorResponse schema
    if doctor and "qualifications" in doctor and isinstance(doctor["qualifications"], str):
        doctor["qualifications"] = [q.strip() for q in doctor["qualifications"].replace("\n", ",").split(",") if q.strip()]

    print(f"✅ DOCTOR ENROLLMENT COMPLETE!")

    response = DoctorResponse(**doctor)
    print(f"📤 Returning response: {response}")

    return response

# Dynamic routes AFTER specific routes to avoid conflicts
@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(doctor_id: str):
    db = get_database()

    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Ensure qualifications is a list for DoctorResponse schema
    if doctor and "qualifications" in doctor and isinstance(doctor["qualifications"], str):
        doctor["qualifications"] = [q.strip() for q in doctor["qualifications"].replace("\n", ",").split(",") if q.strip()]

    doctor["_id"] = str(doctor["_id"])
    return DoctorResponse(**doctor)

@router.put("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(doctor_id: str, doctor_data: DoctorCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    try:
        result = await db.doctors.update_one(
            {"_id": ObjectId(doctor_id)},
            {"$set": {k: v for k, v in doctor_data.dict().items() if v is not None}}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    doctor["_id"] = str(doctor["_id"])
    return DoctorResponse(**doctor)

@router.delete("/{doctor_id}")
async def delete_doctor(doctor_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()

    try:
        result = await db.doctors.delete_one({"_id": ObjectId(doctor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {"message": "Doctor deleted successfully"}

@router.get("/details/{doctor_id}")
async def get_doctor_details(doctor_id: str):
    """Get detailed doctor information for sharing/viewing"""
    db = get_database()

    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Get hospital information if available
    hospital_info = None
    if doctor.get("hospital_id"):
        try:
            hospital = await db.hospitals.find_one({"_id": ObjectId(doctor["hospital_id"])})
            if hospital:
                hospital_info = {
                    "id": str(hospital["_id"]),
                    "name": hospital.get("name", ""),
                    "location": hospital.get("location", ""),
                    "city": hospital.get("city", "")
                }
        except:
            pass  # Hospital not found, continue without hospital info

    doctor["_id"] = str(doctor["_id"])

    # Format response
    response = {
        "id": doctor["_id"],
        "name": doctor.get("name", ""),
        "specialization": doctor.get("specialization", ""),
        "experience_years": doctor.get("experience_years", 0),
        "qualifications": doctor.get("qualifications", []),
        "license_number": doctor.get("license_number", ""),
        "consultation_fee": doctor.get("consultation_fee", 0),
        "available_days": doctor.get("available_days", []),
        "available_time_start": doctor.get("available_time_start", ""),
        "available_time_end": doctor.get("available_time_end", ""),
        "education": doctor.get("education", ""),
        "awards": doctor.get("awards", []),
        "publications": doctor.get("publications", []),
        "languages": doctor.get("languages", []),
        "emergency_contact": doctor.get("emergency_contact", ""),
        "certifications": doctor.get("certifications", []),
        "professional_memberships": doctor.get("professional_memberships", []),
        "research_interests": doctor.get("research_interests", []),
        "hospital": hospital_info,
        "created_at": doctor.get("createdAt", "")
    }

    return response

@router.post("/test-enroll")
async def test_enroll_endpoint(request: Request):
    """Simple test endpoint to debug enrollment issues"""
    try:
        body = await request.body()
        print(f"\n🧪 TEST ENDPOINT CALLED", flush=True)
        print(f"📦 Raw body: {body}", flush=True)

        data = await request.json()
        print(f"📝 Parsed JSON: {data}", flush=True)
        print(f"📋 Data keys: {list(data.keys()) if data else 'None'}", flush=True)

        return {"status": "received", "data_keys": list(data.keys()) if data else [], "data": data}
    except Exception as e:
        print(f"❌ Test endpoint error: {e}", flush=True)
        return {"error": str(e)}
