import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def fix():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Find all doctors with seeded user accounts (emails starting with .)
    seeded_doctors = await db.doctors.find({}).to_list(100)
    
    removed_count = 0
    kept_count = 0
    
    for doctor in seeded_doctors:
        user_id = doctor.get('user_id')
        if user_id:
            user = await db.users.find_one({'_id': ObjectId(user_id)})
            if user:
                email = user.get('email', '')
                # Check if this is a seeded user (email starts with . or has no password)
                if email.startswith('.') or not user.get('password'):
                    print(f'Deactivating seeded doctor: {doctor.get("name")} (user: {email})')
                    # Set is_active to False so they don't appear in Browse Hospitals
                    await db.doctors.update_one(
                        {'_id': doctor['_id']},
                        {'$set': {'is_active': False}}
                    )
                    removed_count += 1
                else:
                    print(f'Keeping real doctor: {doctor.get("name")} (user: {email})')
                    kept_count += 1
    
    print(f'\nDeactivated {removed_count} seeded doctors')
    print(f'Kept {kept_count} real doctors')
    
    # Verify
    print('\n=== REMAINING ACTIVE DOCTORS ===')
    active_doctors = await db.doctors.find({'verified': True, 'is_active': True}).to_list(50)
    for d in active_doctors:
        user = await db.users.find_one({'_id': ObjectId(d['user_id'])}) if d.get('user_id') else None
        print(f'  {d.get("name")} - {user.get("email") if user else "N/A"}')
    
    client.close()

asyncio.run(fix())
