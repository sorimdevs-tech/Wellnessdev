from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List
from database import get_database
from schemas import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from routes.auth import get_current_user, get_current_user_with_role
from auth import encrypt_data, decrypt_data
from routes.notifications import create_notification
from routes.chat import get_conversation_id, send_system_message

router = APIRouter(prefix="/appointments", tags=["appointments"])

async def find_doctor_by_user_id(db, user_id):
    """Find doctor by user_id - tries string first, then ObjectId"""
    # Try string lookup first (most common case)
    doctor = await db.doctors.find_one({"user_id": str(user_id)})
    if doctor:
        return doctor
    # Fallback to ObjectId lookup
    try:
        doctor = await db.doctors.find_one({"user_id": ObjectId(user_id)})
        return doctor
    except:
        return None

@router.post("/", response_model=AppointmentResponse)
async def create_appointment(appointment_data: AppointmentCreate, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    # For ALL authenticated users (both "user" and "doctor"), use their user_id as patient_id
    # This ensures that when a doctor books an appointment with another doctor,
    # they are correctly recorded as the patient
    appointment_data.patient_id = user_info["user_id"]

    print(f"DEBUG: Creating appointment - patient_id: {appointment_data.patient_id}, user_id: {user_info['user_id']}, role: {user_info['role']}")
    print(f"DEBUG: user_info: {user_info}")

    # Validate doctor exists
    # NOTE: Frontend sends doctor USER ID (from hospitals.py), so we need to find doctor by user_id
    try:
        doctor = await db.doctors.find_one({"user_id": appointment_data.doctor_id})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Doctor not found: {str(e)}")

    # Get hospital_id from doctor if not provided or invalid
    hospital_id = appointment_data.hospital_id
    if not hospital_id or hospital_id == "default_hospital":
        hospital_id = doctor.get("hospital_id")

    # Validate hospital exists
    if hospital_id:
        try:
            hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
            if not hospital:
                # Try to find any hospital as fallback
                fallback_hospital = await db.hospitals.find_one()
                if fallback_hospital:
                    hospital_id = str(fallback_hospital["_id"])
                else:
                    raise HTTPException(status_code=404, detail="No hospitals available")
        except:
            # If hospital_id is invalid ObjectId, find fallback
            fallback_hospital = await db.hospitals.find_one()
            if fallback_hospital:
                hospital_id = str(fallback_hospital["_id"])
            else:
                raise HTTPException(status_code=404, detail="No hospitals available")
    else:
        # Find any hospital as fallback
        fallback_hospital = await db.hospitals.find_one()
        if fallback_hospital:
            hospital_id = str(fallback_hospital["_id"])
        else:
            raise HTTPException(status_code=404, detail="No hospitals available")


    # Parse appointment_date as local time if string (from frontend)
    from dateutil import parser
    appointment_doc = appointment_data.dict()
    if isinstance(appointment_doc["appointment_date"], str):
        # Parse as naive local datetime
        appointment_doc["appointment_date"] = parser.parse(appointment_doc["appointment_date"])
    appointment_doc["hospital_id"] = hospital_id  # Use the validated/corrected hospital_id
    appointment_doc["createdAt"] = datetime.utcnow()

    # Encrypt sensitive notes
    if appointment_doc.get("notes"):
        appointment_doc["notes"] = encrypt_data(appointment_doc["notes"])

    result = await db.appointments.insert_one(appointment_doc)
    appointment_id = str(result.inserted_id)
    appointment_doc["_id"] = appointment_id

    # Create notifications for both doctor and patient
    try:
        # Get doctor and patient details
        # NOTE: appointment_data.doctor_id IS the user_id of the doctor (sent from frontend)
        # So we use it directly instead of going through doctor["user_id"]
        doctor_user = await db.users.find_one({"_id": ObjectId(appointment_data.doctor_id)})
        patient_user = await db.users.find_one({"_id": ObjectId(appointment_data.patient_id)})

        if doctor_user and patient_user:
            # Format appointment date for notification
            appointment_date = appointment_data.appointment_date.strftime("%B %d, %Y at %I:%M %p")

            # Notification for doctor (includes appointment_id for approve/reject)
            # Use appointment_data.doctor_id directly as it's the user_id
            await create_notification(
                db,
                appointment_data.doctor_id,  # Use doctor_id directly (it's the user_id)
                "doctor",
                "New Appointment Request",
                f"Patient {patient_user['name']} has requested an appointment with you on {appointment_date}. Please approve or reject this request. Notes: {appointment_data.notes or 'None'}",
                "appointment",
                appointment_id  # Pass appointment_id for actions
            )

            # Notification for patient - use their current role so they see it
            # Get patient's current role from user_info (the one making the request)
            patient_notification_role = user_info.get("role", "user")
            print(f"DEBUG: Creating patient notification with role: {patient_notification_role}")
            
            await create_notification(
                db,
                appointment_data.patient_id,
                patient_notification_role,  # Use their current role (user or doctor)
                "Appointment Requested",
                f"Your appointment request with Dr. {doctor['name']} for {appointment_date} is pending doctor approval.",
                "appointment",
                appointment_id  # Also include appointment_id for reference
            )

            # Send chat notification about the new appointment
            # Use appointment_data.doctor_id directly as it's the user_id
            conversation_id = get_conversation_id(appointment_data.patient_id, appointment_data.doctor_id)
            await send_system_message(
                db, 
                conversation_id, 
                f"📅 New appointment booked for {appointment_date}. Awaiting doctor approval.",
                appointment_id
            )

    except Exception as e:
        print(f"Warning: Failed to create notifications: {e}")
        # Don't fail the appointment creation if notifications fail

    # Decrypt notes for response
    if appointment_doc.get("notes"):
        appointment_doc["notes"] = decrypt_data(appointment_doc["notes"])

    # Add dynamic fields for response (doctor and hospital info)
    appointment_doc["doctorName"] = doctor.get("name", "Unknown Doctor")
    appointment_doc["specialty"] = doctor.get("specialization", "General")
    appointment_doc["qualifications"] = doctor.get("qualifications", [])
    appointment_doc["experience_years"] = str(doctor.get("experience_years", ""))
    appointment_doc["department"] = doctor.get("department", doctor.get("specialization", "General"))
    
    # Add doctor availability status
    # Check if doctor is actually available
    # If they have available_days and time configured, they're available
    # Otherwise default to available
    is_available = True
    if doctor.get("available_days") and len(doctor.get("available_days", [])) > 0:
        # Doctor has specific available days
        is_available = True
    elif doctor.get("available_time_start") and doctor.get("available_time_end"):
        # Doctor has specific hours configured
        is_available = True
    # Default is available unless explicitly marked otherwise
    appointment_doc["is_available"] = is_available
    
    # Get hospital name
    if hospital_id:
        try:
            hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
            appointment_doc["hospital"] = hospital.get("name", "Unknown Hospital") if hospital else "Unknown Hospital"
        except:
            appointment_doc["hospital"] = "Unknown Hospital"
    else:
        appointment_doc["hospital"] = "Unknown Hospital"

    return AppointmentResponse(**appointment_doc)

@router.get("/", response_model=List[AppointmentResponse])
async def list_appointments(user_info = Depends(get_current_user_with_role)):
    db = get_database()

    if user_info["role"] == "doctor":
        # Doctors can see:
        # 1. Appointments where they are the DOCTOR (receiving appointments from patients)
        # 2. Appointments where they are the PATIENT (they booked with another doctor)
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        
        # Get appointments where doctor is receiving (as doctor)
        doctor_appointments = await db.appointments.find({"doctor_id": {"$in": doctor_ids}}).to_list(length=100)
        
        # Get appointments where doctor is booking (as patient)
        patient_appointments = await db.appointments.find({"patient_id": user_info["user_id"]}).to_list(length=100)
        
        # Combine and deduplicate (in case same appointment appears in both)
        appointment_ids = set()
        appointments = []
        for apt in doctor_appointments + patient_appointments:
            apt_id = str(apt["_id"])
            if apt_id not in appointment_ids:
                appointment_ids.add(apt_id)
                appointments.append(apt)
        
        print(f"[DEBUG] Doctor {user_info['user_id']} - As doctor: {len(doctor_appointments)}, As patient: {len(patient_appointments)}, Total unique: {len(appointments)}")

        # For doctors, add patient information to each appointment
        for appointment in appointments:
            patient_id = appointment.get("patient_id")
            if patient_id:
                patient = await db.users.find_one({"_id": ObjectId(patient_id)})
                if patient:
                    appointment["patient_info"] = {
                        "id": str(patient["_id"]),
                        "name": patient.get("name", "Unknown Patient"),
                        "email": patient.get("email", ""),
                        "mobile": patient.get("mobile", "")
                    }
    else:
        # Users can only see their own appointments
        appointments = await db.appointments.find({"patient_id": user_info["user_id"]}).to_list(length=100)

    for appointment in appointments:
        appointment["_id"] = str(appointment["_id"])
        # Decrypt notes
        if appointment.get("notes"):
            appointment["notes"] = decrypt_data(appointment["notes"])
        # Add doctor name, specialty/department, hospital name, and extra info
        doctor_id = appointment.get("doctor_id")
        hospital_id = appointment.get("hospital_id")  # Get hospital_id from appointment directly
        
        if doctor_id:
            # Try to find doctor by _id first, then by user_id
            doctor = await db.doctors.find_one({"_id": ObjectId(doctor_id)})
            if not doctor:
                # Fallback: try finding by user_id
                doctor = await db.doctors.find_one({"user_id": doctor_id})
            
            if doctor:
                appointment["doctorName"] = doctor.get("name", "Unknown Doctor")
                appointment["specialty"] = doctor.get("specialization", "General")
                appointment["qualifications"] = doctor.get("qualifications", [])
                # Convert experience_years to string to match schema
                exp_years = doctor.get("experience_years", "")
                appointment["experience_years"] = str(exp_years) if exp_years else ""
                appointment["department"] = doctor.get("department", doctor.get("specialization", "General"))
                
                # Add doctor user_id for chat functionality
                appointment["doctor_user_id"] = doctor.get("user_id")
                
                # Get doctor's profile image from users collection
                doctor_user_id = doctor.get("user_id")
                if doctor_user_id:
                    try:
                        doctor_user = await db.users.find_one({"_id": ObjectId(doctor_user_id)})
                        if doctor_user:
                            appointment["doctor_profile_image"] = doctor_user.get("profile_image")
                    except:
                        pass
                
                # Add doctor availability status
                is_available = True
                if doctor.get("available_days") and len(doctor.get("available_days", [])) > 0:
                    # Doctor has specific available days
                    is_available = True
                elif doctor.get("available_time_start") and doctor.get("available_time_end"):
                    # Doctor has specific hours configured
                    is_available = True
                appointment["is_available"] = is_available
                
                # Try to get hospital from appointment's hospital_id first, then from doctor's hospital_id
                hospital_found = False
                if hospital_id:
                    try:
                        hospital = await db.hospitals.find_one({"_id": ObjectId(hospital_id)})
                        if hospital:
                            appointment["hospital"] = hospital.get("name", "Unknown Hospital")
                            hospital_found = True
                    except:
                        pass
                
                if not hospital_found:
                    # Fallback to doctor's hospital_id
                    doctor_hospital_id = doctor.get("hospital_id")
                    if doctor_hospital_id:
                        try:
                            hospital = await db.hospitals.find_one({"_id": ObjectId(doctor_hospital_id)})
                            if hospital:
                                appointment["hospital"] = hospital.get("name", "Unknown Hospital")
                                hospital_found = True
                        except:
                            pass
                
                if not hospital_found:
                    appointment["hospital"] = "Unknown Hospital"
            else:
                appointment["doctorName"] = "Unknown Doctor"
                appointment["specialty"] = "General"
                appointment["hospital"] = "Unknown Hospital"
                appointment["qualifications"] = []
                appointment["experience_years"] = ""
                appointment["department"] = "General"
                appointment["is_available"] = True
        else:
            appointment["doctorName"] = "Unknown Doctor"
            appointment["specialty"] = "General"
            appointment["hospital"] = "Unknown Hospital"
            appointment["qualifications"] = []
            appointment["experience_years"] = ""
            appointment["department"] = "General"
            appointment["is_available"] = True

    # Debug: print all appointment statuses being returned
    print("[DEBUG] Returning appointments with statuses:", [a.get("status") for a in appointments])
    # Debug: print patient_id for each appointment
    print("[DEBUG] Appointment patient_ids:", [(a.get("_id"), a.get("patient_id")) for a in appointments])

    return [AppointmentResponse(**a) for a in appointments]

async def get_doctor_ids_for_user(db, user_id: str) -> List[str]:
    """Get all doctor IDs for a user (since a user might be linked to multiple doctors)"""
    doctors = await db.doctors.find({"user_id": user_id}).to_list(length=100)
    return [str(doctor.get("user_id", doctor["_id"])) for doctor in doctors]

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check access permissions
    if user_info["role"] == "doctor":
        # Doctors can access appointments where they are the doctor
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        apt_doctor_id = str(appointment["doctor_id"])  # Convert ObjectId to string
        if apt_doctor_id not in doctor_ids:
            raise HTTPException(status_code=403, detail="Cannot access this appointment")
    else:
        # Users can only access their own appointments
        apt_patient_id = str(appointment["patient_id"])  # Convert ObjectId to string
        if apt_patient_id != user_info["user_id"]:
            raise HTTPException(status_code=403, detail="Cannot access this appointment")

    appointment["_id"] = str(appointment["_id"])
    # Convert ObjectIds to strings for JSON serialization
    if isinstance(appointment.get("doctor_id"), ObjectId):
        appointment["doctor_id"] = str(appointment["doctor_id"])
    if isinstance(appointment.get("patient_id"), ObjectId):
        appointment["patient_id"] = str(appointment["patient_id"])
    if isinstance(appointment.get("hospital_id"), ObjectId):
        appointment["hospital_id"] = str(appointment["hospital_id"])
    # Decrypt notes
    if appointment.get("notes"):
        appointment["notes"] = decrypt_data(appointment["notes"])

    # Add doctor information
    try:
        # appointment["doctor_id"] now contains the doctor's USER ID, need to find doctor profile by user_id
        doctor = await find_doctor_by_user_id(db, appointment["doctor_id"])
        if doctor:
            appointment["doctorName"] = doctor.get("name", "Unknown Doctor")
            appointment["specialty"] = doctor.get("specialization", "General")
            appointment["qualifications"] = doctor.get("qualifications", [])
            appointment["experience_years"] = str(doctor.get("experience_years", ""))
            appointment["department"] = doctor.get("department", doctor.get("specialization", "General"))
            
            # Add doctor availability status
            is_available = True
            if doctor.get("available_days") and len(doctor.get("available_days", [])) > 0:
                # Doctor has specific available days
                is_available = True
            elif doctor.get("available_time_start") and doctor.get("available_time_end"):
                # Doctor has specific hours configured
                is_available = True
            appointment["is_available"] = is_available
    except:
        appointment["is_available"] = True

    return AppointmentResponse(**appointment)

@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(appointment_id: str, appointment_data: AppointmentUpdate, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    # First, get the appointment to check permissions
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check access permissions
    if user_info["role"] == "doctor":
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        if appointment["doctor_id"] not in doctor_ids:
            raise HTTPException(status_code=403, detail="Cannot update this appointment")
    else:
        # Users can only update their own appointments
        if appointment["patient_id"] != user_info["user_id"]:
            raise HTTPException(status_code=403, detail="Cannot update this appointment")

    try:
        update_dict = {k: v for k, v in appointment_data.dict().items() if v is not None}
        # Encrypt notes if present
        if "notes" in update_dict and update_dict["notes"]:
            update_dict["notes"] = encrypt_data(update_dict["notes"])

        result = await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": update_dict}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    appointment["_id"] = str(appointment["_id"])
    # Decrypt notes for response
    if appointment.get("notes"):
        appointment["notes"] = decrypt_data(appointment["notes"])

    return AppointmentResponse(**appointment)

@router.delete("/{appointment_id}")
async def delete_appointment(appointment_id: str, user_info = Depends(get_current_user_with_role)):
    db = get_database()

    # First, get the appointment to check permissions
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check access permissions
    if user_info["role"] == "doctor":
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        if appointment["doctor_id"] not in doctor_ids:
            raise HTTPException(status_code=403, detail="Cannot delete this appointment")
    else:
        # Users can only delete their own appointments
        if appointment["patient_id"] != user_info["user_id"]:
            raise HTTPException(status_code=403, detail="Cannot delete this appointment")

    try:
        result = await db.appointments.delete_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return {"message": "Appointment deleted successfully"}

@router.put("/{appointment_id}/approve")
async def approve_appointment(appointment_id: str, user_info = Depends(get_current_user_with_role)):
    """Doctor approves a pending appointment"""
    db = get_database()

    # Only doctors can approve appointments
    if user_info["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can approve appointments")

    # Get the appointment
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if doctor has access to this appointment
    doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
    if appointment["doctor_id"] not in doctor_ids:
        raise HTTPException(status_code=403, detail="Cannot approve this appointment")

    # Check if appointment is pending
    if appointment["status"] != "pending":
        raise HTTPException(status_code=400, detail="Appointment is not pending approval")

    # Update appointment status
    result = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": "approved"}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to approve appointment")

    # Create notification for patient
    try:
        print(f"[APPROVE] Looking up doctor with user_id: {appointment['doctor_id']}")
        doctor = await find_doctor_by_user_id(db, appointment["doctor_id"])
        print(f"[APPROVE] Doctor found: {doctor.get('name') if doctor else 'None'}")
        
        print(f"[APPROVE] Looking up patient with _id: {appointment['patient_id']}")
        patient_user = await db.users.find_one({"_id": ObjectId(appointment["patient_id"])})
        print(f"[APPROVE] Patient found: {patient_user.get('name') if patient_user else 'None'}")

        if doctor and patient_user:
            appointment_date = appointment["appointment_date"].strftime("%B %d, %Y at %I:%M %p")
            # Use patient's actual currentRole (they might be a doctor booking with another doctor)
            patient_role = patient_user.get("currentRole", "user")
            print(f"[APPROVE] Creating notification for patient {patient_user['name']} with role {patient_role}")
            
            await create_notification(
                db,
                str(patient_user["_id"]),
                patient_role,
                "Appointment Approved",
                f"Your appointment with Dr. {doctor['name']} on {appointment_date} has been approved.",
                "appointment"
            )
            print(f"[APPROVE] ✅ Notification created successfully!")
            
            # Send chat notification about approval
            conversation_id = get_conversation_id(str(appointment["patient_id"]), str(doctor["user_id"]))
            await send_system_message(
                db, 
                conversation_id, 
                f"✅ Appointment for {appointment_date} has been approved by Dr. {doctor['name']}. You can now chat!",
                appointment_id
            )
        else:
            print(f"[APPROVE] ❌ Doctor or patient not found - doctor: {doctor}, patient: {patient_user}")
    except Exception as e:
        import traceback
        print(f"[APPROVE] ❌ Failed to create approval notification: {e}")
        traceback.print_exc()

    return {"message": "Appointment approved successfully"}

@router.put("/{appointment_id}/reject")
async def reject_appointment(appointment_id: str, reason: str = None, user_info = Depends(get_current_user_with_role)):
    """Doctor or Patient rejects/cancels an appointment"""
    db = get_database()

    # Get the appointment
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if user has access to this appointment
    is_doctor = user_info["role"] == "doctor"
    is_patient = appointment["patient_id"] == user_info["user_id"]
    
    if is_doctor:
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        if appointment["doctor_id"] not in doctor_ids:
            raise HTTPException(status_code=403, detail="Cannot reject this appointment")
    elif not is_patient:
        raise HTTPException(status_code=403, detail="Cannot reject this appointment")

    # Check if appointment can be cancelled (pending, approved, or scheduled)
    if appointment["status"] not in ["pending", "approved", "scheduled"]:
        raise HTTPException(status_code=400, detail="This appointment cannot be cancelled")

    # Update appointment status and store rejection reason
    update_data = {
        "status": "rejected" if is_doctor else "cancelled",
        "cancelled_by": "doctor" if is_doctor else "patient"
    }
    if reason:
        update_data["rejection_reason"] = reason
        update_data["is_last_minute"] = True  # Flag for last minute cancellations
    
    result = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": update_data}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to reject/cancel appointment")

    # Create notifications for the other party
    try:
        doctor = await find_doctor_by_user_id(db, appointment["doctor_id"])
        patient_user = await db.users.find_one({"_id": ObjectId(appointment["patient_id"])})
        doctor_user = await db.users.find_one({"_id": ObjectId(appointment["doctor_id"])})

        if doctor and patient_user:
            appointment_date = appointment["appointment_date"].strftime("%B %d, %Y at %I:%M %p")
            
            if is_doctor:
                # Notify patient that doctor rejected - use patient's actual role
                patient_role = patient_user.get("currentRole", "user")
                notification_message = f"Your appointment with Dr. {doctor['name']} on {appointment_date} has been rejected."
                if reason:
                    notification_message += f" Reason: {reason}"
                await create_notification(
                    db,
                    str(patient_user["_id"]),
                    patient_role,
                    "Appointment Rejected",
                    notification_message,
                    "appointment"
                )
            else:
                # Notify doctor that patient cancelled
                notification_message = f"Patient {patient_user['name']} has cancelled their appointment on {appointment_date}."
                if reason:
                    notification_message += f" Reason: {reason}"
                await create_notification(
                    db,
                    str(doctor_user["_id"]) if doctor_user else str(appointment["doctor_id"]),
                    "doctor",
                    "Appointment Cancelled",
                    notification_message,
                    "appointment"
                )
            
            # Send chat notification about cancellation
            conversation_id = get_conversation_id(str(appointment["patient_id"]), str(doctor["user_id"]))
            if is_doctor:
                rejection_msg = f"❌ Appointment for {appointment_date} has been rejected by Dr. {doctor['name']}."
            else:
                rejection_msg = f"❌ Appointment for {appointment_date} has been cancelled by {patient_user['name']}."
            if reason:
                rejection_msg += f" Reason: {reason}"
            await send_system_message(
                db, 
                conversation_id, 
                rejection_msg,
                appointment_id
            )
    except Exception as e:
        print(f"Warning: Failed to create rejection notification: {e}")

    return {"message": "Appointment cancelled successfully"}

