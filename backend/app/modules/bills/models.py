"""
Bill Models and Schemas.
PRISM-M Epic E-04 & Complete Dynamic Dashboard Enhancement.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from ..tariffs.models import SlabDetail


class ReadingDetail(BaseModel):
    date: Optional[str] = None
    reading_kwh: float = 0.0


class MeterReadings(BaseModel):
    previous_reading: ReadingDetail = Field(default_factory=ReadingDetail)
    present_reading: ReadingDetail = Field(default_factory=ReadingDetail)
    units_consumed_kwh: float = 185.0
    billing_days: int = 30


class ChargesINR(BaseModel):
    energy_charges: float = 0.0
    fixed_charges: float = 50.0
    customer_charges: float = 40.0
    electricity_duty: float = 12.0
    other_charges: float = 0.0
    subsidy_amount: float = 0.0
    total_amount: float = 0.0


class ProviderDetails(BaseModel):
    provider_name: str = "APSPDCL (Southern Power AP)"
    discom: str = "APSPDCL"
    state: str = "Andhra Pradesh"
    location: str = "Tirupati"
    location_type: str = "urban"  # "urban" | "rural"
    service_number: str = "AP-TPT-019284"
    consumer_number: str = "XXX-XXX-4010"
    consumer_name: str = "Residential Consumer"
    category: str = "LT-I Domestic"
    sanctioned_load_kw: float = 2.0
    scheme_name: Optional[str] = None


class ExtractedBillRecord(BaseModel):
    bill_id: str
    file_name: str
    consumer_name: str = "Residential Consumer"
    consumer_number: str = "XXX-XXX-4010"
    service_connection_number: str = "AP-TPT-019284"
    discom: str = "APSPDCL"
    provider_name: str = "APSPDCL (Andhra Pradesh Southern Power Distribution)"
    state: str = "Andhra Pradesh"
    location: str = "Tirupati"
    location_type: str = "urban"  # "urban" | "rural"
    consumer_category: str = "LT-I Domestic"
    sanctioned_load_kw: float = 2.0
    billing_start_date: Optional[str] = "01/10/2026"
    billing_end_date: Optional[str] = "31/10/2026"
    bill_date: Optional[str] = "01/11/2026"
    due_date: Optional[str] = "20/11/2026"
    billing_days: int = 30
    previous_reading_kwh: Optional[float] = 1420.0
    current_reading_kwh: Optional[float] = 1605.0
    units_consumed_kwh: float = 185.0
    energy_charges_inr: float = 809.10
    fixed_charges_inr: float = 20.0
    customer_charges_inr: float = 50.0
    electricity_duty_inr: float = 11.10
    other_charges_inr: float = 0.0
    subsidy_amount_inr: float = 0.0
    gross_amount_inr: float = 890.20
    net_payable_inr: float = 890.20
    calculated_amount_inr: float = 890.20
    difference_inr: float = 0.0
    difference_explanation: Optional[str] = "Calculated amount matches billed total."
    is_gruha_jyothi_applied: bool = False
    subsidy_name: Optional[str] = None
    source_language: str = "English"
    review_status: str = "Extracted"  # "Extracted", "Confirmed", "Needs Review"
    raw_ocr_snippet: Optional[str] = None
    slab_breakdown: List[SlabDetail] = Field(default_factory=list)


class ConfirmBillRequest(BaseModel):
    units_consumed_kwh: Optional[float] = None
    billing_days: Optional[int] = None
    is_gruha_jyothi_applied: Optional[bool] = None
    state: Optional[str] = None
    location_type: Optional[str] = None
    consumer_category: Optional[str] = None
    discom: Optional[str] = None
    sanctioned_load_kw: Optional[float] = None
    consumer_name: Optional[str] = None
    consumer_number: Optional[str] = None
    billing_start_date: Optional[str] = None
    billing_end_date: Optional[str] = None
    gross_amount_inr: Optional[float] = None


class ElectricityBillJSON(BaseModel):
    provider_details: ProviderDetails = Field(default_factory=ProviderDetails)
    meter_readings: MeterReadings = Field(default_factory=MeterReadings)
    charges_inr: ChargesINR = Field(default_factory=ChargesINR)
    raw_metadata: Optional[Dict[str, Any]] = None


# Default Golden Sample Bill for Andhra Pradesh Household (APSPDCL Urban LT-I)
DEFAULT_AP_BILL = ElectricityBillJSON(
    provider_details=ProviderDetails(
        provider_name="APSPDCL",
        discom="APSPDCL",
        state="Andhra Pradesh",
        location="Tirupati",
        location_type="urban",
        service_number="AP-TPT-019284",
        consumer_number="XXX-XXX-4010",
        consumer_name="P. Ramesh Kumar",
        category="LT-I Domestic",
        sanctioned_load_kw=2.0,
        scheme_name="APERC Standard Telescopic",
    ),
    meter_readings=MeterReadings(
        previous_reading=ReadingDetail(date="01/10/2026", reading_kwh=1420.0),
        present_reading=ReadingDetail(date="31/10/2026", reading_kwh=1605.0),
        units_consumed_kwh=185.0,
        billing_days=30,
    ),
    charges_inr=ChargesINR(
        energy_charges=809.10,
        fixed_charges=20.0,
        customer_charges=50.0,
        electricity_duty=11.10,
        other_charges=0.0,
        subsidy_amount=0.0,
        total_amount=890.20,
    ),
)

# Default Golden Sample Bill for Telangana Household (TGSPDCL LT-I)
DEFAULT_TELANGANA_BILL = ElectricityBillJSON(
    provider_details=ProviderDetails(
        provider_name="TGSPDCL",
        discom="TGSPDCL",
        state="Telangana",
        location="Hyderabad",
        location_type="urban",
        service_number="TG-HYD-500081",
        consumer_number="XXX-XXX-8921",
        consumer_name="K. Sai Krishna",
        category="LT-I(B)(i) Domestic",
        sanctioned_load_kw=2.0,
        scheme_name="Gruha Jyothi Zero Bill Scheme",
    ),
    meter_readings=MeterReadings(
        previous_reading=ReadingDetail(date="01/10/2026", reading_kwh=3200.0),
        present_reading=ReadingDetail(date="31/10/2026", reading_kwh=3385.0),
        units_consumed_kwh=185.0,
        billing_days=30,
    ),
    charges_inr=ChargesINR(
        energy_charges=809.10,
        fixed_charges=0.0,
        customer_charges=40.0,
        electricity_duty=11.10,
        other_charges=0.0,
        subsidy_amount=860.20,
        total_amount=0.0,
    ),
)



