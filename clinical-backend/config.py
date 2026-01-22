from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    mongodb_url: str = "mongodb+srv://sorimdevs_db_user:USRvJ36YOlw59026@wellnessdev.shmitlo.mongodb.net/?appName=WellnessDev"
    database_name: str = "wellness_db"
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # OTP Mode: "static" uses 123456, "email" sends real email OTP
    otp_mode: str = "static"  # "static" = use 123456, "email" = send real email
    static_otp: str = "123456"  # Static OTP used when otp_mode is "static"
        
    # Email configuration
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    sender_email: str = "sorim.helpdesk@gmail.com"
    sender_password: str = "ehso trad wtdp otzb"
    
    # Twilio WhatsApp configuration
    twilio_account_sid: str = "ACc0b0230c7f63f4f21fd2805dd49b6031"
    twilio_auth_token: str = "79088266838a4772ce86edbfce36b03e"
    whatsapp_from: str = "9345089528"
    
    class Config:
        env_file = ".env"

settings = Settings()

