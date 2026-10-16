import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

class AlertService:
    """
    Manages generation, severity categorization, and persistence of safety alerts.
    Alert types:
      - Missing lab coat
      - Missing gloves
      - Missing safety goggles
      - Missing mask
      - Multiple PPE violations
      - Chemical spill
      - Fire
      - Gas leak
      - High-risk situations
      - Critical safety events
    """

    SEVERITY_MAPPING = {
        "Fire": "CRITICAL",
        "Gas leak": "CRITICAL",
        "Critical safety events": "CRITICAL",
        "Chemical spill": "HIGH",
        "Multiple PPE violations": "HIGH",
        "High-risk situations": "HIGH",
        "Missing safety goggles": "HIGH",
        "Missing lab coat": "MEDIUM",
        "Missing gloves": "MEDIUM",
        "Missing mask": "LOW"
    }

    @classmethod
    def evaluate_ppe_alerts(cls, detection_data: Dict[str, Any], source: str = "AI_DETECTION") -> List[Dict[str, Any]]:
        alerts = []
        persons = detection_data.get("persons", [])

        total_violations = 0
        for p in persons:
            missing = p.get("missing_items", [])
            total_violations += len(missing)
            pid = p.get("person_index", 1)

            if "safety_goggles" in missing:
                alerts.append({
                    "id": f"alt_{uuid.uuid4().hex[:10]}",
                    "alert_type": "Missing safety goggles",
                    "severity": "HIGH",
                    "message": f"Person #{pid} entered hazardous zone without ANSI Z87.1 splash goggles.",
                    "time": datetime.now(timezone.utc).isoformat(),
                    "status": "ACTIVE",
                    "source": source,
                    "detection_id": detection_data.get("detection_id")
                })

            if "lab_coat" in missing:
                alerts.append({
                    "id": f"alt_{uuid.uuid4().hex[:10]}",
                    "alert_type": "Missing lab coat",
                    "severity": "MEDIUM",
                    "message": f"Person #{pid} is not wearing protective buttoned lab coat.",
                    "time": datetime.now(timezone.utc).isoformat(),
                    "status": "ACTIVE",
                    "source": source,
                    "detection_id": detection_data.get("detection_id")
                })

            if "gloves" in missing:
                alerts.append({
                    "id": f"alt_{uuid.uuid4().hex[:10]}",
                    "alert_type": "Missing gloves",
                    "severity": "MEDIUM",
                    "message": f"Person #{pid} operating without chemical-resistant nitrile gloves.",
                    "time": datetime.now(timezone.utc).isoformat(),
                    "status": "ACTIVE",
                    "source": source,
                    "detection_id": detection_data.get("detection_id")
                })

            if "mask" in missing:
                alerts.append({
                    "id": f"alt_{uuid.uuid4().hex[:10]}",
                    "alert_type": "Missing mask",
                    "severity": "LOW",
                    "message": f"Person #{pid} unmasked in designated particulate/BSL-2 area.",
                    "time": datetime.now(timezone.utc).isoformat(),
                    "status": "ACTIVE",
                    "source": source,
                    "detection_id": detection_data.get("detection_id")
                })

            if len(missing) >= 2:
                alerts.append({
                    "id": f"alt_{uuid.uuid4().hex[:10]}",
                    "alert_type": "Multiple PPE violations",
                    "severity": "HIGH",
                    "message": f"Person #{pid} has {len(missing)} active PPE omissions: {', '.join(missing)}.",
                    "time": datetime.now(timezone.utc).isoformat(),
                    "status": "ACTIVE",
                    "source": source,
                    "detection_id": detection_data.get("detection_id")
                })

        return alerts
