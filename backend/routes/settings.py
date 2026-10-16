from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import json
from backend.database.db import get_db
from backend.database.models import SystemSetting
from backend.schemas.settings import SettingsModel

router = APIRouter(prefix="/api/settings", tags=["Settings"])

DEFAULT_SETTINGS = {
    "confidence_threshold": 0.45,
    "model_path": "backend/models/best.pt",
    "require_lab_coat": True,
    "require_gloves": True,
    "require_safety_goggles": True,
    "require_mask": True,
    "auto_alert_violations": True,
    "sound_alerts_enabled": True,
    "risk_level_critical_threshold": 80,
    "risk_level_high_threshold": 60,
    "risk_level_medium_threshold": 30,
    "demo_mode_default": True
}

@router.get("", response_model=SettingsModel)
def get_settings(db: Session = Depends(get_db)):
    record = db.query(SystemSetting).filter(SystemSetting.key == "global_config").first()
    if record:
        try:
            data = json.loads(record.value)
            return SettingsModel(**data)
        except Exception:
            pass
    return SettingsModel(**DEFAULT_SETTINGS)

@router.post("", response_model=SettingsModel)
def save_settings(settings: SettingsModel, db: Session = Depends(get_db)):
    record = db.query(SystemSetting).filter(SystemSetting.key == "global_config").first()
    payload = settings.dict()
    if record:
        record.value = json.dumps(payload)
    else:
        record = SystemSetting(key="global_config", value=json.dumps(payload), category="detection_config")
        db.add(record)
    db.commit()
    return settings
