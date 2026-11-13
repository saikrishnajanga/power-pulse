"""
Pydantic Schemas for Appliance Disaggregation & Decomposition Engine.
PRISM-M Epic E-08 (Consumption Breakdown & Benchmark).
Calibrated for 14 core Indian household appliances with customizable power ratings and hours.
"""
from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class ApplianceShare(BaseModel):
    id: str
    name: str
    category: str
    icon: str
    power_rating_kw: float
    daily_hours: float
    quantity: int = 1
    monthly_kwh: float
    monthly_cost_inr: float
    share_percentage: float
    benchmark_percentage: float
    is_excessive: bool
    efficiency_status: str  # "Optimal", "Average", "High Consumption"
    recommendation: Optional[str] = None


class DisaggregationRequest(BaseModel):
    monthly_consumption_kwh: float = Field(..., ge=1.0, description="Total monthly aggregate consumption in kWh")
    tariff_category: Optional[str] = "LT-I Domestic"
    has_air_conditioner: bool = True
    household_size: int = 4


class CustomApplianceItem(BaseModel):
    id: str
    name: str
    category: Optional[str] = "General"
    icon: Optional[str] = "⚡"
    power_rating_kw: float = Field(..., gt=0)
    daily_hours: float = Field(..., ge=0, le=24)
    quantity: int = Field(1, ge=1)


class CustomDisaggregationRequest(BaseModel):
    monthly_consumption_kwh: float = Field(..., ge=1.0)
    tariff_category: Optional[str] = "LT-I Domestic"
    appliances: List[CustomApplianceItem]


class DisaggregationResponse(BaseModel):
    total_consumption_kwh: float
    total_cost_inr: float
    total_allocated_kwh: float = 0.0
    unallocated_kwh: float = 0.0
    unallocated_percentage: float = 0.0
    appliances: List[ApplianceShare]
    top_consuming_appliance: str
    potential_appliance_savings_kwh: float
    potential_appliance_savings_inr: float
    disclaimer: str = (
        "Appliance-level consumption and costs are model estimates based on appliance power ratings "
        "and daily usage assumptions, calibrated with total billed kWh. Electricity bills do not identify "
        "individual appliance consumption."
    )
    summary: str
