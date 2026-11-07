"""
Pydantic Schemas for Identity, User Profile, Consent & Data Privacy.
PRISM-M Epic E-02 (Tasks T-09, T-11, T-12, K1, T-13).
"""
from typing import Optional, List
from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    user_id: str = "user_demo_01"
    name: str = "Telangana Resident"
    email: str = "consumer@example.com"
    city: str = "Hyderabad"
    state: str = "Telangana"
    provider: str = "TGSPDCL (Telangana Southern Power)"
    tariff_category: str = "LT-I(B)(i) Domestic (up to 200 units)"
    household_size: int = 4
    has_air_conditioner: bool = True
    ac_units_count: int = 2
    has_solar_rooftop: bool = False
    is_gruha_jyothi_registered: bool = True
    data_consent_granted: bool = True
    consent_policy_version: str = "DPDP-Act-2023-v1.2"
    consent_timestamp: str = "2026-11-06T10:00:00"


class ConsentUpdateRequest(BaseModel):
    data_consent_granted: bool
    policy_version: str = "DPDP-Act-2023-v1.2"


class DeletionResponse(BaseModel):
    status: str
    message: str
    deleted_entities: List[str]

