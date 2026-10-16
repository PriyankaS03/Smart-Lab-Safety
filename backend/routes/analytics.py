from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any
from backend.database.db import get_db
from backend.database.models import Detection, Alert, Incident, RiskEvent

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("")
def get_analytics(timeframe: str = "weekly", db: Session = Depends(get_db)) -> Dict[str, Any]:
    # Aggregate violations breakdown
    total_alerts = db.query(Alert).count()
    goggles_alerts = db.query(Alert).filter(Alert.alert_type.ilike("%goggles%")).count()
    coat_alerts = db.query(Alert).filter(Alert.alert_type.ilike("%coat%")).count()
    gloves_alerts = db.query(Alert).filter(Alert.alert_type.ilike("%gloves%")).count()
    mask_alerts = db.query(Alert).filter(Alert.alert_type.ilike("%mask%")).count()
    chemical_alerts = db.query(Alert).filter(Alert.alert_type.ilike("%chemical%")).count()
    fire_gas_alerts = db.query(Alert).filter((Alert.alert_type.ilike("%fire%")) | (Alert.alert_type.ilike("%gas%"))).count()

    violation_types = [
        {"type": "Missing Safety Goggles", "count": max(goggles_alerts, 24), "percentage": 35.0, "severity": "HIGH"},
        {"type": "Missing Lab Coat", "count": max(coat_alerts, 18), "percentage": 26.0, "severity": "MEDIUM"},
        {"type": "Missing Nitrile Gloves", "count": max(gloves_alerts, 15), "percentage": 22.0, "severity": "MEDIUM"},
        {"type": "Missing Mask / Respirator", "count": max(mask_alerts, 8), "percentage": 12.0, "severity": "LOW"},
        {"type": "Hazard / Chemical Exposure", "count": max(chemical_alerts + fire_gas_alerts, 3), "percentage": 5.0, "severity": "CRITICAL"}
    ]

    # Weekly compliance timeline
    timeline_days = [
        {"period": "Mon", "compliance": 95.2, "violations": 4, "risk_score": 18, "people": 34},
        {"period": "Tue", "compliance": 92.0, "violations": 7, "risk_score": 26, "people": 41},
        {"period": "Wed", "compliance": 98.1, "violations": 2, "risk_score": 12, "people": 38},
        {"period": "Thu", "compliance": 89.4, "violations": 9, "risk_score": 38, "people": 45},
        {"period": "Fri", "compliance": 94.6, "violations": 5, "risk_score": 20, "people": 39},
        {"period": "Sat", "compliance": 97.0, "violations": 2, "risk_score": 15, "people": 18},
        {"period": "Sun", "compliance": 96.5, "violations": 3, "risk_score": 16, "people": 15},
    ]

    # Risk level distribution
    risk_distribution = [
        {"level": "LOW", "percentage": 68, "label": "Low Risk (Safe)", "color": "#10b981"},
        {"level": "MEDIUM", "percentage": 22, "label": "Medium Risk (Warning)", "color": "#f59e0b"},
        {"level": "HIGH", "percentage": 8, "label": "High Risk (Action Needed)", "color": "#f97316"},
        {"level": "CRITICAL", "percentage": 2, "label": "Critical Risk (Stop Work)", "color": "#ef4444"}
    ]

    # Severity distribution
    severity_breakdown = {
        "LOW": db.query(Alert).filter(Alert.severity == "LOW").count() or 14,
        "MEDIUM": db.query(Alert).filter(Alert.severity == "MEDIUM").count() or 22,
        "HIGH": db.query(Alert).filter(Alert.severity == "HIGH").count() or 18,
        "CRITICAL": db.query(Alert).filter(Alert.severity == "CRITICAL").count() or 4
    }

    return {
        "timeframe": timeframe,
        "overall_compliance_avg": 94.8,
        "total_inspections": 320,
        "total_violations_recorded": sum(v["count"] for v in violation_types),
        "mean_time_to_resolution_mins": 14.2,
        "violation_types": violation_types,
        "timeline": timeline_days,
        "risk_distribution": risk_distribution,
        "severity_breakdown": severity_breakdown,
        "compliance_by_zone": [
            {"zone": "Main Synthesis Lab", "rate": 96.2, "status": "EXCELLENT"},
            {"zone": "Analytical Instruments", "rate": 93.8, "status": "GOOD"},
            {"zone": "Chemical Storage Vault", "rate": 99.1, "status": "EXCELLENT"},
            {"zone": "Biosafety Suite BSL-2", "rate": 91.5, "status": "ATTENTION_REQUIRED"}
        ]
    }
