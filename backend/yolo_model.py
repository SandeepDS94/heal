from ultralytics import YOLO
import cv2
import numpy as np
import os
from PIL import Image

class YoloModel:
    def __init__(self, model_path="best.pt"):
        # Check if best.pt exists, else fallback
        if not os.path.exists(model_path):
            print(f"Warning: {model_path} not found. Falling back to yolov8n.pt")
            model_path = "yolov8n.pt"
        
        print(f"Loading YOLO model from: {model_path}")
        self.model = YOLO(model_path)

    def detect_fractures(self, image_input):
        """
        Runs YOLOv8 inference on the input image.
        Args:
            image_input: PIL Image or numpy array
        Returns:
            List of dictionaries containing detection results.
        """
        # Run inference
        results = self.model(image_input)
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Confidence score
                conf = float(box.conf[0])
                
                # Class ID and Name
                cls = int(box.cls[0])
                label = self.model.names[cls]
                
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "class": label,
                    "class_id": cls
                })
        
        return detections
