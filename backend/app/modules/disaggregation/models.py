"""
Pydantic Schemas for Appliance Disaggregation & Decomposition Engine.
PRISM-M Epic E-08 (Consumption Breakdown & Benchmark).
Derived from AllHouses REFIT Multi-Appliance Models.
"""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class ApplianceShare(BaseModel):
    name: str
    category: str
    icon: str
    monthly_kwh: float
    monthly_cost_inr: float
    share_percentage: float
    benchmark_percentage: float
    is_excessive: bool
    efficiency_status: str  # "Optimal", "Average", "High Consumption"
    recommendation: Optional[str] = None


class DisaggregationRequest(BaseModel):
    monthly_consumption_kwh: float = Field(..., ge=1.0, description="Total monthly aggregate consumption in kWh")
    tariff_category: Optional[str] = "LT-I(B)(i) Domestic"
    has_air_conditioner: bool = True
    household_size: int = 4


class DisaggregationResponse(BaseModel):
    total_consumption_kwh: float
    total_cost_inr: float
    appliances: List[ApplianceShare]
    top_consuming_appliance: str
    potential_appliance_savings_kwh: float
    potential_appliance_savings_inr: float
    summary: str

