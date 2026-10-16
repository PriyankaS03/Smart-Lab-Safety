# Smart Lab Safety - PPE Detection Dataset Documentation

## Directory Structure
```
dataset/
├── data.yaml
├── dataset_validator.py
├── images/
│   ├── train/
│   └── val/
└── labels/
    ├── train/
    └── val/
```

## Class Mapping
| ID | Class Name | Description |
|---|---|---|
| 0 | person | Laboratory worker, researcher, technician, or student |
| 1 | lab_coat | Standard buttoned lab coat / chemical protective gown |
| 2 | gloves | Nitrile, neoprene, or cryogenic protective handwear |
| 3 | safety_goggles | ANSI Z87.1 rated chemical splash goggles or eye shields |
| 4 | mask | Surgical face mask, N95 respirator, or vapor half-mask |

## YOLO Annotation Format
Each line in `<image_name>.txt` represents one object bounding box:
`<class_id> <x_center> <y_center> <width> <height>`
All coordinates are normalized between 0.0 and 1.0.

Example:
```
0 0.450 0.500 0.350 0.850
1 0.450 0.550 0.320 0.500
2 0.380 0.720 0.080 0.120
3 0.450 0.280 0.120 0.060
4 0.450 0.340 0.100 0.080
```

## Training with Ultralytics YOLOv8
```bash
pip install ultralytics
yolo detect train data=dataset/data.yaml model=yolov8n.pt epochs=100 imgsz=640 batch=16
```
Once training completes, copy the weights to the backend:
```bash
cp runs/detect/train/weights/best.pt backend/models/best.pt
```

## Validate Dataset
```bash
python3 dataset/dataset_validator.py dataset
```
