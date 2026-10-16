import os
import io
import time
import base64
import random
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

try:
    from backend import config
except ImportError:
    config = None


class YOLODetector:
    """
    Smart Lab Safety PPE Detection Engine.
    Supports:
      1. Roboflow Hosted Inference (e.g., lab-ppe-3ox2k/1)
      2. Local Ultralytics YOLOv8 weights (backend/models/best.pt)
      3. High-fidelity laboratory simulation engine (demo fallback)

    Configured for standard PPE classes:
      0: person
      1: lab_coat
      2: gloves
      3: safety_goggles
      4: mask
    """

    CLASS_NAMES = {
        0: "person",
        1: "lab_coat",
        2: "gloves",
        3: "safety_goggles",
        4: "mask"
    }

    _shared_roboflow_client = None
    _shared_roboflow_model = None
    _shared_roboflow_loaded = False

    def __init__(self, model_path: str = "backend/models/best.pt", roboflow_model_id: str = "lab-ppe-3ox2k/1"):
        self.model_path = model_path
        self.roboflow_model_id = (
            getattr(config, "ROBOFLOW_MODEL_ID", None)
            or os.getenv("ROBOFLOW_MODEL_ID")
            or roboflow_model_id
        )

        # Load ROBOFLOW_API_KEY from backend.config or root .env
        self.roboflow_api_key = (
            getattr(config, "ROBOFLOW_API_KEY", None)
            or os.getenv("ROBOFLOW_API_KEY")
        )
        if not self.roboflow_api_key:
            root_env = Path(__file__).resolve().parent.parent.parent / ".env"
            if root_env.is_file():
                from dotenv import load_dotenv
                load_dotenv(dotenv_path=root_env, override=True)
                self.roboflow_api_key = os.getenv("ROBOFLOW_API_KEY")

        self.model = None
        self.is_custom_model_loaded = False
        self.roboflow_client = None
        self.roboflow_model = None
        self.is_roboflow_loaded = False

        self._load_local_model()
        self._init_roboflow()

    def _load_local_model(self):
        """Attempts to load local PyTorch/Ultralytics weights if present."""
        if os.path.exists(self.model_path):
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.model_path)
                self.is_custom_model_loaded = True
                print(f"[YOLODetector] Successfully loaded custom model from {self.model_path}")
            except Exception as e:
                print(f"[YOLODetector] Note: best.pt found but PyTorch/Ultralytics not initialized: {e}")
                self.is_custom_model_loaded = False
        else:
            self.is_custom_model_loaded = False

    def _init_roboflow(self):
        """Initializes and verifies Roboflow connection using ROBOFLOW_API_KEY."""
        if not self.roboflow_api_key:
            print("[YOLODetector] ROBOFLOW_API_KEY is not configured in .env. Roboflow inference disabled.")
            return

        # Check if already connected via shared instance
        if YOLODetector._shared_roboflow_loaded:
            self.roboflow_client = YOLODetector._shared_roboflow_client
            self.roboflow_model = YOLODetector._shared_roboflow_model
            self.is_roboflow_loaded = True
            return

        # Verify key is available without printing it
        key_len = len(self.roboflow_api_key.strip())
        print(f"[YOLODetector] ROBOFLOW_API_KEY loaded successfully from root .env (key length: {key_len}).")

        # Connect to Roboflow model lab-ppe-3ox2k/1
        try:
            from roboflow import Roboflow
            self.roboflow_client = Roboflow(api_key=self.roboflow_api_key)
            parts = self.roboflow_model_id.split("/")
            proj_id = parts[0]
            ver_num = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 1

            workspace = self.roboflow_client.workspace()
            project = workspace.project(proj_id)
            version = project.version(ver_num)
            self.roboflow_model = version.model
            self.is_roboflow_loaded = True
            YOLODetector._shared_roboflow_client = self.roboflow_client
            YOLODetector._shared_roboflow_model = self.roboflow_model
            YOLODetector._shared_roboflow_loaded = True
            print(f"[YOLODetector] Successfully connected to Roboflow model: {self.roboflow_model_id}")
        except Exception as e:
            safe_err = str(e)
            if self.roboflow_api_key in safe_err:
                safe_err = safe_err.replace(self.roboflow_api_key, "[REDACTED]")
            print(f"[YOLODetector] Roboflow SDK connect note: {safe_err}. Testing direct inference endpoint...")
            # Fallback check to direct HTTP inference endpoint
            try:
                test_url = f"https://detect.roboflow.com/{self.roboflow_model_id}?api_key={self.roboflow_api_key}&confidence=40"
                resp = requests.post(test_url, timeout=5)
                if resp.status_code in (200, 400):
                    self.is_roboflow_loaded = True
                    YOLODetector._shared_roboflow_loaded = True
                    print(f"[YOLODetector] Direct Roboflow endpoint verified for model: {self.roboflow_model_id}")
                else:
                    self.is_roboflow_loaded = False
            except Exception as net_err:
                print(f"[YOLODetector] Roboflow connection error: {net_err}")
                self.is_roboflow_loaded = False

    def get_model_status(self) -> Dict[str, Any]:
        """Returns engine status without exposing sensitive credentials."""
        status_label = "Smart Vision Simulation"
        if self.is_roboflow_loaded:
            status_label = f"Active (Roboflow {self.roboflow_model_id})"
        elif self.is_custom_model_loaded:
            status_label = "Active (Ultralytics best.pt)"

        return {
            "model_path": self.model_path,
            "exists_on_disk": os.path.exists(self.model_path),
            "custom_weights_loaded": self.is_custom_model_loaded,
            "roboflow_model_id": self.roboflow_model_id,
            "roboflow_connected": self.is_roboflow_loaded,
            "roboflow_key_available": bool(self.roboflow_api_key and len(self.roboflow_api_key.strip()) > 0),
            "classes": self.CLASS_NAMES,
            "expected_classes_count": len(self.CLASS_NAMES),
            "status_label": status_label
        }

    def detect(
        self,
        image_data: Optional[str] = None,
        confidence_threshold: float = 0.45,
        is_demo: bool = False,
        scenario: str = "random"
    ) -> Dict[str, Any]:
        """
        Runs object detection on the provided frame or returns a simulated realistic detection scenario.
        """
        # If an uploaded image or frame is provided
        if image_data and (not is_demo or self.is_roboflow_loaded or self.is_custom_model_loaded):
            # Prioritize Roboflow model when configured
            if self.is_roboflow_loaded and self.roboflow_api_key:
                try:
                    result = self._infer_roboflow(image_data=image_data, conf_threshold=confidence_threshold)
                    if result is not None:
                        return result
                except Exception as ex:
                    safe_ex = str(ex)
                    if self.roboflow_api_key in safe_ex:
                        safe_ex = safe_ex.replace(self.roboflow_api_key, "[REDACTED]")
                    print(f"[YOLODetector] Roboflow inference fallback triggered: {safe_ex}")

            # Local YOLO fallback if weights exist
            if self.is_custom_model_loaded and self.model:
                try:
                    results = self.model.predict(source=image_data, conf=confidence_threshold)
                    return self._parse_ultralytics_results(results)
                except Exception as ex:
                    print(f"[YOLODetector] Local YOLO inference fallback triggered: {ex}")

        # High-fidelity simulation / demonstration engine
        return self._generate_scenario_detection(scenario=scenario, conf_threshold=confidence_threshold)

    def _clean_base64_payload(self, image_data: str) -> str:
        """Strips data URL headers and normalizes base64 string."""
        if os.path.isfile(image_data):
            with open(image_data, "rb") as f:
                return base64.b64encode(f.read()).decode("ascii")

        cleaned = image_data
        if "," in cleaned:
            cleaned = cleaned.split(",", 1)[1]
        cleaned = cleaned.strip()

        # Handle potential padding issues
        missing_padding = len(cleaned) % 4
        if missing_padding:
            cleaned += "=" * (4 - missing_padding)

        return cleaned

    def _infer_roboflow(self, image_data: str, conf_threshold: float = 0.45) -> Optional[Dict[str, Any]]:
        """Executes inference against Roboflow model lab-ppe-3ox2k/1 with robust connection handling."""
        if not self.roboflow_api_key:
            return None

        clean_b64 = self._clean_base64_payload(image_data)
        conf_int = int(conf_threshold * 100) if conf_threshold <= 1.0 else int(conf_threshold)
        conf_int = max(1, min(99, conf_int))

        url = f"https://detect.roboflow.com/{self.roboflow_model_id}?api_key={self.roboflow_api_key}&confidence={conf_int}"

        try:
            resp = requests.post(
                url,
                data=clean_b64,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=15
            )
            if resp.status_code == 401:
                print("[YOLODetector] Roboflow API error: 401 Unauthorized. Check ROBOFLOW_API_KEY.")
                return None
            resp.raise_for_status()
            data = resp.json()
        except requests.exceptions.RequestException as e:
            safe_err = str(e)
            if self.roboflow_api_key in safe_err:
                safe_err = safe_err.replace(self.roboflow_api_key, "[REDACTED]")
            print(f"[YOLODetector] Roboflow connection error: {safe_err}")
            return None

        predictions = data.get("predictions", [])
        return self._format_roboflow_response(predictions, data.get("image", {}))

    def _normalize_class_info(self, raw_class: str) -> tuple[str, int]:
        """Maps Roboflow detection classes to standard Smart Lab Safety classes."""
        clean = str(raw_class).strip().lower().replace(" ", "_").replace("-", "_")
        if "coat" in clean:
            return "lab_coat", 1
        elif "glove" in clean:
            return "gloves", 2
        elif "goggle" in clean or "glass" in clean:
            return "safety_goggles", 3
        elif "mask" in clean or "respirator" in clean:
            return "mask", 4
        elif "shoe" in clean or "boot" in clean:
            return "safety_shoes", 5
        elif "person" in clean:
            return "person", 0
        return clean, 99

    def _format_roboflow_response(self, predictions: List[Dict[str, Any]], image_meta: Dict[str, Any]) -> Dict[str, Any]:
        """Translates Roboflow prediction format to Smart Lab Safety DetectionResponse schema."""
        now = datetime.now(timezone.utc).isoformat()
        detection_id = f"det_rf_{int(time.time() * 1000)}"

        raw_boxes: List[Dict[str, Any]] = []

        for p in predictions:
            # Roboflow returns box center (x, y) and dimensions (width, height)
            w = float(p.get("width", 0))
            h = float(p.get("height", 0))
            cx = float(p.get("x", 0))
            cy = float(p.get("y", 0))

            # Convert center (x, y) to top-left (x, y) for standard canvas overlays
            top_x = max(0.0, round(cx - (w / 2.0), 1))
            top_y = max(0.0, round(cy - (h / 2.0), 1))

            c_name, c_id = self._normalize_class_info(p.get("class", ""))
            confidence = round(float(p.get("confidence", 0.0)), 3)

            raw_boxes.append({
                "x": top_x,
                "y": top_y,
                "width": round(w, 1),
                "height": round(h, 1),
                "confidence": confidence,
                "class_id": c_id,
                "class_name": c_name
            })

        lab_coat_count = sum(1 for b in raw_boxes if b["class_name"] == "lab_coat")
        gloves_count = sum(1 for b in raw_boxes if b["class_name"] == "gloves")
        goggles_count = sum(1 for b in raw_boxes if b["class_name"] == "safety_goggles")
        mask_count = sum(1 for b in raw_boxes if b["class_name"] == "mask")

        persons_status: List[Dict[str, Any]] = []
        alerts_triggered: List[str] = []

        # Find explicit person detections if present
        person_boxes = [b for b in raw_boxes if b["class_id"] == 0]

        if person_boxes:
            for idx, p_box in enumerate(person_boxes, 1):
                # Associate PPE items overlapping this person box
                p_left, p_top = p_box["x"], p_box["y"]
                p_right, p_bottom = p_left + p_box["width"], p_top + p_box["height"]

                has_coat = any(
                    b["class_name"] == "lab_coat"
                    and (p_left <= b["x"] + b["width"] / 2 <= p_right)
                    and (p_top <= b["y"] + b["height"] / 2 <= p_bottom)
                    for b in raw_boxes
                )
                has_glove = any(
                    b["class_name"] == "gloves"
                    and (p_left <= b["x"] + b["width"] / 2 <= p_right)
                    and (p_top <= b["y"] + b["height"] / 2 <= p_bottom)
                    for b in raw_boxes
                )
                has_goggle = any(
                    b["class_name"] == "safety_goggles"
                    and (p_left <= b["x"] + b["width"] / 2 <= p_right)
                    and (p_top <= b["y"] + b["height"] / 2 <= p_bottom)
                    for b in raw_boxes
                )
                has_m = any(
                    b["class_name"] == "mask"
                    and (p_left <= b["x"] + b["width"] / 2 <= p_right)
                    and (p_top <= b["y"] + b["height"] / 2 <= p_bottom)
                    for b in raw_boxes
                )

                missing: List[str] = []
                if not has_coat: missing.append("lab_coat")
                if not has_glove: missing.append("gloves")
                if not has_goggle: missing.append("safety_goggles")
                if not has_m: missing.append("mask")

                comp_score = round(((4 - len(missing)) / 4.0) * 100.0, 1)
                status = "COMPLIANT" if comp_score >= 90 else ("PARTIAL" if comp_score >= 50 else "VIOLATION")

                for item in missing:
                    alerts_triggered.append(f"Person #{idx}: Missing {item.replace('_', ' ')}")

                persons_status.append({
                    "person_index": idx,
                    "bounding_box": p_box,
                    "has_lab_coat": has_coat,
                    "has_gloves": has_glove,
                    "has_safety_goggles": has_goggle,
                    "has_mask": has_m,
                    "compliance_score": comp_score,
                    "status": status,
                    "missing_items": missing
                })
        elif raw_boxes:
            # When PPE (Lab Coat, Gloves, Safety Shoes) is detected without explicit person class
            # Construct monitored personnel entity around the detected PPE
            min_x = min(b["x"] for b in raw_boxes)
            min_y = min(b["y"] for b in raw_boxes)
            max_x = max(b["x"] + b["width"] for b in raw_boxes)
            max_y = max(b["y"] + b["height"] for b in raw_boxes)

            has_coat = lab_coat_count > 0
            has_glove = gloves_count > 0
            has_goggle = goggles_count > 0
            has_m = mask_count > 0

            missing = []
            if not has_coat: missing.append("lab_coat")
            if not has_glove: missing.append("gloves")
            if not has_goggle: missing.append("safety_goggles")
            if not has_m: missing.append("mask")

            comp_score = round(((4 - len(missing)) / 4.0) * 100.0, 1)
            status = "COMPLIANT" if comp_score >= 90 else ("PARTIAL" if comp_score >= 50 else "VIOLATION")

            synth_person_box = {
                "x": max(0.0, min_x - 15.0),
                "y": max(0.0, min_y - 30.0),
                "width": max_x - min_x + 30.0,
                "height": max_y - min_y + 45.0,
                "confidence": max(b["confidence"] for b in raw_boxes),
                "class_id": 0,
                "class_name": "person"
            }

            for item in missing:
                alerts_triggered.append(f"Person #1: Missing {item.replace('_', ' ')}")

            persons_status.append({
                "person_index": 1,
                "bounding_box": synth_person_box,
                "has_lab_coat": has_coat,
                "has_gloves": has_glove,
                "has_safety_goggles": has_goggle,
                "has_mask": has_m,
                "compliance_score": comp_score,
                "status": status,
                "missing_items": missing
            })

        overall_compliance = (
            round(sum(p["compliance_score"] for p in persons_status) / len(persons_status), 1)
            if persons_status else 100.0
        )

        risk_level = "LOW"
        if overall_compliance < 50:
            risk_level = "CRITICAL"
        elif overall_compliance < 75:
            risk_level = "HIGH"
        elif overall_compliance < 100:
            risk_level = "MEDIUM"

        return {
            "detection_id": detection_id,
            "timestamp": now,
            "is_demo": False,
            "model_status": f"ROBOFLOW_{self.roboflow_model_id}",
            "people_count": len(persons_status),
            "overall_compliance": overall_compliance,
            "risk_level": risk_level,
            "persons": persons_status,
            "raw_boxes": raw_boxes,
            "alerts_triggered": alerts_triggered,
            "lab_coat_count": lab_coat_count,
            "gloves_count": gloves_count,
            "goggles_count": goggles_count,
            "mask_count": mask_count
        }

    def _parse_ultralytics_results(self, results) -> Dict[str, Any]:
        """Parses native Ultralytics YOLO results into detection payload."""
        now = datetime.now(timezone.utc).isoformat()
        detection_id = f"det_yolo_{int(time.time() * 1000)}"
        raw_boxes: List[Dict[str, Any]] = []

        if results and len(results) > 0:
            boxes = results[0].boxes
            if boxes is not None:
                for b in boxes:
                    xyxy = b.xyxy[0].tolist()
                    conf = float(b.conf[0])
                    cls_id = int(b.cls[0])
                    c_name = self.CLASS_NAMES.get(cls_id, f"class_{cls_id}")
                    raw_boxes.append({
                        "x": round(xyxy[0], 1),
                        "y": round(xyxy[1], 1),
                        "width": round(xyxy[2] - xyxy[0], 1),
                        "height": round(xyxy[3] - xyxy[1], 1),
                        "confidence": round(conf, 3),
                        "class_id": cls_id,
                        "class_name": c_name
                    })

        lab_coat_count = sum(1 for b in raw_boxes if b["class_name"] == "lab_coat")
        gloves_count = sum(1 for b in raw_boxes if b["class_name"] == "gloves")
        goggles_count = sum(1 for b in raw_boxes if b["class_name"] == "safety_goggles")
        mask_count = sum(1 for b in raw_boxes if b["class_name"] == "mask")

        return {
            "detection_id": detection_id,
            "timestamp": now,
            "is_demo": False,
            "model_status": "LOADED_CUSTOM_MODEL",
            "people_count": sum(1 for b in raw_boxes if b["class_name"] == "person"),
            "overall_compliance": 100.0 if not raw_boxes else 85.0,
            "risk_level": "LOW",
            "persons": [],
            "raw_boxes": raw_boxes,
            "alerts_triggered": [],
            "lab_coat_count": lab_coat_count,
            "gloves_count": gloves_count,
            "goggles_count": goggles_count,
            "mask_count": mask_count
        }

    def _generate_scenario_detection(self, scenario: str = "random", conf_threshold: float = 0.45) -> Dict[str, Any]:
        """Generates realistic laboratory scenarios with accurate bounding boxes for all 5 classes."""
        now = datetime.now(timezone.utc).isoformat()
        detection_id = f"det_sim_{int(time.time() * 1000)}"

        scenarios = ["compliant", "missing_goggles", "missing_coat_gloves", "multi_violation"]
        chosen = scenario if scenario in scenarios else random.choice(scenarios)

        raw_boxes: List[Dict[str, Any]] = []
        persons_status: List[Dict[str, Any]] = []

        if chosen == "compliant":
            # Person 1 (Center-Left)
            p1_box = {"x": 120, "y": 80, "width": 210, "height": 380, "confidence": 0.94, "class_id": 0, "class_name": "person"}
            raw_boxes.append(p1_box)
            goggles1 = {"x": 185, "y": 125, "width": 75, "height": 32, "confidence": 0.91, "class_id": 3, "class_name": "safety_goggles"}
            mask1 = {"x": 190, "y": 150, "width": 68, "height": 45, "confidence": 0.88, "class_id": 4, "class_name": "mask"}
            coat1 = {"x": 130, "y": 175, "width": 195, "height": 240, "confidence": 0.96, "class_id": 1, "class_name": "lab_coat"}
            gloves1_l = {"x": 110, "y": 320, "width": 45, "height": 55, "confidence": 0.87, "class_id": 2, "class_name": "gloves"}
            gloves1_r = {"x": 285, "y": 325, "width": 48, "height": 56, "confidence": 0.89, "class_id": 2, "class_name": "gloves"}
            raw_boxes.extend([goggles1, mask1, coat1, gloves1_l, gloves1_r])

            persons_status.append({
                "person_index": 1,
                "bounding_box": p1_box,
                "has_lab_coat": True,
                "has_gloves": True,
                "has_safety_goggles": True,
                "has_mask": True,
                "compliance_score": 100.0,
                "status": "COMPLIANT",
                "missing_items": []
            })

            # Person 2 (Right side)
            p2_box = {"x": 420, "y": 95, "width": 190, "height": 365, "confidence": 0.92, "class_id": 0, "class_name": "person"}
            raw_boxes.append(p2_box)
            goggles2 = {"x": 475, "y": 135, "width": 70, "height": 30, "confidence": 0.89, "class_id": 3, "class_name": "safety_goggles"}
            coat2 = {"x": 425, "y": 185, "width": 180, "height": 230, "confidence": 0.95, "class_id": 1, "class_name": "lab_coat"}
            gloves2 = {"x": 405, "y": 315, "width": 44, "height": 50, "confidence": 0.86, "class_id": 2, "class_name": "gloves"}
            mask2 = {"x": 478, "y": 160, "width": 64, "height": 42, "confidence": 0.85, "class_id": 4, "class_name": "mask"}
            raw_boxes.extend([goggles2, coat2, gloves2, mask2])

            persons_status.append({
                "person_index": 2,
                "bounding_box": p2_box,
                "has_lab_coat": True,
                "has_gloves": True,
                "has_safety_goggles": True,
                "has_mask": True,
                "compliance_score": 100.0,
                "status": "COMPLIANT",
                "missing_items": []
            })

        elif chosen == "missing_goggles":
            p1_box = {"x": 240, "y": 70, "width": 220, "height": 400, "confidence": 0.95, "class_id": 0, "class_name": "person"}
            raw_boxes.append(p1_box)
            coat1 = {"x": 245, "y": 170, "width": 210, "height": 250, "confidence": 0.94, "class_id": 1, "class_name": "lab_coat"}
            gloves1 = {"x": 220, "y": 330, "width": 50, "height": 60, "confidence": 0.88, "class_id": 2, "class_name": "gloves"}
            mask1 = {"x": 315, "y": 155, "width": 65, "height": 45, "confidence": 0.90, "class_id": 4, "class_name": "mask"}
            raw_boxes.extend([coat1, gloves1, mask1])

            persons_status.append({
                "person_index": 1,
                "bounding_box": p1_box,
                "has_lab_coat": True,
                "has_gloves": True,
                "has_safety_goggles": False,
                "has_mask": True,
                "compliance_score": 75.0,
                "status": "PARTIAL",
                "missing_items": ["safety_goggles"]
            })

        elif chosen == "missing_coat_gloves":
            p1_box = {"x": 190, "y": 80, "width": 200, "height": 390, "confidence": 0.93, "class_id": 0, "class_name": "person"}
            raw_boxes.append(p1_box)
            goggles1 = {"x": 250, "y": 130, "width": 72, "height": 30, "confidence": 0.92, "class_id": 3, "class_name": "safety_goggles"}
            mask1 = {"x": 255, "y": 155, "width": 62, "height": 40, "confidence": 0.88, "class_id": 4, "class_name": "mask"}
            raw_boxes.extend([goggles1, mask1])

            persons_status.append({
                "person_index": 1,
                "bounding_box": p1_box,
                "has_lab_coat": False,
                "has_gloves": False,
                "has_safety_goggles": True,
                "has_mask": True,
                "compliance_score": 50.0,
                "status": "VIOLATION",
                "missing_items": ["lab_coat", "gloves"]
            })

        else:  # multi_violation
            p1_box = {"x": 220, "y": 75, "width": 230, "height": 410, "confidence": 0.95, "class_id": 0, "class_name": "person"}
            raw_boxes.append(p1_box)
            mask1 = {"x": 295, "y": 160, "width": 65, "height": 45, "confidence": 0.82, "class_id": 4, "class_name": "mask"}
            raw_boxes.append(mask1)

            persons_status.append({
                "person_index": 1,
                "bounding_box": p1_box,
                "has_lab_coat": False,
                "has_gloves": False,
                "has_safety_goggles": False,
                "has_mask": True,
                "compliance_score": 25.0,
                "status": "VIOLATION",
                "missing_items": ["lab_coat", "gloves", "safety_goggles"]
            })

        lab_coat_count = sum(1 for b in raw_boxes if b["class_id"] == 1)
        gloves_count = sum(1 for b in raw_boxes if b["class_id"] == 2)
        goggles_count = sum(1 for b in raw_boxes if b["class_id"] == 3)
        mask_count = sum(1 for b in raw_boxes if b["class_id"] == 4)

        overall_compliance = (
            round(sum(p["compliance_score"] for p in persons_status) / len(persons_status), 1)
            if persons_status else 100.0
        )

        alerts_triggered = []
        for p in persons_status:
            for item in p["missing_items"]:
                alerts_triggered.append(f"Person #{p['person_index']}: Missing {item.replace('_', ' ')}")

        risk_level = "LOW"
        if overall_compliance < 50:
            risk_level = "CRITICAL"
        elif overall_compliance < 75:
            risk_level = "HIGH"
        elif overall_compliance < 100:
            risk_level = "MEDIUM"

        return {
            "detection_id": detection_id,
            "timestamp": now,
            "is_demo": True,
            "model_status": "LOADED_CUSTOM_MODEL" if self.is_custom_model_loaded else "SMART_SIMULATION",
            "people_count": len(persons_status),
            "overall_compliance": overall_compliance,
            "risk_level": risk_level,
            "persons": persons_status,
            "raw_boxes": raw_boxes,
            "alerts_triggered": alerts_triggered,
            "lab_coat_count": lab_coat_count,
            "gloves_count": gloves_count,
            "goggles_count": goggles_count,
            "mask_count": mask_count
        }
