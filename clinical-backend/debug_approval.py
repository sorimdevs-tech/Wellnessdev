import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def debug_approval():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get Dr. Rajesh Kumar (the one logged in with rajesh@example.com)
    rajesh_user = await db.users.find_one({'email': 'rajesh@example.com'})
    rajesh_user_id = str(rajesh_user['_id'])
    print(f'Dr. Rajesh Kumar user_id: {rajesh_user_id}')
    
    # Get doctor_ids for this user
    doctors = await db.doctors.find({"user_id": rajesh_user_id}).to_list(length=100)
    doctor_ids = [str(doctor.get("user_id", doctor["_id"])) for doctor in doctors]
    print(f'Doctor IDs for this user: {doctor_ids}')
    
    # Check what appointments exist and if they match
    appointments = await db.appointments.find().to_list(100)
    print(f'\nAll appointments:')
    for apt in appointments:
        apt_doctor_id = apt.get('doctor_id')
        matches = apt_doctor_id in doctor_ids
        print(f'  Apt {apt["_id"]}:')
        print(f'    doctor_id: {apt_doctor_id}')
        print(f'    matches Rajesh doctor_ids? {matches}')
        print(f'    status: {apt.get("status")}')
    
    # The real issue - appointments are stored with different doctor_id
    print('\n--- INVESTIGATION ---')
    print(f'Rajesh user_id: {rajesh_user_id}')
    
    # Find what user_id the appointments are using as doctor_id
    for apt in appointments:
        apt_doctor_id = apt.get('doctor_id')
        # Find what user this doctor_id belongs to
        user = await db.users.find_one({'_id': ObjectId(apt_doctor_id)})
        if user:
            print(f'\nAppointment {apt["_id"]}:')
            print(f'  doctor_id points to user: {user.get("name")} ({user.get("email")})')
        else:
            print(f'\nAppointment {apt["_id"]}:')
            print(f'  doctor_id {apt_doctor_id} - USER NOT FOUND')
    
    client.close()

asyncio.run(debug_approval())
