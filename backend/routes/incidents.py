from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid
from backend.database.db import get_db
from backend.database.models import Incident
from backend.schemas.incident import IncidentOut, IncidentCreate, IncidentResolve

router = APIRouter(prefix="/api/incidents", tags=["Incident Management"])

@router.get("", response_model=List[IncidentOut])
def get_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if search:
        s = f"%{search}%"
        query = query.filter((Incident.title.ilike(s)) | (Incident.description.ilike(s)))

    incidents = query.order_by(Incident.date_time.desc()).all()
    return [
        IncidentOut(
            id=i.id,
            incident_type=i.incident_type,
            title=i.title,
            description=i.description,
            severity=i.severity,
            status=i.status,
            date_time=i.date_time.isoformat() if i.date_time else datetime.utcnow().isoformat(),
            resolution_notes=i.resolution_notes,
            location=i.location,
            reported_by=i.reported_by,
            related_detection=i.related_detection
        )
        for i in incidents
    ]

@router.post("", response_model=IncidentOut)
def create_incident(inc_in: IncidentCreate, db: Session = Depends(get_db)):
    new_id = f"inc_{uuid.uuid4().hex[:8]}"
    incident = Incident(
        id=new_id,
        incident_type=inc_in.incident_type,
        title=inc_in.title,
        description=inc_in.description,
        severity=inc_in.severity,
        status=inc_in.status,
        date_time=datetime.utcnow(),
        location=inc_in.location,
        reported_by=inc_in.reported_by,
        related_detection=inc_in.related_detection
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return IncidentOut(
        id=incident.id,
        incident_type=incident.incident_type,
        title=incident.title,
        description=incident.description,
        severity=incident.severity,
        status=incident.status,
        date_time=incident.date_time.isoformat(),
        location=incident.location,
        reported_by=incident.reported_by,
        related_detection=incident.related_detection
    )

@router.put("/{incident_id}/resolve", response_model=IncidentOut)
def resolve_incident(incident_id: str, res: IncidentResolve, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    inc.status = "RESOLVED"
    inc.resolution_notes = res.resolution_notes
    db.commit()
    db.refresh(inc)

    return IncidentOut(
        id=inc.id,
        incident_type=inc.incident_type,
        title=inc.title,
        description=inc.description,
        severity=inc.severity,
        status=inc.status,
        date_time=inc.date_time.isoformat(),
        resolution_notes=inc.resolution_notes,
        location=inc.location,
        reported_by=inc.reported_by,
        related_detection=inc.related_detection
    )
