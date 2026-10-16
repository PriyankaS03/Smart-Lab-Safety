# Smart Lab Safety - YOLOv8 PPE Detection Model Placement
# Target location: backend/models/best.pt
#
# Target YOLO Classes:
# 0: person
# 1: lab_coat
# 2: gloves
# 3: safety_goggles
# 4: mask
#
# To deploy your custom-trained YOLO model:
# 1. Train YOLOv8 with the dataset configured in dataset/data.yaml
# 2. Copy the resulting best weights: cp runs/detect/train/weights/best.pt backend/models/best.pt
# 3. The backend automatically detects best.pt and switches from fallback simulation to full neural inference.
MODEL_CLASSES = ["person", "lab_coat", "gloves", "safety_goggles", "mask"]
EXPECTED_CLASSES_COUNT = 5
