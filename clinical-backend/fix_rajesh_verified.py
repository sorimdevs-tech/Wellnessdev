import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def fix():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Update the doctor record for Rajesh to add verified and is_active
    result = await db.doctors.update_one(
        {'user_id': '694a68b86d8a62258eae882e'},
        {'$set': {'verified': True, 'is_active': True}}
    )
    print(f'Updated {result.modified_count} doctor record(s)')
    
    # Verify
    doctor = await db.doctors.find_one({'user_id': '694a68b86d8a62258eae882e'})
    print(f'\nVerification:')
    print(f'  name: {doctor.get("name")}')
    print(f'  verified: {doctor.get("verified")}')
    print(f'  is_active: {doctor.get("is_active")}')
    print(f'  hospital_id: {doctor.get("hospital_id")}')
    
    # Check hospital name
    if doctor.get("hospital_id"):
        from bson import ObjectId
        hospital = await db.hospitals.find_one({'_id': ObjectId(doctor.get("hospital_id"))})
        print(f'  hospital_name: {hospital.get("name") if hospital else "NOT FOUND"}')
    
    client.close()
    print('\nDone! Dr. Rajesh Kumar is now verified and active.')

asyncio.run(fix())
