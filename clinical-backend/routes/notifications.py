from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime
from typing import List
from database import get_database
from routes.auth import get_current_user_with_role

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[dict])
async def get_notifications(user_info = Depends(get_current_user_with_role)):
    """Get notifications for the current user"""
    db = get_database()

    print(f"🔔 FETCHING NOTIFICATIONS for user_id: {user_info['user_id']}, role: {user_info['role']}")
    
    # Get notifications for this user
    notifications = await db.notifications.find({
        "user_id": user_info["user_id"],
        "user_type": user_info["role"]
    }).sort("createdAt", -1).to_list(length=50)

    print(f"🔔 FOUND {len(notifications)} notifications")
    
    # Convert ObjectId to string for JSON response
    for notification in notifications:
        notification["_id"] = str(notification["_id"])
        notification["id"] = str(notification["_id"])
        # Log each notification including appointmentId for debugging
        print(f"   📌 Notification: title={notification.get('title')}, appointmentId={notification.get('appointmentId', 'NONE')}")

    return notifications

@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user_info = Depends(get_current_user_with_role)):
    """Mark a notification as read"""
    db = get_database()

    try:
        result = await db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": user_info["user_id"],
                "user_type": user_info["role"]
            },
            {"$set": {"read": True}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"message": "Notification marked as read"}

    except:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user_info = Depends(get_current_user_with_role)):
    """Delete a notification"""
    db = get_database()

    try:
        result = await db.notifications.delete_one({
            "_id": ObjectId(notification_id),
            "user_id": user_info["user_id"],
            "user_type": user_info["role"]
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")

        return {"message": "Notification deleted"}

    except:
        raise HTTPException(status_code=400, detail="Invalid notification ID")

@router.delete("/")
async def clear_all_notifications(user_info = Depends(get_current_user_with_role)):
    """Clear all notifications for the current user"""
    db = get_database()

    result = await db.notifications.delete_many({
        "user_id": user_info["user_id"],
        "user_type": user_info["role"]
    })

    return {"message": f"Cleared {result.deleted_count} notifications"}

async def create_notification(db, user_id: str, user_type: str, title: str, message: str, notification_type: str = "general", appointment_id: str = None):
    """Helper function to create a notification"""
    notification = {
        "user_id": user_id,
        "user_type": user_type,
        "title": title,
        "message": message,
        "type": notification_type,
        "read": False,
        "createdAt": datetime.utcnow()
    }
    
    if appointment_id:
        notification["appointmentId"] = appointment_id

    result = await db.notifications.insert_one(notification)
    return str(result.inserted_id)
