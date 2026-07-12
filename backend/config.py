import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # This pulls from your .env file
    MONGO_URL = os.getenv("MONGO_URL")
    DATABASE_NAME = "auth_db" 
    VALID_DEPARTMENT_IDS_COLLECTION = os.getenv("VALID_DEPARTMENT_IDS_COLLECTION", "valid_department_ids")
    VALID_AADHAAR_NUMBERS_COLLECTION = os.getenv("VALID_AADHAAR_NUMBERS_COLLECTION", "valid_aadhaar_numbers")
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30

settings = Settings()
