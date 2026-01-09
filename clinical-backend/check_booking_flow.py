import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check_booking_flow():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get Puli murugan (doctor who is booking)
    puli = await db.users.find_one({'email': 'pulimuruganbtechit@gmail.com'})
    print('PULI MURUGAN (booking doctor):')
    print(f'  User ID: {puli["_id"]}')
    print(f'  userType: {puli.get("userType")}')
    print(f'  currentRole: {puli.get("currentRole")}')
    
    # Get Dr. Rajesh Kumar (doctor being booked)
    rajesh = await db.users.find_one({'email': 'rajesh@example.com'})
    print(f'\nDR. RAJESH KUMAR (receiving doctor):')
    print(f'  User ID: {rajesh["_id"]}')
    
    # Check Rajesh's doctor record
    rajesh_doctor = await db.doctors.find_one({'user_id': str(rajesh['_id'])})
    print(f'  Doctor record exists: {rajesh_doctor is not None}')
    if rajesh_doctor:
        print(f'  Doctor record user_id: {rajesh_doctor.get("user_id")}')
    
    # Check all appointments
    print(f'\n--- ALL APPOINTMENTS ---')
    appointments = await db.appointments.find().to_list(100)
    for apt in appointments:
        patient = await db.users.find_one({'_id': ObjectId(apt['patient_id'])}) if apt.get('patient_id') else None
        doctor_user = await db.users.find_one({'_id': ObjectId(apt['doctor_id'])}) if apt.get('doctor_id') else None
        print(f'  Apt {apt["_id"]}:')
        print(f'    patient_id: {apt.get("patient_id")} ({patient.get("name") if patient else "NOT FOUND"})')
        print(f'    doctor_id: {apt.get("doctor_id")} ({doctor_user.get("name") if doctor_user else "NOT FOUND"})')
        print(f'    status: {apt.get("status")}')
    
    client.close()

asyncio.run(check_booking_flow())
