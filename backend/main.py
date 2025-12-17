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

# Initialize YOLOv8 Model
from .yolo_model import YoloModel
try:
    yolo_model = YoloModel() 
    print("YOLOv8 model loaded successfully.")
except Exception as e:
    print(f"Failed to load YOLOv8 model: {e}")
    yolo_model = None

# Initialize U-Net Model
from .unet_model import UNetInference
try:
    # Check for weights file
    unet_weights = "unet_fracture.pth" if os.path.exists("unet_fracture.pth") else None
    unet_model = UNetInference(model_path=unet_weights)
except Exception as e:
    print(f"Failed to init U-Net: {e}")
    unet_model = None

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

def create_pdf_report(buffer, data, image_bytes=None):
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "OrthoAI Diagnostic Report")
    
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 80, "Generated by AI Analysis System")
    c.line(50, height - 90, width - 50, height - 90)
    
    # Patient/Doctor Info
    doctor_name = data.get("doctor_name") or data.get("doctor_id") or "Unknown"
    c.drawString(50, height - 120, f"Doctor: {doctor_name}")
    c.drawString(50, height - 140, f"Patient ID: {data.get('patient_id', 'Unknown')}")
    created_at = data.get("created_at", datetime.now())
    if isinstance(created_at, str):
         # Try parsing if string
         try: created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
         except: pass
    date_str = created_at.strftime('%Y-%m-%d') if isinstance(created_at, datetime) else str(created_at)
    c.drawString(300, height - 120, f"Date: {date_str}")
    
    # Patient Image
    img_y_bottom = height - 400
    img_display_h = 250
    img_display_w = 250
    img_x_left = 50
    
    if image_bytes:
        try:
            img = ImageReader(io.BytesIO(image_bytes))
            orig_w, orig_h = img.getSize()
            aspect = orig_w / orig_h
            
            # Calculate scale to fit in 250x250
            scale = min(img_display_w / orig_w, img_display_h / orig_h)
            drawn_w = orig_w * scale
            drawn_h = orig_h * scale
            
            # Center the image in the box
            offset_x = (img_display_w - drawn_w) / 2
            offset_y = (img_display_h - drawn_h) / 2
            final_x = img_x_left + offset_x
            final_y = img_y_bottom + offset_y
            
            c.drawImage(img, final_x, final_y, width=drawn_w, height=drawn_h)
            
            # Draw Bounding Box if exists AND not using an already annotated image
            if not data.get("is_annotated_image"):
                damage_loc = data.get("damage_location")
                if damage_loc and isinstance(damage_loc, dict):
                    x = float(damage_loc.get("x", 0))
                    y = float(damage_loc.get("y", 0))
                    w = float(damage_loc.get("width", 0))
                    h = float(damage_loc.get("height", 0))
                    
                    # Check for normalized coordinates (usually < 1)
                    # If they are not normalized, we assume they are percentages anyway based on Gemini prompt
                    
                    # Calculate PDF coordinates
                    # Image/Canvas origin is Top-Left. PDF origin is Bottom-Left.
                    # Box X (from left of image) = x * drawn_w
                    # Box Y (from TOP of image) = y * drawn_h
                    
                    rect_x = final_x + (x * drawn_w)
                    rect_y_top = final_y + drawn_h - (y * drawn_h)
                    rect_y_bottom = rect_y_top - (h * drawn_h)
                    
                    # Make circle instead of ellipse
                    # Use max dimension for radius to cover area
                    orig_w_px = w * drawn_w
                    orig_h_px = h * drawn_h
                    max_dim = max(orig_w_px, orig_h_px)
                    
                    diameter = max_dim * 1.2
                    radius = diameter / 2
                    
                    # Center of original box
                    center_x = rect_x + (orig_w_px / 2)
                    center_y_abs = rect_y_top - (orig_h_px / 2) # Y grows UP in PDF from bottom
                    
                    c.setStrokeColorRGB(1, 0, 0) # Red
                    c.setLineWidth(3)
                    
                    # c.circle(x_cen, y_cen, radius, stroke=1, fill=0)
                    c.circle(center_x, center_y_abs, radius, stroke=1, fill=0)
                    
                    c.setStrokeColorRGB(0, 0, 0) # Reset to black
                
        except Exception as e:
            print(f"Error drawing image: {e}")
            c.drawString(50, height - 200, "Image could not be processed")
    else:
        c.drawString(50, height - 300, "[Image Placeholder - Image not stored in DB]")
    
    # Results Summary
    c.setFont("Helvetica-Bold", 16)
    c.drawString(350, height - 180, "Analysis Summary")
    
    c.setFont("Helvetica", 12)
    c.drawString(350, height - 210, f"Disorder: {data.get('disorder', 'N/A')}")
    c.drawString(350, height - 230, f"Confidence: {float(data.get('confidence', 0))*100:.1f}%")
    c.drawString(350, height - 250, f"Severity: {data.get('severity', 'N/A')}")
    
    # Detailed Analysis
    y_position = height - 450
    if data.get('detailed_analysis'):
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y_position, "Detailed Analysis")
        y_position -= 20
        c.setFont("Helvetica", 11)
        
        analysis_lines = []
        current_line = ""
        words = (data.get('detailed_analysis') or "").split()
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
    if data.get('recommendations'):
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y_position, "Recommendations")
        y_position -= 20
        c.setFont("Helvetica", 11)
        
        rec_lines = (data.get('recommendations') or "").split('\n')
        for line in rec_lines:
            c.drawString(50, y_position, line)
            y_position -= 15
        y_position -= 10

    # Clinical Notes
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y_position, "Clinical Notes")
    y_position -= 20
    c.setFont("Helvetica", 11)
    c.drawString(50, y_position, data.get('notes', ''))
    
    # Footer
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(50, 50, "Disclaimer: This report is generated by AI and should be verified by a medical professional.")
    
    c.save()
    
