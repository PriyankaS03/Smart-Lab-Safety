"""
Sensor Fusion Engine
---------------------
Combines three risk vectors into a single explainable composite score (0–100):

  1. Environmental sensor score   (40 % weight)
     Derived from current SensorReading values vs. user-configured thresholds.

  2. PPE compliance score         (40 % weight)
     From the latest YOLO Detection in the DB.

  3. Incident / alert score       (20 % weight)
     From the count and severity of currently-open safety alerts and incidents.

The engine returns a detailed explanation list so the UI can render why the
score is what it is – fulfilling requirement #5 (explainable risk score).
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Sensor-specific score weights (sum to 100 within the sensor component)
SENSOR_WEIGHTS = {
    "temperature":        25.0,
    "gas_concentration":  35.0,
    "smoke_level":        25.0,
    "humidity":           10.0,
    "air_quality":         5.0,
}

# Top-level component weights (must sum to 1.0)
COMPONENT_WEIGHTS = {
    "sensor":   0.40,
    "ppe":      0.40,
    "incident": 0.20,
}

VENTILATION_PENALTY = {"NORMAL": 0.0, "REDUCED": 8.0, "FAILED": 25.0}


class SensorFusionEngine:
    """
    Calculates an explainable composite risk score.
    Accepts pre-loaded data dicts; does NOT perform DB queries itself so it
    stays decoupled from database sessions.
    """

    @classmethod
    def calculate(
        cls,
        sensor_reading: Optional[Dict[str, Any]],
        thresholds: Dict[str, Dict[str, Any]],
        latest_ppe_risk_score: float,
        active_alert_count: int,
        open_incident_count: int,
        active_sensor_alerts: int,
    ) -> Dict[str, Any]:
        """
        Parameters
        ----------
        sensor_reading : latest SensorReading as dict (or None if not started)
        thresholds     : {sensor_name: {warn, critical, direction}} from DB
        latest_ppe_risk_score : 0-100 from the last RiskEvent
        active_alert_count    : safety alerts currently ACTIVE
        open_incident_count   : incidents not RESOLVED
        active_sensor_alerts  : unresolved SensorAlerts

        Returns
        -------
        {fused_score, risk_level, sensor_score, ppe_score, incident_score, explanation[]}
        """
        explanation: List[str] = []

        # 1 ─ Sensor component ────────────────────────────────────────────────
        sensor_score = 0.0
        if sensor_reading:
            for name, weight in SENSOR_WEIGHTS.items():
                value = sensor_reading.get(name, 0.0)
                thr = thresholds.get(name, {})
                warn = thr.get("warn_threshold", 9e9)
                crit = thr.get("critical_threshold", 9e9)
                direction = thr.get("direction", "HIGH")

                exceeded = False
                frac = 0.0

                if direction == "HIGH":
                    if value >= crit:
                        frac = 1.0
                        exceeded = True
                        explanation.append(
                            f"🔴 {name.replace('_', ' ').title()} {value:.1f} ≥ CRITICAL threshold {crit:.1f}"
                        )
                    elif value >= warn:
                        frac = 0.5
                        exceeded = True
                        explanation.append(
                            f"🟡 {name.replace('_', ' ').title()} {value:.1f} ≥ WARNING threshold {warn:.1f}"
                        )
                else:  # LOW direction (e.g. humidity too low)
                    if value <= crit:
                        frac = 1.0
                        exceeded = True
                        explanation.append(
                            f"🔴 {name.replace('_', ' ').title()} {value:.1f} ≤ CRITICAL low threshold {crit:.1f}"
                        )
                    elif value <= warn:
                        frac = 0.5
                        exceeded = True
                        explanation.append(
                            f"🟡 {name.replace('_', ' ').title()} {value:.1f} ≤ WARNING low threshold {warn:.1f}"
                        )

                sensor_score += frac * weight

            # Ventilation penalty
            vstate = sensor_reading.get("ventilation_status", "NORMAL")
            vpen = VENTILATION_PENALTY.get(vstate, 0.0)
            if vpen > 0:
                sensor_score = min(100.0, sensor_score + vpen)
                explanation.append(f"⚠️ Ventilation status: {vstate} (+{vpen:.0f} pts)")

        else:
            explanation.append("ℹ️ Sensor simulation not started – no environmental data.")

        sensor_score = min(100.0, max(0.0, round(sensor_score, 1)))

        # 2 ─ PPE component ───────────────────────────────────────────────────
        ppe_score = min(100.0, max(0.0, round(latest_ppe_risk_score, 1)))
        if ppe_score >= 85:
            explanation.append(f"🔴 YOLO PPE risk score CRITICAL ({ppe_score:.0f}/100)")
        elif ppe_score >= 60:
            explanation.append(f"🟠 YOLO PPE risk score HIGH ({ppe_score:.0f}/100)")
        elif ppe_score >= 30:
            explanation.append(f"🟡 YOLO PPE risk score MEDIUM ({ppe_score:.0f}/100)")
        else:
            explanation.append(f"🟢 YOLO PPE risk score NORMAL ({ppe_score:.0f}/100)")

        # 3 ─ Incident / alert component ───────────────────────────────────────
        # Each critical alert adds ~15 pts, each open incident ~8 pts, each sensor alert ~5 pts
        # Capped at 100
        incident_score = min(
            100.0,
            (active_alert_count * 8.0)
            + (open_incident_count * 8.0)
            + (active_sensor_alerts * 5.0)
        )
        incident_score = round(incident_score, 1)
        if incident_score > 0:
            explanation.append(
                f"⚠️ {active_alert_count} safety alert(s), "
                f"{open_incident_count} open incident(s), "
                f"{active_sensor_alerts} sensor alert(s) active."
            )

        # 4 ─ Weighted fusion ─────────────────────────────────────────────────
        fused = (
            sensor_score   * COMPONENT_WEIGHTS["sensor"]
            + ppe_score    * COMPONENT_WEIGHTS["ppe"]
            + incident_score * COMPONENT_WEIGHTS["incident"]
        )
        fused = round(min(100.0, max(0.0, fused)), 1)

        if fused >= 85:
            risk_level = "CRITICAL"
        elif fused >= 60:
            risk_level = "HIGH"
        elif fused >= 30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        explanation.insert(0, f"📊 Fused Risk Score: {fused}/100 — {risk_level}")
        explanation.append(
            f"[Weights] Sensor {COMPONENT_WEIGHTS['sensor']*100:.0f}% | "
            f"PPE {COMPONENT_WEIGHTS['ppe']*100:.0f}% | "
            f"Incidents {COMPONENT_WEIGHTS['incident']*100:.0f}%"
        )

        return {
            "fused_score":    fused,
            "risk_level":     risk_level,
            "sensor_score":   sensor_score,
            "ppe_score":      ppe_score,
            "incident_score": incident_score,
            "explanation":    explanation,
            "timestamp":      datetime.now(timezone.utc).isoformat(),
        }
