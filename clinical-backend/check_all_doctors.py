import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    print('ALL DOCTORS:')
    doctors = await db.doctors.find().to_list(100)
    for d in doctors:
        print(f'  - {d.get("_id")}: name={d.get("name")}, user_id={d.get("user_id")}')
    
    print('\nALL USERS WITH userType=doctor:')
    users = await db.users.find({'userType': 'doctor'}).to_list(100)
    for u in users:
        print(f'  - {u.get("_id")}: name={u.get("name")}, email={u.get("email")}')
    
    client.close()

asyncio.run(check())
