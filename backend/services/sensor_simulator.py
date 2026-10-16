"""
Virtual Sensor Simulation Engine
---------------------------------
Generates realistic time-series data for six environmental sensors:
  1. Temperature (°C)       – random-walk around lab baseline 22°C
  2. Humidity (%)            – random-walk around 45 %
  3. Gas Concentration (ppm) – random-walk, spikes on test events
  4. Smoke Level (0-100)     – slow drift, large spike on test events
  5. Air Quality AQI (0-500) – correlates with gas / smoke
  6. Ventilation Status      – NORMAL | REDUCED | FAILED

Data source is clearly labelled VIRTUAL_SENSOR on every record.
"""

import math
import random
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

# Default safe baseline values
BASELINES: Dict[str, float] = {
    "temperature":       22.0,
    "humidity":          45.0,
    "gas_concentration": 15.0,
    "smoke_level":        2.0,
    "air_quality":       35.0,
}

# Simulation drift parameters (max change per tick)
DRIFT: Dict[str, float] = {
    "temperature":        0.4,
    "humidity":           0.8,
    "gas_concentration":  2.0,
    "smoke_level":        0.8,
    "air_quality":        3.0,
}

# Hard physical bounds
BOUNDS: Dict[str, tuple] = {
    "temperature":       (15.0, 55.0),
    "humidity":          (10.0, 95.0),
    "gas_concentration": (0.0, 500.0),
    "smoke_level":       (0.0, 100.0),
    "air_quality":       (0.0, 500.0),
}

VENTILATION_STATES = ["NORMAL", "REDUCED", "FAILED"]


class SensorSimulator:
    """
    Thread-safe sensor simulator.  A background thread advances the simulation
    every `tick_interval` seconds and stores the latest reading in memory.
    Readings are also persisted to SQLite via a callback supplied by the route.
    """

    def __init__(self, tick_interval: float = 5.0):
        self._lock = threading.Lock()
        self._tick_interval = tick_interval
        self._running = False
        self._paused = False
        self._thread: Optional[threading.Thread] = None
        self._persist_callback = None   # called with reading dict each tick
        self._tick_count = 0

        # Current state (initialise at baselines)
        self._state: Dict[str, Any] = {
            "temperature":       BASELINES["temperature"],
            "humidity":          BASELINES["humidity"],
            "gas_concentration": BASELINES["gas_concentration"],
            "smoke_level":       BASELINES["smoke_level"],
            "air_quality":       BASELINES["air_quality"],
            "ventilation_status": "NORMAL",
        }
        self._test_event_pending = False
        self._test_event_type: Optional[str] = None

    # ------------------------------------------------------------------ state

    def get_current_reading(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._state) | {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data_source": "VIRTUAL_SENSOR",
                "is_running": self._running and not self._paused,
                "is_paused": self._paused,
                "tick_count": self._tick_count,
            }

    def is_running(self) -> bool:
        return self._running

    def is_paused(self) -> bool:
        return self._paused

    # ---------------------------------------------------------------- control

    def start(self, persist_callback=None):
        """Start background simulation thread."""
        with self._lock:
            if self._running:
                self._paused = False
                return
            self._running = True
            self._paused = False
            if persist_callback:
                self._persist_callback = persist_callback
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def pause(self):
        with self._lock:
            self._paused = True

    def resume(self):
        with self._lock:
            self._paused = False

    def stop(self):
        with self._lock:
            self._running = False
            self._paused = False

    def reset_to_normal(self):
        """Snap all sensors back to safe baseline values."""
        with self._lock:
            for key, val in BASELINES.items():
                self._state[key] = val
            self._state["ventilation_status"] = "NORMAL"
            self._test_event_pending = False

    def trigger_test_event(self, event_type: str = "gas_leak"):
        """
        Inject an artificial hazard spike for the next tick.
        Supported types: gas_leak | fire | chemical_spill | ventilation_failure
        """
        with self._lock:
            self._test_event_pending = True
            self._test_event_type = event_type

    # ---------------------------------------------------------------- private

    def _run_loop(self):
        while True:
            with self._lock:
                running = self._running
                paused = self._paused
            if not running:
                break
            if not paused:
                self._advance_tick()
            time.sleep(self._tick_interval)

    def _advance_tick(self):
        with self._lock:
            self._tick_count += 1

            if self._test_event_pending:
                self._apply_test_event(self._test_event_type)
                self._test_event_pending = False
            else:
                self._random_walk()

            # Ensure bounds
            for key, (lo, hi) in BOUNDS.items():
                self._state[key] = max(lo, min(hi, self._state[key]))

            # Air quality loosely tracks gas + smoke
            self._state["air_quality"] = min(
                500.0,
                max(0.0,
                    self._state["gas_concentration"] * 0.3
                    + self._state["smoke_level"] * 2.5
                    + random.gauss(0, 3)
                )
            )

            # Ventilation status stochastic drift
            vstate = self._state["ventilation_status"]
            r = random.random()
            if vstate == "NORMAL":
                if r < 0.005:
                    self._state["ventilation_status"] = "REDUCED"
            elif vstate == "REDUCED":
                if r < 0.01:
                    self._state["ventilation_status"] = "FAILED"
                elif r < 0.05:
                    self._state["ventilation_status"] = "NORMAL"
            else:  # FAILED
                if r < 0.08:
                    self._state["ventilation_status"] = "REDUCED"

            reading = dict(self._state) | {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data_source": "VIRTUAL_SENSOR",
            }

        # Persist outside the lock to avoid deadlocks
        if self._persist_callback:
            try:
                self._persist_callback(reading)
            except Exception as exc:
                print(f"[SensorSimulator] persist error: {exc}")

    def _random_walk(self):
        for key in BASELINES:
            drift = DRIFT[key]
            # Gentle pull toward baseline
            pull = (BASELINES[key] - self._state[key]) * 0.05
            delta = random.gauss(pull, drift)
            self._state[key] = self._state[key] + delta

    def _apply_test_event(self, event_type: str):
        if event_type == "gas_leak":
            self._state["gas_concentration"] = random.uniform(150, 350)
            self._state["air_quality"] = random.uniform(200, 400)
            self._state["ventilation_status"] = "REDUCED"
        elif event_type == "fire":
            self._state["temperature"] = random.uniform(42, 55)
            self._state["smoke_level"] = random.uniform(60, 90)
            self._state["air_quality"] = random.uniform(350, 500)
        elif event_type == "chemical_spill":
            self._state["gas_concentration"] = random.uniform(80, 200)
            self._state["smoke_level"] = random.uniform(20, 50)
        elif event_type == "ventilation_failure":
            self._state["ventilation_status"] = "FAILED"
            self._state["gas_concentration"] += random.uniform(20, 60)
            self._state["humidity"] += random.uniform(10, 25)
        elif event_type == "high_temp":
            self._state["temperature"] = random.uniform(38, 48)


# ── Module-level singleton ────────────────────────────────────────────────────
_simulator: Optional[SensorSimulator] = None


def get_simulator() -> SensorSimulator:
    global _simulator
    if _simulator is None:
        _simulator = SensorSimulator(tick_interval=5.0)
    return _simulator