@router.put("/{appointment_id}/complete")
async def complete_appointment(appointment_id: str, user_info = Depends(get_current_user_with_role)):
    """Doctor marks an appointment as completed"""
    db = get_database()

    # Only doctors can mark appointments as complete
    if user_info["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can mark appointments as complete")

    # Get the appointment
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if doctor has access to this appointment
    doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
    if appointment["doctor_id"] not in doctor_ids:
        raise HTTPException(status_code=403, detail="Cannot complete this appointment")

    # Check if appointment can be completed (must be approved or scheduled)
    if appointment["status"] not in ["approved", "scheduled"]:
        raise HTTPException(status_code=400, detail="Only approved or scheduled appointments can be marked as complete")

    # Update appointment status
    result = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": "completed"}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to mark appointment as complete")

    # Create notification for patient
    try:
        doctor = await find_doctor_by_user_id(db, appointment["doctor_id"])
        patient_user = await db.users.find_one({"_id": ObjectId(appointment["patient_id"])})

        if doctor and patient_user:
            appointment_date = appointment["appointment_date"].strftime("%B %d, %Y at %I:%M %p")
            # Use patient's actual currentRole (they might be a doctor booking with another doctor)
            patient_role = patient_user.get("currentRole", "user")
            await create_notification(
                db,
                str(patient_user["_id"]),
                patient_role,
                "Appointment Completed",
                f"Your appointment with Dr. {doctor['name']} on {appointment_date} has been completed. Thank you for visiting!",
                "appointment"
            )
            
            # Send chat notification about completion
            conversation_id = get_conversation_id(str(appointment["patient_id"]), str(doctor["user_id"]))
            await send_system_message(
                db, 
                conversation_id, 
                f"🎉 Appointment for {appointment_date} has been completed. Thank you for choosing Dr. {doctor['name']}!",
                appointment_id
            )
    except Exception as e:
        print(f"Warning: Failed to create completion notification: {e}")

    return {"message": "Appointment marked as complete"}

