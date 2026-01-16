from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    mongodb_url: str = "mongodb+srv://sorimdevs_db_user:USRvJ36YOlw59026@wellnessdev.shmitlo.mongodb.net/?appName=WellnessDev"
    database_name: str = "wellness_db"
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Email configuration
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    sender_email: str = ""
    sender_password: str = ""
    
    # Twilio WhatsApp configuration
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    whatsapp_from: str = ""
    
    class Config:
        env_file = ".env"

settings = Settings()
