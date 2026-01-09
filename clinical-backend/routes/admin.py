from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
from database import get_database
from schemas import (
    UserCreate, UserResponse, UserUpdate,
    DoctorCreate, DoctorResponse,
    HospitalCreate, HospitalResponse,
    BackgroundVerificationCreate, BackgroundVerificationUpdate, BackgroundVerificationResponse,
    AdminStats, AdminExtendedStats, VerificationStatus,
    UserDocumentCreate, UserDocumentUpdate, UserDocumentResponse, DocumentStatus,
    DoctorPortfolioCreate, DoctorPortfolioUpdate, DoctorPortfolioResponse,
    DoctorPatientRelationshipCreate, DoctorPatientRelationshipUpdate, DoctorPatientRelationshipResponse,
    RelationshipStatus,
    HospitalTypeCreate, HospitalTypeUpdate, HospitalTypeResponse,
    SpecializationCreate, SpecializationUpdate, SpecializationResponse
)
from routes.auth import get_current_user, get_current_user_with_role

router = APIRouter(prefix="/admin", tags=["admin"])

async def require_admin(user_info = Depends(get_current_user_with_role)):
    """Dependency to ensure only clinical admins can access these routes"""
    if user_info.get("role") != "clinical_admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_info["user_id"]  # Return just the user_id string for backwards compatibility

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(user_info = Depends(require_admin)):
    db = get_database()

    total_users = await db.users.count_documents({"userType": "user"})
    total_doctors = await db.doctors.count_documents({})
    total_hospitals = await db.hospitals.count_documents({})
    pending_verifications = await db.background_verifications.count_documents({"status": "pending"})
    total_appointments = await db.appointments.count_documents({})

    return AdminStats(
        total_users=total_users,
        total_doctors=total_doctors,
        total_hospitals=total_hospitals,
        pending_verifications=pending_verifications,
        total_appointments=total_appointments
    )

# User Management
@router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user: str = Depends(require_admin)):
    db = get_database()

    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = user_data.dict()
    user_doc["createdAt"] = datetime.utcnow()
    user_doc["currentRole"] = user_data.userType

    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = str(result.inserted_id)

    # Create background verification record
    verification_doc = {
        "entity_type": "user",
        "entity_id": str(result.inserted_id),
        "status": "pending",
        "documents_required": ["ID Proof", "Address Proof"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    await db.background_verifications.insert_one(verification_doc)

    return UserResponse(**user_doc)

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    user_type: Optional[str] = None,
    current_user: str = Depends(require_admin)
):
    db = get_database()

    query = {}
    if user_type:
        query["userType"] = user_type

    users = await db.users.find(query).skip(skip).limit(limit).to_list(length=limit)

    for user in users:
        user["_id"] = str(user["_id"])

    return [UserResponse(**u) for u in users]

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: str = Depends(require_admin)
):
    db = get_database()

    try:
        result = await db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {k: v for k, v in user_data.dict().items() if v is not None}}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user["_id"] = str(user["_id"])
    return UserResponse(**user)

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: str = Depends(require_admin)):
    db = get_database()

    try:
        result = await db.users.delete_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}

