import unittest
import os
import sys
import io
import base64
from pathlib import Path
from PIL import Image, ImageDraw

# Ensure root path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend import config
from backend.services.yolo_detector import YOLODetector
from backend.routes.detection import detector as global_detector


class TestRoboflowIntegration(unittest.TestCase):
    """Test suite for Roboflow API integration and inference verification."""

    @classmethod
    def setUpClass(cls):
        cls.detector = YOLODetector()

    def test_01_env_file_and_key_path(self):
        """Verify that the .env file exists in the project root and is correctly loaded."""
        root_dir = Path(__file__).resolve().parent.parent
        expected_env = root_dir / ".env"
        self.assertTrue(expected_env.is_file(), f".env file must exist at {expected_env}")

        # Verify config loaded the exact path
        self.assertEqual(config.ENV_PATH, expected_env)

    def test_02_key_is_available_without_exposure(self):
        """Verify that ROBOFLOW_API_KEY is available without exposing or printing it."""
        # Check key presence via config helper
        self.assertTrue(config.is_roboflow_configured(), "ROBOFLOW_API_KEY must be configured and non-empty")

        # Verify model status endpoint does NOT contain raw key string
        status = self.detector.get_model_status()
        self.assertTrue(status["roboflow_key_available"])
        self.assertIn("status_label", status)
        self.assertIn("classes", status)

        # Confirm the key string itself is nowhere in the returned status dictionary
        key_val = os.getenv("ROBOFLOW_API_KEY")
        self.assertNotIn(key_val, str(status), "ROBOFLOW_API_KEY must NEVER be exposed in model status response")

    def test_03_connection_to_roboflow_model(self):
        """Verify connection to Roboflow model lab-ppe-3ox2k/1."""
        self.assertEqual(self.detector.roboflow_model_id, "lab-ppe-3ox2k/1")
        self.assertTrue(
            self.detector.is_roboflow_loaded,
            f"Failed to connect to Roboflow model {self.detector.roboflow_model_id}"
        )

    def test_04_inference_on_uploaded_image_file(self):
        """Verify model inference on a synthesized uploaded image file containing PPE shapes."""
        img = Image.new("RGB", (640, 640), color=(235, 235, 235))
        draw = ImageDraw.Draw(img)
        # Synthetic lab coat rectangle
        draw.rectangle([180, 140, 460, 520], fill=(255, 255, 255), outline=(40, 40, 40), width=3)
        # Synthetic gloves
        draw.ellipse([140, 320, 200, 400], fill=(20, 100, 240))
        draw.ellipse([440, 320, 500, 400], fill=(20, 100, 240))

        temp_path = "test_uploaded_sample.jpg"
        img.save(temp_path, format="JPEG")

        try:
            result = self.detector.detect(image_data=temp_path, confidence_threshold=0.25)
            self.assertIsNotNone(result)
            self.assertIn("detection_id", result)
            self.assertIn("raw_boxes", result)
            self.assertIn("overall_compliance", result)
            self.assertIn("risk_level", result)
            self.assertIn("lab-ppe-3ox2k/1", result.get("model_status", ""))
            # Ensure at least 1 PPE box detected by Roboflow model
            self.assertGreaterEqual(len(result["raw_boxes"]), 1)
            # Verify coordinates are non-negative and finite
            for b in result["raw_boxes"]:
                self.assertGreaterEqual(b["x"], 0)
                self.assertGreaterEqual(b["y"], 0)
                self.assertGreater(b["width"], 0)
                self.assertGreater(b["height"], 0)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_05_inference_on_base64_data_url(self):
        """Verify model inference on base64 data URL with prefix (format uploaded by frontend)."""
        img = Image.new("RGB", (400, 400), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)
        draw.rectangle([100, 100, 300, 350], fill=(255, 255, 255), outline=(0, 0, 0), width=2)
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        b64_encoded = base64.b64encode(buf.getvalue()).decode("ascii")
        data_url = f"data:image/jpeg;base64,{b64_encoded}"

        result = self.detector.detect(image_data=data_url, confidence_threshold=0.25)
        self.assertIsNotNone(result)
        self.assertIn("detection_id", result)
        self.assertIn("raw_boxes", result)
        self.assertIn("persons", result)

    def test_06_connection_error_handling(self):
        """Verify that connection errors or bad payloads fail gracefully without exposing credentials."""
        # Test cleaning logic
        cleaned = self.detector._clean_base64_payload("data:image/png;base64,QUJDRA==")
        self.assertEqual(cleaned, "QUJDRA==")

        # Test corrupt data handling
        corrupt_res = self.detector.detect(image_data="invalid_corrupt_data", is_demo=False)
        self.assertIsNotNone(corrupt_res)
        # Should gracefully fallback without throwing an unhandled exception
        self.assertIn("detection_id", corrupt_res)


if __name__ == "__main__":
    unittest.main(verbosity=2)
