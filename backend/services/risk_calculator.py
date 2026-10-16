from typing import List, Dict, Any

class RiskCalculator:
    """
    Calculates safety risk level based on detected PPE compliance,
    violation severity, and environmental hazard reports.
    Risk Levels:
      - LOW (0 - 29): Safe operation, standard precautions.
      - MEDIUM (30 - 59): Minor omission (e.g. mask or single glove), advisory status.
      - HIGH (60 - 84): Multiple violations (missing goggles + lab coat), immediate intervention.
      - CRITICAL (85 - 100): Hazardous unshielded operations, toxic release, or fire.
    """

    WEIGHTS = {
        "missing_safety_goggles": 25.0,  # High risk: direct optical chemical/debris danger
        "missing_lab_coat": 20.0,        # Moderate/High risk: skin chemical exposure
        "missing_gloves": 15.0,          # Moderate risk: contact dermatitis, burns
        "missing_mask": 15.0,            # Moderate risk: particulate / bio-aerosol inhalation
        "multiple_person_factor": 1.25,   # Multiplier when multiple personnel are unshielded
    }

    @classmethod
    def calculate_detection_risk(cls, persons: List[Dict[str, Any]], active_hazards: List[str] = None) -> Dict[str, Any]:
        if not persons:
            return {
                "score": 0.0,
                "level": "LOW",
                "breakdown": "No personnel currently detected in active zone.",
                "status": "CLEAR"
            }

        total_penalty = 0.0
        violations_count = 0

        for p in persons:
            p_violations = 0
            if not p.get("has_safety_goggles", True):
                total_penalty += cls.WEIGHTS["missing_safety_goggles"]
                p_violations += 1
            if not p.get("has_lab_coat", True):
                total_penalty += cls.WEIGHTS["missing_lab_coat"]
                p_violations += 1
            if not p.get("has_gloves", True):
                total_penalty += cls.WEIGHTS["missing_gloves"]
                p_violations += 1
            if not p.get("has_mask", True):
                total_penalty += cls.WEIGHTS["missing_mask"]
                p_violations += 1
            
            if p_violations > 2:
                total_penalty += 15.0  # Compound neglect penalty
            violations_count += p_violations

        # Scale by count of people
        if len(persons) > 1 and violations_count > 0:
            total_penalty *= min(cls.WEIGHTS["multiple_person_factor"], 1.5)

        # Factor in active environmental hazards
        if active_hazards:
            for h in active_hazards:
                h_lower = h.lower()
                if "fire" in h_lower or "flame" in h_lower:
                    total_penalty = max(total_penalty, 95.0)
                elif "gas" in h_lower or "asphyx" in h_lower:
                    total_penalty = max(total_penalty, 90.0)
                elif "spill" in h_lower or "chemical" in h_lower:
                    total_penalty = max(total_penalty, 85.0)

        normalized_score = min(max(round(total_penalty, 1), 0.0), 100.0)

        if normalized_score >= 85:
            level = "CRITICAL"
        elif normalized_score >= 60:
            level = "HIGH"
        elif normalized_score >= 30:
            level = "MEDIUM"
        else:
            level = "LOW"

        return {
            "score": normalized_score,
            "level": level,
            "violation_count": violations_count,
            "people_monitored": len(persons)
        }
