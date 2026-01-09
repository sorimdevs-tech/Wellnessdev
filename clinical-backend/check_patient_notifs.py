import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Patient user_id
    patient_id = '6957983eefd1d2adfbbdd1de'
    
    notifs = await db.notifications.find({
        'user_id': patient_id,
        'user_type': 'user'
    }).to_list(20)
    
    print(f"Found {len(notifs)} notifications for patient (user_type='user'):")
    for n in notifs:
        print(f"  - {n.get('title')}: {n.get('message', '')[:50]}...")
    
    client.close()

asyncio.run(check())
