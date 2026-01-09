import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

async def test_full_flow():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Find a pending appointment
    pending_apt = await db.appointments.find_one({'status': 'pending'})
    
    if not pending_apt:
        print("No pending appointments found. Creating a test one...")
        
        # Get a doctor and patient
        doctor = await db.doctors.find_one({'verified': True, 'is_active': True})
        patient = await db.users.find_one({'currentRole': 'user'})
        
        if not doctor or not patient:
            print("No doctor or patient found!")
            client.close()
            return
        
        # Create a test appointment
        apt_doc = {
            "patient_id": str(patient["_id"]),
            "doctor_id": str(doctor["user_id"]),
            "hospital_id": doctor.get("hospital_id"),
            "appointment_date": datetime(2026, 1, 5, 10, 0),
            "status": "pending",
            "notes": "Test appointment",
            "createdAt": datetime.utcnow()
        }
        result = await db.appointments.insert_one(apt_doc)
        pending_apt = await db.appointments.find_one({'_id': result.inserted_id})
        print(f"Created test appointment: {pending_apt['_id']}")
    
    print(f"\n=== TESTING APPROVAL NOTIFICATION ===")
    print(f"Appointment ID: {pending_apt['_id']}")
    print(f"Patient ID: {pending_apt['patient_id']}")
    print(f"Doctor ID: {pending_apt['doctor_id']}")
    print(f"Status: {pending_apt['status']}")
    
    # Simulate the approval process
    print(f"\n1. Finding doctor...")
    doctor = await db.doctors.find_one({"user_id": str(pending_apt["doctor_id"])})
    if not doctor:
        doctor = await db.doctors.find_one({"user_id": ObjectId(pending_apt["doctor_id"])})
    print(f"   Doctor: {doctor.get('name') if doctor else 'NOT FOUND'}")
    
    print(f"\n2. Finding patient...")
    patient_user = await db.users.find_one({"_id": ObjectId(pending_apt["patient_id"])})
    print(f"   Patient: {patient_user.get('name') if patient_user else 'NOT FOUND'}")
    print(f"   Patient currentRole: {patient_user.get('currentRole') if patient_user else 'N/A'}")
    
    if doctor and patient_user:
        print(f"\n3. Updating appointment status to 'approved'...")
        await db.appointments.update_one(
            {"_id": pending_apt["_id"]},
            {"$set": {"status": "approved"}}
        )
        print(f"   ✅ Status updated!")
        
        print(f"\n4. Creating notification...")
        appointment_date = pending_apt["appointment_date"].strftime("%B %d, %Y at %I:%M %p")
        patient_role = patient_user.get("currentRole", "user")
        
        notification = {
            "user_id": str(patient_user["_id"]),
            "user_type": patient_role,
            "title": "Appointment Approved",
            "message": f"Your appointment with Dr. {doctor['name']} on {appointment_date} has been approved.",
            "type": "appointment",
            "read": False,
            "createdAt": datetime.utcnow(),
            "appointmentId": str(pending_apt["_id"])
        }
        
        result = await db.notifications.insert_one(notification)
        print(f"   ✅ Notification created with ID: {result.inserted_id}")
        
        # Verify notification exists
        print(f"\n5. Verifying notification...")
        created_notif = await db.notifications.find_one({"_id": result.inserted_id})
        print(f"   Title: {created_notif.get('title')}")
        print(f"   User ID: {created_notif.get('user_id')}")
        print(f"   User Type: {created_notif.get('user_type')}")
        
        # Check all notifications for patient
        print(f"\n6. All notifications for patient {patient_user['name']}:")
        all_notifs = await db.notifications.find({
            "user_id": str(patient_user["_id"]),
            "user_type": patient_role
        }).to_list(20)
        
        for n in all_notifs:
            print(f"   - {n.get('title')}")
    else:
        print("\n❌ Cannot proceed - doctor or patient not found")
    
    client.close()
    print("\n=== TEST COMPLETE ===")

asyncio.run(test_full_flow())
