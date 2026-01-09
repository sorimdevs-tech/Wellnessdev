import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check_doctor():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Find Dr. Rajesh Kumar in users
    user = await db.users.find_one({'name': {'$regex': 'Rajesh', '$options': 'i'}})
    if user:
        print('USER FOUND:')
        print(f'  ID: {user["_id"]}')
        print(f'  Name: {user.get("name")}')
        print(f'  Email: {user.get("email")}')
        print(f'  userType: {user.get("userType")}')
        print(f'  currentRole: {user.get("currentRole")}')
        
        user_id = str(user['_id'])
        
        # Check doctor record
        doctor = await db.doctors.find_one({'user_id': user_id})
        if doctor:
            print(f'\nDOCTOR RECORD:')
            print(f'  Doctor _id: {doctor["_id"]}')
            print(f'  user_id: {doctor.get("user_id")}')
            print(f'  name: {doctor.get("name")}')
        else:
            print(f'\nNO DOCTOR RECORD for user_id: {user_id}')
        
        # Check appointments where this user is doctor
        appointments_as_doctor = await db.appointments.find({'doctor_id': user_id}).to_list(100)
        print(f'\nAPPOINTMENTS AS DOCTOR: {len(appointments_as_doctor)}')
        for apt in appointments_as_doctor:
            print(f'  - {apt["_id"]}: patient={apt.get("patient_id")}, status={apt.get("status")}')
        
        # Check appointments where this user is patient
        appointments_as_patient = await db.appointments.find({'patient_id': user_id}).to_list(100)
        print(f'\nAPPOINTMENTS AS PATIENT: {len(appointments_as_patient)}')
        for apt in appointments_as_patient:
            print(f'  - {apt["_id"]}: doctor={apt.get("doctor_id")}, status={apt.get("status")}')
        
        # Check notifications
        notifications = await db.notifications.find({'user_id': user_id}).to_list(100)
        print(f'\nNOTIFICATIONS: {len(notifications)}')
        for notif in notifications[:5]:
            msg = notif.get("message", "")[:50] if notif.get("message") else "No message"
            print(f'  - {notif.get("title")}: {msg}...')
    else:
        print('Dr. Rajesh Kumar NOT FOUND in users')
    
    # Also check all appointments
    all_appointments = await db.appointments.find().to_list(100)
    print(f'\n\nALL APPOINTMENTS IN DB: {len(all_appointments)}')
    for apt in all_appointments:
        print(f'  - {apt["_id"]}: doctor_id={apt.get("doctor_id")}, patient_id={apt.get("patient_id")}, status={apt.get("status")}')
    
    client.close()

asyncio.run(check_doctor())
