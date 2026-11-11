from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    role = Column(String(50), default="student")  # admin, assistant, student
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(Text, nullable=True)
    password_salt = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Detection(Base):
    __tablename__ = "detections"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    source = Column(String(50), default="live_camera")  # live_camera, image_upload, video_upload, demo
    people_count = Column(Integer, default=0)
    compliance_score = Column(Float, default=100.0)
    risk_level = Column(String(20), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    is_demo = Column(Boolean, default=False)
    image_url = Column(Text, nullable=True)
    raw_detections = Column(JSON, nullable=True)  # List of bounding boxes and classes

    ppe_events = relationship("PPEEvent", back_populates="detection", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="detection")

class PPEEvent(Base):
    __tablename__ = "ppe_events"

    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(String(64), ForeignKey("detections.id"), nullable=False)
    person_index = Column(Integer, default=0)
    has_lab_coat = Column(Boolean, default=True)
    has_gloves = Column(Boolean, default=True)
    has_safety_goggles = Column(Boolean, default=True)
    has_mask = Column(Boolean, default=True)
    compliance_percentage = Column(Float, default=100.0)
    status = Column(String(30), default="COMPLIANT")  # COMPLIANT, WARNING, VIOLATION
    created_at = Column(DateTime, default=datetime.utcnow)

    detection = relationship("Detection", back_populates="ppe_events")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    alert_type = Column(String(80), nullable=False, index=True)  # Missing lab coat, Chemical spill, Fire, Gas leak, etc.
    severity = Column(String(20), nullable=False, index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    message = Column(Text, nullable=False)
    time = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(30), default="ACTIVE", index=True)  # ACTIVE, ACKNOWLEDGED, RESOLVED
    source = Column(String(50), default="AI_DETECTION")  # AI_DETECTION, SENSOR, MANUAL_REPORT, SYSTEM
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    detection_id = Column(String(64), ForeignKey("detections.id"), nullable=True)

    detection = relationship("Detection", back_populates="alerts")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(64), primary_key=True, index=True)
    incident_type = Column(String(80), nullable=False)  # PPE Violation, Chemical Spill, Thermal/Fire Risk, Gas Leak, Equipment Hazard
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    date_time = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String(30), default="OPEN", index=True)  # OPEN, INVESTIGATING, RESOLVED
    resolution_notes = Column(Text, nullable=True)
    related_detection = Column(String(64), nullable=True)
    location = Column(String(100), default="Main Chemistry Lab 3B")
    reported_by = Column(String(100), default="Smart Lab AI Safety Agent")

class RiskEvent(Base):
    __tablename__ = "risk_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    risk_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, nullable=False)  # 0 to 100
    violation_count = Column(Integer, default=0)
    primary_threat = Column(String(100), default="Routine Operation")
    zone = Column(String(50), default="Zone A - Fume Hoods")

class SafetyQuestion(Base):
    __tablename__ = "safety_questions"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_document = Column(String(100), nullable=True)
    relevance_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    category = Column(String(50), default="general")
    updated_at = Column(DateTime, default=datetime.utcnow)


# ──────────────────────────────────────────────────────────────────────────────
# Virtual Sensor Monitoring Models
# ──────────────────────────────────────────────────────────────────────────────

class SensorReading(Base):
    """One row per simulation tick; stores all six simulated sensor values."""
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    # Simulated environmental values
    temperature = Column(Float, nullable=False)           # °C
    humidity = Column(Float, nullable=False)              # %
    gas_concentration = Column(Float, nullable=False)     # ppm
    smoke_level = Column(Float, nullable=False)           # 0-100 index
    air_quality = Column(Float, nullable=False)           # AQI index 0-500
    ventilation_status = Column(String(20), nullable=False)  # NORMAL | REDUCED | FAILED
    # Derived sensor status flags
    any_threshold_crossed = Column(Boolean, default=False)
    data_source = Column(String(30), default="VIRTUAL_SENSOR")  # VIRTUAL_SENSOR always


class SensorThreshold(Base):
    """User-configurable warning and critical thresholds per sensor metric."""
    __tablename__ = "sensor_thresholds"

    id = Column(Integer, primary_key=True, index=True)
    sensor_name = Column(String(50), unique=True, nullable=False, index=True)
    # Human-readable display label
    label = Column(String(100), nullable=False)
    unit = Column(String(20), default="")
    warn_threshold = Column(Float, nullable=False)
    critical_threshold = Column(Float, nullable=False)
    # Whether higher or lower values are dangerous
    direction = Column(String(10), default="HIGH")  # HIGH = bad when above, LOW = bad when below
    updated_at = Column(DateTime, default=datetime.utcnow)


class SensorAlert(Base):
    """Alert records produced when sensor readings cross configured thresholds."""
    __tablename__ = "sensor_alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sensor_name = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)  # WARNING | CRITICAL
    reading_value = Column(Float, nullable=False)
    threshold_value = Column(Float, nullable=False)
    unit = Column(String(20), default="")
    explanation = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    status = Column(String(20), default="ACTIVE")  # ACTIVE | RESOLVED
    resolved_at = Column(DateTime, nullable=True)


class RiskFusionEvent(Base):
    """Unified explainable risk score combining sensor data + PPE violations + safety events."""
    __tablename__ = "risk_fusion_events"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    # Component scores (0-100 each)
    sensor_score = Column(Float, default=0.0)       # derived from environmental sensors
    ppe_score = Column(Float, default=0.0)          # from latest YOLO detection
    incident_score = Column(Float, default=0.0)     # from open incidents / active alerts
    # Fused composite score
    fused_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)  # LOW | MEDIUM | HIGH | CRITICAL
    # Explanation breakdown as JSON list of contributing factors
    explanation = Column(JSON, nullable=True)
    # Snapshot context
    sensor_reading_id = Column(Integer, ForeignKey("sensor_readings.id"), nullable=True)
