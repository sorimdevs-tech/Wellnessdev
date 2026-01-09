import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def fix_appointments():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']

    # Old Rajesh ID (doesn't exist)
    old_rajesh_id = '694a68b86d8a62258eae882e'

    # New Rajesh ID
    new_rajesh = await db.users.find_one({'name': 'Dr. Rajesh Kumar'})
    if not new_rajesh:
        print('New Rajesh user not found')
        return

    new_rajesh_id = str(new_rajesh['_id'])
    print(f'Updating appointments from {old_rajesh_id} to {new_rajesh_id}')

    # Update appointments where doctor_id is the old ID
    result = await db.appointments.update_many(
        {'doctor_id': old_rajesh_id},
        {'$set': {'doctor_id': new_rajesh_id}}
    )

    print(f'Updated {result.modified_count} appointments')

    client.close()

asyncio.run(fix_appointments())