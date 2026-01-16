"""
MongoDB Database Export Script
Exports all collections from the wellness_db database to JSON files
"""
import asyncio
import json
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import os

# Custom JSON encoder for MongoDB types
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return {"$oid": str(obj)}
        if isinstance(obj, datetime):
            return {"$date": obj.isoformat()}
        return super().default(obj)

async def export_database():
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    
    # Create export directory
    export_dir = "db_export/wellness_db"
    os.makedirs(export_dir, exist_ok=True)
    
    # Get all collection names
    collection_names = await db.list_collection_names()
    
    print(f"Found {len(collection_names)} collections to export:")
    print(collection_names)
    
    for collection_name in collection_names:
        collection = db[collection_name]
        documents = await collection.find({}).to_list(length=None)
        
        # Save to JSON file
        filepath = os.path.join(export_dir, f"{collection_name}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(documents, f, cls=MongoJSONEncoder, indent=2, ensure_ascii=False)
        
        print(f"Exported {len(documents)} documents from '{collection_name}' to {filepath}")
    
    print(f"\nDatabase export complete! Files saved to: {export_dir}")
    client.close()

if __name__ == "__main__":
    asyncio.run(export_database())
