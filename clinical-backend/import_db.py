"""
MongoDB Database Import Script
Imports all collections from JSON files back into the wellness_db database
"""
import asyncio
import json
import os
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

def convert_mongo_types(obj):
    """Convert MongoDB extended JSON types back to Python types"""
    if isinstance(obj, dict):
        if "$oid" in obj:
            return ObjectId(obj["$oid"])
        if "$date" in obj:
            return datetime.fromisoformat(obj["$date"])
        return {k: convert_mongo_types(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [convert_mongo_types(item) for item in obj]
    return obj

async def import_database():
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]
    
    import_dir = "db_export/wellness_db"
    
    if not os.path.exists(import_dir):
        print(f"Error: Import directory '{import_dir}' not found!")
        return
    
    # Get all JSON files
    json_files = [f for f in os.listdir(import_dir) if f.endswith('.json')]
    
    print(f"Found {len(json_files)} collections to import:")
    
    for json_file in json_files:
        collection_name = json_file.replace('.json', '')
        filepath = os.path.join(import_dir, json_file)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            documents = json.load(f)
        
        # Convert MongoDB types
        documents = convert_mongo_types(documents)
        
        if documents:
            collection = db[collection_name]
            
            # Optional: Clear existing collection before importing
            # await collection.delete_many({})
            
            # Insert documents
            result = await collection.insert_many(documents)
            print(f"Imported {len(result.inserted_ids)} documents into '{collection_name}'")
        else:
            print(f"No documents to import for '{collection_name}'")
    
    print(f"\nDatabase import complete!")
    client.close()

if __name__ == "__main__":
    print("WARNING: This will import data into your database.")
    print("Make sure MongoDB is running and the database is ready.")
    confirm = input("Continue? (yes/no): ")
    if confirm.lower() == 'yes':
        asyncio.run(import_database())
    else:
        print("Import cancelled.")
