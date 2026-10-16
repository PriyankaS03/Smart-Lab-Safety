from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AlertBase(BaseModel):
    alert_type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    message: str
    status: str = "ACTIVE"  # ACTIVE, ACKNOWLEDGED, RESOLVED
    source: str = "AI_DETECTION"
    detection_id: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertResolve(BaseModel):
    resolution_notes: str

class AlertOut(AlertBase):
    id: str
    time: str
    resolution_notes: Optional[str] = None
    resolved_at: Optional[str] = None

    class Config:
        from_attributes = True

class AlertFilter(BaseModel):
    severity: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
