import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

async def test_approval_flow():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get the approved appointment
    apt = await db.appointments.find_one({'_id': ObjectId('69579a43efd1d2adfbbdd1f1')})
    print(f"=== APPOINTMENT ===")
    print(f"ID: {apt['_id']}")
    print(f"Status: {apt['status']}")
    print(f"doctor_id: {apt['doctor_id']} (type: {type(apt['doctor_id'])})")
    print(f"patient_id: {apt['patient_id']} (type: {type(apt['patient_id'])})")
    
    # Test doctor lookup - string
    print(f"\n=== DOCTOR LOOKUP (string) ===")
    doctor = await db.doctors.find_one({"user_id": str(apt['doctor_id'])})
    print(f"Found: {doctor.get('name') if doctor else 'None'}")
    
    # Test patient lookup
    print(f"\n=== PATIENT LOOKUP ===")
    patient = await db.users.find_one({"_id": ObjectId(apt['patient_id'])})
    print(f"Found: {patient.get('name') if patient else 'None'}")
    print(f"Patient currentRole: {patient.get('currentRole') if patient else 'None'}")
    
    # Manually create the notification that should have been created
    if doctor and patient:
        print(f"\n=== CREATING TEST NOTIFICATION ===")
        patient_role = patient.get("currentRole", "user")
        appointment_date = apt["appointment_date"].strftime("%B %d, %Y at %I:%M %p")
        
        notification_doc = {
            "user_id": str(patient["_id"]),
            "user_type": patient_role,
            "title": "Appointment Approved (TEST)",
            "message": f"Your appointment with Dr. {doctor['name']} on {appointment_date} has been approved.",
            "type": "appointment",
            "read": False,
            "createdAt": datetime.utcnow(),
            "appointmentId": str(apt['_id'])
        }
        
        print(f"Notification to create:")
        print(f"  user_id: {notification_doc['user_id']}")
        print(f"  user_type: {notification_doc['user_type']}")
        print(f"  title: {notification_doc['title']}")
        
        result = await db.notifications.insert_one(notification_doc)
        print(f"  Created with ID: {result.inserted_id}")
    
    # Check all notifications for this patient
    print(f"\n=== ALL NOTIFICATIONS FOR PATIENT ===")
    patient_notifications = await db.notifications.find({
        "user_id": str(apt['patient_id'])
    }).to_list(20)
    
    for n in patient_notifications:
        print(f"  - [{n.get('user_type')}] {n.get('title')}")
    
    client.close()

asyncio.run(test_approval_flow())
