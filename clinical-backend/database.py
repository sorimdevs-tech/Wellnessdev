from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from typing import Optional
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

client: Optional[AsyncIOMotorClient] = None
database = None

async def connect_to_mongo():
    global client, database
    try:
        client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
        database = client[settings.database_name]
        # Test the connection
        await client.admin.command('ping')
        print("Connected to MongoDB")
        logger.info("Connected to MongoDB")
    except Exception as e:
        print(f"Warning: Could not connect to MongoDB: {e}")
        print("Server will start but database operations will fail until MongoDB is available.")
        logger.warning(f"MongoDB connection failed: {e}")
        # Still set client and database to None so we can check later
        client = None
        database = None

async def close_mongo_connection():
    global client
    if client:
        try:
            client.close()
            print("Disconnected from MongoDB")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")

def get_database():
    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not connected. Please ensure MongoDB is running and accessible."
        )
    return database
