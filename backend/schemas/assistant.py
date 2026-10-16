from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class SafetyQuestionRequest(BaseModel):
    question: str
    include_sources: bool = True

class RelevantSource(BaseModel):
    document_title: str
    filename: str
    section: str
    excerpt: str
    relevance_score: float

class SafetyAnswerResponse(BaseModel):
    question: str
    answer: str
    sources: List[RelevantSource]
    suggested_actions: List[str]
    emergency_level: str  # NORMAL, ADVISORY, URGENT, CRITICAL
    sensor_context: Optional[Dict[str, Any]] = None  # current simulated env data
