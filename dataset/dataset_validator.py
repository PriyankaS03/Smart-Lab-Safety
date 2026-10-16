#!/usr/bin/env python3
"""
Dataset Validation Utility for Smart Lab Safety PPE Detection
Validates directory structure, image/label pairings, class IDs (0-4), and normalized bounding boxes.
"""

import os
import sys
from typing import Dict, Any, List

EXPECTED_CLASSES = {
    0: "person",
    1: "lab_coat",
    2: "gloves",
    3: "safety_goggles",
    4: "mask"
}

VALID_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

def validate_dataset(dataset_dir: str = "dataset") -> Dict[str, Any]:
    print("============================================================")
    print(f"[INFO] Validating Smart Lab Safety PPE YOLO Dataset at: {dataset_dir}")
    print("============================================================")

    results = {
        "status": "PASSED",
        "splits": {},
        "class_counts": {k: 0 for k in EXPECTED_CLASSES.keys()},
        "errors": [],
        "warnings": []
    }

    yaml_path = os.path.join(dataset_dir, "data.yaml")
    if not os.path.exists(yaml_path):
        results["errors"].append(f"Missing data.yaml at {yaml_path}")
        results["status"] = "FAILED"
    else:
        print("[OK] Found data.yaml")

    for split in ["train", "val"]:
        img_dir = os.path.join(dataset_dir, "images", split)
        lbl_dir = os.path.join(dataset_dir, "labels", split)

        os.makedirs(img_dir, exist_ok=True)
        os.makedirs(lbl_dir, exist_ok=True)

        images = [f for f in os.listdir(img_dir) if os.path.splitext(f)[1].lower() in VALID_IMAGE_EXTS]
        labels = [f for f in os.listdir(lbl_dir) if f.endswith(".txt")]

        print(f"\n[Split: '{split}'] -> {len(images)} images, {len(labels)} label files")

        split_errors = 0
        img_basenames = {os.path.splitext(f)[0] for f in images}
        lbl_basenames = {os.path.splitext(f)[0] for f in labels}

        # Check for images without annotations
        orphan_images = img_basenames - lbl_basenames
        if orphan_images and len(images) > 0:
            results["warnings"].append(f"[{split}] {len(orphan_images)} images lack corresponding .txt label files.")

        # Check each label file
        for lbl_file in labels:
            lbl_path = os.path.join(lbl_dir, lbl_file)
            with open(lbl_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            for line_no, line in enumerate(lines, start=1):
                parts = line.strip().split()
                if not parts:
                    continue
                if len(parts) != 5:
                    results["errors"].append(f"[{lbl_file}:{line_no}] Expected 5 values (class x y w h), found {len(parts)}.")
                    split_errors += 1
                    continue

                try:
                    cls_id = int(parts[0])
                    x_center, y_center, width, height = map(float, parts[1:])
                except ValueError:
                    results["errors"].append(f"[{lbl_file}:{line_no}] Invalid non-numeric format.")
                    split_errors += 1
                    continue

                if cls_id not in EXPECTED_CLASSES:
                    results["errors"].append(f"[{lbl_file}:{line_no}] Class ID {cls_id} out of range (must be 0-4).")
                    split_errors += 1
                else:
                    results["class_counts"][cls_id] += 1

                for val, name in [(x_center, "x_center"), (y_center, "y_center"), (width, "width"), (height, "height")]:
                    if not (0.0 <= val <= 1.0):
                        results["warnings"].append(f"[{lbl_file}:{line_no}] {name} value {val:.3f} outside [0.0, 1.0].")

        results["splits"][split] = {
            "images": len(images),
            "labels": len(labels),
            "valid": split_errors == 0
        }

    print("\n------------------------------------------------------------")
    print("[INFO] Class Distribution Across All Annotation Labels:")
    for cls_id, name in EXPECTED_CLASSES.items():
        print(f"  Class {cls_id} ({name:<15}): {results['class_counts'][cls_id]} instances")

    if results["errors"]:
        results["status"] = "FAILED"
        print(f"\n[FAIL] Validation FAILED with {len(results['errors'])} error(s).")
        for err in results["errors"][:5]:
            print(f"  - {err}")
    else:
        print("\n[OK] Dataset structure is valid and ready for training!")

    return results

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "dataset"
    validate_dataset(path)
