import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Check the newly created doctor record for Rajesh
    doctor = await db.doctors.find_one({'user_id': '694a68b86d8a62258eae882e'})
    print('Dr. Rajesh Kumar doctor record:')
    print(f'  verified: {doctor.get("verified")}')
    print(f'  is_active: {doctor.get("is_active")}')
    print(f'  hospital_id: {doctor.get("hospital_id")}')
    
    # Check a working doctor
    working = await db.doctors.find_one({'verified': True, 'is_active': True})
    if working:
        print(f'\nWorking doctor example:')
        print(f'  name: {working.get("name")}')
        print(f'  verified: {working.get("verified")}')
        print(f'  is_active: {working.get("is_active")}')
        print(f'  hospital_id: {working.get("hospital_id")}')
    
    client.close()

asyncio.run(check())
