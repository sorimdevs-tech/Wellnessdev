import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def fix_duplicates():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Find all "Dr. Rajesh Kumar" doctors in hospital 694a4888f473e7f5db5a2422
    rajesh_doctors = await db.doctors.find({
        'name': 'Dr. Rajesh Kumar',
        'hospital_id': '694a4888f473e7f5db5a2422'
    }).to_list(100)
    
    print(f'Found {len(rajesh_doctors)} Dr. Rajesh Kumar entries for City Care Hospital:')
    for d in rajesh_doctors:
        user = await db.users.find_one({'_id': ObjectId(d['user_id'])}) if d.get('user_id') else None
        print(f'  _id: {d["_id"]}')
        print(f'  user_id: {d.get("user_id")}')
        print(f'  User email: {user.get("email") if user else "N/A"}')
        print(f'  verified: {d.get("verified")}')
        print(f'  is_active: {d.get("is_active")}')
        print()
    
    # The seeded one has user_id: 69523c0ea89c62d3facfaac0
    # The real one has user_id: 694a68b86d8a62258eae882e (rajesh@example.com)
    
    # Remove the seeded duplicate to avoid confusion
    seeded_doctor = await db.doctors.find_one({
        'name': 'Dr. Rajesh Kumar',
        'hospital_id': '694a4888f473e7f5db5a2422',
        'user_id': '69523c0ea89c62d3facfaac0'
    })
    
    if seeded_doctor:
        print('Removing seeded duplicate Dr. Rajesh Kumar...')
        await db.doctors.delete_one({'_id': seeded_doctor['_id']})
        print('Done!')
    else:
        print('Seeded duplicate not found.')
    
    # Verify
    remaining = await db.doctors.find({
        'name': 'Dr. Rajesh Kumar',
        'hospital_id': '694a4888f473e7f5db5a2422'
    }).to_list(100)
    print(f'\nRemaining Dr. Rajesh Kumar entries: {len(remaining)}')
    for d in remaining:
        print(f'  user_id: {d.get("user_id")}')
    
    client.close()

asyncio.run(fix_duplicates())
