import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Check doctors with verified=True and is_active=True
    doctors = await db.doctors.find({'verified': True, 'is_active': True}).to_list(100)
    print('VERIFIED & ACTIVE DOCTORS:')
    for d in doctors:
        user = await db.users.find_one({'_id': ObjectId(d['user_id'])}) if d.get('user_id') else None
        print(f'  {d.get("name")}:')
        print(f'    user_id: {d.get("user_id")}')
        print(f'    hospital_id: {d.get("hospital_id")}')
        if user:
            print(f'    User email: {user.get("email")}')
    
    # Check hospital
    hospital = await db.hospitals.find_one()
    print(f'\nHOSPITAL: {hospital.get("name")} (ID: {hospital.get("_id")})')
    
    client.close()

asyncio.run(check())
