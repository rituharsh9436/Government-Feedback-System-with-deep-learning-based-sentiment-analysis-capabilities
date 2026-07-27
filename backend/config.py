from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    MONGO_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "auth_db" 
    VALID_DEPARTMENT_IDS_COLLECTION: str = "valid_department_ids"
    VALID_AADHAAR_NUMBERS_COLLECTION: str = "valid_aadhaar_numbers"
    SECRET_KEY: str = "super_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
