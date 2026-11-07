"""
Household Consumption Benchmarking Engine.
Calibrated for Telangana / Hyderabad residential domestic profiles (TGSPDCL LT-I).
Implements PRISM-M Task B2 / S-24.
"""
from typing import List
from .models import HouseholdPercentile, BenchmarkComparisonResponse


def calculate_household_benchmark(
    user_consumption_kwh: float,
    household_size: int = 4,
    has_air_conditioner: bool = True,
    city: str = "Hyderabad",
) -> BenchmarkComparisonResponse:
    """
    Compares user's monthly kWh consumption against peer distributions
    in Hyderabad/Telangana domestic consumers with matching family size and AC ownership.
    """
    # Base baseline for Hyderabad domestic household
    # ~45 kWh per person base load + 80 kWh if AC present in summer
    base_kwh_per_person = 42.0
    ac_addon = 85.0 if has_air_conditioner else 0.0

    median_kwh = (household_size * base_kwh_per_person) + ac_addon
    p25 = round(median_kwh * 0.72, 1)
    p50 = round(median_kwh, 1)
    p75 = round(median_kwh * 1.35, 1)
    p90 = round(median_kwh * 1.70, 1)

    distribution: List[HouseholdPercentile] = [
        HouseholdPercentile(percentile=25, label="Eco-Efficient (Bottom 25%)", monthly_kwh=p25),
        HouseholdPercentile(percentile=50, label="Regional Median (Average)", monthly_kwh=p50),
        HouseholdPercentile(percentile=75, label="High Consumer (75th Percentile)", monthly_kwh=p75),
        HouseholdPercentile(percentile=90, label="Heavy Consumption Surge (Top 10%)", monthly_kwh=p90),
    ]

    # Calculate user percentile estimate
    if user_consumption_kwh <= p25:
        user_percentile = int(max(5, (user_consumption_kwh / p25) * 25))
        efficiency_category = "Eco-Efficient Leader"
        key_insight = (
            f"Your household uses less electricity than {100 - user_percentile}% of similar "
            f"{household_size}-person homes in {city}. Excellent efficiency!"
        )
    elif user_consumption_kwh <= p50:
        ratio = (user_consumption_kwh - p25) / max(1.0, (p50 - p25))
        user_percentile = int(25 + ratio * 25)
        efficiency_category = "Above Average Efficiency"
        key_insight = (
            f"Your consumption is {round(p50 - user_consumption_kwh, 1)} kWh below the median "
            f"benchmark for {household_size}-person households in {city}."
        )
    elif user_consumption_kwh <= p75:
        ratio = (user_consumption_kwh - p50) / max(1.0, (p75 - p50))
        user_percentile = int(50 + ratio * 25)
        efficiency_category = "Moderate Consumption"
        key_insight = (
            f"Your usage is {round(user_consumption_kwh - p50, 1)} kWh above the peer median. "
            "Optimizing AC cooling temperature to 24°C will shift you toward the efficient quartile."
        )
    else:
        ratio = min(1.0, (user_consumption_kwh - p75) / max(1.0, (p90 - p75)))
        user_percentile = int(min(98, 75 + ratio * 23))
        efficiency_category = "High Consumer Alert"
        key_insight = (
            f"Your consumption places you in the top {100 - user_percentile}% highest energy users "
            f"among similar homes in {city}. Rooftop solar and 5-star inverter upgrades offer rapid payback."
        )

    variance_kwh = round(user_consumption_kwh - p50, 1)
    variance_pct = round((variance_kwh / p50) * 100, 1)

    return BenchmarkComparisonResponse(
        user_consumption_kwh=user_consumption_kwh,
        household_size=household_size,
        city=city,
        property_type=f"{min(4, max(1, household_size - 1))} BHK Residential",
        user_percentile=user_percentile,
        efficiency_category=efficiency_category,
        variance_from_median_kwh=variance_kwh,
        variance_from_median_pct=variance_pct,
        median_benchmark_kwh=p50,
        benchmark_distribution=distribution,
        key_insight=key_insight,
    )

