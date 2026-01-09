from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from bson import ObjectId
from datetime import datetime
from typing import List, Optional
import os
import uuid
from database import get_database
from schemas import MedicalRecordCreate, MedicalRecordResponse
from routes.auth import get_current_user, get_current_user_with_role
from auth import encrypt_data, decrypt_data

router = APIRouter(prefix="/medical-records", tags=["medical-records"])

# Create uploads directory for medical records
UPLOAD_DIR = "./uploads/medical_records"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_medical_file(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    title: str = Form(...),
    record_type: str = Form(default="other"),
    description: Optional[str] = Form(default=None),
    appointment_id: Optional[str] = Form(default=None),
    current_user = Depends(get_current_user_with_role)
):
    """Upload a medical file and create a medical record - accessible by patients for their own records"""
    db = get_database()
    user_id = current_user.get("user_id")
    
    # Patients can upload their own records
    if current_user["role"] != "doctor" and patient_id != user_id:
        raise HTTPException(status_code=403, detail="You can only upload records for yourself")
    
    # Create patient directory
    patient_dir = os.path.join(UPLOAD_DIR, patient_id)
    os.makedirs(patient_dir, exist_ok=True)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(patient_dir, unique_filename)
    
    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Create medical record in database
    record_doc = {
        "patient_id": patient_id,
        "record_type": record_type,
        "title": title,
        "description": encrypt_data(description) if description else None,
        "file_path": f"/medical-records/download/{patient_id}/{unique_filename}",
        "original_filename": file.filename,
        "file_size": len(contents),
        "appointment_id": appointment_id,
        "uploaded_by": user_id,
        "createdAt": datetime.utcnow()
    }
    
    result = await db.medical_records.insert_one(record_doc)
    record_doc["_id"] = str(result.inserted_id)
    
    # Decrypt for response
    if record_doc.get("description"):
        record_doc["description"] = decrypt_data(record_doc["description"])
    
    return {
        "id": record_doc["_id"],
        "file_url": record_doc["file_path"],
        "file_name": unique_filename,
        "original_name": file.filename,
        "record": record_doc
    }

