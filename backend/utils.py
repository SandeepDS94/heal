import cv2
import numpy as np

def preprocess_image(image_bytes: bytes):
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Resize
    img = cv2.resize(img, (224, 224))
    
    # Skip heavy preprocessing for now to improve speed
    # img = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)
    
    return img