# Doctor Management
@router.post("/doctors", response_model=DoctorResponse)
async def create_doctor(doctor_data: DoctorCreate, current_user: str = Depends(require_admin)):
    db = get_database()

    doctor_doc = doctor_data.dict()
    doctor_doc["createdAt"] = datetime.utcnow()

    result = await db.doctors.insert_one(doctor_doc)
    doctor_doc["_id"] = str(result.inserted_id)

    # Create background verification record
    verification_doc = {
        "entity_type": "doctor",
        "entity_id": str(result.inserted_id),
        "status": "pending",
        "documents_required": ["Medical License", "Qualification Certificates", "ID Proof"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    await db.background_verifications.insert_one(verification_doc)

    return DoctorResponse(**doctor_doc)

@router.get("/doctors", response_model=List[DoctorResponse])
async def list_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    hospital_id: Optional[str] = None,
    current_user: str = Depends(require_admin)
):
    db = get_database()

    query = {}
    if hospital_id:
        query["hospital_id"] = hospital_id

    doctors = await db.doctors.find(query).skip(skip).limit(limit).to_list(length=limit)

    for doctor in doctors:
        doctor["_id"] = str(doctor["_id"])

    return [DoctorResponse(**d) for d in doctors]

@router.put("/doctors/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: str,
    doctor_data: DoctorCreate,
    current_user: str = Depends(require_admin)
):
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

@router.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str, current_user: str = Depends(require_admin)):
    db = get_database()

    try:
        result = await db.doctors.delete_one({"_id": ObjectId(doctor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {"message": "Doctor deleted successfully"}

# Hospital Management
@router.post("/hospitals", response_model=HospitalResponse)
async def create_hospital(hospital_data: HospitalCreate, current_user: str = Depends(require_admin)):
    db = get_database()

    hospital_doc = hospital_data.dict()
    hospital_doc["createdAt"] = datetime.utcnow()

    result = await db.hospitals.insert_one(hospital_doc)
    hospital_doc["_id"] = str(result.inserted_id)

    # Create background verification record
    verification_doc = {
        "entity_type": "hospital",
        "entity_id": str(result.inserted_id),
        "status": "pending",
        "documents_required": ["Registration Certificate", "License", "Address Proof", "Insurance"],
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    await db.background_verifications.insert_one(verification_doc)

    return HospitalResponse(**hospital_doc)

@router.get("/hospitals", response_model=List[HospitalResponse])
async def list_hospitals(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    city: Optional[str] = None,
    current_user: str = Depends(require_admin)
):
    db = get_database()

    query = {}
    if city:
        query["city"] = city

    hospitals = await db.hospitals.find(query).skip(skip).limit(limit).to_list(length=limit)

    for hospital in hospitals:
        hospital["_id"] = str(hospital["_id"])

    return [HospitalResponse(**h) for h in hospitals]

@router.put("/hospitals/{hospital_id}", response_model=HospitalResponse)
async def update_hospital(
    hospital_id: str,
    hospital_data: HospitalCreate,
    current_user: str = Depends(require_admin)
):
    db = get_database()

    try:
        result = await db.hospitals.update_one(
            {"_id": ObjectId(hospital_id)},
            {"$set": {k: v for k, v in hospital_data.dict().items() if v is not None}}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid hospital ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")

    hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    hospital["_id"] = str(hospital["_id"])
    return HospitalResponse(**hospital)

@router.delete("/hospitals/{hospital_id}")
async def delete_hospital(hospital_id: str, current_user: str = Depends(require_admin)):
    db = get_database()

    try:
        result = await db.hospitals.delete_one({"_id": ObjectId(hospital_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid hospital ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hospital not found")

    return {"message": "Hospital deleted successfully"}

# Background Verification Management
@router.get("/verifications", response_model=List[BackgroundVerificationResponse])
async def list_verifications(
    status: Optional[VerificationStatus] = None,
    entity_type: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: str = Depends(require_admin)
):
    db = get_database()

    query = {}
    if status:
        query["status"] = status
    if entity_type:
        query["entity_type"] = entity_type

    verifications = await db.background_verifications.find(query).skip(skip).limit(limit).to_list(length=limit)

    for verification in verifications:
        verification["_id"] = str(verification["_id"])

    return [BackgroundVerificationResponse(**v) for v in verifications]

@router.get("/pending-doctor-verifications")
async def get_pending_doctor_verifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: str = Depends(require_admin)
):
    """Get all pending doctor verifications with full doctor details"""
    db = get_database()

    # Get pending doctor verifications
    verifications = await db.background_verifications.find({
        "entity_type": "doctor",
        "status": "pending"
    }).skip(skip).limit(limit).to_list(length=limit)

    result = []
    for verification in verifications:
        verification["_id"] = str(verification["_id"])
        
        # Get doctor details
        try:
            doctor = await db.doctors.find_one({"_id": ObjectId(verification["entity_id"])})
            if doctor:
                doctor["_id"] = str(doctor["_id"])
                
                # Get user details if available
                user_info = None
                if doctor.get("user_id"):
                    user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])})
                    if user:
                        user_info = {
                            "id": str(user["_id"]),
                            "name": user.get("name"),
                            "email": user.get("email"),
                            "mobile": user.get("mobile"),
                            "userType": user.get("userType"),
                            "createdAt": user.get("createdAt")
                        }
                
                # Get hospital details if available
                hospital_info = None
                if doctor.get("hospital_id"):
                    hospital = await db.hospitals.find_one({"_id": ObjectId(doctor["hospital_id"])})
                    if hospital:
                        hospital_info = {
                            "id": str(hospital["_id"]),
                            "name": hospital.get("name"),
                            "city": hospital.get("city"),
                            "address": hospital.get("location")
                        }
                
                result.append({
                    "verification": verification,
                    "doctor": doctor,
                    "user": user_info,
                    "hospital": hospital_info
                })
        except:
            # Doctor might have been deleted
            result.append({
                "verification": verification,
                "doctor": None,
                "user": None,
                "hospital": None
            })

    return result

@router.put("/verifications/{verification_id}", response_model=BackgroundVerificationResponse)
async def update_verification(
    verification_id: str,
    verification_data: BackgroundVerificationUpdate,
    current_user: str = Depends(require_admin)
):
    db = get_database()

    update_data = {k: v for k, v in verification_data.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    update_data["verified_by"] = current_user

    try:
        result = await db.background_verifications.update_one(
            {"_id": ObjectId(verification_id)},
            {"$set": update_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid verification ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Verification not found")

    verification = await db.background_verifications.find_one({"_id": ObjectId(verification_id)})
    verification["_id"] = str(verification["_id"])
    return BackgroundVerificationResponse(**verification)

@router.post("/verifications/{verification_id}/approve")
async def approve_verification(
    verification_id: str, 
    comments: str = Query(None, description="Admin comments for the verification"),
    current_user: str = Depends(require_admin)
):
    db = get_database()

    try:
        verification = await db.background_verifications.find_one({"_id": ObjectId(verification_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid verification ID")

    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")

    # Update verification status with comments
    await db.background_verifications.update_one(
        {"_id": ObjectId(verification_id)},
        {"$set": {
            "status": "verified",
            "verified_by": current_user,
            "verification_notes": comments or "Approved by clinical admin",
            "updatedAt": datetime.utcnow()
        }}
    )

    # Update the corresponding entity status if needed
    entity_type = verification["entity_type"]
    entity_id = verification["entity_id"]
    notification_message = ""
    user_id_for_notification = None

    if entity_type == "doctor":
        await db.doctors.update_one(
            {"_id": ObjectId(entity_id)},
            {"$set": {"verified": True, "is_active": True}}
        )
        # Get the doctor's user_id for notification
        doctor = await db.doctors.find_one({"_id": ObjectId(entity_id)})
        if doctor:
            user_id_for_notification = doctor.get("user_id")
            # Also update the user's verified status
            if user_id_for_notification:
                await db.users.update_one(
                    {"_id": ObjectId(user_id_for_notification)},
                    {"$set": {"verified": True, "doctor_verified": True}}
                )
            notification_message = f"🎉 Congratulations! Your doctor profile has been verified by the Clinical Admin. You can now act as a doctor and receive patient appointments. Admin comments: {comments or 'Your credentials have been reviewed and approved.'}"
    elif entity_type == "hospital":
        await db.hospitals.update_one(
            {"_id": ObjectId(entity_id)},
            {"$set": {"verified": True}}
        )
        notification_message = f"Your hospital has been verified. Admin comments: {comments or 'Verified successfully.'}"
    elif entity_type == "user":
        await db.users.update_one(
            {"_id": ObjectId(entity_id)},
            {"$set": {"verified": True}}
        )
        user_id_for_notification = entity_id
        notification_message = f"Your account has been verified. Admin comments: {comments or 'Verified successfully.'}"

    # Create notification for the entity
    if user_id_for_notification:
        notification_doc = {
            "user_id": user_id_for_notification,
            "user_type": "doctor" if entity_type == "doctor" else "user",
            "title": f"✅ {entity_type.capitalize()} Verification Approved",
            "message": notification_message,
            "type": "verification_approved",
            "read": False,
            "createdAt": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)

    return {"message": "Verification approved successfully", "notification_sent": bool(user_id_for_notification)}

@router.post("/verifications/{verification_id}/reject")
async def reject_verification(
    verification_id: str,
    notes: str = Query(..., description="Rejection reason"),
    current_user: str = Depends(require_admin)
):
    db = get_database()

    # First get the verification to find the entity
    try:
        verification = await db.background_verifications.find_one({"_id": ObjectId(verification_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid verification ID")

    if not verification:
        raise HTTPException(status_code=404, detail="Verification not found")

    try:
        result = await db.background_verifications.update_one(
            {"_id": ObjectId(verification_id)},
            {"$set": {
                "status": "rejected",
                "verification_notes": notes,
                "verified_by": current_user,
                "updatedAt": datetime.utcnow()
            }}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid verification ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Verification not found")

    # Send notification to the entity about rejection
    entity_type = verification["entity_type"]
    entity_id = verification["entity_id"]
    user_id_for_notification = None

    if entity_type == "doctor":
        doctor = await db.doctors.find_one({"_id": ObjectId(entity_id)})
        if doctor:
            user_id_for_notification = doctor.get("user_id")
    elif entity_type == "user":
        user_id_for_notification = entity_id

    if user_id_for_notification:
        notification_doc = {
            "user_id": user_id_for_notification,
            "user_type": "doctor" if entity_type == "doctor" else "user",
            "title": f"❌ {entity_type.capitalize()} Verification Rejected",
            "message": f"Your {entity_type} verification has been rejected. Reason: {notes}. Please review and resubmit the required documents.",
            "type": "verification_rejected",
            "read": False,
            "createdAt": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)

    return {"message": "Verification rejected successfully", "notification_sent": bool(user_id_for_notification)}


# ==================== EXTENDED ADMIN STATS ====================
@router.get("/extended-stats", response_model=AdminExtendedStats)
async def get_extended_admin_stats(current_user: str = Depends(require_admin)):
    db = get_database()

    total_users = await db.users.count_documents({"userType": "user"})
    total_doctors = await db.doctors.count_documents({})
    total_hospitals = await db.hospitals.count_documents({})
    pending_verifications = await db.background_verifications.count_documents({"status": "pending"})
    total_appointments = await db.appointments.count_documents({})
    
    # Document stats
    total_documents = await db.user_documents.count_documents({})
    pending_documents = await db.user_documents.count_documents({"status": "pending"})
    
    # Portfolio stats
    total_portfolios = await db.doctor_portfolios.count_documents({})
    pending_portfolios = await db.doctor_portfolios.count_documents({"status": "pending"})
    
    # Relationship stats
    active_relationships = await db.doctor_patient_relationships.count_documents({"status": "active"})

    return AdminExtendedStats(
        total_users=total_users,
        total_doctors=total_doctors,
        total_hospitals=total_hospitals,
        pending_verifications=pending_verifications,
        total_appointments=total_appointments,
        total_documents=total_documents,
        pending_documents=pending_documents,
        total_portfolios=total_portfolios,
        pending_portfolios=pending_portfolios,
        active_relationships=active_relationships
    )


# ==================== USER DOCUMENTS MANAGEMENT ====================
@router.get("/documents", response_model=List[UserDocumentResponse])
async def list_user_documents(
    status: Optional[DocumentStatus] = None,
    user_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    query = {}
    if status:
        query["status"] = status
    if user_id:
        query["user_id"] = user_id
    
    documents = await db.user_documents.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with user names
    for doc in documents:
        doc["_id"] = str(doc["_id"])
        try:
            user = await db.users.find_one({"_id": ObjectId(doc["user_id"])})
            doc["user_name"] = user.get("name", "Unknown") if user else "Unknown"
        except:
            doc["user_name"] = "Unknown"
    
    return [UserDocumentResponse(**d) for d in documents]

@router.get("/documents/{document_id}", response_model=UserDocumentResponse)
async def get_user_document(document_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        document = await db.user_documents.find_one({"_id": ObjectId(document_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document["_id"] = str(document["_id"])
    try:
        user = await db.users.find_one({"_id": ObjectId(document["user_id"])})
        document["user_name"] = user.get("name", "Unknown") if user else "Unknown"
    except:
        document["user_name"] = "Unknown"
    
    return UserDocumentResponse(**document)

@router.put("/documents/{document_id}", response_model=UserDocumentResponse)
async def update_user_document(
    document_id: str,
    document_data: UserDocumentUpdate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    update_data = {k: v for k, v in document_data.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    update_data["verified_by"] = current_user
    
    try:
        result = await db.user_documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": update_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    document = await db.user_documents.find_one({"_id": ObjectId(document_id)})
    document["_id"] = str(document["_id"])
    
    return UserDocumentResponse(**document)

@router.post("/documents/{document_id}/verify")
async def verify_user_document(document_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        result = await db.user_documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "status": "verified",
                "verified_by": current_user,
                "updatedAt": datetime.utcnow()
            }}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document verified successfully"}

@router.post("/documents/{document_id}/reject")
async def reject_user_document(
    document_id: str,
    notes: str = Query(..., description="Rejection reason"),
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    try:
        result = await db.user_documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "status": "rejected",
                "notes": notes,
                "verified_by": current_user,
                "updatedAt": datetime.utcnow()
            }}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document rejected successfully"}

@router.delete("/documents/{document_id}")
async def delete_user_document(document_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        result = await db.user_documents.delete_one({"_id": ObjectId(document_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}


# ==================== DOCTOR PORTFOLIO MANAGEMENT ====================
@router.get("/portfolios", response_model=List[DoctorPortfolioResponse])
async def list_doctor_portfolios(
    status: Optional[DocumentStatus] = None,
    doctor_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    query = {}
    if status:
        query["status"] = status
    if doctor_id:
        query["doctor_id"] = doctor_id
    
    portfolios = await db.doctor_portfolios.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with doctor names
    for portfolio in portfolios:
        portfolio["_id"] = str(portfolio["_id"])
        try:
            doctor = await db.doctors.find_one({"_id": ObjectId(portfolio["doctor_id"])})
            portfolio["doctor_name"] = doctor.get("name", "Unknown") if doctor else "Unknown"
        except:
            portfolio["doctor_name"] = "Unknown"
    
    return [DoctorPortfolioResponse(**p) for p in portfolios]

@router.get("/portfolios/{portfolio_id}", response_model=DoctorPortfolioResponse)
async def get_doctor_portfolio(portfolio_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        portfolio = await db.doctor_portfolios.find_one({"_id": ObjectId(portfolio_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    if not portfolio:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    portfolio["_id"] = str(portfolio["_id"])
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(portfolio["doctor_id"])})
        portfolio["doctor_name"] = doctor.get("name", "Unknown") if doctor else "Unknown"
    except:
        portfolio["doctor_name"] = "Unknown"
    
    return DoctorPortfolioResponse(**portfolio)

@router.put("/portfolios/{portfolio_id}", response_model=DoctorPortfolioResponse)
async def update_doctor_portfolio(
    portfolio_id: str,
    portfolio_data: DoctorPortfolioUpdate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    update_data = {k: v for k, v in portfolio_data.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    update_data["verified_by"] = current_user
    
    try:
        result = await db.doctor_portfolios.update_one(
            {"_id": ObjectId(portfolio_id)},
            {"$set": update_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    portfolio = await db.doctor_portfolios.find_one({"_id": ObjectId(portfolio_id)})
    portfolio["_id"] = str(portfolio["_id"])
    
    return DoctorPortfolioResponse(**portfolio)

@router.post("/portfolios/{portfolio_id}/verify")
async def verify_doctor_portfolio(portfolio_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        result = await db.doctor_portfolios.update_one(
            {"_id": ObjectId(portfolio_id)},
            {"$set": {
                "status": "verified",
                "verified_by": current_user,
                "updatedAt": datetime.utcnow()
            }}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    return {"message": "Portfolio item verified successfully"}

@router.post("/portfolios/{portfolio_id}/reject")
async def reject_doctor_portfolio(
    portfolio_id: str,
    notes: str = Query(..., description="Rejection reason"),
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    try:
        result = await db.doctor_portfolios.update_one(
            {"_id": ObjectId(portfolio_id)},
            {"$set": {
                "status": "rejected",
                "verification_notes": notes,
                "verified_by": current_user,
                "updatedAt": datetime.utcnow()
            }}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    return {"message": "Portfolio item rejected successfully"}

@router.delete("/portfolios/{portfolio_id}")
async def delete_doctor_portfolio(portfolio_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        result = await db.doctor_portfolios.delete_one({"_id": ObjectId(portfolio_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid portfolio ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    
    return {"message": "Portfolio item deleted successfully"}


# ==================== DOCTOR-PATIENT RELATIONSHIPS ====================
@router.get("/relationships", response_model=List[DoctorPatientRelationshipResponse])
async def list_relationships(
    status: Optional[RelationshipStatus] = None,
    doctor_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    query = {}
    if status:
        query["status"] = status
    if doctor_id:
        query["doctor_id"] = doctor_id
    if patient_id:
        query["patient_id"] = patient_id
    
    relationships = await db.doctor_patient_relationships.find(query).skip(skip).limit(limit).to_list(length=limit)
    
    # Enrich with names
    for rel in relationships:
        rel["_id"] = str(rel["_id"])
        try:
            doctor = await db.doctors.find_one({"_id": ObjectId(rel["doctor_id"])})
            rel["doctor_name"] = doctor.get("name", "Unknown") if doctor else "Unknown"
        except:
            rel["doctor_name"] = "Unknown"
        try:
            patient = await db.users.find_one({"_id": ObjectId(rel["patient_id"])})
            rel["patient_name"] = patient.get("name", "Unknown") if patient else "Unknown"
        except:
            rel["patient_name"] = "Unknown"
        if rel.get("hospital_id"):
            try:
                hospital = await db.hospitals.find_one({"_id": ObjectId(rel["hospital_id"])})
                rel["hospital_name"] = hospital.get("name", "Unknown") if hospital else "Unknown"
            except:
                rel["hospital_name"] = "Unknown"
    
    return [DoctorPatientRelationshipResponse(**r) for r in relationships]

@router.get("/relationships/{relationship_id}", response_model=DoctorPatientRelationshipResponse)
async def get_relationship(relationship_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        relationship = await db.doctor_patient_relationships.find_one({"_id": ObjectId(relationship_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid relationship ID")
    
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    relationship["_id"] = str(relationship["_id"])
    
    # Enrich with names
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(relationship["doctor_id"])})
        relationship["doctor_name"] = doctor.get("name", "Unknown") if doctor else "Unknown"
    except:
        relationship["doctor_name"] = "Unknown"
    try:
        patient = await db.users.find_one({"_id": ObjectId(relationship["patient_id"])})
        relationship["patient_name"] = patient.get("name", "Unknown") if patient else "Unknown"
    except:
        relationship["patient_name"] = "Unknown"
    
    return DoctorPatientRelationshipResponse(**relationship)

@router.post("/relationships", response_model=DoctorPatientRelationshipResponse)
async def create_relationship(
    relationship_data: DoctorPatientRelationshipCreate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    # Verify doctor exists
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(relationship_data.doctor_id)})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    
    # Verify patient exists
    try:
        patient = await db.users.find_one({"_id": ObjectId(relationship_data.patient_id)})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid patient ID")
    
    relationship_dict = relationship_data.dict()
    relationship_dict["createdAt"] = datetime.utcnow()
    relationship_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.doctor_patient_relationships.insert_one(relationship_dict)
    
    relationship = await db.doctor_patient_relationships.find_one({"_id": result.inserted_id})
    relationship["_id"] = str(relationship["_id"])
    relationship["doctor_name"] = doctor.get("name", "Unknown")
    relationship["patient_name"] = patient.get("name", "Unknown")
    
    return DoctorPatientRelationshipResponse(**relationship)

@router.put("/relationships/{relationship_id}", response_model=DoctorPatientRelationshipResponse)
async def update_relationship(
    relationship_id: str,
    relationship_data: DoctorPatientRelationshipUpdate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    update_data = {k: v for k, v in relationship_data.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    
    try:
        result = await db.doctor_patient_relationships.update_one(
            {"_id": ObjectId(relationship_id)},
            {"$set": update_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid relationship ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    relationship = await db.doctor_patient_relationships.find_one({"_id": ObjectId(relationship_id)})
    relationship["_id"] = str(relationship["_id"])
    
    return DoctorPatientRelationshipResponse(**relationship)

@router.delete("/relationships/{relationship_id}")
async def delete_relationship(relationship_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        result = await db.doctor_patient_relationships.delete_one({"_id": ObjectId(relationship_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid relationship ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    return {"message": "Relationship deleted successfully"}


# ==================== DETAILED USER/DOCTOR/HOSPITAL INFO ====================
@router.get("/users/{user_id}/details")
async def get_user_full_details(user_id: str, current_user: str = Depends(require_admin)):
    """Get comprehensive user details including documents, appointments, and relationships"""
    db = get_database()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user["_id"] = str(user["_id"])
    
    # Get user documents
    documents = await db.user_documents.find({"user_id": user_id}).to_list(length=100)
    for doc in documents:
        doc["_id"] = str(doc["_id"])
    
    # Get user appointments
    appointments = await db.appointments.find({"patient_id": user_id}).to_list(length=100)
    for apt in appointments:
        apt["_id"] = str(apt["_id"])
    
    # Get doctor relationships
    relationships = await db.doctor_patient_relationships.find({"patient_id": user_id}).to_list(length=100)
    for rel in relationships:
        rel["_id"] = str(rel["_id"])
    
    # Get medical records
    medical_records = await db.medical_records.find({"patient_id": user_id}).to_list(length=100)
    for rec in medical_records:
        rec["_id"] = str(rec["_id"])
    
    return {
        "user": user,
        "documents": documents,
        "appointments": appointments,
        "relationships": relationships,
        "medical_records": medical_records
    }

@router.get("/doctors/{doctor_id}/details")
async def get_doctor_full_details(doctor_id: str, current_user: str = Depends(require_admin)):
    """Get comprehensive doctor details including portfolio, appointments, and patient relationships"""
    db = get_database()
    
    try:
        doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid doctor ID")
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor["_id"] = str(doctor["_id"])
    
    # Get doctor portfolio
    portfolios = await db.doctor_portfolios.find({"doctor_id": doctor_id}).to_list(length=100)
    for portfolio in portfolios:
        portfolio["_id"] = str(portfolio["_id"])
    
    # Get doctor appointments
    appointments = await db.appointments.find({"doctor_id": doctor_id}).to_list(length=100)
    for apt in appointments:
        apt["_id"] = str(apt["_id"])
    
    # Get patient relationships
    relationships = await db.doctor_patient_relationships.find({"doctor_id": doctor_id}).to_list(length=100)
    for rel in relationships:
        rel["_id"] = str(rel["_id"])
        try:
            patient = await db.users.find_one({"_id": ObjectId(rel["patient_id"])})
            rel["patient_name"] = patient.get("name", "Unknown") if patient else "Unknown"
        except:
            rel["patient_name"] = "Unknown"
    
    # Get verification status
    verification = await db.background_verifications.find_one({
        "entity_type": "doctor",
        "entity_id": doctor_id
    })
    if verification:
        verification["_id"] = str(verification["_id"])
    
    return {
        "doctor": doctor,
        "portfolios": portfolios,
        "appointments": appointments,
        "relationships": relationships,
        "verification": verification
    }

@router.get("/hospitals/{hospital_id}/details")
async def get_hospital_full_details(hospital_id: str, current_user: str = Depends(require_admin)):
    """Get comprehensive hospital details including doctors and appointments"""
    db = get_database()
    
    try:
        hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid hospital ID")
    
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")
    
    hospital["_id"] = str(hospital["_id"])
    
    # Get hospital doctors
    doctors = await db.doctors.find({"hospital_ids": hospital_id}).to_list(length=100)
    for doc in doctors:
        doc["_id"] = str(doc["_id"])
    
    # Get hospital appointments
    appointments = await db.appointments.find({"hospital_id": hospital_id}).to_list(length=100)
    for apt in appointments:
        apt["_id"] = str(apt["_id"])
    
    # Get verification status
    verification = await db.background_verifications.find_one({
        "entity_type": "hospital",
        "entity_id": hospital_id
    })
    if verification:
        verification["_id"] = str(verification["_id"])
    
    return {
        "hospital": hospital,
        "doctors": doctors,
        "appointments": appointments,
        "verification": verification
    }


# ==================== HOSPITAL TYPES MANAGEMENT ====================
@router.get("/hospital-types", response_model=List[HospitalTypeResponse])
async def list_hospital_types(
    active_only: bool = Query(False),
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    query = {}
    if active_only:
        query["is_active"] = True
    
    types = await db.hospital_types.find(query).to_list(length=100)
    for t in types:
        t["_id"] = str(t["_id"])
    
    return [HospitalTypeResponse(**t) for t in types]

@router.post("/hospital-types", response_model=HospitalTypeResponse)
async def create_hospital_type(
    type_data: HospitalTypeCreate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    # Check if type already exists
    existing = await db.hospital_types.find_one({"name": type_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Hospital type already exists")
    
    type_dict = type_data.dict()
    type_dict["createdAt"] = datetime.utcnow()
    type_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.hospital_types.insert_one(type_dict)
    type_dict["_id"] = str(result.inserted_id)
    
    return HospitalTypeResponse(**type_dict)

@router.put("/hospital-types/{type_id}", response_model=HospitalTypeResponse)
async def update_hospital_type(
    type_id: str,
    type_data: HospitalTypeUpdate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    update_data = {k: v for k, v in type_data.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    
    try:
        result = await db.hospital_types.update_one(
            {"_id": ObjectId(type_id)},
            {"$set": update_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid type ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hospital type not found")
    
    hospital_type = await db.hospital_types.find_one({"_id": ObjectId(type_id)})
    hospital_type["_id"] = str(hospital_type["_id"])
    
    return HospitalTypeResponse(**hospital_type)

@router.delete("/hospital-types/{type_id}")
async def delete_hospital_type(type_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        result = await db.hospital_types.delete_one({"_id": ObjectId(type_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid type ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hospital type not found")
    
    return {"message": "Hospital type deleted successfully"}


# ==================== SPECIALIZATIONS MANAGEMENT ====================
@router.get("/specializations", response_model=List[SpecializationResponse])
async def list_specializations(
    active_only: bool = Query(False),
    category: Optional[str] = None,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    query = {}
    if active_only:
        query["is_active"] = True
    if category:
        query["category"] = category
    
    specs = await db.specializations.find(query).to_list(length=100)
    for s in specs:
        s["_id"] = str(s["_id"])
    
    return [SpecializationResponse(**s) for s in specs]

@router.post("/specializations", response_model=SpecializationResponse)
async def create_specialization(
    spec_data: SpecializationCreate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    # Check if specialization already exists
    existing = await db.specializations.find_one({"name": spec_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Specialization already exists")
    
    spec_dict = spec_data.dict()
    spec_dict["createdAt"] = datetime.utcnow()
    spec_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.specializations.insert_one(spec_dict)
    spec_dict["_id"] = str(result.inserted_id)
    
    return SpecializationResponse(**spec_dict)

@router.put("/specializations/{spec_id}", response_model=SpecializationResponse)
async def update_specialization(
    spec_id: str,
    spec_data: SpecializationUpdate,
    current_user: str = Depends(require_admin)
):
    db = get_database()
    
    update_data = {k: v for k, v in spec_data.dict().items() if v is not None}
    update_data["updatedAt"] = datetime.utcnow()
    
    try:
        result = await db.specializations.update_one(
            {"_id": ObjectId(spec_id)},
            {"$set": update_data}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid specialization ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Specialization not found")
    
    spec = await db.specializations.find_one({"_id": ObjectId(spec_id)})
    spec["_id"] = str(spec["_id"])
    
    return SpecializationResponse(**spec)

@router.delete("/specializations/{spec_id}")
async def delete_specialization(spec_id: str, current_user: str = Depends(require_admin)):
    db = get_database()
    
    try:
        result = await db.specializations.delete_one({"_id": ObjectId(spec_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid specialization ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Specialization not found")
    
    return {"message": "Specialization deleted successfully"}
