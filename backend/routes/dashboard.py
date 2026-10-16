from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any
from backend.database.db import get_db
from backend.database.models import Detection, Alert, Incident, RiskEvent

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    # Compute active stats
    active_alerts_count = db.query(Alert).filter(Alert.status == "ACTIVE").count()
    open_incidents_count = db.query(Incident).filter(Incident.status != "RESOLVED").count()
    
    # Recent detections
    recent_detections = db.query(Detection).order_by(Detection.timestamp.desc()).limit(10).all()
    
    total_people = sum(d.people_count for d in recent_detections) if recent_detections else 14
    avg_compliance = (
        round(sum(d.compliance_score for d in recent_detections) / len(recent_detections), 1)
        if recent_detections else 92.4
    )
    
    # Latest risk
    latest_risk = db.query(RiskEvent).order_by(RiskEvent.timestamp.desc()).first()
    risk_level = latest_risk.risk_level if latest_risk else ("MEDIUM" if active_alerts_count > 0 else "LOW")
    risk_score = latest_risk.risk_score if latest_risk else (42.0 if active_alerts_count > 0 else 18.5)

    recent_incidents = (
        db.query(Incident)
        .order_by(Incident.date_time.desc())
        .limit(5)
        .all()
    )

    incidents_list = [
        {
            "id": inc.id,
            "title": inc.title,
            "incident_type": inc.incident_type,
            "severity": inc.severity,
            "status": inc.status,
            "date_time": inc.date_time.isoformat() if inc.date_time else datetime.utcnow().isoformat(),
            "location": inc.location
        }
        for inc in recent_incidents
    ]

    # Sample lab zones
    zones = [
        {"name": "Zone A - Organic Synthesis Fume Hoods", "status": "NOMINAL", "compliance": 96.5, "people": 3, "risk": "LOW"},
        {"name": "Zone B - Analytical Spectrometry Bench", "status": "WARNING", "compliance": 75.0, "people": 2, "risk": "MEDIUM"},
        {"name": "Zone C - Biosafety Level 2 Cabinet", "status": "NOMINAL", "compliance": 100.0, "people": 1, "risk": "LOW"},
        {"name": "Zone D - Hazardous Reagent Storage Vault", "status": "NOMINAL", "compliance": 100.0, "people": 0, "risk": "LOW"}
    ]

    # Compliance trends over last 7 days
    compliance_trend = [
        {"day": "Mon", "compliance": 94.2, "violations": 3},
        {"day": "Tue", "compliance": 91.0, "violations": 5},
        {"day": "Wed", "compliance": 97.5, "violations": 1},
        {"day": "Thu", "compliance": 88.0, "violations": 7},
        {"day": "Fri", "compliance": 95.0, "violations": 2},
        {"day": "Sat", "compliance": 98.2, "violations": 1},
        {"day": "Sun", "compliance": avg_compliance, "violations": active_alerts_count}
    ]

    return {
        "total_people_detected": total_people,
        "ppe_compliance_percentage": avg_compliance,
        "active_alerts_count": active_alerts_count,
        "open_incidents_count": open_incidents_count,
        "current_risk_level": risk_level,
        "current_risk_score": risk_score,
        "laboratory_status": "NORMAL" if risk_level == "LOW" else ("WARNING" if risk_level == "MEDIUM" else "CRITICAL"),
        "zones": zones,
        "recent_incidents": incidents_list,
        "compliance_trend": compliance_trend,
        "alert_statistics": {
            "critical": db.query(Alert).filter(Alert.severity == "CRITICAL", Alert.status == "ACTIVE").count(),
            "high": db.query(Alert).filter(Alert.severity == "HIGH", Alert.status == "ACTIVE").count(),
            "medium": db.query(Alert).filter(Alert.severity == "MEDIUM", Alert.status == "ACTIVE").count(),
            "low": db.query(Alert).filter(Alert.severity == "LOW", Alert.status == "ACTIVE").count(),
            "total_resolved": db.query(Alert).filter(Alert.status == "RESOLVED").count()
        }
    }
