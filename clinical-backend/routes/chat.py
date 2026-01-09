from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import json
import os
import uuid
from datetime import datetime
from typing import List, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from database import get_database
from routes.auth import get_current_user_with_role

router = APIRouter(prefix="/chat", tags=["chat"])

# WebSocket connection manager - now uses conversation_id (doctor-patient pair)
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, conversation_id: str, websocket: WebSocket):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, conversation_id: str, websocket: WebSocket):
        if conversation_id in self.active_connections:
            if websocket in self.active_connections[conversation_id]:
                self.active_connections[conversation_id].remove(websocket)
            if len(self.active_connections[conversation_id]) == 0:
                del self.active_connections[conversation_id]

    async def broadcast(self, conversation_id: str, data: dict):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(data)
                except Exception as e:
                    print(f"Error broadcasting to websocket: {e}")

manager = ConnectionManager()

# Create uploads directory
os.makedirs("./uploads/chat", exist_ok=True)


def get_conversation_id(user1_id: str, user2_id: str) -> str:
    """Generate a consistent conversation ID for two users (doctor-patient pair)"""
    # Sort IDs to ensure consistency regardless of who initiates
    sorted_ids = sorted([str(user1_id), str(user2_id)])
    return f"{sorted_ids[0]}_{sorted_ids[1]}"


