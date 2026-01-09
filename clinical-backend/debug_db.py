import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.wellness_db
    
    # Get patient user
    user = await db.users.find_one({"name": "pulimurugan user"})
    user_id = str(user["_id"])
    role = user.get("currentRole", "user")
    
    print("Patient user_id:", user_id)
    print("Patient currentRole:", role)
    
    # Simulate what notifications endpoint does
    notifications = await db.notifications.find({
        "user_id": user_id,
        "user_type": role
    }).sort("createdAt", -1).to_list(50)
    
    print("Notifications found:", len(notifications))
    for n in notifications:
        print("  -", n["title"])

asyncio.run(check())
