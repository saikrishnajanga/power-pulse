"""
Pydantic Schemas for Eco-Alternatives and ROI Engine.
PRISM-M Epic E-09.
"""
from typing import List, Optional
from pydantic import BaseModel, Field

class RecommendationItem(BaseModel):
    id: str
    title: str
    category: str
    description: str
    estimated_monthly_savings_kwh: float
    estimated_monthly_savings_inr: float
    gross_investment_inr: float
    subsidy_amount_inr: float
    net_investment_inr: float
    payback_years: float
    five_year_net_savings_inr: float
    ten_year_net_savings_inr: float
    annual_co2_offset_kg: float
    suitability_score: float = Field(..., ge=0, le=100)
    key_assumptions: List[str]

class RecommendationsResponse(BaseModel):
    user_monthly_consumption_kwh: float
    user_estimated_monthly_bill_inr: float
    recommended_solutions: List[RecommendationItem]
    total_potential_monthly_savings_inr: float
    best_payback_solution_id: str

