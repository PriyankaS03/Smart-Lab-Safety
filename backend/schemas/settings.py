from pydantic import BaseModel
from typing import Dict, Any

class SettingsModel(BaseModel):
    confidence_threshold: float = 0.45
    model_path: str = "backend/models/best.pt"
    require_lab_coat: bool = True
    require_gloves: bool = True
    require_safety_goggles: bool = True
    require_mask: bool = True
    auto_alert_violations: bool = True
    sound_alerts_enabled: bool = True
    risk_level_critical_threshold: int = 80
    risk_level_high_threshold: int = 60
    risk_level_medium_threshold: int = 30
    demo_mode_default: bool = True
