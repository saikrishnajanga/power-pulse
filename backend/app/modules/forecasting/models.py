"""
Pydantic Schemas for Forecasting Engine.
PRISM-M Epic E-07.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class HourlyForecastPoint(BaseModel):
    timestamp: datetime
    predicted_kwh: float
    potential_spike: bool
    status: str
    spike_threshold_kwh: Optional[float] = None

class ForecastResponse(BaseModel):
    horizon_name: str
    horizon_hours: int
    start_time: datetime
    end_time: datetime
    total_predicted_kwh: float
    estimated_cost_inr: float
    potential_spike_count: int
    points: List[HourlyForecastPoint]
    summary_message: str

class ModelMetrics(BaseModel):
    mae_kwh: float
    rmse_kwh: float
    r2_score: float
    train_samples: int
    test_samples: int

