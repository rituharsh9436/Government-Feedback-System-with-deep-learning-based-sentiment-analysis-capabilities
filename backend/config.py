from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List
import json

class Settings(BaseSettings):
    MONGO_URL: str
    DATABASE_NAME: str = "smart_gov_feedback" 
    VALID_DEPARTMENT_IDS_COLLECTION: str = "valid_department_ids"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: List[str] = ["http://localhost", "http://localhost:3000"]
    ENVIRONMENT: str = "production"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        if isinstance(v, list):
            return v
        import json
        try:
            return json.loads(v)
        except Exception:
            raise ValueError("Invalid CORS_ORIGINS format")
    ML_SERVICE_URL: str = "http://localhost:8001"
    ML_SERVICE_API_KEY: str | None = None
    
    BREVO_API_KEY: str | None = None
    MAIL_FROM_EMAIL: str | None = None
    MAIL_FROM_NAME: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
