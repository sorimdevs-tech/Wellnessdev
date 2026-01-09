import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timedelta

async def debug():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get recent appointments
    recent_appointments = await db.appointments.find({}).sort('createdAt', -1).limit(5).to_list(5)
    
    print("=== RECENT APPOINTMENTS ===")
    for apt in recent_appointments:
        patient = await db.users.find_one({'_id': ObjectId(apt['patient_id'])})
        print(f"\nAppointment: {apt['_id']}")
        print(f"  Status: {apt.get('status')}")
        print(f"  Patient: {patient.get('name') if patient else 'N/A'} ({patient.get('email') if patient else 'N/A'})")
        print(f"  Patient ID: {apt.get('patient_id')}")
        print(f"  Patient currentRole: {patient.get('currentRole') if patient else 'N/A'}")
        print(f"  Doctor ID: {apt.get('doctor_id')}")
        
        # Check notifications for this appointment
        apt_notifications = await db.notifications.find({
            'appointmentId': str(apt['_id'])
        }).to_list(10)
        print(f"  Notifications for this appointment: {len(apt_notifications)}")
        for n in apt_notifications:
            print(f"    - To user_id: {n.get('user_id')}, user_type: {n.get('user_type')}, title: {n.get('title')}")
    
    # Get all users and their notifications
    print("\n\n=== ALL USERS AND THEIR NOTIFICATIONS ===")
    users = await db.users.find({
        'email': {'$not': {'$regex': '^\\.'}}  # Exclude seeded users
    }).to_list(50)
    
    for user in users:
        user_id = str(user['_id'])
        current_role = user.get('currentRole', 'user')
        
        # Notifications matching user_id and currentRole
        matching_notifications = await db.notifications.find({
            'user_id': user_id,
            'user_type': current_role
        }).to_list(100)
        
        # All notifications for this user_id (any user_type)
        all_notifications = await db.notifications.find({
            'user_id': user_id
        }).to_list(100)
        
        if len(all_notifications) > 0 or current_role == 'user':
            print(f"\n{user.get('name')} ({user.get('email')})")
            print(f"  user_id: {user_id}")
            print(f"  currentRole: {current_role}")
            print(f"  Notifications with matching role '{current_role}': {len(matching_notifications)}")
            print(f"  Total notifications (all roles): {len(all_notifications)}")
            
            # Show breakdown by user_type
            by_type = {}
            for n in all_notifications:
                t = n.get('user_type', 'unknown')
                by_type[t] = by_type.get(t, 0) + 1
            print(f"  Breakdown by user_type: {by_type}")
            
            # Show recent notifications
            if len(all_notifications) > 0:
                print(f"  Recent notifications:")
                for n in sorted(all_notifications, key=lambda x: x.get('createdAt', datetime.min), reverse=True)[:3]:
                    print(f"    - [{n.get('user_type')}] {n.get('title')}: {n.get('message', '')[:50]}...")
    
    client.close()

asyncio.run(debug())