@router.put("/{appointment_id}/missed")
async def mark_appointment_missed(appointment_id: str, user_info = Depends(get_current_user_with_role)):
    """Mark an appointment as missed (can be done by doctor or patient)"""
    db = get_database()

    # Get the appointment
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check access permissions
    has_access = False
    if user_info["role"] == "doctor":
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        has_access = appointment["doctor_id"] in doctor_ids
    else:
        has_access = appointment["patient_id"] == user_info["user_id"]

    if not has_access:
        raise HTTPException(status_code=403, detail="Cannot modify this appointment")

    # Check if appointment can be marked as missed (must be approved or scheduled)
    if appointment["status"] not in ["approved", "scheduled"]:
        raise HTTPException(status_code=400, detail="Only approved or scheduled appointments can be marked as missed")

    # Update appointment status
    result = await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {"status": "missed", "missed_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to mark appointment as missed")

    # Create notifications
    try:
        doctor = await find_doctor_by_user_id(db, appointment["doctor_id"])
        patient_user = await db.users.find_one({"_id": ObjectId(appointment["patient_id"])})
        doctor_user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])}) if doctor else None

        appointment_date = appointment["appointment_date"].strftime("%B %d, %Y at %I:%M %p")

        # Notify patient - use patient's actual role
        if patient_user:
            patient_role = patient_user.get("currentRole", "user")
            await create_notification(
                db,
                str(patient_user["_id"]),
                patient_role,
                "Appointment Missed",
                f"Your appointment with Dr. {doctor['name']} on {appointment_date} was marked as missed. Please reschedule.",
                "appointment"
            )

        # Notify doctor
        if doctor_user:
            await create_notification(
                db,
                str(doctor_user["_id"]),
                "doctor",
                "Appointment Missed",
                f"Appointment with patient {patient_user['name']} on {appointment_date} was marked as missed.",
                "appointment"
            )
    except Exception as e:
        print(f"Warning: Failed to create missed notification: {e}")

