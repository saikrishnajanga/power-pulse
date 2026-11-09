"""
Pydantic Schemas for Tariff & Cost Engine.
PRISM-M Epic E-03, E-06.
Supports Telangana (TGSPDCL) and Andhra Pradesh (APERC LT-I Domestic Urban/Rural).
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
    state: str = Field(default="Telangana", description="State: 'Telangana' or 'Andhra Pradesh'")
    location_type: str = Field(default="urban", description="Location classification: 'urban' or 'rural'")
    sanctioned_load_kw: float = Field(default=2.0, ge=0.5, le=50.0, description="Sanctioned contracted load in kW")
    is_gruha_jyothi_eligible: bool = Field(default=False, description="Whether user qualifies for Gruha Jyothi (TS) or YSR Jagjeevan Jyothi (AP) zero-bill scheme")
    fixed_charges: Optional[float] = Field(default=None, description="Optional manual override for fixed charges")
    electricity_duty_per_kwh: float = Field(default=0.06, ge=0, description="State electricity duty in INR/kWh (default ~0.06)")

class TariffCalculationResult(BaseModel):
    state: str
    location_type: str
    provider: str
    units_consumed_kwh: float
    billing_days: int
    category: str
    energy_charges_inr: float
    fixed_charges_inr: float
    customer_charges_inr: float
    electricity_duty_inr: float
    gross_total_inr: float
    subsidy_amount_inr: float
    net_payable_inr: float
    is_gruha_jyothi_applied: bool
    gruha_jyothi_headroom_kwh: Optional[float] = None
    subsidy_name: Optional[str] = None
    effective_rate_per_kwh: float
    slab_breakdown: List[SlabDetail]
    notes: List[str]