async def send_system_message(db, conversation_id: str, message: str, appointment_id: str = None):
    """Send a system message to a conversation (for notifications)"""
    system_msg = {
        "conversation_id": conversation_id,
        "appointment_id": appointment_id,
        "sender_id": "system",
        "sender_role": "system",
        "message": message,
        "message_type": "system",
        "read_by": [],
        "timestamp": datetime.utcnow().isoformat(),
        "deleted": False
    }
    await db.chat_messages.insert_one(system_msg)
    
    # Broadcast to connected clients
    system_msg["_id"] = str(system_msg.get("_id"))
    await manager.broadcast(conversation_id, system_msg)
    
    return system_msg


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for live chat using conversation_id (doctor-patient pair)"""
    db = get_database()
    await manager.connect(conversation_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Create message record
            message = {
                "conversation_id": conversation_id,
                "appointment_id": message_data.get("appointment_id"),  # Optional - for context
                "sender_id": message_data.get("sender_id"),
                "sender_role": message_data.get("sender_role"),
                "message": message_data.get("message"),
                "message_type": message_data.get("message_type", "text"),
                "file_url": message_data.get("file_url"),
                "read_by": [message_data.get("sender_id")],
                "timestamp": datetime.utcnow().isoformat(),
                "deleted": False
            }
            
            # Store in database
            await db.chat_messages.insert_one(message)
            message["_id"] = str(message.get("_id"))
            
            # Broadcast to all connected clients
            await manager.broadcast(conversation_id, message)
            
    except WebSocketDisconnect:
        manager.disconnect(conversation_id, websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(conversation_id, websocket)


@router.get("/messages/{conversation_id}")
async def get_chat_history(
    conversation_id: str,
    current_user = Depends(get_current_user_with_role)
):
    """Get chat history for a conversation (doctor-patient pair)"""
    db = get_database()
    user_id = current_user.get("user_id")
    user_role = current_user.get("role", "user")
    
    # Parse conversation_id to verify access
    parts = conversation_id.split("_")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid conversation ID format")
    
    # Verify user is part of this conversation
    if user_id not in parts:
        raise HTTPException(status_code=403, detail="Access denied: You're not part of this conversation")
    
    # Get messages - check both old appointment_id based and new conversation_id based
    messages = await db.chat_messages.find({
        "$or": [
            {"conversation_id": conversation_id},
            {"appointment_id": {"$exists": True}}  # Legacy messages
        ],
        "deleted": False
    }).sort("timestamp", 1).to_list(None)
    
    # Filter legacy messages to only include those between these two users
    filtered_messages = []
    for msg in messages:
        if msg.get("conversation_id") == conversation_id:
            filtered_messages.append(msg)
        elif msg.get("appointment_id"):
            # Check if this legacy message belongs to this conversation
            apt = await db.appointments.find_one({"_id": ObjectId(msg.get("appointment_id"))})
            if apt:
                apt_conv_id = get_conversation_id(str(apt.get("patient_id")), str(apt.get("doctor_id")))
                if apt_conv_id == conversation_id:
                    filtered_messages.append(msg)
    
    # Sort by timestamp
    filtered_messages.sort(key=lambda x: x.get("timestamp", ""))
    
    # Cache for sender names to avoid repeated DB queries
    sender_names = {"system": "System"}
    
    result = []
    for msg in filtered_messages:
        # Skip empty messages (messages with no content)
        message_content = msg.get("message", "")
        if not message_content or (isinstance(message_content, str) and not message_content.strip()):
            continue
            
        sender_id = msg.get("sender_id", "")
        
        # Get sender name if not cached
        if sender_id and sender_id not in sender_names and sender_id != "system":
            try:
                sender = await db.users.find_one({"_id": ObjectId(sender_id)})
                sender_names[sender_id] = sender.get("name", "Unknown") if sender else "Unknown"
            except:
                sender_names[sender_id] = "Unknown"
        
        result.append({
            "id": str(msg.get("_id")),
            "conversation_id": msg.get("conversation_id", conversation_id),
            "appointment_id": msg.get("appointment_id"),
            "sender_id": sender_id,
            "sender_name": sender_names.get(sender_id, "Unknown"),
            "sender_role": msg.get("sender_role"),
            "message": msg.get("message"),
            "message_type": msg.get("message_type", "text"),
            "file_url": msg.get("file_url"),
            "read_by": msg.get("read_by", []),
            "timestamp": msg.get("timestamp"),
            "deleted": msg.get("deleted", False)
        })
    
    return result


@router.get("/conversations")
async def get_conversations(
    current_user = Depends(get_current_user_with_role)
):
    """Get list of conversations for current user - ONE per doctor-patient pair"""
    db = get_database()
    user_id = current_user.get("user_id")
    user_role = current_user.get("role", "user")
    
    print(f"[CHAT] Getting consolidated conversations for user_id={user_id}, role={user_role}")
    
    try:
        # Find all appointments where user is patient or doctor
        if user_role == "doctor":
            # For doctors, doctor_id in appointments stores the doctor's USER ID
            # So we can match directly against user_id
            appointments = await db.appointments.find({
                "$or": [
                    {"doctor_id": ObjectId(user_id)},
                    {"doctor_id": user_id}
                ]
            }).to_list(length=None)
            
            # Also check if user has appointments as a patient (doctor booking with another doctor)
            patient_appointments = await db.appointments.find({
                "$or": [
                    {"patient_id": ObjectId(user_id)},
                    {"patient_id": user_id}
                ]
            }).to_list(length=None)
            
            # Combine both lists
            appointment_ids = set()
            all_appointments = []
            for apt in appointments + patient_appointments:
                apt_id = str(apt["_id"])
                if apt_id not in appointment_ids:
                    appointment_ids.add(apt_id)
                    all_appointments.append(apt)
            appointments = all_appointments
        else:
            appointments = await db.appointments.find({
                "$or": [
                    {"patient_id": ObjectId(user_id)},
                    {"patient_id": user_id}
                ]
            }).to_list(length=None)
        
        print(f"[CHAT] Found {len(appointments)} total appointments")
        
        # Group appointments by partner (doctor-patient pair)
        partner_appointments = {}  # partner_id -> list of appointments
        
        for apt in appointments:
            # Determine who is the partner based on the user's relationship to this appointment
            patient_id = str(apt.get("patient_id", ""))
            doctor_id = str(apt.get("doctor_id", ""))
            
            # If user is the patient in this appointment, partner is the doctor
            # If user is the doctor in this appointment, partner is the patient
            if patient_id == user_id:
                partner_id = doctor_id
            else:
                partner_id = patient_id
            
            if not partner_id:
                continue
                
            if partner_id not in partner_appointments:
                partner_appointments[partner_id] = []
            partner_appointments[partner_id].append(apt)
        
        print(f"[CHAT] Grouped into {len(partner_appointments)} unique partners")
        
        conversations = []
        
        for partner_id, apts in partner_appointments.items():
            # Generate conversation_id for this pair
            conversation_id = get_conversation_id(user_id, partner_id)
            
            # Get partner info
            try:
                partner = await db.users.find_one({"_id": ObjectId(partner_id)})
                partner_name = partner.get("name", "Unknown") if partner else "Unknown"
                partner_mobile = partner.get("mobile", "") if partner else ""
                # Check if partner is a doctor
                partner_is_doctor = await db.doctors.find_one({"user_id": partner_id}) or await db.doctors.find_one({"user_id": ObjectId(partner_id)})
                partner_role = "doctor" if partner_is_doctor else "user"
            except:
                partner_name = "Unknown"
                partner_mobile = ""
                partner_role = "user"
            
            # Get last message from this conversation
            last_msg = await db.chat_messages.find_one(
                {
                    "$or": [
                        {"conversation_id": conversation_id},
                        # Also check legacy messages by appointment_id
                        {"appointment_id": {"$in": [str(apt["_id"]) for apt in apts]}}
                    ],
                    "deleted": False
                },
                sort=[("timestamp", -1)]
            )
            
            # Count unread messages
            unread = await db.chat_messages.count_documents({
                "$or": [
                    {"conversation_id": conversation_id},
                    {"appointment_id": {"$in": [str(apt["_id"]) for apt in apts]}}
                ],
                "deleted": False,
                "sender_id": {"$ne": user_id},
                "read_by": {"$ne": user_id}
            })
            
            # Get all appointment info for this conversation
            appointment_summaries = []
            latest_appointment = None
            latest_approved = None
            
            for apt in apts:
                apt_date = apt.get("appointment_date")
                if isinstance(apt_date, datetime):
                    apt_date_str = apt_date.isoformat()
                else:
                    apt_date_str = str(apt_date) if apt_date else ""
                
                apt_summary = {
                    "id": str(apt["_id"]),
                    "status": apt.get("status", "pending"),
                    "date": apt_date_str,
                    "time": apt.get("appointment_time", "")
                }
                appointment_summaries.append(apt_summary)
                
                # Track latest and latest approved
                if latest_appointment is None or (apt_date and apt_date > latest_appointment.get("appointment_date", datetime.min)):
                    latest_appointment = apt
                
                if apt.get("status") in ["approved", "completed"]:
                    if latest_approved is None or (apt_date and apt_date > latest_approved.get("appointment_date", datetime.min)):
                        latest_approved = apt
            
            # Use latest approved appointment or latest overall
            active_apt = latest_approved or latest_appointment
            
            # Get last message time
            last_message_time = ""
            if last_msg:
                last_message_time = last_msg.get("timestamp", "")
            elif active_apt and active_apt.get("appointment_date"):
                if isinstance(active_apt.get("appointment_date"), datetime):
                    last_message_time = active_apt.get("appointment_date").isoformat()
                else:
                    last_message_time = str(active_apt.get("appointment_date"))
            
            # Determine if chat is enabled (at least one approved/completed appointment)
            has_approved = any(apt.get("status") in ["approved", "completed"] for apt in apts)
            
            conversation = {
                "conversation_id": conversation_id,
                "partner_id": partner_id,
                "partner_name": partner_name,
                "partner_mobile": partner_mobile,
                "partner_role": partner_role,
                "last_message": last_msg.get("message", "") if last_msg else "No messages yet",
                "last_message_time": last_message_time,
                "unread_count": unread,
                "chat_enabled": has_approved,
                "appointments": appointment_summaries,
                "active_appointment_id": str(active_apt["_id"]) if active_apt else None,
                "active_appointment_status": active_apt.get("status") if active_apt else None,
                "total_appointments": len(apts)
            }
            conversations.append(conversation)
        
        # Sort by timestamp (most recent first)
        conversations.sort(key=lambda x: x["last_message_time"] or "", reverse=True)
        
        print(f"[CHAT] Returning {len(conversations)} consolidated conversations")
        return conversations
        
    except Exception as e:
        print(f"Error in get_conversations: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/{conversation_id}")
async def upload_file(
    conversation_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user_with_role)
):
    """Upload file for chat and also save to medical records"""
    db = get_database()
    user_id = current_user.get("user_id")
    user_role = current_user.get("role", "user")
    
    # Create directory for conversation
    chat_dir = f"./uploads/chat/{conversation_id}"
    os.makedirs(chat_dir, exist_ok=True)
    
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(chat_dir, unique_filename)
    
    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)
    
    file_url = f"/chat/download/{conversation_id}/{unique_filename}"
    
    # Determine patient_id from conversation_id (format: user1_user2)
    parts = conversation_id.split("_")
    patient_id = None
    if len(parts) == 2:
        # The patient is the non-doctor user, or both if user is a patient
        if user_role == "doctor":
            # The other person is the patient
            patient_id = parts[0] if parts[1] == user_id else parts[1]
        else:
            # Current user is the patient
            patient_id = user_id
    
    # Also save to medical records if it's a medical document type
    medical_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx', '.xls', '.xlsx']
    if file_ext.lower() in medical_extensions and patient_id:
        try:
            # Also save file to medical records folder
            medical_dir = f"./uploads/medical_records/{patient_id}"
            os.makedirs(medical_dir, exist_ok=True)
            medical_filename = f"{uuid.uuid4()}{file_ext}"
            medical_file_path = os.path.join(medical_dir, medical_filename)
            
            # Copy file to medical records
            with open(medical_file_path, "wb") as f:
                f.write(contents)
            
            # Create medical record entry
            medical_record = {
                "patient_id": patient_id,
                "record_type": "other",
                "title": f"Chat: {file.filename}",
                "description": f"Document uploaded via chat conversation",
                "file_path": f"/medical-records/download/{patient_id}/{medical_filename}",
                "original_filename": file.filename,
                "file_size": len(contents),
                "uploaded_by": user_id,
                "source": "chat",
                "conversation_id": conversation_id,
                "createdAt": datetime.utcnow()
            }
            await db.medical_records.insert_one(medical_record)
            print(f"[CHAT] Also saved file to medical records for patient {patient_id}")
        except Exception as e:
            print(f"[CHAT] Warning: Could not save to medical records: {e}")
    
    # Get sender name
    try:
        sender = await db.users.find_one({"_id": ObjectId(user_id)})
        sender_name = sender.get("name", "Unknown") if sender else "Unknown"
    except:
        sender_name = "Unknown"
    
    # Create chat message for the file
    message = {
        "conversation_id": conversation_id,
        "sender_id": user_id,
        "sender_name": sender_name,
        "sender_role": user_role,
        "message": file.filename,
        "message_type": "file",
        "file_url": file_url,
        "read_by": [user_id],
        "timestamp": datetime.utcnow().isoformat(),
        "deleted": False
    }
    
    result = await db.chat_messages.insert_one(message)
    message["id"] = str(result.inserted_id)
    message["_id"] = str(result.inserted_id)
    
    # Broadcast to WebSocket clients
    await manager.broadcast(conversation_id, message)
    
    return message


@router.get("/download/{conversation_id}/{file_name}")
async def download_file(conversation_id: str, file_name: str):
    """Download file from chat"""
    file_path = f"./uploads/chat/{conversation_id}/{file_name}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)


@router.post("/messages/{conversation_id}")
async def send_message(
    conversation_id: str,
    message_data: dict,
    current_user = Depends(get_current_user_with_role)
):
    """Send message using conversation_id (doctor-patient pair)"""
    db = get_database()
    user_id = current_user.get("user_id")
    user_role = current_user.get("role", "user")
    
    # Verify user is part of this conversation
    parts = conversation_id.split("_")
    if len(parts) != 2 or user_id not in parts:
        raise HTTPException(status_code=403, detail="Access denied: You're not part of this conversation")
    
    # Get sender name
    try:
        sender = await db.users.find_one({"_id": ObjectId(user_id)})
        sender_name = sender.get("name", "Unknown") if sender else "Unknown"
    except:
        sender_name = "Unknown"
    
    message = {
        "conversation_id": conversation_id,
        "appointment_id": message_data.get("appointment_id"),  # Optional context
        "sender_id": user_id,
        "sender_role": user_role,
        "message": message_data.get("message"),
        "message_type": message_data.get("message_type", "text"),
        "file_url": message_data.get("file_url"),
        "read_by": [user_id],
        "timestamp": datetime.utcnow().isoformat(),
        "deleted": False
    }
    
    result = await db.chat_messages.insert_one(message)
    
    response_msg = {
        "id": str(result.inserted_id),
        "conversation_id": conversation_id,
        "appointment_id": message_data.get("appointment_id"),
        "sender_id": user_id,
        "sender_name": sender_name,
        "sender_role": user_role,
        "message": message_data.get("message"),
        "message_type": message_data.get("message_type", "text"),
        "file_url": message_data.get("file_url"),
        "read_by": [user_id],
        "timestamp": message["timestamp"],
        "deleted": False
    }
    
    # Broadcast to WebSocket clients
    await manager.broadcast(conversation_id, response_msg)
    
    return response_msg


@router.put("/messages/{conversation_id}/read")
async def mark_all_as_read(
    conversation_id: str,
    current_user = Depends(get_current_user_with_role)
):
    """Mark all messages in a conversation as read"""
    db = get_database()
    user_id = current_user.get("user_id")
    
    # Update messages with conversation_id
    result = await db.chat_messages.update_many(
        {
            "$or": [
                {"conversation_id": conversation_id},
                # Also support legacy appointment_id format
                {"appointment_id": conversation_id}
            ],
            "read_by": {"$ne": user_id}
        },
        {"$addToSet": {"read_by": user_id}}
    )
    
    return {"modified_count": result.modified_count}


# WhatsApp Integration (Twilio)
try:
    from twilio.rest import Client
    from config import settings
    
    twilio_client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
except ImportError:
    print("Twilio not installed. WhatsApp features will not work.")
    twilio_client = None


@router.post("/whatsapp/send/{appointment_id}")
async def send_whatsapp_message(
    appointment_id: str,
    message_data: dict,
    current_user = Depends(get_current_user_with_role)
):
    """Send message via WhatsApp"""
    db = get_database()
    if not twilio_client:
        raise HTTPException(status_code=501, detail="WhatsApp integration not configured")
    
    user_id = current_user.get("user_id")
    message_text = message_data.get("message", "")
    
    # Get appointment and other user's phone
    appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Get recipient user
    if user_id == str(appointment.get("patient_id")):
        recipient = await db.users.find_one({"_id": appointment.get("doctor_id")})
    else:
        recipient = await db.users.find_one({"_id": appointment.get("patient_id")})
    
    if not recipient or not recipient.get("phone"):
        raise HTTPException(status_code=400, detail="Recipient phone number not found")
    
    # Format phone number for WhatsApp
    phone = recipient.get("phone")
    if not phone.startswith("+"):
        phone = "+91" + phone  # India default, adjust as needed
    
    try:
        # Send WhatsApp message
        whatsapp_message = twilio_client.messages.create(
            from_=f"whatsapp:{settings.whatsapp_from}",
            to=f"whatsapp:{phone}",
            body=message_text
        )
        
        # Store in database
        db_message = {
            "appointment_id": appointment_id,
            "sender_id": user_id,
            "sender_role": current_user.get("currentRole", "user"),
            "message": message_text,
            "message_type": "whatsapp",
            "whatsapp_sid": whatsapp_message.sid,
            "status": "sent",
            "read_by": [user_id],
            "timestamp": datetime.utcnow().isoformat(),
            "deleted": False
        }
        
        result = await db.chat_messages.insert_one(db_message)
        db_message["_id"] = str(result.inserted_id)
        
        return {"status": "sent", "sid": whatsapp_message.sid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send WhatsApp message: {str(e)}")


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(
    request_data: dict
):
    """Receive incoming WhatsApp messages from Twilio"""
    db = get_database()
    # Extract message data from Twilio webhook
    from_number = request_data.get("From", "").replace("whatsapp:", "")
    message_text = request_data.get("Body", "")
    message_sid = request_data.get("SmsMessageSid", "")
    
    # Find user by phone number
    sender = await db.users.find_one({"phone": from_number})
    if not sender:
        return {"status": "ignored", "reason": "Sender not found"}
    
    # Store message
    db_message = {
        "appointment_id": None,  # Will be updated if linked
        "sender_id": str(sender.get("_id")),
        "sender_role": sender.get("currentRole", "user"),
        "message": message_text,
        "message_type": "whatsapp",
        "whatsapp_sid": message_sid,
        "status": "received",
        "read_by": [],
        "timestamp": datetime.utcnow().isoformat(),
        "deleted": False
    }
    
    await db.chat_messages.insert_one(db_message)
    
    return {"status": "received"}


# ========== APPOINTMENT NOTIFICATION TO CHAT ==========

@router.post("/appointment-notification")
async def send_appointment_notification(
    notification_data: dict,
    current_user = Depends(get_current_user_with_role)
):
    """Send appointment notification to chat (booking, approval, rejection, completion)"""
    db = get_database()
    
    appointment_id = notification_data.get("appointment_id")
    notification_type = notification_data.get("type")  # "booked", "approved", "rejected", "completed"
    extra_info = notification_data.get("extra_info", "")
    
    if not appointment_id:
        raise HTTPException(status_code=400, detail="appointment_id is required")
    
    # Get appointment details
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    patient_id = str(appointment.get("patient_id", ""))
    doctor_id = str(appointment.get("doctor_id", ""))
    
    # Get conversation_id for this doctor-patient pair
    conversation_id = get_conversation_id(patient_id, doctor_id)
    
    # Get appointment date/time
    apt_date = appointment.get("appointment_date")
    apt_time = appointment.get("appointment_time", "")
    if isinstance(apt_date, datetime):
        date_str = apt_date.strftime("%B %d, %Y")
    else:
        date_str = str(apt_date) if apt_date else "Unknown date"
    
    # Get patient and doctor names
    try:
        patient = await db.users.find_one({"_id": ObjectId(patient_id)})
        patient_name = patient.get("name", "Patient") if patient else "Patient"
        doctor = await db.users.find_one({"_id": ObjectId(doctor_id)})
        doctor_name = doctor.get("name", "Doctor") if doctor else "Doctor"
    except:
        patient_name = "Patient"
        doctor_name = "Doctor"
    
    # Create notification message based on type
    notification_messages = {
        "booked": f"📅 New appointment booked for {date_str} at {apt_time}",
        "approved": f"✅ Appointment for {date_str} at {apt_time} has been approved. You can now chat!",
        "rejected": f"❌ Appointment for {date_str} at {apt_time} has been rejected.{' Reason: ' + extra_info if extra_info else ''}",
        "completed": f"🎉 Appointment on {date_str} has been marked as completed. Thank you!",
        "cancelled": f"🚫 Appointment for {date_str} has been cancelled."
    }
    
    message_text = notification_messages.get(notification_type, f"📋 Appointment update: {notification_type}")
    
    # Send system message to chat
    system_msg = await send_system_message(db, conversation_id, message_text, appointment_id)
    
    return {
        "status": "success",
        "message_id": str(system_msg.get("_id")),
        "conversation_id": conversation_id
    }


# Helper function to be called from appointments route
async def notify_chat_on_appointment_change(db, appointment_id: str, notification_type: str, extra_info: str = ""):
    """Helper function to send appointment notifications to chat"""
    try:
        appointment = await db.appointments.find_one({"_id": ObjectId(appointment_id)})
        if not appointment:
            return None
        
        patient_id = str(appointment.get("patient_id", ""))
        doctor_id = str(appointment.get("doctor_id", ""))
        
        conversation_id = get_conversation_id(patient_id, doctor_id)
        
        apt_date = appointment.get("appointment_date")
        apt_time = appointment.get("appointment_time", "")
        if isinstance(apt_date, datetime):
            date_str = apt_date.strftime("%B %d, %Y")
        else:
            date_str = str(apt_date) if apt_date else "Unknown date"
        
        notification_messages = {
            "booked": f"📅 New appointment booked for {date_str} at {apt_time}",
            "approved": f"✅ Appointment for {date_str} at {apt_time} has been approved. You can now chat!",
            "rejected": f"❌ Appointment for {date_str} at {apt_time} has been rejected.{' Reason: ' + extra_info if extra_info else ''}",
            "completed": f"🎉 Appointment on {date_str} has been marked as completed. Thank you!",
            "cancelled": f"🚫 Appointment for {date_str} has been cancelled."
        }
        
        message_text = notification_messages.get(notification_type, f"📋 Appointment update: {notification_type}")
        
        return await send_system_message(db, conversation_id, message_text, appointment_id)
    except Exception as e:
        print(f"Error sending chat notification: {e}")
        return None