@router.post("/check-missed")
async def check_missed_appointments(user_info = Depends(get_current_user_with_role)):
    """Check for missed appointments and mark them automatically (can be called by a cron job)"""
    db = get_database()
    
    # Only doctors can check missed appointments
    if user_info["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can check missed appointments")
    
    from datetime import datetime, timedelta
    
    # Find approved/scheduled appointments that are in the past and not completed
    now = datetime.utcnow()
    past_appointments = await db.appointments.find({
        "status": {"$in": ["approved", "scheduled"]},
        "appointment_date": {"$lt": now}
    }).to_list(length=100)
    
    marked_missed = []
    for appointment in past_appointments:
        # Check if doctor has access to this appointment
        doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
        if appointment["doctor_id"] not in doctor_ids:
            continue
            
        # Mark as missed
        await db.appointments.update_one(
            {"_id": appointment["_id"]},
            {"$set": {"status": "missed", "missed_at": now}}
        )
        
        # Create notification for patient
        try:
            doctor = await find_doctor_by_user_id(db, appointment["doctor_id"])
            patient_user = await db.users.find_one({"_id": ObjectId(appointment["patient_id"])})
            
            if doctor and patient_user:
                appointment_date = appointment["appointment_date"].strftime("%B %d, %Y at %I:%M %p")
                # Use patient's actual role
                patient_role = patient_user.get("currentRole", "user")
                await create_notification(
                    db,
                    str(patient_user["_id"]),
                    patient_role,
                    "Appointment Missed",
                    f"Your appointment with Dr. {doctor['name']} on {appointment_date} was marked as missed. Please reschedule.",
                    "appointment"
                )
        except Exception as e:
            print(f"Warning: Failed to create missed notification: {e}")
            
        marked_missed.append(str(appointment["_id"]))
    
    return {"message": f"Checked {len(past_appointments)} appointments, marked {len(marked_missed)} as missed"}

