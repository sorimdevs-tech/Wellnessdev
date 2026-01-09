import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def test():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get Dr. Rajesh Kumar (rajesh@example.com)
    rajesh = await db.users.find_one({'email': 'rajesh@example.com'})
    user_id = str(rajesh["_id"])
    current_role = rajesh.get("currentRole", "user")
    
    print(f"Simulating notification fetch for Dr. Rajesh:")
    print(f"  user_id: {user_id}")
    print(f"  role (from currentRole): {current_role}")
    
    # Simulate get_notifications query
    notifications = await db.notifications.find({
        "user_id": user_id,
        "user_type": current_role
    }).sort("createdAt", -1).to_list(length=50)
    
    print(f"\nQuery result: {len(notifications)} notifications")
    for n in notifications:
        print(f"  - {n.get('title')}: {n.get('message')[:50]}...")
    
    # Also check all notifications without role filter
    all_notifs = await db.notifications.find({
        "user_id": user_id
    }).to_list(100)
    print(f"\nTotal notifications (no role filter): {len(all_notifs)}")
    
    # Check puli murugan notifications
    puli = await db.users.find_one({'email': 'pulimuruganbtechit@gmail.com'})
    if puli:
        puli_role = puli.get("currentRole", "user")
        print(f"\nPuli murugan (booker):")
        print(f"  user_id: {puli['_id']}")
        print(f"  currentRole: {puli_role}")
        
        puli_notifs = await db.notifications.find({
            "user_id": str(puli['_id']),
            "user_type": puli_role
        }).to_list(100)
        print(f"  Notifications with role '{puli_role}': {len(puli_notifs)}")
        
        # Show puli's notifications
        for n in puli_notifs:
            print(f"    - {n.get('title')}: {n.get('message')[:40]}...")
    
    client.close()

asyncio.run(test())
