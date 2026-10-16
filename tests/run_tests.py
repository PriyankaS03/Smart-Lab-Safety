import unittest
import os
import sys

# Ensure root path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.services.yolo_detector import YOLODetector
from backend.services.risk_calculator import RiskCalculator
from backend.services.alert_service import AlertService
from backend.rag.vector_store import SafetyKnowledgeRAG
from backend.services.rag_service import SafetyAssistantService
from dataset.dataset_validator import validate_dataset

class TestSmartLabSafety(unittest.TestCase):

    def setUp(self):
        self.detector = YOLODetector(model_path="backend/models/best.pt")
        self.assistant = SafetyAssistantService(doc_dir="backend/data/safety_documents")

    def test_model_status(self):
        status = self.detector.get_model_status()
        self.assertIn("classes", status)
        self.assertEqual(len(status["classes"]), 5)
        self.assertEqual(status["classes"][0], "person")
        self.assertEqual(status["classes"][1], "lab_coat")
        self.assertEqual(status["classes"][2], "gloves")
        self.assertEqual(status["classes"][3], "safety_goggles")
        self.assertEqual(status["classes"][4], "mask")

    def test_yolo_simulation_detection(self):
        result = self.detector.detect(is_demo=True, scenario="compliant")
        self.assertEqual(result["people_count"], 2)
        self.assertEqual(result["overall_compliance"], 100.0)
        self.assertEqual(result["risk_level"], "LOW")
        self.assertEqual(len(result["alerts_triggered"]), 0)

    def test_yolo_violation_detection(self):
        result = self.detector.detect(is_demo=True, scenario="multi_violation")
        self.assertEqual(result["people_count"], 1)
        self.assertLessEqual(result["overall_compliance"], 50.0)
        self.assertIn(result["risk_level"], ["HIGH", "CRITICAL"])
        self.assertGreater(len(result["alerts_triggered"]), 0)

    def test_risk_calculator_logic(self):
        compliant_person = [{
            "has_safety_goggles": True,
            "has_lab_coat": True,
            "has_gloves": True,
            "has_mask": True
        }]
        risk = RiskCalculator.calculate_detection_risk(compliant_person)
        self.assertEqual(risk["level"], "LOW")
        self.assertEqual(risk["score"], 0.0)

        unshielded_person = [{
            "has_safety_goggles": False,
            "has_lab_coat": False,
            "has_gloves": False,
            "has_mask": False
        }]
        high_risk = RiskCalculator.calculate_detection_risk(unshielded_person)
        self.assertIn(high_risk["level"], ["HIGH", "CRITICAL"])
        self.assertGreater(high_risk["score"], 60.0)

    def test_alert_generation(self):
        detection_data = {
            "detection_id": "test_det_123",
            "persons": [{
                "person_index": 1,
                "missing_items": ["safety_goggles", "lab_coat"]
            }]
        }
        alerts = AlertService.evaluate_ppe_alerts(detection_data)
        self.assertGreaterEqual(len(alerts), 2)
        types = [a["alert_type"] for a in alerts]
        self.assertIn("Missing safety goggles", types)
        self.assertIn("Missing lab coat", types)

    def test_rag_knowledge_base_retrieval(self):
        # Test chemical spill query
        response = self.assistant.ask("What should I do during a chemical spill?")
        self.assertIn("answer", response)
        self.assertGreater(len(response["sources"]), 0)
        self.assertTrue(any("chemical" in s["filename"].lower() for s in response["sources"]))
        self.assertEqual(response["emergency_level"], "URGENT")

        # Test fire response query
        fire_response = self.assistant.ask("What should I do during a fire?")
        self.assertIn("P.A.S.S.", fire_response["answer"])
        self.assertEqual(fire_response["emergency_level"], "CRITICAL")

        # Test PPE requirements query
        ppe_response = self.assistant.ask("What PPE is required in the laboratory?")
        self.assertIn("Four Pillars", ppe_response["answer"])

    def test_dataset_validator(self):
        res = validate_dataset("dataset")
        self.assertIn(res["status"], ["PASSED", "WARNING"])

    def test_roboflow_connection_and_inference(self):
        # 1. Verify model connection
        status = self.detector.get_model_status()
        self.assertTrue(status["roboflow_connected"])
        self.assertTrue(status["roboflow_key_available"])
        self.assertEqual(status["roboflow_model_id"], "lab-ppe-3ox2k/1")
        
        # Verify secret key is not exposed
        roboflow_key = os.getenv("ROBOFLOW_API_KEY", "")
        if roboflow_key:
            self.assertNotIn(roboflow_key, str(status))

        # 2. Test inference on synthetic uploaded image
        import io, base64
        from PIL import Image, ImageDraw

        img = Image.new("RGB", (640, 640), color=(230, 230, 230))
        draw = ImageDraw.Draw(img)
        draw.rectangle([180, 140, 460, 520], fill=(255, 255, 255), outline=(50, 50, 50), width=3)
        draw.ellipse([140, 320, 200, 400], fill=(20, 100, 240))
        draw.ellipse([440, 320, 500, 400], fill=(20, 100, 240))

        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        data_url = f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode('ascii')}"

        result = self.detector.detect(image_data=data_url, confidence_threshold=0.25)
        self.assertIsNotNone(result)
        self.assertIn("detection_id", result)
        self.assertIn("raw_boxes", result)
        self.assertIn("overall_compliance", result)
        self.assertIn("risk_level", result)
        self.assertGreaterEqual(len(result["raw_boxes"]), 1)

if __name__ == "__main__":
    unittest.main(verbosity=2)

