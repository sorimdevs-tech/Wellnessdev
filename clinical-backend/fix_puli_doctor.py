import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def fix():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Reactivate puli (pulimuruganbtechit@gmail.com)
    puli_user = await db.users.find_one({'email': 'pulimuruganbtechit@gmail.com'})
    if puli_user:
        puli_doctor = await db.doctors.find_one({'user_id': str(puli_user['_id'])})
        if puli_doctor:
            await db.doctors.update_one(
                {'_id': puli_doctor['_id']},
                {'$set': {'is_active': True}}
            )
            print(f'Reactivated puli doctor profile')
    
    # Verify active doctors
    print('\n=== ACTIVE DOCTORS (can receive notifications) ===')
    active_doctors = await db.doctors.find({'verified': True, 'is_active': True}).to_list(50)
    for d in active_doctors:
        user = await db.users.find_one({'_id': ObjectId(d['user_id'])}) if d.get('user_id') else None
        print(f'  {d.get("name")} - {user.get("email") if user else "N/A"} (hospital: {d.get("hospital_id")})')
    
    client.close()

asyncio.run(fix())