@app.post("/detect")
async def detect_fractures(file: UploadFile = File(...), current_user: UserInDB = Depends(get_current_user)):
    if not yolo_model:
        raise HTTPException(status_code=500, detail="YOLOv8 model not loaded")
    
    contents = await file.read()
    
    # Preprocess if needed (YOLO usually handles raw images well, but we need PIL/numpy)
    pil_image = PIL.Image.open(io.BytesIO(contents))
    
    detections = yolo_model.detect_fractures(pil_image)
    
    return {"detections": detections}

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
    damage_location: str = Form(None),
    doctor_name: str = Form(None),
    is_annotated_image: bool = Form(False),
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

    # Parse damage_location
    damage_loc_dict = None
    if damage_location:
        try:
            damage_loc_dict = json.loads(damage_location)
        except:
            pass

    # Save report to database
    report_data = {
        "patient_id": patient_id,
        "doctor_id": current_user.username,
        "doctor_name": doctor_name, # Store the specific doctor name used
        "disorder": disorder,
        "confidence": float(confidence),
        "severity": severity,
        "notes": notes,
        "detailed_analysis": detailed_analysis,
        "recommendations": recommendations_text,
        "damage_location": damage_loc_dict,
        "is_annotated_image": is_annotated_image,
        "created_at": datetime.utcnow(),
        "image_url": "placeholder_url" # In a real app, upload to S3/Cloudinary
    }
    
    result = await db.reports.insert_one(report_data)
    
    if save_only:
        return {"message": "Report saved successfully", "report_id": str(result.inserted_id)}

    buffer = io.BytesIO()
    # Use helper function to generate PDF
    create_pdf_report(buffer, report_data, contents)
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

        # Use helper function to generate PDF
        # Note: image_bytes is None here because we rely on placeholder logic for now
        create_pdf_report(buffer, report)
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=report_{report_id}.pdf"})

    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate PDF")

