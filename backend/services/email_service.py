import logging
import smtplib
from email.message import EmailMessage
import asyncio
from config import settings

logger = logging.getLogger(__name__)

async def send_otp_email(email: str, otp: str):
    """
    Sends an email with the OTP using Brevo SMTP if configured.
    Otherwise, falls back to a mock console logger.
    """
    if settings.BREVO_SMTP_USER and settings.BREVO_SMTP_PASSWORD:
        try:
            # Using asyncio.to_thread to run synchronous smtplib code without blocking the event loop
            await asyncio.to_thread(_send_smtp_email, email, otp)
            logger.info(f"OTP email successfully sent to {email} via Brevo SMTP.")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {email} via Brevo: {e}")
            return False
    else:
        # Mock email sending service
        logger.info("=" * 40)
        logger.info(f"MOCK EMAIL SENT TO: {email}")
        logger.info(f"YOUR VERIFICATION OTP IS: {otp}")
        logger.info("=" * 40)
        
        # Simulate network delay
        await asyncio.sleep(0.5)
        return True

def _send_smtp_email(to_email: str, otp: str):
    msg = EmailMessage()
    msg.set_content(f"Hello,\n\nYour verification code is: {otp}\n\nThis code will expire in 5 minutes.")
    msg['Subject'] = 'Your Verification Code'
    msg['From'] = settings.BREVO_SMTP_USER
    msg['To'] = to_email

    with smtplib.SMTP('smtp-relay.brevo.com', 587) as server:
        server.starttls()
        server.login(settings.BREVO_SMTP_USER, settings.BREVO_SMTP_PASSWORD)
        server.send_message(msg)
