import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Check Dr. Sneha Patel user
    sneha = await db.users.find_one({'_id': ObjectId('69523c0ea89c62d3facfaac6')})
    print('Dr. Sneha Patel user record:')
    if sneha:
        print(f'  _id: {sneha["_id"]}')
        print(f'  name: {sneha.get("name")}')
        print(f'  email: {sneha.get("email")}')
        print(f'  password: {sneha.get("password", "NO PASSWORD")}')
        print(f'  currentRole: {sneha.get("currentRole")}')
    else:
        print('  NOT FOUND!')
    
    # Check all real users (not seeded)
    print('\n=== REAL USER ACCOUNTS (with normal emails) ===')
    users = await db.users.find({
        'email': {'$not': {'$regex': '^\\.'}}  # Exclude emails starting with .
    }).to_list(100)
    for u in users:
        doctor_profile = await db.doctors.find_one({'user_id': str(u['_id']), 'verified': True, 'is_active': True})
        print(f'{u.get("name")} ({u.get("email")})')
        print(f'  _id: {u["_id"]}')
        print(f'  currentRole: {u.get("currentRole")}')
        print(f'  Has verified doctor profile: {"Yes" if doctor_profile else "No"}')
        print()
    
    client.close()

asyncio.run(check())