@app.post("/segment")
async def segment_fracture(file: UploadFile = File(...), current_user: UserInDB = Depends(get_current_user)):
    contents = await file.read()
    
    # 1. Try U-Net first (if weights loaded)
    if unet_model and unet_model.model_loaded:
        try:
            # Preprocess for U-Net
            pil_image = PIL.Image.open(io.BytesIO(contents)).convert("RGB")
            # Resize to 256x256 or whatever the model expects (assuming 256 for now)
            # This part depends heavily on training data config.
            # Minimal implementation:
            import torchvision.transforms as T
            transform = T.Compose([
                T.Resize((256, 256)),
                T.ToTensor(),
            ])
            input_tensor = transform(pil_image).unsqueeze(0)
            mask = unet_model.predict(input_tensor)
            
            # Convert mask to base64 image
            mask_np = mask.squeeze().cpu().numpy()
            mask_img = PIL.Image.fromarray((mask_np * 255).astype('uint8'), mode='L')
            mask_img = mask_img.resize(pil_image.size) # Resize back to original
            
            # Create red overlay
            overlay = PIL.Image.new("RGBA", pil_image.size, (255, 0, 0, 0))
            # Paste red where mask is white
            # ... (skipped for brevity, falling back to simple mask return)
            
            buffer = io.BytesIO()
            mask_img.save(buffer, format="PNG")
            mask_b64 = base64.b64encode(buffer.getvalue()).decode()
            
            return {"mask": f"data:image/png;base64,{mask_b64}", "method": "U-Net"}
        except Exception as e:
            print(f"U-Net inference failed: {e}")

    # 2. Fallback: YOLO + CV Heuristic (Smart Segmentation)
    # This uses the YOLO bounding box to isolate the area, then uses edge detection/thresholding
    # to create a "tight" mask, simulating segmentation.
    try:
        pil_image = PIL.Image.open(io.BytesIO(contents)).convert("RGB")
        import numpy as np
        import cv2
        open_cv_image = np.array(pil_image) 
        # Convert RGB to BGR 
        open_cv_image = open_cv_image[:, :, ::-1].copy()
        
        detections = []
        if yolo_model:
            detections = yolo_model.detect_fractures(pil_image)
            
        # Create a blank mask
        mask = np.zeros(open_cv_image.shape[:2], dtype=np.uint8)
        
        has_detection = False
        if detections:
            for det in detections:
                box = det['bbox'] # [x1, y1, x2, y2]
                x1, y1, x2, y2 = map(int, box)
                
                # Extract ROI
                roi = open_cv_image[y1:y2, x1:x2]
                if roi.size == 0: continue
                
                # Processing ROI to find "fracture" features
                gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                # Invert (bones are white, fractures are dark lines)
                # Adaptive Thresholding to find dark lines in bright bone
                thresh_roi = cv2.adaptiveThreshold(gray_roi, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2)
                
                # Morphological operations to clean up noise
                kernel = np.ones((3,3), np.uint8)
                opening = cv2.morphologyEx(thresh_roi, cv2.MORPH_OPEN, kernel, iterations=1)
                
                # Place back into mask
                mask[y1:y2, x1:x2] = opening
                has_detection = True
        
        if not has_detection:
            # If no YOLO detection, just return empty or simple Canny on whole image (too noisy usually)
            pass

        # Convert mask to base64
        # Apply a red color to the mask
        color_mask = np.zeros_like(open_cv_image)
        color_mask[:, :] = [0, 0, 255] # Red in BGR
        
        # We process 'mask' to be alpha channel
        rgba_mask = np.dstack((color_mask, mask)) # BGR + Alpha
        # Use simple PNG encoding
        
        # Actually easier: Return just the raw mask, let frontend handle color? 
        # Or return a transparent PNG with red pixels.
        
        # Create PIL Image from mask
        # Make a Red image
        red_img = PIL.Image.new("RGBA", pil_image.size, (255, 0, 0, 0))
        # Get data
        datas = red_img.getdata()
        
        # Efficient way:
        # Create numpy array for RGBA
        H, W = mask.shape
        rgba = np.zeros((H, W, 4), dtype=np.uint8)
        rgba[mask > 0] = [255, 0, 0, 128] # Red with 50% opacity
        
        final_mask_img = PIL.Image.fromarray(rgba, 'RGBA')
        
        buffer = io.BytesIO()
        final_mask_img.save(buffer, format="PNG")
        import base64
        mask_b64 = base64.b64encode(buffer.getvalue()).decode()
        
        return {"mask": f"data:image/png;base64,{mask_b64}", "method": "YOLO+Heuristic", "detections": detections}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Segmentation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
