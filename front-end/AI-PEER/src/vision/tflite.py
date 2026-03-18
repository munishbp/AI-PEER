from ultralytics import YOLO
import tensorflow as tf
import shutil

# Load the YOLO26 model
model = YOLO("yolo26n.pt")

# Export the model to TFLite format
exported_path=model.export(format="tflite")  # creates 'yolo26n_float32.tflite'

destination = '/Users/munish/Desktop/AI-PEER/front-end/AI-PEER/src/vision/yolo26n_float32.tflite'


shutil.copy(exported_path, destination)
print("File copied successfully")

