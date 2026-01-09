from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List
from database import get_database
from schemas import HospitalCreate, HospitalResponse
from routes.auth import get_current_user

router = APIRouter(prefix="/hospitals", tags=["hospitals"])

@router.post("/", response_model=HospitalResponse)
async def create_hospital(hospital_data: HospitalCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    hospital_doc = hospital_data.dict()
    hospital_doc["createdAt"] = datetime.utcnow()
    
    result = await db.hospitals.insert_one(hospital_doc)
    hospital_doc["_id"] = str(result.inserted_id)
    
    return HospitalResponse(**hospital_doc)

@router.get("/", response_model=List[HospitalResponse])
async def list_hospitals():
    db = get_database()

    hospitals = await db.hospitals.find().to_list(length=100)

    # Get doctors for each hospital
    for hospital in hospitals:
        hospital["_id"] = str(hospital["_id"])
        hospital_id = hospital["_id"]

        # Find ONLY VERIFIED and ACTIVE doctors associated with this hospital
        doctors = await db.doctors.find({
            "hospital_id": hospital_id,
            "verified": True,
            "is_active": True
        }).to_list(length=50)
        print(f"DEBUG: Found {len(doctors)} verified doctors for hospital {hospital_id}")
        hospital["doctors"] = []

        for doctor in doctors:
            doctor["_id"] = str(doctor["_id"])
            hospital["doctors"].append({
                "id": str(doctor.get("user_id", doctor["_id"])),  # Use user_id if available, fallback to doctor profile id
                "name": doctor["name"],
                "status": "Available",  # Default status
                "specialization": doctor.get("specialization", "")
            })
            print(f"DEBUG: Added doctor {doctor['name']} (user_id: {doctor.get('user_id')}) to hospital {hospital['name']}")

    result = [HospitalResponse(**h) for h in hospitals]
    print(f"DEBUG: Returning {len(result)} hospitals")
    for i, h in enumerate(result):
        print(f"DEBUG: Hospital {i}: {h.name}, doctors: {len(h.doctors) if hasattr(h, 'doctors') and h.doctors else 0}")

    return result

@router.get("/{hospital_id}", response_model=HospitalResponse)
async def get_hospital(hospital_id: str):
    db = get_database()
    
    try:
        hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid hospital ID")
    
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    hospital["_id"] = str(hospital["_id"])
    return HospitalResponse(**hospital)

@router.put("/{hospital_id}", response_model=HospitalResponse)
async def update_hospital(hospital_id: str, hospital_data: HospitalCreate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    try:
        result = await db.hospitals.update_one(
            {"_id": ObjectId(hospital_id)},
            {"$set": hospital_data.dict()}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid hospital ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    hospital["_id"] = str(hospital["_id"])
    return HospitalResponse(**hospital)

@router.delete("/{hospital_id}")
async def delete_hospital(hospital_id: str, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    try:
        result = await db.hospitals.delete_one({"_id": ObjectId(hospital_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid hospital ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    return {"message": "Hospital deleted successfully"}


# Public endpoints for filter data
@router.get("/meta/types")
async def get_hospital_types():
    """Get all active hospital types for filter dropdowns"""
    db = get_database()
    
    types = await db.hospital_types.find({"is_active": True}).to_list(length=100)
    for t in types:
        t["_id"] = str(t["_id"])
        t["id"] = t["_id"]
    
    return types

@router.get("/meta/specializations")
async def get_specializations():
    """Get all active specializations for filter dropdowns"""
    db = get_database()
    
    specs = await db.specializations.find({"is_active": True}).to_list(length=100)
    for s in specs:
        s["_id"] = str(s["_id"])
        s["id"] = s["_id"]
    
    return specs
