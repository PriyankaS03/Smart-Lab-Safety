from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    confidence: float
    class_id: int
    class_name: str  # person, lab_coat, gloves, safety_goggles, mask

class PersonPPEStatus(BaseModel):
    person_index: int
    bounding_box: BoundingBox
    has_lab_coat: bool
    has_gloves: bool
    has_safety_goggles: bool
    has_mask: bool
    compliance_score: float
    status: str  # COMPLIANT, PARTIAL, VIOLATION
    missing_items: List[str]

class DetectionRequest(BaseModel):
    image_base64: Optional[str] = None
    source: str = "webcam"
    is_demo: bool = False
    confidence_threshold: Optional[float] = 0.45

class DetectionResponse(BaseModel):
    detection_id: str
    timestamp: str
    is_demo: bool
    model_status: str  # "LOADED_CUSTOM_MODEL" or "SMART_SIMULATION"
    people_count: int
    overall_compliance: float
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    persons: List[PersonPPEStatus]
    raw_boxes: List[BoundingBox]
    alerts_triggered: List[str]
    lab_coat_count: int
    gloves_count: int
    goggles_count: int
    mask_count: int
