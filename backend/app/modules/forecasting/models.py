"""
Pydantic Schemas for Forecasting Engine.
PRISM-M Epic E-07.
"""
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class HourlyForecastPoint(BaseModel):
    timestamp: datetime
    actual_kwh: Optional[float] = None
    predicted_kwh: Optional[float] = None
    potential_spike: bool = False
    status: str = "Normal"
    spike_threshold_kwh: Optional[float] = None
    point_type: str = "predicted"  # "actual", "transition", "predicted"

class ForecastResponse(BaseModel):
    horizon_name: str
    horizon_hours: int
    start_time: datetime
    end_time: datetime
    transition_time: Optional[datetime] = None
    total_predicted_kwh: float
    estimated_cost_inr: float
    potential_spike_count: int
    points: List[HourlyForecastPoint]
    summary_message: str
    threshold_explanation: Optional[str] = (
        "The red dotted line is the Dynamic Hourly MAD (Median Absolute Deviation) Anomaly Threshold. "
        "Calculated as Median(h) + 3.0 × 1.4826 × MAD(h) (a robust 3-sigma ceiling). "
        "It adapts to natural hourly diurnal patterns, flagging abnormal spikes above normal household usage."
    )

class ModelMetrics(BaseModel):
    mae_kwh: float
    rmse_kwh: float
    r2_score: float
    train_samples: int
    test_samples: int


