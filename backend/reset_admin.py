import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# Database Setup
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.bone

async def delete_admin():
    print("Connecting to MongoDB...")
    try:
        await db.command("ping")
        print("Connected successfully.")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    print("Deleting 'admin' user...")
    result = await db.users.delete_one({"username": "admin"})
    
    if result.deleted_count > 0:
        print("Successfully deleted 'admin' user.")
    else:
        print("'admin' user not found (or already deleted).")

if __name__ == "__main__":
    asyncio.run(delete_admin())
