import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['wellness_db']
    
    # Get the approved appointment
    apt = await db.appointments.find_one({'_id': ObjectId('69579a43efd1d2adfbbdd1f1')})
    print(f"Appointment doctor_id: {apt['doctor_id']} (type: {type(apt['doctor_id'])})")
    
    # Try to find doctor the way the code does
    doctor_id = apt['doctor_id']
    print(f"\nTrying to find doctor with user_id as ObjectId...")
    try:
        doctor = await db.doctors.find_one({"user_id": ObjectId(doctor_id)})
        print(f"  Result: {doctor}")
    except Exception as e:
        print(f"  Error: {e}")
    
    print(f"\nTrying to find doctor with user_id as string...")
    doctor = await db.doctors.find_one({"user_id": doctor_id})
    print(f"  Result: {doctor.get('name') if doctor else None}")
    
    # Check what doctors exist
    print(f"\n=== ALL DOCTORS ===")
    doctors = await db.doctors.find({}).to_list(50)
    for d in doctors:
        print(f"  {d.get('name')}: user_id={d.get('user_id')} (type: {type(d.get('user_id'))})")
    
    client.close()

asyncio.run(check())
