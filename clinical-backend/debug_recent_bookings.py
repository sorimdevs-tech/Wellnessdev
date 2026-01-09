import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timedelta

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get recent appointments (last 24 hours)
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_appointments = await db.appointments.find({
        'createdAt': {'$gte': yesterday}
    }).sort('createdAt', -1).to_list(20)
    
    print(f'=== RECENT APPOINTMENTS (last 24 hours) ===')
    print(f'Found: {len(recent_appointments)} appointments\n')
    
    for apt in recent_appointments:
        patient = await db.users.find_one({'_id': ObjectId(apt['patient_id'])})
        
        # Find doctor - could be user_id or doctor profile id
        doctor_id = apt.get('doctor_id')
        doctor_user = await db.users.find_one({'_id': ObjectId(doctor_id)}) if doctor_id else None
        doctor_profile = await db.doctors.find_one({'user_id': doctor_id}) if doctor_id else None
        
        if not doctor_user:
            # Maybe doctor_id is the doctor profile _id
            doctor_profile = await db.doctors.find_one({'_id': ObjectId(doctor_id)}) if doctor_id else None
            if doctor_profile:
                doctor_user = await db.users.find_one({'_id': ObjectId(doctor_profile.get('user_id'))}) if doctor_profile.get('user_id') else None
        
        print(f'Appointment ID: {apt["_id"]}')
        print(f'  Created: {apt.get("createdAt")}')
        print(f'  Status: {apt.get("status")}')
        print(f'  Patient ID: {apt.get("patient_id")}')
        print(f'  Patient: {patient.get("name") if patient else "NOT FOUND"} ({patient.get("email") if patient else ""})')
        print(f'  Patient currentRole: {patient.get("currentRole") if patient else "N/A"}')
        print(f'  Doctor ID (from apt): {doctor_id}')
        print(f'  Doctor User: {doctor_user.get("name") if doctor_user else "NOT FOUND"} ({doctor_user.get("email") if doctor_user else ""})')
        
        # Check if notification was created for this appointment
        notifications = await db.notifications.find({
            'appointmentId': str(apt['_id'])
        }).to_list(10)
        print(f'  Notifications created: {len(notifications)}')
        for n in notifications:
            print(f'    - To: {n.get("user_id")} (type: {n.get("user_type")})')
            print(f'      Title: {n.get("title")}')
        print()
    
    # Also check all doctors and their user_ids
    print('\n=== ALL VERIFIED DOCTORS ===')
    doctors = await db.doctors.find({'verified': True, 'is_active': True}).to_list(50)
    for d in doctors:
        user = await db.users.find_one({'_id': ObjectId(d['user_id'])}) if d.get('user_id') else None
        print(f'{d.get("name")}:')
        print(f'  doctor._id: {d["_id"]}')
        print(f'  doctor.user_id: {d.get("user_id")}')
        print(f'  user email: {user.get("email") if user else "N/A"}')
        print()
    
    client.close()

asyncio.run(check())