@router.post("/{appointment_id}/reschedule")
async def reschedule_appointment(appointment_id: str, new_date: datetime, user_info = Depends(get_current_user_with_role)):
    """Reschedule an appointment - marks old one as rescheduled and creates a new one"""
    db = get_database()

    # Get the original appointment
    try:
        original = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    if not original:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check access permissions (only patient can reschedule)
    if user_info["role"] == "doctor":
        raise HTTPException(status_code=403, detail="Only patients can reschedule appointments")
    
    if original["patient_id"] != user_info["user_id"]:
        raise HTTPException(status_code=403, detail="Cannot reschedule this appointment")

    # Check if appointment can be rescheduled
    if original["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot reschedule completed or cancelled appointments")

    # Mark original appointment as rescheduled
    await db.appointments.update_one(
        {"_id": ObjectId(appointment_id)},
        {"$set": {
            "status": "rescheduled",
            "rescheduled_at": datetime.utcnow(),
            "rescheduled_to": new_date
        }}
    )

    # Create new appointment with same details but new date
    new_appointment = {
        "patient_id": original["patient_id"],
        "doctor_id": original["doctor_id"],
        "hospital_id": original.get("hospital_id"),
        "appointment_date": new_date,
        "status": "pending",  # New appointment needs approval
        "consultationType": original.get("consultationType", "In-Person"),
        "notes": original.get("notes"),
        "createdAt": datetime.utcnow(),
        "rescheduled_from": appointment_id
    }

    result = await db.appointments.insert_one(new_appointment)
    new_appointment_id = str(result.inserted_id)

    # Create notifications
    try:
        doctor = await find_doctor_by_user_id(db, original["doctor_id"])
        patient_user = await db.users.find_one({"_id": ObjectId(original["patient_id"])})
        doctor_user = await db.users.find_one({"_id": ObjectId(doctor["user_id"])}) if doctor else None

        old_date = original["appointment_date"].strftime("%B %d, %Y at %I:%M %p")
        new_date_str = new_date.strftime("%B %d, %Y at %I:%M %p")

        # Notify doctor about reschedule
        if doctor_user:
            await create_notification(
                db,
                str(doctor_user["_id"]),
                "doctor",
                "Appointment Rescheduled",
                f"Patient {patient_user['name']} has rescheduled their appointment from {old_date} to {new_date_str}. Please approve the new appointment.",
                "appointment",
                new_appointment_id
            )

        # Notify patient - use patient's actual role
        if patient_user:
            patient_role = patient_user.get("currentRole", "user")
            await create_notification(
                db,
                str(patient_user["_id"]),
                patient_role,
                "Appointment Rescheduled",
                f"Your appointment with Dr. {doctor['name']} has been rescheduled from {old_date} to {new_date_str}. Awaiting doctor approval.",
                "appointment"
            )
    except Exception as e:
        print(f"Warning: Failed to create reschedule notification: {e}")

    return {
        "message": "Appointment rescheduled successfully",
        "new_appointment_id": new_appointment_id,
        "old_appointment_id": appointment_id
    }

