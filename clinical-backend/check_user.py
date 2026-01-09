import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Check the missing Rajesh user
    user1 = await db.users.find_one({'_id': ObjectId('694a68b86d8a62258eae882e')})
    print('User 694a68b86d8a62258eae882e exists:', user1 is not None)
    if user1:
        print('Name:', user1.get('name'))
        print('Email:', user1.get('email'))
    
    # Check rajesh@example.com
    user2 = await db.users.find_one({'email': 'rajesh@example.com'})
    print('User rajesh@example.com exists:', user2 is not None)
    if user2:
        print('Name:', user2.get('name'))
        print('ID:', user2['_id'])
    
    client.close()

asyncio.run(check())
