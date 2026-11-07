"""
Pydantic Schemas for Anomaly Detection Engine.
PRISM-M Epic E-07.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class AnomalyPoint(BaseModel):
    timestamp: datetime
    actual_kwh: float
    rolling_baseline_kwh: float
    is_anomaly: bool
    is_high_spike: bool
    status: str
    likely_cause: Optional[str] = None

class AnomalyDetectionRequest(BaseModel):
    timestamps: List[datetime]
    readings_kwh: List[float]
    contamination: Optional[float] = Field(default=0.02, ge=0.001, le=0.2)

class AnomalySummary(BaseModel):
    total_hours_analyzed: int
    abnormal_count: int
    high_spike_count: int
    anomaly_percentage: float
    points: List[AnomalyPoint]
    recommendations: List[str]

