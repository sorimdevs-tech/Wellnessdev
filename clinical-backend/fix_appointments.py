import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def fix_appointments():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # The correct Dr. Rajesh Kumar (the one you log in as)
    correct_rajesh = await db.users.find_one({'email': 'rajesh@example.com'})
    correct_rajesh_id = str(correct_rajesh['_id'])
    print(f'Correct Dr. Rajesh Kumar ID: {correct_rajesh_id}')
    
    # The wrong Dr. Rajesh Kumar (seeded data)
    wrong_rajesh = await db.users.find_one({'email': '.rajesh.kumar_2422@wellness.com'})
    wrong_rajesh_id = str(wrong_rajesh['_id']) if wrong_rajesh else None
    print(f'Wrong Dr. Rajesh Kumar ID: {wrong_rajesh_id}')
    
    if wrong_rajesh_id:
        # Update all appointments that have the wrong doctor_id to use the correct one
        result = await db.appointments.update_many(
            {'doctor_id': wrong_rajesh_id},
            {'$set': {'doctor_id': correct_rajesh_id}}
        )
        print(f'\nUpdated {result.modified_count} appointments')
    
    # Verify
    print('\n--- VERIFICATION ---')
    appointments = await db.appointments.find().to_list(100)
    for apt in appointments:
        doctor_user = await db.users.find_one({'_id': ObjectId(apt['doctor_id'])})
        patient_user = await db.users.find_one({'_id': ObjectId(apt['patient_id'])})
        print(f'Apt {apt["_id"]}:')
        print(f'  Doctor: {doctor_user.get("name")} ({doctor_user.get("email")})')
        print(f'  Patient: {patient_user.get("name")}')
        print(f'  Status: {apt.get("status")}')
    
    client.close()

asyncio.run(fix_appointments())
