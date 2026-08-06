import logging
import httpx
import asyncio
from config import settings

logger = logging.getLogger(__name__)

async def send_otp_email(email: str, otp: str):
    """
    Sends an email with the OTP using Brevo HTTP API if configured.
    Otherwise, falls back to a mock console logger.
    """
    if settings.BREVO_API_KEY and settings.MAIL_FROM_EMAIL:
        url = "https://api.brevo.com/v3/smtp/email"
        headers = {
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json"
        }
        payload = {
            "sender": {
                "name": settings.MAIL_FROM_NAME or "Smart Gov Feedback",
                "email": settings.MAIL_FROM_EMAIL
            },
            "to": [
                {
                    "email": email
                }
            ],
            "subject": "Your Verification Code",
            "htmlContent": f"<p>Hello,</p><p>Your verification code is: <strong>{otp}</strong></p><p>This code will expire in 5 minutes.</p>"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                
            if response.status_code in [200, 201, 202]:
                logger.info(f"OTP email successfully sent to {email} via Brevo API.")
                return True
            else:
                logger.error(f"Failed to send email to {email} via Brevo. Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Exception while sending email to {email} via Brevo: {e}")
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
