"""
Bill Models and Schemas.
Directly aligns with Zoheba notebook (Section 12, Cell 28 bill_from_json schema).
PRISM-M Epic E-04.
"""
from typing import Optional, Dict, Any, List
from datetime import date
from pydantic import BaseModel, Field

class ReadingDetail(BaseModel):
    date: str
    reading_kwh: float

class MeterReadings(BaseModel):
    previous_reading: ReadingDetail
    present_reading: ReadingDetail
    units_consumed_kwh: float
    billing_days: int

class ChargesINR(BaseModel):
    energy_charges: float
    fixed_charges: float = 50.0
    customer_charges: float = 40.0
    electricity_duty: float = 12.0
    total_amount: float

class ProviderDetails(BaseModel):
    provider_name: str = "TGSPDCL (Telangana Southern Power Distribution)"
    service_number: str = "HYD-102948-LT1"
    category: str = "LT-I(B)(i) Domestic"
    scheme_name: Optional[str] = "Gruha Jyothi"

class ElectricityBillJSON(BaseModel):
    provider_details: ProviderDetails
    meter_readings: MeterReadings
    charges_inr: ChargesINR
    raw_metadata: Optional[Dict[str, Any]] = None

# Default Golden Sample Bill for Telangana Household
DEFAULT_TELANGANA_BILL = ElectricityBillJSON(
    provider_details=ProviderDetails(
        provider_name="TGSPDCL",
        service_number="TS-HYD-500081-0021",
        category="LT-I(B)(i) Domestic",
        scheme_name="Gruha Jyothi",
    ),
    meter_readings=MeterReadings(
        previous_reading=ReadingDetail(date="01/03/2026", reading_kwh=1420.0),
        present_reading=ReadingDetail(date="31/03/2026", reading_kwh=1605.0),
        units_consumed_kwh=185.0,
        billing_days=30,
    ),
    charges_inr=ChargesINR(
        energy_charges=748.0,
        fixed_charges=50.0,
        customer_charges=40.0,
        electricity_duty=11.10,
        total_amount=849.10,
    ),
)

