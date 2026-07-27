from database import db_connection
from models.audit_model import AuditLog

async def log_audit_action(action: str, user_email: str, target_id: str = None, details: str = None):
    audit_log = AuditLog(
        action=action,
        user_email=user_email,
        target_id=target_id,
        details=details
    )
    await db_connection.db["audit_logs"].insert_one(audit_log.model_dump())
