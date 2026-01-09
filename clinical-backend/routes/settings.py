from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from database import get_database
from schemas import SettingsUpdate, SettingsResponse
from routes.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])

@router.post("/", response_model=SettingsResponse)
async def create_settings(settings_data: SettingsUpdate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    # Check if settings already exist
    existing = await db.settings.find_one({"user_id": current_user})
    if existing:
        raise HTTPException(status_code=400, detail="Settings already exist for this user")
    
    settings_doc = settings_data.dict()
    settings_doc["user_id"] = current_user
    settings_doc["updatedAt"] = datetime.utcnow()
    
    result = await db.settings.insert_one(settings_doc)
    settings_doc["_id"] = str(result.inserted_id)
    
    return SettingsResponse(**settings_doc)

@router.get("/", response_model=SettingsResponse)
async def get_settings(current_user: str = Depends(get_current_user)):
    db = get_database()
    
    settings = await db.settings.find_one({"user_id": current_user})
    
    if not settings:
        # Create default settings if none exist
        default_settings = {
            "user_id": current_user,
            "notifications": {
                "emailNotifications": True,
                "pushNotifications": True,
                "appointmentReminders": True,
                "healthTips": False,
                "promosAndOffers": False
            },
            "privacy": {
                "profileVisibility": "private",
                "shareHealthData": False,
                "allowResearch": False
            },
            "preferences": {
                "language": "English",
                "theme": "light",
                "dateFormat": "DD/MM/YYYY",
                "distanceUnit": "km"
            },
            "updatedAt": datetime.utcnow()
        }
        result = await db.settings.insert_one(default_settings)
        default_settings["_id"] = str(result.inserted_id)
        return SettingsResponse(**default_settings)
    
    settings["_id"] = str(settings["_id"])
    return SettingsResponse(**settings)

@router.put("/", response_model=SettingsResponse)
async def update_settings(settings_data: SettingsUpdate, current_user: str = Depends(get_current_user)):
    db = get_database()
    
    update_dict = {k: v for k, v in settings_data.dict().items() if v is not None}
    update_dict["updatedAt"] = datetime.utcnow()
    
    result = await db.settings.update_one(
        {"user_id": current_user},
        {"$set": update_dict},
        upsert=True
    )
    
    settings = await db.settings.find_one({"user_id": current_user})
    settings["_id"] = str(settings["_id"])
    return SettingsResponse(**settings)
