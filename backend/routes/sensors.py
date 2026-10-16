"""
Virtual Sensor Monitoring Routes
----------------------------------
Prefix: /api/sensors

Endpoints:
  GET  /current          – latest reading (live-poll)
  GET  /history          – historical readings (paginated)
  GET  /thresholds       – current threshold config
  POST /thresholds       – update threshold config
  GET  /alerts           – sensor-triggered alerts
  POST /alerts/{id}/resolve
  GET  /risk             – latest fused risk score
  GET  /risk/history     – fused risk history
  POST /simulation/start
  POST /simulation/pause
  POST /simulation/reset
  POST /simulation/trigger-event
  GET  /simulation/status
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.db import get_db
from backend.database.models import (
    Alert,
    Incident,
    RiskEvent,
    SensorAlert,
    SensorReading,
    SensorThreshold,
    RiskFusionEvent,
)
from backend.services.sensor_simulator import get_simulator
from backend.services.sensor_fusion import SensorFusionEngine

router = APIRouter(prefix="/api/sensors", tags=["Virtual Sensor Monitoring"])

# ── Default thresholds (safe lab baselines) ───────────────────────────────────
DEFAULT_THRESHOLDS = [
    {"sensor_name": "temperature",       "label": "Room Temperature",      "unit": "°C",  "warn_threshold": 32.0, "critical_threshold": 40.0, "direction": "HIGH"},
    {"sensor_name": "humidity",          "label": "Relative Humidity",     "unit": "%",   "warn_threshold": 70.0, "critical_threshold": 85.0, "direction": "HIGH"},
    {"sensor_name": "gas_concentration", "label": "Gas Concentration",     "unit": "ppm", "warn_threshold": 50.0, "critical_threshold": 100.0,"direction": "HIGH"},
    {"sensor_name": "smoke_level",       "label": "Smoke Level",           "unit": "idx", "warn_threshold": 25.0, "critical_threshold": 50.0, "direction": "HIGH"},
    {"sensor_name": "air_quality",       "label": "Air Quality Index (AQI)","unit": "AQI","warn_threshold": 100.0,"critical_threshold": 200.0,"direction": "HIGH"},
    # Ventilation is handled as a categorical field, not threshold
]


def _ensure_thresholds(db: Session) -> List[SensorThreshold]:
    """Seed defaults if the table is empty."""
    existing = db.query(SensorThreshold).all()
    if not existing:
        for d in DEFAULT_THRESHOLDS:
            db.add(SensorThreshold(**d))
        db.commit()
        existing = db.query(SensorThreshold).all()
    return existing


def _thresholds_as_dict(thresholds: List[SensorThreshold]) -> Dict[str, Dict[str, Any]]:
    return {
        t.sensor_name: {
            "warn_threshold":     t.warn_threshold,
            "critical_threshold": t.critical_threshold,
            "direction":          t.direction,
            "label":              t.label,
            "unit":               t.unit,
        }
        for t in thresholds
    }


# ── Persist callback wired to simulator ───────────────────────────────────────

def _make_persist_callback():
    """Returns a closure that saves each tick to DB and checks thresholds."""
    from backend.database.db import SessionLocal

    def _persist(reading: Dict[str, Any]):
        db = SessionLocal()
        try:
            thresholds_list = _ensure_thresholds(db)
            thr_dict = _thresholds_as_dict(thresholds_list)

            any_crossed = False
            for sensor_name, thr in thr_dict.items():
                value = reading.get(sensor_name)
                if value is None:
                    continue
                direction = thr["direction"]
                crit = thr["critical_threshold"]
                warn = thr["warn_threshold"]
                unit = thr["unit"]
                label = thr["label"]

                severity = None
                threshold_val = None
                if direction == "HIGH":
                    if value >= crit:
                        severity = "CRITICAL"
                        threshold_val = crit
                    elif value >= warn:
                        severity = "WARNING"
                        threshold_val = warn
                else:
                    if value <= crit:
                        severity = "CRITICAL"
                        threshold_val = crit
                    elif value <= warn:
                        severity = "WARNING"
                        threshold_val = warn

                if severity:
                    any_crossed = True
                    # Check if we already have an ACTIVE alert for this sensor
                    # in the last 60 s to avoid flooding
                    recent_active = (
                        db.query(SensorAlert)
                        .filter(
                            SensorAlert.sensor_name == sensor_name,
                            SensorAlert.status == "ACTIVE",
                        )
                        .first()
                    )
                    if not recent_active:
                        expl, action = _build_explanation(sensor_name, label, value, threshold_val, severity, unit, direction)
                        sa = SensorAlert(
                            sensor_name=sensor_name,
                            severity=severity,
                            reading_value=round(value, 2),
                            threshold_value=round(threshold_val, 2),
                            unit=unit,
                            explanation=expl,
                            recommended_action=action,
                            status="ACTIVE",
                        )
                        db.add(sa)

                        # Also write to the shared alerts table so the existing
                        # Safety Alerts page picks it up automatically
                        shared_alert = Alert(
                            id=f"sen_{uuid.uuid4().hex[:10]}",
                            alert_type=f"Sensor: {label} threshold crossed",
                            severity="CRITICAL" if severity == "CRITICAL" else "HIGH",
                            message=expl,
                            time=datetime.utcnow(),
                            status="ACTIVE",
                            source="VIRTUAL_SENSOR",
                        )
                        db.add(shared_alert)

            # Save reading row
            ts_str = reading.get("timestamp", datetime.utcnow().isoformat())
            if isinstance(ts_str, str):
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    ts = datetime.utcnow()
            else:
                ts = datetime.utcnow()

            sr = SensorReading(
                timestamp=ts,
                temperature=reading["temperature"],
                humidity=reading["humidity"],
                gas_concentration=reading["gas_concentration"],
                smoke_level=reading["smoke_level"],
                air_quality=reading["air_quality"],
                ventilation_status=reading["ventilation_status"],
                any_threshold_crossed=any_crossed,
                data_source="VIRTUAL_SENSOR",
            )
            db.add(sr)
            db.commit()
            db.refresh(sr)

            # Compute and store fused risk event every tick
            latest_risk = db.query(RiskEvent).order_by(RiskEvent.timestamp.desc()).first()
            ppe_score = latest_risk.risk_score if latest_risk else 0.0

            active_alerts = db.query(Alert).filter(Alert.status == "ACTIVE").count()
            open_incidents = db.query(Incident).filter(Incident.status != "RESOLVED").count()
            active_sensor_alerts = db.query(SensorAlert).filter(SensorAlert.status == "ACTIVE").count()

            reading_dict = {
                "temperature":        sr.temperature,
                "humidity":           sr.humidity,
                "gas_concentration":  sr.gas_concentration,
                "smoke_level":        sr.smoke_level,
                "air_quality":        sr.air_quality,
                "ventilation_status": sr.ventilation_status,
            }
            fusion = SensorFusionEngine.calculate(
                sensor_reading=reading_dict,
                thresholds=thr_dict,
                latest_ppe_risk_score=ppe_score,
                active_alert_count=active_alerts,
                open_incident_count=open_incidents,
                active_sensor_alerts=active_sensor_alerts,
            )
            rfe = RiskFusionEvent(
                sensor_score=fusion["sensor_score"],
                ppe_score=fusion["ppe_score"],
                incident_score=fusion["incident_score"],
                fused_score=fusion["fused_score"],
                risk_level=fusion["risk_level"],
                explanation=fusion["explanation"],
                sensor_reading_id=sr.id,
            )
            db.add(rfe)
            db.commit()

        except Exception as exc:
            db.rollback()
            print(f"[SensorRoute] persist error: {exc}")
        finally:
            db.close()

    return _persist


def _build_explanation(
    sensor_name: str, label: str, value: float,
    threshold: float, severity: str, unit: str, direction: str
) -> tuple:
    """Generate human-readable explanation and recommended action."""
    dir_word = "above" if direction == "HIGH" else "below"
    expl = (
        f"[SIMULATED] {label} reading {value:.1f} {unit} is {dir_word} "
        f"the {severity.lower()} threshold of {threshold:.1f} {unit}. "
        f"Data source: VIRTUAL_SENSOR."
    )
    actions = {
        "temperature":       "Check lab HVAC, evacuate if >45°C. Close fume hoods.",
        "gas_concentration": "Activate emergency gas shutoff. Evacuate and ventilate.",
        "smoke_level":       "Activate fire suppression protocol. Pull fire alarm.",
        "humidity":          "Check dehumidifier systems. High humidity promotes mould and corrosion.",
        "air_quality":       "Increase ventilation. Avoid lab entry without respiratory protection.",
    }
    action = actions.get(sensor_name, "Inspect sensor and notify lab safety officer.")
    return expl, action


# ── Simulation must be auto-started once when module loads ────────────────────
_sim_started = False


def _ensure_sim_started():
    global _sim_started
    if not _sim_started:
        sim = get_simulator()
        if not sim.is_running():
            sim.start(persist_callback=_make_persist_callback())
        _sim_started = True


# ── Pydantic I/O models ───────────────────────────────────────────────────────

class ThresholdUpdate(BaseModel):
    sensor_name: str
    warn_threshold: float
    critical_threshold: float
    direction: str = "HIGH"


class SimulationControl(BaseModel):
    event_type: Optional[str] = "gas_leak"


# ── Route handlers ────────────────────────────────────────────────────────────

@router.get("/current")
def get_current_reading():
    """Return the latest simulated sensor values (not from DB – in-memory)."""
    _ensure_sim_started()
    sim = get_simulator()
    return sim.get_current_reading()


@router.get("/history")
def get_sensor_history(limit: int = Query(100, le=500), db: Session = Depends(get_db)):
    """Return recent stored sensor readings from SQLite."""
    rows = (
        db.query(SensorReading)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":                 r.id,
            "timestamp":         r.timestamp.isoformat(),
            "temperature":        r.temperature,
            "humidity":           r.humidity,
            "gas_concentration":  r.gas_concentration,
            "smoke_level":        r.smoke_level,
            "air_quality":        r.air_quality,
            "ventilation_status": r.ventilation_status,
            "any_threshold_crossed": r.any_threshold_crossed,
            "data_source":        r.data_source,
        }
        for r in rows
    ]


@router.get("/thresholds")
def get_thresholds(db: Session = Depends(get_db)):
    thresholds = _ensure_thresholds(db)
    return [
        {
            "sensor_name":        t.sensor_name,
            "label":              t.label,
            "unit":               t.unit,
            "warn_threshold":     t.warn_threshold,
            "critical_threshold": t.critical_threshold,
            "direction":          t.direction,
        }
        for t in thresholds
    ]


@router.post("/thresholds")
def update_thresholds(updates: List[ThresholdUpdate], db: Session = Depends(get_db)):
    for upd in updates:
        record = (
            db.query(SensorThreshold)
            .filter(SensorThreshold.sensor_name == upd.sensor_name)
            .first()
        )
        if record:
            record.warn_threshold = upd.warn_threshold
            record.critical_threshold = upd.critical_threshold
            record.direction = upd.direction
            record.updated_at = datetime.utcnow()
        else:
            # Shouldn't happen after seed, but handle gracefully
            db.add(SensorThreshold(
                sensor_name=upd.sensor_name,
                label=upd.sensor_name.replace("_", " ").title(),
                unit="",
                warn_threshold=upd.warn_threshold,
                critical_threshold=upd.critical_threshold,
                direction=upd.direction,
            ))
    db.commit()
    return {"status": "saved", "count": len(updates)}


@router.get("/alerts")
def get_sensor_alerts(
    status: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(SensorAlert)
    if status:
        q = q.filter(SensorAlert.status == status)
    rows = q.order_by(SensorAlert.timestamp.desc()).limit(limit).all()
    return [
        {
            "id":               r.id,
            "timestamp":        r.timestamp.isoformat(),
            "sensor_name":      r.sensor_name,
            "severity":         r.severity,
            "reading_value":    r.reading_value,
            "threshold_value":  r.threshold_value,
            "unit":             r.unit,
            "explanation":      r.explanation,
            "recommended_action": r.recommended_action,
            "status":           r.status,
            "resolved_at":      r.resolved_at.isoformat() if r.resolved_at else None,
        }
        for r in rows
    ]


@router.post("/alerts/{alert_id}/resolve")
def resolve_sensor_alert(alert_id: int, db: Session = Depends(get_db)):
    sa = db.query(SensorAlert).filter(SensorAlert.id == alert_id).first()
    if not sa:
        raise HTTPException(status_code=404, detail="Sensor alert not found")
    sa.status = "RESOLVED"
    sa.resolved_at = datetime.utcnow()
    db.commit()
    return {"status": "resolved", "id": alert_id}


@router.get("/risk")
def get_risk_fusion(db: Session = Depends(get_db)):
    """Return the most recent fused risk score."""
    _ensure_sim_started()
    latest = db.query(RiskFusionEvent).order_by(RiskFusionEvent.timestamp.desc()).first()
    if not latest:
        # Return a default LOW score if simulation just started
        return {
            "fused_score": 0.0,
            "risk_level": "LOW",
            "sensor_score": 0.0,
            "ppe_score": 0.0,
            "incident_score": 0.0,
            "explanation": ["Sensor simulation starting – no data yet."],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    return {
        "fused_score":    latest.fused_score,
        "risk_level":     latest.risk_level,
        "sensor_score":   latest.sensor_score,
        "ppe_score":      latest.ppe_score,
        "incident_score": latest.incident_score,
        "explanation":    latest.explanation or [],
        "timestamp":      latest.timestamp.isoformat(),
    }


@router.get("/risk/history")
def get_risk_history(limit: int = Query(50, le=200), db: Session = Depends(get_db)):
    rows = (
        db.query(RiskFusionEvent)
        .order_by(RiskFusionEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":             r.id,
            "timestamp":      r.timestamp.isoformat(),
            "fused_score":    r.fused_score,
            "risk_level":     r.risk_level,
            "sensor_score":   r.sensor_score,
            "ppe_score":      r.ppe_score,
            "incident_score": r.incident_score,
            "explanation":    r.explanation or [],
        }
        for r in rows
    ]


@router.post("/simulation/start")
def start_simulation():
    _ensure_sim_started()
    sim = get_simulator()
    if sim.is_paused():
        sim.resume()
        return {"status": "resumed"}
    sim.start(persist_callback=_make_persist_callback())
    return {"status": "started"}


@router.post("/simulation/pause")
def pause_simulation():
    get_simulator().pause()
    return {"status": "paused"}


@router.post("/simulation/reset")
def reset_simulation():
    get_simulator().reset_to_normal()
    return {"status": "reset_to_normal"}


@router.post("/simulation/trigger-event")
def trigger_test_event(body: SimulationControl):
    valid = {"gas_leak", "fire", "chemical_spill", "ventilation_failure", "high_temp"}
    event = body.event_type if body.event_type in valid else "gas_leak"
    _ensure_sim_started()
    get_simulator().trigger_test_event(event)
    return {"status": "event_triggered", "event_type": event}


@router.get("/simulation/status")
def simulation_status():
    sim = get_simulator()
    return {
        "is_running": sim.is_running(),
        "is_paused":  sim.is_paused(),
        "tick_count": sim.get_current_reading().get("tick_count", 0),
        "data_source_label": "VIRTUAL_SENSOR – all readings are software-simulated",
    }
