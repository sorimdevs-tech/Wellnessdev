from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import get_database
from schemas import UserResponse, UserUpdate
from routes.auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
async def get_current_user_profile(current_user: str = Depends(get_current_user)):
    """Get the current logged-in user's profile, including doctor info if applicable"""
    db = get_database()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(current_user)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    
    # If user is a doctor, merge doctor profile data
    if user.get("userType") == "doctor":
        doctor = await db.doctors.find_one({"user_id": current_user})
        if doctor:
            print(f"[DEBUG] Found doctor profile: {doctor}")
            # Merge doctor fields into user response
            user["specialization"] = doctor.get("specialization")
            # Ensure qualification is always a string (convert array to comma-separated)
            qual = doctor.get("qualification") or doctor.get("qualifications")
            if isinstance(qual, list):
                user["qualification"] = ", ".join(qual)
            else:
                user["qualification"] = qual
            user["experience"] = doctor.get("experience") or doctor.get("experience_years")
            user["experience_years"] = doctor.get("experience_years") or doctor.get("experience")
            user["hospital_id"] = doctor.get("hospital_id")
            user["consultation_fee"] = doctor.get("consultation_fee")
            user["bio"] = doctor.get("bio")
            user["registration_number"] = doctor.get("registration_number") or doctor.get("regNumber")
            user["available_days"] = doctor.get("available_days")
            user["available_time_start"] = doctor.get("available_time_start")
            user["available_time_end"] = doctor.get("available_time_end")
            user["languages"] = doctor.get("languages")
            user["verified"] = doctor.get("verified", False)
            user["doctor_id"] = str(doctor.get("_id"))
            
            # Always fetch current hospital name from hospitals collection
            hospital_id = doctor.get("hospital_id")
            if hospital_id:
                try:
                    hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
                    if hospital:
                        user["hospital_name"] = hospital.get("name")
                        print(f"[DEBUG] Found hospital: {hospital.get('name')}")
                    else:
                        user["hospital_name"] = None
                except:
                    user["hospital_name"] = None
            else:
                user["hospital_name"] = None
    
    print(f"[DEBUG] GET /me - Returning user: {user}")
    return user

@router.put("/me")
async def update_current_user_profile(user_data: UserUpdate, current_user: str = Depends(get_current_user)):
    """Update the current logged-in user's profile"""
    db = get_database()
    
    print(f"[DEBUG] Updating user {current_user} with data: {user_data.model_dump()}")
    
    # Use model_dump to get all fields, then filter out None values
    data = user_data.model_dump(exclude_none=True)
    
    # Separate user fields from doctor fields
    user_fields = ['name', 'email', 'mobile', 'date_of_birth', 'gender', 'address', 
                   'blood_group', 'emergency_contact', 'profile_image', 'password']
    doctor_fields = ['specialization', 'qualification', 'experience_years', 'consultation_fee',
                     'available_days', 'available_time_start', 'available_time_end', 
                     'bio', 'languages', 'registration_number']
    
    # Build user update dict
    user_update = {}
    for field in user_fields:
        if field in data and data[field] is not None:
            if field == 'password':
                from auth import hash_password
                user_update['password'] = hash_password(data[field])
            else:
                user_update[field] = data[field]
    
    # Update user collection
    if user_update:
        user_update["updated_at"] = datetime.utcnow()
        result = await db.users.update_one(
            {"_id": ObjectId(current_user)},
            {"$set": user_update}
        )
        print(f"[DEBUG] User update result - matched: {result.matched_count}, modified: {result.modified_count}")
    
    # Check if user is a doctor and update doctor collection
    user = await db.users.find_one({"_id": ObjectId(current_user)})
    if user and user.get("userType") == "doctor":
        doctor_update = {}
        for field in doctor_fields:
            if field in data and data[field] is not None:
                doctor_update[field] = data[field]
        
        if doctor_update:
            doctor_update["updated_at"] = datetime.utcnow()
            # Update or create doctor profile
            doctor_result = await db.doctors.update_one(
                {"user_id": current_user},
                {"$set": doctor_update},
                upsert=True
            )
            print(f"[DEBUG] Doctor update result - matched: {doctor_result.matched_count}, modified: {doctor_result.modified_count}")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    
    # If user is a doctor, merge doctor profile data for response
    if user.get("userType") == "doctor":
        doctor = await db.doctors.find_one({"user_id": current_user})
        if doctor:
            user["specialization"] = doctor.get("specialization")
            # Ensure qualification is always a string (convert array to comma-separated)
            qual = doctor.get("qualification") or doctor.get("qualifications")
            if isinstance(qual, list):
                user["qualification"] = ", ".join(qual)
            else:
                user["qualification"] = qual
            user["experience"] = doctor.get("experience") or doctor.get("experience_years")
            user["experience_years"] = doctor.get("experience_years") or doctor.get("experience")
            user["hospital_id"] = doctor.get("hospital_id")
            user["hospital_name"] = doctor.get("hospital_name")
            user["consultation_fee"] = doctor.get("consultation_fee")
            user["bio"] = doctor.get("bio")
            user["registration_number"] = doctor.get("registration_number") or doctor.get("regNumber")
            user["available_days"] = doctor.get("available_days")
            user["available_time_start"] = doctor.get("available_time_start")
            user["available_time_end"] = doctor.get("available_time_end")
            user["languages"] = doctor.get("languages")
    
    print(f"[DEBUG] Returning user after update: {user}")
    return user

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    return UserResponse(**user)

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, user_data: UserUpdate, current_user: str = Depends(get_current_user)):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Cannot update other users")
    
    db = get_database()
    
    update_dict = {}
    if user_data.name:
        update_dict["name"] = user_data.name
    if user_data.email:
        update_dict["email"] = user_data.email
    if user_data.mobile:
        update_dict["mobile"] = user_data.mobile
    if user_data.password:
        from auth import hash_password
        update_dict["password"] = hash_password(user_data.password)
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user["_id"] = str(user["_id"])
    return UserResponse(**user)

@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: str = Depends(get_current_user)):
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Cannot delete other users")
    
    db = get_database()
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}
