import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pprint import pprint

# load_dotenv()

# Database Setup
MONGO_URL = "mongodb://localhost:27017"
client = AsyncIOMotorClient(MONGO_URL)
db = client.bone

async def fetch_data():
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write("Connecting to MongoDB...\n")
        try:
            await db.command("ping")
            f.write("Connected successfully.\n")
        except Exception as e:
            f.write(f"Connection failed: {e}\n")
            return

        f.write("\n--- USERS ---\n")
        users = await db.users.find().to_list(length=100)
        for user in users:
            f.write(f"Username: {user.get('username')}, Name: {user.get('full_name')}, ID: {user.get('_id')}\n")

        f.write("\n--- APPOINTMENTS ---\n")
        appointments = await db.appointments.find().to_list(length=100)
        if not appointments:
            f.write("No appointments found.\n")
        for apt in appointments:
            f.write(f"ID: {apt.get('_id')}\n")
            f.write(f"  Patient: {apt.get('patient_id')}\n")
            f.write(f"  Doctor: {apt.get('doctor_name')}\n")
            f.write(f"  Time: {apt.get('appointment_date')} at {apt.get('appointment_time')}\n")
            f.write(f"  Status: {apt.get('status')}\n")
            f.write("-" * 20 + "\n")

if __name__ == "__main__":
    asyncio.run(fetch_data())
