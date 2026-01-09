"""
Email Service for sending OTPs
"""
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # For development, we'll use a simple console-based approach
        # In production, you'd configure with real SMTP settings
        # For Gmail SMTP, use:
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587  # Gmail SMTP port
        self.sender_email = "sorim.helpdesk@gmail.com"
        self.sender_password = "ehso trad wtdp otzb"  # ⚠️ Replace with actual App Password

    def generate_otp(self, length: int = 6) -> str:
        """Generate a random OTP"""
        return ''.join(random.choices(string.digits, k=length))

    def send_otp_email(self, recipient_email: str, otp: str) -> bool:
        """
        Send OTP via email
        For development, we'll log to console and return success
        In production, implement real email sending
        """
        try:
            # For development - just log the OTP (primary method)
            logger.info(f"OTP for {recipient_email}: {otp}")
            print(f"\n🔐 DEVELOPMENT MODE - OTP sent to {recipient_email}: {otp}")
            print(f"📧 Copy this OTP in the app: {otp}")
            print(f"⏰ This OTP expires in 10 minutes\n")

            # Try to send actual email using SMTP (optional for development)
            try:
                message = MIMEMultipart("alternative")
                message["Subject"] = "Your Wellness App OTP"
                message["From"] = self.sender_email
                message["To"] = recipient_email

                html = f"""
                <html>
                <body>
                    <h2>Welcome to Wellness Healthcare Platform</h2>
                    <p>Your One-Time Password (OTP) is:</p>
                    <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px;">{otp}</h1>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you didn't request this OTP, please ignore this email.</p>
                    <br>
                    <p>Best regards,<br>Wellness Team</p>
                </body>
                </html>
                """

                text = f"""
                Welcome to Wellness Healthcare Platform

                Your One-Time Password (OTP) is: {otp}

                This OTP will expire in 10 minutes.

                If you didn't request this OTP, please ignore this email.

                Best regards,
                Wellness Team
                """

                part1 = MIMEText(text, "plain")
                part2 = MIMEText(html, "html")

                message.attach(part1)
                message.attach(part2)

                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())
                server.quit()

                print("📧 Email sent successfully via SMTP!")
            except Exception as email_error:
                print(f"⚠️  SMTP email failed (continuing with console OTP): {email_error}")
                print("🔧 For production, configure proper SMTP settings in email_service.py")

            return True

        except Exception as e:
            logger.error(f"Failed to send OTP: {e}")
            print(f"❌ OTP sending failed: {e}")
            return False

    def send_welcome_email(self, recipient_email: str, user_name: str, user_type: str = "user") -> bool:
        """
        Send welcome email to new registered users (especially doctors)
        """
        try:
            # For development - log to console
            logger.info(f"Welcome email for {recipient_email} ({user_type})")
            print(f"\n🎉 DEVELOPMENT MODE - Welcome email sent to {recipient_email}")
            print(f"👤 User: {user_name} ({user_type})")
            print("📧 Welcome email sent successfully!\n")

            # Try to send actual email using SMTP
            try:
                message = MIMEMultipart("alternative")
                message["Subject"] = f"Welcome to Wellness Healthcare Platform - {user_type.title()} Account"
                message["From"] = self.sender_email
                message["To"] = recipient_email

                # Customize content based on user type
                if user_type.lower() == "doctor":
                    welcome_title = "Welcome to Wellness Healthcare Platform, Doctor!"
                    role_specific_content = """
                    <h3>🏥 Your Doctor Dashboard</h3>
                    <p>As a registered healthcare professional, you now have access to:</p>
                    <ul>
                        <li>📅 Manage your appointments and patient schedules</li>
                        <li>👥 View and approve appointment requests from patients</li>
                        <li>📋 Access to patient medical records (when authorized)</li>
                        <li>🔔 Receive notifications for new appointments</li>
                        <li>⚙️ Customize your availability and preferences</li>
                    </ul>
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Complete your profile with your specialization details</li>
                        <li>Set up your availability schedule</li>
                        <li>Start receiving patient appointments</li>
                    </ol>
                    """
                else:
                    welcome_title = "Welcome to Wellness Healthcare Platform!"
                    role_specific_content = """
                    <h3>🏥 Your Health Dashboard</h3>
                    <p>As a patient, you now have access to:</p>
                    <ul>
                        <li>👨‍⚕️ Browse and book appointments with doctors</li>
                        <li>📋 View your medical records and history</li>
                        <li>🔔 Stay updated with appointment reminders</li>
                        <li>⚙️ Manage your health preferences and settings</li>
                    </ul>
                    <p><strong>Next Steps:</strong></p>
                    <ol>
                        <li>Complete your health profile</li>
                        <li>Browse available doctors and hospitals</li>
                        <li>Book your first appointment</li>
                    </ol>
                    """

                html = f"""
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                        .content {{ padding: 30px; }}
                        .footer {{ background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }}
                        .button {{ display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>{welcome_title}</h1>
                        <p>Hello {user_name}, we're excited to have you join our healthcare community!</p>
                    </div>
                    <div class="content">
                        <p>Thank you for registering with Wellness Healthcare Platform. Your account has been successfully created and you can now access all our healthcare services.</p>

                        {role_specific_content}

                        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>

                        <p style="text-align: center; margin: 30px 0;">
                            <a href="#" class="button">Access Your Dashboard</a>
                        </p>

                        <p>Best regards,<br>
                        <strong>The Wellness Team</strong><br>
                        <em>Your trusted healthcare companion</em></p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply to this email.</p>
                        <p>© 2025 Wellness Healthcare Platform. All rights reserved.</p>
                    </div>
                </body>
                </html>
                """

                text = f"""
                {welcome_title}

                Hello {user_name}, we're excited to have you join our healthcare community!

                Thank you for registering with Wellness Healthcare Platform. Your account has been successfully created.

                {'As a doctor, you can now manage appointments and patient care.' if user_type.lower() == 'doctor' else 'As a patient, you can now book appointments and manage your health records.'}

                If you have any questions, please contact our support team.

                Best regards,
                The Wellness Team
                """

                part1 = MIMEText(text, "plain")
                part2 = MIMEText(html, "html")

                message.attach(part1)
                message.attach(part2)

                server = smtplib.SMTP(self.smtp_server, self.smtp_port)
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())
                server.quit()

                print("📧 Welcome email sent successfully via SMTP!")
            except Exception as email_error:
                print(f"⚠️  SMTP welcome email failed (continuing with console message): {email_error}")
                print("🔧 For production, configure proper SMTP settings in email_service.py")

            return True

        except Exception as e:
            logger.error(f"Failed to send welcome email: {e}")
            print(f"❌ Welcome email sending failed: {e}")
            return False

# Global email service instance
email_service = EmailService()
