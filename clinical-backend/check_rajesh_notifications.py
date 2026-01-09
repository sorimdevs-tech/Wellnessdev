import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get Dr. Rajesh Kumar (rajesh@example.com)
    rajesh = await db.users.find_one({'email': 'rajesh@example.com'})
    print(f'Dr. Rajesh Kumar:')
    print(f'  user_id: {rajesh["_id"]}')
    print(f'  role: {rajesh.get("role")}')
    print(f'  currentRole: {rajesh.get("currentRole")}')
    
    # Check notifications for Dr. Rajesh
    print(f'\nNotifications for user_id {rajesh["_id"]}:')
    all_notifications = await db.notifications.find({'user_id': str(rajesh['_id'])}).to_list(100)
    print(f'  Total: {len(all_notifications)}')
    for n in all_notifications:
        print(f'    title: {n.get("title")}')
        print(f'    user_type: {n.get("user_type")}')
        print(f'    message: {n.get("message")[:50] if n.get("message") else "N/A"}...')
        print()
    
    # Now check with role filter
    print('With user_type="doctor" filter:')
    doctor_notifications = await db.notifications.find({
        'user_id': str(rajesh['_id']),
        'user_type': 'doctor'
    }).to_list(100)
    print(f'  Count: {len(doctor_notifications)}')
    
    print('With user_type="user" filter:')
    user_notifications = await db.notifications.find({
        'user_id': str(rajesh['_id']),
        'user_type': 'user'
    }).to_list(100)
    print(f'  Count: {len(user_notifications)}')
    
    client.close()

asyncio.run(check())
