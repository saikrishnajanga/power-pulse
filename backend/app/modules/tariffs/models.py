"""
Pydantic Schemas for Tariff & Cost Engine.
PRISM-M Epic E-03, E-06 & Complete Dynamic Dashboard Enhancement.
Supports Andhra Pradesh (APERC APSPDCL/APEPDCL/APCPDCL Urban/Rural Domestic & Commercial)
and Telangana (TGSPDCL / TGNPDCL).
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SlabDetail(BaseModel):
    slab_range: str
    units_in_slab: float
    rate_per_kwh: float
    amount_inr: float


class TariffScheduleConfig(BaseModel):
    state: str = "Andhra Pradesh"
    discom: str = "APSPDCL"
    effective_date: str = "2024-25"
    consumer_category: str = "LT-I Domestic"
    location_type: str = "urban"  # "urban" | "rural"
    slabs: List[Dict[str, Any]]
    fixed_charge_per_kw: float = 10.0
    customer_charge_inr: float = 50.0
    electricity_duty_rate: float = 0.06
    subsidy_scheme_name: Optional[str] = None
    subsidy_unit_limit: Optional[float] = None


class TariffCalculationRequest(BaseModel):
    units_consumed_kwh: float = Field(..., ge=0, description="Total units consumed in kWh")
    billing_days: int = Field(default=30, ge=1, le=365, description="Number of days in billing cycle")
    state: str = Field(default="Andhra Pradesh", description="State: 'Andhra Pradesh' or 'Telangana'")
    location_type: str = Field(default="urban", description="Location classification: 'urban' or 'rural'")
    discom: str = Field(default="APSPDCL", description="DISCOM: APSPDCL, APEPDCL, APCPDCL, TGSPDCL, TGNPDCL")
    consumer_category: str = Field(default="LT-I Domestic", description="Category: 'LT-I Domestic' or 'LT-II Commercial'")
    sanctioned_load_kw: float = Field(default=2.0, ge=0.5, le=50.0, description="Sanctioned contracted load in kW")
    is_gruha_jyothi_eligible: bool = Field(default=False, description="Whether user qualifies for YSR Jagjeevan Jyothi (AP) or Gruha Jyothi (TS) zero-bill scheme")
    fixed_charges: Optional[float] = Field(default=None, description="Optional manual override for fixed charges")
    electricity_duty_per_kwh: float = Field(default=0.06, ge=0, description="State electricity duty in INR/kWh (default ~0.06)")
    effective_date: str = Field(default="2024-25", description="Tariff schedule effective year")
    billed_amount_inr: Optional[float] = Field(default=None, description="Actual billed amount from uploaded bill for reconciliation")


class TariffCalculationResult(BaseModel):
    state: str
    location_type: str
    discom: str
    provider: str
    units_consumed_kwh: float
    billing_days: int
    category: str
    sanctioned_load_kw: float = 2.0
    energy_charges_inr: float
    fixed_charges_inr: float
    customer_charges_inr: float
    electricity_duty_inr: float
    other_charges_inr: float = 0.0
    gross_total_inr: float
    subsidy_amount_inr: float
    net_payable_inr: float
    billed_amount_inr: Optional[float] = None
    difference_inr: float = 0.0
    difference_explanation: Optional[str] = None
    is_gruha_jyothi_applied: bool
    gruha_jyothi_headroom_kwh: Optional[float] = None
    subsidy_name: Optional[str] = None
    effective_rate_per_kwh: float
    slab_breakdown: List[SlabDetail]
    notes: List[str]


