"""
Pydantic Schemas for Household Consumption Benchmarking.
PRISM-M Epic E-08 (Tasks B2, S-24).
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class HouseholdPercentile(BaseModel):
    percentile: int  # 25, 50, 75, 90
    label: str  # e.g. "Highly Efficient", "Average", "High Usage", "Top 10% Surge"
    monthly_kwh: float


class BenchmarkComparisonResponse(BaseModel):
    user_consumption_kwh: float
    household_size: int
    city: str
    property_type: str
    user_percentile: int  # e.g., 42 (means uses less than 58% of similar homes)
    efficiency_category: str  # "Eco-Efficient", "Average Household", "High Consumer"
    variance_from_median_kwh: float
    variance_from_median_pct: float
    median_benchmark_kwh: float
    benchmark_distribution: List[HouseholdPercentile]
    key_insight: str

