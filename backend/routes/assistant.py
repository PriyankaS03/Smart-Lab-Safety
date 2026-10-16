from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional
from backend.database.db import get_db
from backend.database.models import SafetyQuestion, RiskFusionEvent
from backend.services.rag_service import SafetyAssistantService
from backend.schemas.assistant import SafetyQuestionRequest, SafetyAnswerResponse
from backend.services.sensor_simulator import get_simulator

router = APIRouter(prefix="/api/assistant", tags=["Safety Assistant RAG"])
assistant_service = SafetyAssistantService()


@router.post("/query", response_model=SafetyAnswerResponse)
def ask_safety_question(req: SafetyQuestionRequest, db: Session = Depends(get_db)):
    """
    RAG query endpoint.  If the sensor simulation is running the current
    environmental readings are automatically injected into the answer context
    so the assistant can comment on live (simulated) conditions.
    """
    # Grab current sensor reading from in-memory simulator (may be None)
    try:
        sim = get_simulator()
        sensor_reading = sim.get_current_reading() if sim.is_running() and not sim.is_paused() else None
    except Exception:
        sensor_reading = None

    # Latest fused risk from DB
    try:
        latest_fusion = db.query(RiskFusionEvent).order_by(RiskFusionEvent.timestamp.desc()).first()
        fused_risk = {
            "fused_score": latest_fusion.fused_score,
            "risk_level": latest_fusion.risk_level,
        } if latest_fusion else None
    except Exception:
        fused_risk = None

    result = assistant_service.ask_with_sensor_context(
        question=req.question,
        sensor_reading=sensor_reading,
        fused_risk=fused_risk,
    )

    # Log question in DB
    try:
        primary_source = result["sources"][0]["document_title"] if result["sources"] else "General SOP"
        top_score = result["sources"][0]["relevance_score"] if result["sources"] else 0.0
        record = SafetyQuestion(
            question=req.question,
            answer=result["answer"],
            source_document=primary_source,
            relevance_score=top_score,
        )
        db.add(record)
        db.commit()
    except Exception as e:
        print(f"[AssistantRoute] Error recording question: {e}")

    return result
