from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
from backend.database.db import get_db
from backend.database.models import Alert
from backend.schemas.alert import AlertOut, AlertCreate, AlertResolve

router = APIRouter(prefix="/api/alerts", tags=["Safety Alerts"])

@router.get("", response_model=List[AlertOut])
def get_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    if source:
        query = query.filter(Alert.source == source)

    alerts = query.order_by(Alert.time.desc()).limit(limit).all()
    
    return [
        AlertOut(
            id=a.id,
            alert_type=a.alert_type,
            severity=a.severity,
            message=a.message,
            time=a.time.isoformat() if a.time else datetime.utcnow().isoformat(),
            status=a.status,
            source=a.source,
            resolution_notes=a.resolution_notes,
            resolved_at=a.resolved_at.isoformat() if a.resolved_at else None,
            detection_id=a.detection_id
        )
        for a in alerts
    ]

@router.post("", response_model=AlertOut)
def create_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    new_id = f"alt_{uuid.uuid4().hex[:10]}"
    alert = Alert(
        id=new_id,
        alert_type=alert_in.alert_type,
        severity=alert_in.severity,
        message=alert_in.message,
        status="ACTIVE",
        source=alert_in.source,
        time=datetime.utcnow(),
        detection_id=alert_in.detection_id
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return AlertOut(
        id=alert.id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        time=alert.time.isoformat(),
        status=alert.status,
        source=alert.source,
        detection_id=alert.detection_id
    )

@router.put("/{alert_id}/resolve", response_model=AlertOut)
def resolve_alert(alert_id: str, res: AlertResolve, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.status = "RESOLVED"
    alert.resolution_notes = res.resolution_notes
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    return AlertOut(
        id=alert.id,
        alert_type=alert.alert_type,
        severity=alert.severity,
        message=alert.message,
        time=alert.time.isoformat(),
        status=alert.status,
        source=alert.source,
        resolution_notes=alert.resolution_notes,
        resolved_at=alert.resolved_at.isoformat(),
        detection_id=alert.detection_id
    )
