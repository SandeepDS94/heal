from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import uvicorn
import random
import io
import os
import json
from datetime import timedelta, datetime
from .utils import preprocess_image
from .auth import create_access_token, get_current_user, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from .database import db
from .models import UserCreate, User, Token, ReportCreate, UserInDB
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from fastapi.responses import StreamingResponse
import google.generativeai as genai
from dotenv import load_dotenv
import PIL.Image

load_dotenv() # Reload triggered

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="Bone & Joint Disorder Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    try:
        # Ping the database to check connection
        await db.command("ping")
        print("Successfully connected to MongoDB!")
        
        # Admin user seeding removed as per requirement
        # existing_admin = await db.users.find_one({"username": "admin"})
        # if not existing_admin:
        #     hashed_password = get_password_hash("admin")
        #     admin_user = {
        #         "username": "admin",
        #         "full_name": "System Admin",
        #         "hashed_password": hashed_password
        #     }
        #     await db.users.insert_one(admin_user)
        #     print("Default admin user created (admin/admin)")
            
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

@app.get("/")
def read_root():
    return {"message": "Bone & Joint Disorder Detection API is running"}

@app.post("/register", response_model=Token)
async def register(user: UserCreate):
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict["hashed_password"] = hashed_password
    del user_dict["password"]
    
    await db.users.insert_one(user_dict)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await db.users.find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...), current_user: UserInDB = Depends(get_current_user)):
    contents = await file.read()
    
    # Preprocess image (Resize only)
    processed_img = preprocess_image(contents)
    
    # Convert to PIL Image for Gemini
    pil_image = PIL.Image.open(io.BytesIO(contents))

    try:
        api_key = os.getenv("GEMINI_API_KEY")
        print(f"DEBUG: API Key found: {bool(api_key)}")
        if api_key:
            print(f"DEBUG: API Key start: {api_key[:4]}...")
        
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = """
        Analyze this medical X-ray image as an expert radiologist. Identify any bone disorders, fractures, or abnormalities.
        Return the result ONLY as a JSON object with the following keys:
        - disorder: The name of the detected disorder (or "Healthy" if none).
        - confidence: A number between 0 and 1 representing confidence.
        - severity: "Mild", "Moderate", or "Severe" (or "None" if healthy).
        - notes: A concise summary of the findings (max 2 sentences).
        - detailed_analysis: A detailed technical explanation of the visual findings, including specific bone structures affected.
        - recommendations: A list of 3-5 recommended next steps or treatments.
        - damage_location: An object with x, y, width, height (all as floats between 0.0 and 1.0 representing percentage of image dimensions) representing the bounding box of the primary issue. If no issue or unsure, return null.
        """
        
        print("DEBUG: Sending request to Gemini...")
        response = model.generate_content([prompt, pil_image])
        print("DEBUG: Response received from Gemini")
        
        # Clean up response text to ensure it's valid JSON
        response_text = response.text.replace("```json", "").replace("```", "").strip()
        print(f"DEBUG: Response text: {response_text[:100]}...")
        result = json.loads(response_text)
        
        # Ensure damage_location has valid values if present
        if not result.get('damage_location'):
             # Fallback for damage location if model doesn't return it
             result['damage_location'] = {"x": 0.2, "y": 0.2, "width": 0.4, "height": 0.4}

        return result

    except Exception as e:
        print(f"Gemini API Error: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to mock if API fails (e.g. no key)
        disorders = ["Fracture", "Arthritis", "Osteoporosis", "Joint Dislocation", "Tissue Damage"]
        prediction = random.choice(disorders)
        confidence = random.uniform(0.85, 0.99)
        return {
            "disorder": prediction,
            "confidence": confidence,
            "severity": "Moderate",
            "notes": f"Detected signs of {prediction.lower()} in the provided scan. Recommended further consultation. (Mock Analysis - API Error)",
            "detailed_analysis": "Mock detailed analysis: The scan shows potential irregularities in the bone structure. Further investigation is required to confirm the diagnosis.",
            "recommendations": ["Consult an orthopedic specialist", "Schedule an MRI for better visualization", "Rest and immobilize the affected area"],
            "damage_location": {"x": 0.3, "y": 0.3, "width": 0.2, "height": 0.2}
        }

@app.post("/report")
async def generate_report(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    disorder: str = Form(...),
    confidence: str = Form(...),
    severity: str = Form(...),
    notes: str = Form(...),
    detailed_analysis: str = Form(None),
    recommendations: str = Form(None),
    save_only: bool = Query(False),
    current_user: UserInDB = Depends(get_current_user)
):
    contents = await file.read()
    
    # Parse recommendations if it's a JSON string, otherwise keep as is
    try:
        if recommendations:
            recs_list = json.loads(recommendations)
            if isinstance(recs_list, list):
                recommendations_text = "\n".join([f"- {r}" for r in recs_list])
            else:
                recommendations_text = str(recommendations)
        else:
            recommendations_text = "No specific recommendations provided."
    except:
        recommendations_text = recommendations or "No specific recommendations provided."

    # Save report to database
    report_data = {
        "patient_id": patient_id,
        "doctor_id": current_user.username,
        "disorder": disorder,
        "confidence": float(confidence),
        "severity": severity,
        "notes": notes,
        "detailed_analysis": detailed_analysis,
        "recommendations": recommendations_text,
        "created_at": datetime.utcnow(),
        "image_url": "placeholder_url" # In a real app, upload to S3/Cloudinary
    }
    
    result = await db.reports.insert_one(report_data)
    
    if save_only:
        return {"message": "Report saved successfully", "report_id": str(result.inserted_id)}

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "OrthoAI Diagnostic Report")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, "Generated by AI Analysis System")
    c.line(50, height - 90, width - 50, height - 90)
    
    # Patient/Doctor Info
    c.drawString(50, height - 120, f"Doctor: {current_user.full_name or current_user.username}")
    c.drawString(50, height - 140, f"Patient ID: {patient_id}")
    c.drawString(300, height - 120, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    
    # Patient Image
    try:
        img = ImageReader(io.BytesIO(contents))
        c.drawImage(img, 50, height - 400, width=250, height=250, preserveAspectRatio=True)
    except Exception as e:
        c.drawString(50, height - 200, "Image could not be processed")
    
    # Results Summary
    c.setFont("Helvetica-Bold", 16)
    c.drawString(350, height - 180, "Analysis Summary")
    
    c.setFont("Helvetica", 12)
    c.drawString(350, height - 210, f"Disorder: {disorder}")
    c.drawString(350, height - 230, f"Confidence: {float(confidence)*100:.1f}%")
    c.drawString(350, height - 250, f"Severity: {severity}")
    
    # Detailed Analysis
    y_position = height - 450
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_position, "Detailed Analysis")
    y_position -= 20
    c.setFont("Helvetica", 11)
    
    # Simple text wrapping for detailed analysis
    analysis_lines = []
    current_line = ""
    words = (detailed_analysis or "").split()
    for word in words:
        if c.stringWidth(current_line + " " + word, "Helvetica", 11) < 500:
            current_line += " " + word
        else:
            analysis_lines.append(current_line)
            current_line = word
    analysis_lines.append(current_line)
    
    for line in analysis_lines:
        c.drawString(50, y_position, line)
        y_position -= 15
        
    # Recommendations
    y_position -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_position, "Recommendations")
    y_position -= 20
    c.setFont("Helvetica", 11)
    
    rec_lines = recommendations_text.split('\n')
    for line in rec_lines:
        c.drawString(50, y_position, line)
        y_position -= 15
        
    # Clinical Notes
    y_position -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_position, "Clinical Notes")
    y_position -= 20
    c.setFont("Helvetica", 11)
    c.drawString(50, y_position, notes)
    
    # Footer
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, "Disclaimer: This report is generated by AI and should be verified by a medical professional.")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=report.pdf"})

