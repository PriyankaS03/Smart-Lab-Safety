from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class IncidentBase(BaseModel):
    incident_type: str
    title: str
    description: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    status: str = "OPEN"  # OPEN, INVESTIGATING, RESOLVED
    location: str = "Main Laboratory 3B"
    reported_by: str = "Smart Lab AI Safety Agent"
    related_detection: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentResolve(BaseModel):
    resolution_notes: str

class IncidentOut(IncidentBase):
    id: str
    date_time: str
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True
