import os
from pathlib import Path
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Initialize and verify configuration from root .env
from backend import config
if config.is_roboflow_configured():
    print(f"[Startup] ROBOFLOW_API_KEY loaded successfully from root .env.")
else:
    print("[Startup] ROBOFLOW_API_KEY not found in root .env.")

from backend.database.db import engine, Base, SessionLocal
from backend.database.models import (
    User, Alert, Incident, RiskEvent, Detection,
    SensorReading, SensorThreshold, SensorAlert, RiskFusionEvent
)
from backend.routes import (
    dashboard,
    detection,
    alerts,
    incidents,
    analytics,
    assistant,
    safety_docs,
    settings,
    sensors
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Ensure schema compatibility for existing sqlite databases
from sqlalchemy import text
with engine.connect() as _conn:
    try:
        _conn.execute(text("ALTER TABLE detections ADD COLUMN image_url TEXT"))
        _conn.commit()
    except Exception:
        pass

def seed_initial_demo_data():
    """Seeds rich demonstration data so the dashboard is immediately operational."""
    db = SessionLocal()
    try:
        if db.query(Alert).count() == 0:
            initial_alerts = [
                Alert(
                    id="alt_init_001",
                    alert_type="Missing safety goggles",
                    severity="HIGH",
                    message="Person #1 detected in Organic Synthesis Zone without ANSI Z87.1 splash goggles.",
                    time=datetime.utcnow(),
                    status="ACTIVE",
                    source="AI_DETECTION"
                ),
                Alert(
                    id="alt_init_002",
                    alert_type="Missing gloves",
                    severity="MEDIUM",
                    message="Person #2 pipetting organic reagents without nitrile hand protection.",
                    time=datetime.utcnow(),
                    status="ACTIVE",
                    source="AI_DETECTION"
                ),
                Alert(
                    id="alt_init_003",
                    alert_type="Chemical spill",
                    severity="HIGH",
                    message="Small volume nitric acid spill contained in Fume Hood 2 dike perimeter.",
                    time=datetime.utcnow(),
                    status="RESOLVED",
                    source="SENSOR",
                    resolution_notes="Absorbed with sodium bicarbonate spill kit, pH tested 7.0.",
                    resolved_at=datetime.utcnow()
                ),
                Alert(
                    id="alt_init_004",
                    alert_type="Missing lab coat",
                    severity="MEDIUM",
                    message="Visitor entering Analytical Bench area without fastened coat.",
                    time=datetime.utcnow(),
                    status="RESOLVED",
                    source="AI_DETECTION",
                    resolution_notes="Visitor provided Nomex coat from vestibule.",
                    resolved_at=datetime.utcnow()
                )
            ]
            db.add_all(initial_alerts)

        if db.query(Incident).count() == 0:
            initial_incidents = [
                Incident(
                    id="inc_2026_01",
                    incident_type="PPE Violation",
                    title="Repeated Missing Goggles during Acid Digestion",
                    description="Automated AI camera recorded technician handling 6M HCl without secondary eye shield or splash goggles.",
                    severity="HIGH",
                    status="INVESTIGATING",
                    date_time=datetime.utcnow(),
                    location="Synthesis Lab Room 302",
                    reported_by="AI Smart Lab Vision Agent",
                    resolution_notes="Safety officer notified; mandatory retraining scheduled."
                ),
                Incident(
                    id="inc_2026_02",
                    incident_type="Chemical Spill",
                    title="Isopropanol Solvent Runoff on Floor Bench",
                    description="Solvent wash bottle leaked approximately 150 mL isopropanol onto bench linoleum.",
                    severity="MEDIUM",
                    status="RESOLVED",
                    date_time=datetime.utcnow(),
                    location="Analytical Bench Station 4",
                    reported_by="Dr. Aris Thorne",
                    resolution_notes="Polypropylene absorbent pads deployed; ventilated for 30 minutes."
                ),
                Incident(
                    id="inc_2026_03",
                    incident_type="Gas Leak",
                    title="Nitrogen Boil-off Pressure Sensor Trigger",
                    description="Cryogenic liquid nitrogen cylinder dewar showed 15% pressure vent spike near cell culture incubators.",
                    severity="CRITICAL",
                    status="RESOLVED",
                    date_time=datetime.utcnow(),
                    location="Cryo Storage Facility",
                    reported_by="HVAC Monitoring Subsystem",
                    resolution_notes="Safety relief valve reseated; continuous oxygen monitoring read 20.8%."
                )
            ]
            db.add_all(initial_incidents)

        if db.query(RiskEvent).count() == 0:
            initial_risks = [
                RiskEvent(
                    timestamp=datetime.utcnow(),
                    risk_level="MEDIUM",
                    risk_score=38.5,
                    violation_count=2,
                    primary_threat="Missing Goggles & Gloves",
                    zone="Zone B - Analytical Spectrometry Bench"
                )
            ]
            db.add_all(initial_risks)

        db.commit()
    except Exception as e:
        print(f"[Seed] Error seeding demo data: {e}")
        db.rollback()
    finally:
        db.close()

seed_initial_demo_data()

app = FastAPI(
    title="Smart Lab Safety API",
    description="AI-Powered Laboratory Safety Monitoring & PPE Detection System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Setup CORS for React frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all modular routes
app.include_router(dashboard.router)
app.include_router(detection.router)
app.include_router(alerts.router)
app.include_router(incidents.router)
app.include_router(analytics.router)
app.include_router(assistant.router)
app.include_router(safety_docs.router)
app.include_router(settings.router)
app.include_router(sensors.router)

@app.get("/")
def root():
    return {
        "system": "Smart Lab Safety API",
        "status": "OPERATIONAL",
        "timestamp": datetime.utcnow().isoformat(),
        "documentation": "/docs"
    }

@app.get("/api/health")
def health():
    return {"status": "HEALTHY", "database": "SQLITE_CONNECTED"}
