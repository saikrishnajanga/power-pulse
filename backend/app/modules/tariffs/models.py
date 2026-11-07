"""
Pydantic Schemas for Tariff & Cost Engine.
PRISM-M Epic E-03, E-06.
"""
from typing import Optional, List
from pydantic import BaseModel, Field

class SlabDetail(BaseModel):
    slab_range: str
    units_in_slab: float
    rate_per_kwh: float
    amount_inr: float

class TariffCalculationRequest(BaseModel):
    units_consumed_kwh: float = Field(..., ge=0, description="Total units consumed in kWh")
    billing_days: int = Field(default=30, ge=1, le=365, description="Number of days in billing cycle")
    is_gruha_jyothi_eligible: bool = Field(default=False, description="Whether user qualifies for Gruha Jyothi zero-bill scheme")
    fixed_charges: float = Field(default=50.0, ge=0, description="Monthly fixed customer charges in INR")
    electricity_duty_per_kwh: float = Field(default=0.06, ge=0, description="State electricity duty in INR/kWh (default ~0.06)")

class TariffCalculationResult(BaseModel):
    units_consumed_kwh: float
    billing_days: int
    category: str
    energy_charges_inr: float
    fixed_charges_inr: float
    electricity_duty_inr: float
    gross_total_inr: float
    net_payable_inr: float
    is_gruha_jyothi_applied: bool
    gruha_jyothi_headroom_kwh: Optional[float] = None
    slab_breakdown: List[SlabDetail]
    notes: List[str]

