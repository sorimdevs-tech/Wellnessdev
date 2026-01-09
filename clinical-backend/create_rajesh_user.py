import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime
from auth import hash_password

async def create_user():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']

    # Check if user already exists
    existing = await db.users.find_one({'_id': ObjectId('694a68b86d8a62258eae882e')})
    if existing:
        print('User already exists')
        return

    # Create the user
    user_doc = {
        "name": "Dr. Rajesh Kumar",
        "email": "rajesh@example.com",
        "password": hash_password("password123"),  # Default password
        "userType": "doctor",
        "currentRole": "doctor",
        "createdAt": datetime.utcnow()
    }

    result = await db.users.insert_one(user_doc)
    print(f'User created with ID: {result.inserted_id}')

    # Now create doctor profile
    hospital = await db.hospitals.find_one()
    hospital_id = str(hospital['_id']) if hospital else None

    doctor_doc = {
        "user_id": str(result.inserted_id),
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
        "verified": True,
        "is_active": True,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    doctor_result = await db.doctors.insert_one(doctor_doc)
    print(f'Doctor profile created with ID: {doctor_result.inserted_id}')

    client.close()
    print('Done!')

asyncio.run(create_user())