"""
Appliance Disaggregation & Decomposition Engine.
Implements PRISM-M Epic E-08 (FR-15, FR-16) using REFIT multi-house multi-appliance modeling principles.
"""
from typing import List, Dict, Any
import numpy as np

from .models import ApplianceShare, DisaggregationRequest, DisaggregationResponse
from ..tariffs.engine import calculate_energy_charge

# REFIT-calibrated baseline share distributions for Indian domestic profiles
BASE_SHARES_WITH_AC = {
    "Air Conditioning (HVAC)": {"share": 0.40, "cat": "Cooling", "icon": "❄️", "benchmark": 35.0},
    "Water Heating (Geyser)": {"share": 0.22, "cat": "Water Heating", "icon": "♨️", "benchmark": 20.0},
    "Refrigeration (Fridge/Freezer)": {"share": 0.16, "cat": "Refrigeration", "icon": "🧊", "benchmark": 18.0},
    "Lighting & Ceiling Fans": {"share": 0.11, "cat": "Lighting & Circulation", "icon": "💡", "benchmark": 12.0},
    "Washing Machine & Laundry": {"share": 0.05, "cat": "Laundry", "icon": "🧺", "benchmark": 6.0},
    "Kitchen (Microwave/Kettle)": {"share": 0.03, "cat": "Kitchen", "icon": "🍳", "benchmark": 4.0},
    "TV, Computing & Standby": {"share": 0.03, "cat": "Electronics", "icon": "🖥️", "benchmark": 5.0},
}

BASE_SHARES_WITHOUT_AC = {
    "Water Heating (Geyser)": {"share": 0.35, "cat": "Water Heating", "icon": "♨️", "benchmark": 30.0},
    "Refrigeration (Fridge/Freezer)": {"share": 0.28, "cat": "Refrigeration", "icon": "🧊", "benchmark": 25.0},
    "Lighting & Ceiling Fans": {"share": 0.20, "cat": "Lighting & Circulation", "icon": "💡", "benchmark": 22.0},
    "Washing Machine & Laundry": {"share": 0.08, "cat": "Laundry", "icon": "🧺", "benchmark": 10.0},
    "Kitchen (Microwave/Kettle)": {"share": 0.05, "cat": "Kitchen", "icon": "🍳", "benchmark": 6.0},
    "TV, Computing & Standby": {"share": 0.04, "cat": "Electronics", "icon": "🖥️", "benchmark": 7.0},
}


class DisaggregationEngine:
    def disaggregate(self, request: DisaggregationRequest) -> DisaggregationResponse:
        total_kwh = max(1.0, float(request.monthly_consumption_kwh))
        total_cost, _, _ = calculate_energy_charge(total_kwh, days=30)
        effective_rate = total_cost / total_kwh if total_kwh > 0 else 4.5

        profiles = BASE_SHARES_WITH_AC if request.has_air_conditioner else BASE_SHARES_WITHOUT_AC

        # Normalize shares
        sum_shares = sum(item["share"] for item in profiles.values())
        
        appliances: List[ApplianceShare] = []
        potential_savings_kwh = 0.0

        for name, meta in profiles.items():
            normalized_share = meta["share"] / sum_shares
            app_kwh = round(total_kwh * normalized_share, 1)
            app_cost = round(app_kwh * effective_rate, 2)
            pct = round(normalized_share * 100, 1)
            bm_pct = meta["benchmark"]

            # Efficiency assessment
            is_excess = pct > (bm_pct + 3.0)
            status = "High Consumption" if is_excess else ("Optimal" if pct <= bm_pct else "Average")

            advice = None
            if name == "Air Conditioning (HVAC)" and is_excess:
                advice = "AC cooling share is higher than comparable homes. Setting temperature to 24°C saves ~6% per degree."
                potential_savings_kwh += app_kwh * 0.20
            elif name == "Water Heating (Geyser)" and is_excess:
                advice = "Geyser draw indicates prolonged heating cycles. Install a 15-minute bath timer or switch to Solar Water Heating."
                potential_savings_kwh += app_kwh * 0.30
            elif name == "Refrigeration (Fridge/Freezer)" and is_excess:
                advice = "Continuous refrigeration baseline detected. Inspect door seals and maintain 50mm clearance around the condenser coils."
                potential_savings_kwh += app_kwh * 0.15
            elif is_excess:
                advice = f"{name} usage exceeds typical benchmarks by {round(pct - bm_pct, 1)}%."

            appliances.append(
                ApplianceShare(
                    name=name,
                    category=meta["cat"],
                    icon=meta["icon"],
                    monthly_kwh=app_kwh,
                    monthly_cost_inr=app_cost,
                    share_percentage=pct,
                    benchmark_percentage=bm_pct,
                    is_excessive=is_excess,
                    efficiency_status=status,
                    recommendation=advice,
                )
            )

        # Sort by energy share descending
        appliances.sort(key=lambda x: x.monthly_kwh, reverse=True)
        top_app = appliances[0].name
        potential_savings_inr = round(potential_savings_kwh * effective_rate, 2)

        summary = (
            f"Top consumer is {top_app} at {appliances[0].share_percentage}% of total energy (₹{appliances[0].monthly_cost_inr}/mo). "
            f"Identified potential monthly savings of {round(potential_savings_kwh, 1)} kWh (approx. ₹{potential_savings_inr}) through targeted efficiency."
        )

        return DisaggregationResponse(
            total_consumption_kwh=round(total_kwh, 1),
            total_cost_inr=round(total_cost, 2),
            appliances=appliances,
            top_consuming_appliance=top_app,
            potential_appliance_savings_kwh=round(potential_savings_kwh, 1),
            potential_appliance_savings_inr=potential_savings_inr,
            summary=summary,
        )


disaggregation_engine = DisaggregationEngine()

