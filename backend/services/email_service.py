import logging

logger = logging.getLogger(__name__)

async def send_otp_email(email: str, otp: str):
    """
    Mock email sending service.
    In a production environment, this would integrate with an SMTP server or email API (e.g., SendGrid, AWS SES).
    For now, we securely log the OTP to the console so it can be used for testing.
    """
    logger.info("=" * 40)
    logger.info(f"MOCK EMAIL SENT TO: {email}")
    logger.info(f"YOUR VERIFICATION OTP IS: {otp}")
    logger.info("=" * 40)
    
    # Simulate network delay
    import asyncio
    await asyncio.sleep(0.5)
    
    return True