@router.post("/check-missed")
async def check_and_mark_missed_appointments(user_info = Depends(get_current_user_with_role)):
    """Check for appointments that should be marked as missed and update them"""
    try:
        db = get_database()
        now = datetime.utcnow()
        # Find all approved/scheduled appointments where the date has passed
        query = {
            "status": {"$in": ["approved", "scheduled"]},
            "appointment_date": {"$lt": now}
        }
        # For non-admin users, only check their own appointments
        if user_info["role"] == "doctor":
            doctor_ids = await get_doctor_ids_for_user(db, user_info["user_id"])
            query["doctor_id"] = {"$in": doctor_ids}
        elif user_info["role"] == "user":
            query["patient_id"] = user_info["user_id"]
        # Update all matching appointments to missed
        result = await db.appointments.update_many(
            query,
            {"$set": {"status": "missed", "auto_missed_at": now}}
        )
        return {
            "message": f"Marked {result.modified_count} appointments as missed",
            "count": result.modified_count
        }
    except Exception as e:
        import traceback
        print("[ERROR] check_and_mark_missed_appointments exception:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")


@router.post("/{appointment_id}/feedback")
async def submit_appointment_feedback(
    appointment_id: str,
    feedback_data: dict,
    user_info = Depends(get_current_user_with_role)
):
    """Submit feedback/review for a completed appointment"""
    from email_service import email_service
    
    try:
        db = get_database()
        
        # Validate ObjectId format
        if not ObjectId.is_valid(appointment_id):
            raise HTTPException(status_code=400, detail="Invalid appointment ID format")
        
        # Verify appointment exists and is completed
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        if appointment["status"] != "completed":
            raise HTTPException(status_code=400, detail="Can only submit feedback for completed appointments")
        
        # Verify the user is the patient who had the appointment
        if appointment["patient_id"] != user_info["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized to submit feedback for this appointment")
        
        # Get user details for email
        patient = await db.users.find_one({"_id": ObjectId(user_info["user_id"])})
        patient_name = patient.get("name", "Patient") if patient else "Patient"
        patient_email = patient.get("email") if patient else None
        patient_mobile = feedback_data.get("mobile") or (patient.get("mobile") if patient else None)
        
        # Get doctor details
        doctor_id = feedback_data.get("doctorId") or appointment.get("doctor_id")
        doctor_name = "Doctor"
        if doctor_id:
            doctor_user = await db.users.find_one({"_id": ObjectId(doctor_id)})
            if doctor_user:
                doctor_name = doctor_user.get("name", "Doctor")
        
        # Create feedback document
        feedback_doc = {
            "appointment_id": appointment_id,
            "patient_id": user_info["user_id"],
            "patient_name": patient_name,
            "patient_mobile": patient_mobile,
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
            "rating": feedback_data.get("rating", 0),
            "feedback": feedback_data.get("feedback", ""),
            "created_at": datetime.utcnow()
        }
        
        # Store feedback in feedback collection
        await db.feedbacks.insert_one(feedback_doc)
        
        # Update appointment with feedback flag
        await db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": {"has_feedback": True, "feedback_rating": feedback_data.get("rating", 0)}}
        )
        
        # Update doctor's average rating
        if doctor_id:
            # Calculate new average rating for doctor
            pipeline = [
                {"$match": {"doctor_id": doctor_id}},
                {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
            ]
            rating_result = await db.feedbacks.aggregate(pipeline).to_list(1)
            
            if rating_result:
                avg_rating = round(rating_result[0]["avg_rating"], 1)
                review_count = rating_result[0]["count"]
                
                # Update doctor profile with new rating
                await db.doctors.update_one(
                    {"user_id": doctor_id},
                    {"$set": {"rating": avg_rating, "review_count": review_count}}
                )
        
        # Send thank you email to the patient
        if patient_email:
            try:
                email_service.send_feedback_thank_you_email(
                    recipient_email=patient_email,
                    user_name=patient_name,
                    doctor_name=doctor_name,
                    rating=feedback_data.get("rating", 0)
                )
                print(f"✅ Thank you email sent to {patient_email}")
            except Exception as email_error:
                print(f"⚠️ Failed to send thank you email: {email_error}")
                # Don't fail the request if email fails
        
        return {
            "message": "Feedback submitted successfully", 
            "success": True,
            "email_sent": patient_email is not None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("[ERROR] submit_appointment_feedback exception:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