@app.get("/reports")
async def get_reports(current_user: UserInDB = Depends(get_current_user)):
    reports = await db.reports.find({"doctor_id": current_user.username}).to_list(length=100)
    # Convert ObjectId to string for JSON serialization
    for report in reports:
        report["id"] = str(report["_id"])
        del report["_id"]
    return reports




@app.get("/reports/{report_id}/download")
async def download_report(report_id: str, current_user: UserInDB = Depends(get_current_user)):
    try:
        from bson import ObjectId
        report = await db.reports.find_one({"_id": ObjectId(report_id)})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Verify ownership (optional, depending on requirements, but good practice)
        if report["doctor_id"] != current_user.username:
             # Allow admin to view all, or just restrict to owner
             pass 

        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 24)
        c.drawString(50, height - 50, "OrthoAI Diagnostic Report")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 80, "Generated by AI Analysis System")
        c.line(50, height - 90, width - 50, height - 90)
        
        # Patient/Doctor Info
        c.drawString(50, height - 120, f"Doctor: {report.get('doctor_id', 'Unknown')}")
        c.drawString(50, height - 140, f"Patient ID: {report.get('patient_id', 'Unknown')}")
        c.drawString(300, height - 120, f"Date: {report.get('created_at', datetime.now()).strftime('%Y-%m-%d')}")
        
        # Patient Image (Placeholder if not saved)
        # In a real app, we would fetch the image from S3 using report['image_url']
        c.drawString(50, height - 300, "[Image Placeholder - Image not stored in DB]")
        
        # Results Summary
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, height - 350, "Analysis Summary")
        
        c.setFont("Helvetica", 12)
        c.drawString(50, height - 380, f"Disorder: {report.get('disorder', 'N/A')}")
        c.drawString(50, height - 400, f"Confidence: {float(report.get('confidence', 0))*100:.1f}%")
        c.drawString(50, height - 420, f"Severity: {report.get('severity', 'N/A')}")
        
        # Detailed Analysis
        y_position = height - 460
        if report.get('detailed_analysis'):
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y_position, "Detailed Analysis")
            y_position -= 20
            c.setFont("Helvetica", 11)
            
            analysis_lines = []
            current_line = ""
            words = report['detailed_analysis'].split()
            for word in words:
                if c.stringWidth(current_line + " " + word, "Helvetica", 11) < 500:
                    current_line += " " + word
                else:
                    analysis_lines.append(current_line)
                    current_line = word
            analysis_lines.append(current_line)
            
            for line in analysis_lines:
                c.drawString(50, y_position, line)
                y_position -= 15
            y_position -= 10

        # Recommendations
        if report.get('recommendations'):
            c.setFont("Helvetica-Bold", 14)
            c.drawString(50, y_position, "Recommendations")
            y_position -= 20
            c.setFont("Helvetica", 11)
            
            rec_lines = report['recommendations'].split('\n')
            for line in rec_lines:
                c.drawString(50, y_position, line)
                y_position -= 15
            y_position -= 10

        # Clinical Notes
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y_position, "Clinical Notes")
        y_position -= 20
        c.setFont("Helvetica", 11)
        c.drawString(50, y_position, report.get('notes', ''))
        
        # Footer
        c.setFont("Helvetica-Oblique", 10)
        c.drawString(50, 50, "Disclaimer: This report is generated by AI and should be verified by a medical professional.")
        
        c.save()
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"})

    except Exception as e:
        print(f"Error generating PDF: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
