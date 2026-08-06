import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def check():
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DATABASE_NAME]
    user = await db['users'].find_one({'email': 'rituharsh9436@gmail.com'})
    print('User found' if user else 'User not found')
    client.close()

if __name__ == '__main__':
    asyncio.run(check())
