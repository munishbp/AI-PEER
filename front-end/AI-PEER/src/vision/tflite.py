from ultralytics import YOLO
import shutil
import os

# Load the YOLO26 large pose model (downloads automatically)
model = YOLO("yolo26l-pose.pt")

# Export to TFLite with float16 quantization
exported_path = model.export(format="tflite", half=True)

# Copy to the models directory
destination = os.path.join(os.path.dirname(__file__), 'models', 'yolo26l_float16.tflite')

shutil.copy(exported_path, destination)
print(f"Model exported and copied to {destination}")