@router.get("/download/{patient_id}/{file_name}")
async def download_medical_file(patient_id: str, file_name: str, current_user = Depends(get_current_user_with_role)):
    """Download a medical file - patients can download their own, doctors can download their patients'"""
    db = get_database()
    user_id = current_user.get("user_id")
    
    # Check access permissions
    if current_user["role"] != "doctor" and patient_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path = os.path.join(UPLOAD_DIR, patient_id, file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@router.get("/by-appointment/{appointment_id}")
async def get_medical_records_by_appointment(appointment_id: str, current_user = Depends(get_current_user_with_role)):
    """Get medical records attached to a specific appointment - for doctors to view patient documents"""
    db = get_database()
    user_id = current_user.get("user_id")
    
    # Find the appointment to verify access
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check if user is the doctor or patient of this appointment
    is_doctor = current_user["role"] == "doctor"
    is_patient = str(appointment.get("patient_id")) == user_id
    is_appointment_doctor = str(appointment.get("doctor_id")) == user_id
    
    if not (is_patient or is_appointment_doctor):
        raise HTTPException(status_code=403, detail="Access denied - not authorized for this appointment")
    
    # Find medical records linked to this appointment
    records = await db.medical_records.find({"appointment_id": appointment_id}).to_list(length=100)
    
    result = []
    for record in records:
        record["_id"] = str(record["_id"])
        record["id"] = record["_id"]
        # Decrypt sensitive data
        if record.get("description"):
            try:
                record["description"] = decrypt_data(record["description"])
            except:
                pass
        result.append(record)
    
    return result

@router.post("/", response_model=MedicalRecordResponse)
async def create_medical_record(record_data: MedicalRecordCreate, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    # Only allow doctors to create medical records
    if user_info["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can create medical records")

    record_doc = record_data.dict()
    record_doc["createdAt"] = datetime.utcnow()

    # Encrypt sensitive data
    if record_doc.get("description"):
        record_doc["description"] = encrypt_data(record_doc["description"])
    if record_doc.get("doctor_notes"):
        record_doc["doctor_notes"] = encrypt_data(record_doc["doctor_notes"])

    result = await db.medical_records.insert_one(record_doc)
    record_doc["_id"] = str(result.inserted_id)

    # Decrypt for response
    if record_doc.get("description"):
        record_doc["description"] = decrypt_data(record_doc["description"])
    if record_doc.get("doctor_notes"):
        record_doc["doctor_notes"] = decrypt_data(record_doc["doctor_notes"])

    return MedicalRecordResponse(**record_doc)

@router.get("/", response_model=List[MedicalRecordResponse])
async def list_medical_records(user_info = Depends(get_current_user_with_role)):
    db = get_database()

    if user_info["role"] == "doctor":
        # Doctors can see all medical records for patients they have appointments with
        # Get all patient IDs from appointments where doctor is involved
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        appointments = await db.appointments.find({"doctor_id": {"$in": doctor_ids}}).to_list(length=1000)
        patient_ids = list(set([str(appt["patient_id"]) for appt in appointments]))

        records = await db.medical_records.find({"patient_id": {"$in": patient_ids}}).to_list(length=100)
        
        # Get patient names for doctors view
        patient_names = {}
        for patient_id in patient_ids:
            try:
                user = await db.users.find_one({"_id": ObjectId(patient_id)})
                if user:
                    patient_names[patient_id] = user.get("name", "Unknown Patient")
            except:
                pass
        
        for record in records:
            record["patient_name"] = patient_names.get(record.get("patient_id"), "Unknown Patient")
    else:
        # Users can only see their own medical records
        records = await db.medical_records.find({"patient_id": user_info["user_id"]}).to_list(length=100)

    for record in records:
        record["_id"] = str(record["_id"])
        # Decrypt sensitive data
        if record.get("description"):
            try:
                record["description"] = decrypt_data(record["description"])
            except:
                pass
        if record.get("doctor_notes"):
            try:
                record["doctor_notes"] = decrypt_data(record["doctor_notes"])
            except:
                pass

    return [MedicalRecordResponse(**r) for r in records]

async def get_doctor_ids_for_user(db, user_id: str) -> List[str]:
    """Get all doctor IDs for a user (since a user might be linked to multiple doctors)"""
    doctors = await db.doctors.find({"user_id": user_id}).to_list(length=100)
    return [str(doctor.get("user_id", doctor["_id"])) for doctor in doctors]

@router.get("/{record_id}", response_model=MedicalRecordResponse)
async def get_medical_record(record_id: str, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    try:
        record = await db.medical_records.find_one({"_id": ObjectId(record_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Check access permissions
    if user_info["role"] == "doctor":
        # Doctors can access records for patients they have appointments with
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        appointment_count = await db.appointments.count_documents({
            "doctor_id": {"$in": doctor_ids},
            "patient_id": record["patient_id"]
        })
        if appointment_count == 0:
            raise HTTPException(status_code=403, detail="Cannot access this medical record")
    else:
        # Users can only access their own medical records
        if record["patient_id"] != user_info["user_id"]:
            raise HTTPException(status_code=403, detail="Cannot access this medical record")

    record["_id"] = str(record["_id"])
    # Decrypt sensitive data
    if record.get("description"):
        record["description"] = decrypt_data(record["description"])
    if record.get("doctor_notes"):
        record["doctor_notes"] = decrypt_data(record["doctor_notes"])

    return MedicalRecordResponse(**record)

@router.put("/{record_id}", response_model=MedicalRecordResponse)
async def update_medical_record(record_id: str, record_data: MedicalRecordCreate, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    # First get the record to check permissions
    try:
        record = await db.medical_records.find_one({"_id": ObjectId(record_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Only doctors can update medical records
    if user_info["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can update medical records")

    # Check if doctor has access to this patient's records
    doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
    appointment_count = await db.appointments.count_documents({
        "doctor_id": {"$in": doctor_ids},
        "patient_id": record["patient_id"]
    })
    if appointment_count == 0:
        raise HTTPException(status_code=403, detail="Cannot update this medical record")

    try:
        update_dict = {k: v for k, v in record_data.dict().items() if v is not None}
        # Encrypt sensitive data
        if "description" in update_dict and update_dict["description"]:
            update_dict["description"] = encrypt_data(update_dict["description"])
        if "doctor_notes" in update_dict and update_dict["doctor_notes"]:
            update_dict["doctor_notes"] = encrypt_data(update_dict["doctor_notes"])

        result = await db.medical_records.update_one(
            {"_id": ObjectId(record_id)},
            {"$set": update_dict}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    record = await db.medical_records.find_one({"_id": ObjectId(record_id)})
    record["_id"] = str(record["_id"])
    # Decrypt for response
    if record.get("description"):
        record["description"] = decrypt_data(record["description"])
    if record.get("doctor_notes"):
        record["doctor_notes"] = decrypt_data(record["doctor_notes"])

    return MedicalRecordResponse(**record)

@router.delete("/{record_id}")
async def delete_medical_record(record_id: str, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    # First get the record to check permissions
    try:
        record = await db.medical_records.find_one({"_id": ObjectId(record_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Users can delete their own records
    if record["patient_id"] == user_info["user_id"]:
        # User deleting their own record - allowed
        pass
    elif user_info["role"] == "doctor":
        # Check if doctor has access to this patient's records
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        appointment_count = await db.appointments.count_documents({
            "doctor_id": {"$in": doctor_ids},
            "patient_id": record["patient_id"]
        })
        if appointment_count == 0:
            raise HTTPException(status_code=403, detail="Cannot delete this medical record")
    else:
        raise HTTPException(status_code=403, detail="Cannot delete this medical record")

    # Delete the file from disk if it exists
    if record.get("file_path"):
        try:
            path_parts = record["file_path"].split("/")
            if len(path_parts) >= 2:
                file_name = path_parts[-1]
                patient_dir = path_parts[-2]
                file_full_path = os.path.join(UPLOAD_DIR, patient_dir, file_name)
                if os.path.exists(file_full_path):
                    os.remove(file_full_path)
        except Exception as e:
            print(f"Warning: Could not delete file: {e}")

    try:
        result = await db.medical_records.delete_one({"_id": ObjectId(record_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")

    return {"message": "Record deleted successfully"}
