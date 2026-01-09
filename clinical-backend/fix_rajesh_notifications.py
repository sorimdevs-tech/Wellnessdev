import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

async def fix_notifications():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Correct Dr. Rajesh Kumar
    correct_rajesh = await db.users.find_one({'email': 'rajesh@example.com'})
    correct_rajesh_id = str(correct_rajesh['_id'])
    print(f'Correct Dr. Rajesh ID: {correct_rajesh_id}')
    
    # Get appointments where correct Rajesh is the doctor
    appointments = await db.appointments.find({'doctor_id': correct_rajesh_id}).to_list(100)
    print(f'Appointments for correct Rajesh: {len(appointments)}')
    
    for apt in appointments:
        apt_id = str(apt['_id'])
        patient = await db.users.find_one({'_id': ObjectId(apt['patient_id'])})
        patient_name = patient.get('name', 'Patient') if patient else 'Patient'
        appointment_date = apt['appointment_date'].strftime("%B %d, %Y at %I:%M %p")
        
        # Check if notification already exists for this appointment
        existing = await db.notifications.find_one({
            'user_id': correct_rajesh_id,
            'appointmentId': apt_id
        })
        
        if not existing:
            # Create notification for Dr. Rajesh
            notification = {
                "user_id": correct_rajesh_id,
                "user_type": "doctor",
                "title": "New Appointment Request",
                "message": f"Patient {patient_name} has requested an appointment with you on {appointment_date}. Please approve or reject this request.",
                "type": "appointment",
                "read": False,
                "createdAt": datetime.utcnow(),
                "appointmentId": apt_id
            }
            result = await db.notifications.insert_one(notification)
            print(f'  Created notification for appointment {apt_id}: {result.inserted_id}')
        else:
            print(f'  Notification already exists for appointment {apt_id}')
    
    # Verify
    print('\n--- VERIFICATION ---')
    rajesh_notifs = await db.notifications.find({
        'user_id': correct_rajesh_id,
        'user_type': 'doctor'
    }).to_list(100)
    print(f'Dr. Rajesh now has {len(rajesh_notifs)} notifications as doctor')
    for n in rajesh_notifs:
        print(f'  - {n.get("title")}: appointmentId={n.get("appointmentId")}')
    
    client.close()

asyncio.run(fix_notifications())
