import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os

# Database Setup
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.bone

# Password Hashing
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

async def reset_admin():
    print("Connecting to MongoDB...")
    try:
        await db.command("ping")
        print("Connected successfully.")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    print("Resetting admin user...")
    username = "admin"
    password = "admin"
    print(f"Hashing password: '{password}'")
    try:
        hashed_password = get_password_hash(password)
        print("Password hashed successfully.")
    except Exception as e:
        print(f"Hashing failed: {e}")
        return
    
    user_data = {
        "username": username,
        "full_name": "System Admin",
        "hashed_password": hashed_password
    }
    
    # Update if exists, insert if not
    result = await db.users.update_one(
        {"username": username},
        {"$set": user_data},
        upsert=True
    )
    
    if result.upserted_id:
        print(f"Admin user created. ID: {result.upserted_id}")
    else:
        print("Admin user updated.")
        
    # Verify
    user = await db.users.find_one({"username": username})
    print(f"Verification: Found user '{user['username']}'")

if __name__ == "__main__":
    asyncio.run(reset_admin())
