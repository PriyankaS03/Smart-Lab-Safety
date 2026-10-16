from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database.db import get_db
from backend.database.models import Detection, PPEEvent, Alert, RiskEvent
from backend.services.yolo_detector import YOLODetector
from backend.services.alert_service import AlertService
from backend.services.risk_calculator import RiskCalculator
from backend.schemas.detection import DetectionRequest, DetectionResponse
from datetime import datetime

router = APIRouter(prefix="/api/detection", tags=["PPE Detection"])
detector = YOLODetector()

@router.get("/model-status")
def get_model_status():
    return detector.get_model_status()

@router.post("/detect", response_model=DetectionResponse)
def run_detection(req: DetectionRequest, db: Session = Depends(get_db)):
    result = detector.detect(
        image_data=req.image_base64,
        confidence_threshold=req.confidence_threshold or 0.45,
        is_demo=req.is_demo,
        scenario="random"
    )

    # Persist detection in DB
    detection_record = Detection(
        id=result["detection_id"],
        timestamp=datetime.utcnow(),
        source=req.source,
        people_count=result["people_count"],
        compliance_score=result["overall_compliance"],
        risk_level=result["risk_level"],
        is_demo=result["is_demo"],
        raw_detections=result["raw_boxes"]
    )
    db.add(detection_record)

    # Generate alerts if violations found
    new_alerts = AlertService.evaluate_ppe_alerts(result, source=req.source.upper())
    for alt in new_alerts:
        db_alert = Alert(
            id=alt["id"],
            alert_type=alt["alert_type"],
            severity=alt["severity"],
            message=alt["message"],
            time=datetime.utcnow(),
            status="ACTIVE",
            source=alt["source"],
            detection_id=result["detection_id"]
        )
        db.add(db_alert)

    # Calculate and store risk event
    risk_data = RiskCalculator.calculate_detection_risk(result["persons"])
    risk_record = RiskEvent(
        timestamp=datetime.utcnow(),
        risk_level=risk_data["level"],
        risk_score=risk_data["score"],
        violation_count=risk_data["violation_count"],
        primary_threat="Missing PPE" if risk_data["violation_count"] > 0 else "Routine Operation"
    )
    db.add(risk_record)

    db.commit()

    return result
