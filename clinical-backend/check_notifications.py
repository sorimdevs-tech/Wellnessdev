import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check_notifications():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    print('=== ALL NOTIFICATIONS ===')
    notifications = await db.notifications.find().to_list(100)
    for n in notifications:
        user = await db.users.find_one({'_id': ObjectId(n['user_id'])}) if n.get('user_id') else None
        print(f'\nNotification {n["_id"]}:')
        print(f'  user_id: {n.get("user_id")} ({user.get("name") if user else "NOT FOUND"})')
        print(f'  user_type: {n.get("user_type")}')
        print(f'  title: {n.get("title")}')
        print(f'  appointmentId: {n.get("appointmentId", "NONE")}')
    
    # Check Dr. Rajesh Kumar's notifications
    rajesh = await db.users.find_one({'email': 'rajesh@example.com'})
    print(f'\n\n=== DR. RAJESH KUMAR NOTIFICATIONS ===')
    print(f'User ID: {rajesh["_id"]}')
    print(f'Current Role: {rajesh.get("currentRole")}')
    
    rajesh_notifs = await db.notifications.find({
        'user_id': str(rajesh['_id'])
    }).to_list(100)
    print(f'Total notifications for Rajesh (any role): {len(rajesh_notifs)}')
    for n in rajesh_notifs:
        print(f'  - user_type={n.get("user_type")}, title={n.get("title")}')
    
    # Check as doctor specifically
    rajesh_doctor_notifs = await db.notifications.find({
        'user_id': str(rajesh['_id']),
        'user_type': 'doctor'
    }).to_list(100)
    print(f'Notifications as doctor: {len(rajesh_doctor_notifs)}')
    
    # Check appointments where Rajesh is the doctor
    print(f'\n\n=== APPOINTMENTS FOR DR. RAJESH ===')
    appointments = await db.appointments.find({
        'doctor_id': str(rajesh['_id'])
    }).to_list(100)
    print(f'Appointments where Rajesh is doctor: {len(appointments)}')
    for apt in appointments:
        patient = await db.users.find_one({'_id': ObjectId(apt['patient_id'])})
        print(f'  Apt {apt["_id"]}: patient={patient.get("name") if patient else "?"}, status={apt.get("status")}')
    
    client.close()

asyncio.run(check_notifications())
