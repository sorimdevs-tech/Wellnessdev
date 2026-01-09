import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

async def fix_doctor():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # The user who is logged in as Dr. Rajesh Kumar
    user_id = "694a68b86d8a62258eae882e"
    
    # Check if doctor record exists
    existing = await db.doctors.find_one({'user_id': user_id})
    if existing:
        print(f'Doctor record already exists: {existing["_id"]}')
        return
    
    # Get hospital for linking
    hospital = await db.hospitals.find_one()
    hospital_id = str(hospital['_id']) if hospital else None
    
    # Create doctor record
    doctor_doc = {
        "user_id": user_id,
        "name": "Dr. Rajesh Kumar",
        "specialization": "General Medicine",
        "qualifications": ["MBBS", "MD - General Medicine"],
        "experience_years": 15,
        "hospital_id": hospital_id,
        "department": "General Medicine",
        "consultation_fee": 500,
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "available_time_start": "09:00",
        "available_time_end": "17:00",
        "isAvailable": True,
        "rating": 4.5,
        "totalReviews": 120,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.doctors.insert_one(doctor_doc)
    print(f'Doctor record created: {result.inserted_id}')
    print(f'Linked to user_id: {user_id}')
    
    # Verify
    doctor = await db.doctors.find_one({'_id': result.inserted_id})
    print(f'\nVerification:')
    print(f'  Doctor name: {doctor.get("name")}')
    print(f'  user_id: {doctor.get("user_id")}')
    print(f'  Hospital: {hospital.get("name") if hospital else "None"}')
    
    client.close()
    print('\nDone! Dr. Rajesh Kumar can now receive appointments.')

asyncio.run(fix_doctor())
