"""
Appliance Disaggregation & Decomposition Engine.
Calibrated for 14 Core Indian Household Appliances with customizable power ratings,
daily hours, quantity, and reconciliation against aggregate utility bills.
"""
from typing import List, Dict, Any, Optional
import numpy as np

from .models import ApplianceShare, DisaggregationRequest, DisaggregationResponse, CustomDisaggregationRequest, CustomApplianceItem
from ..tariffs.engine import calculate_energy_charge

# Calibrated 14 core appliances for Indian households
DEFAULT_14_APPLIANCES = [
    {
        "id": "ac",
        "name": "Air Conditioner",
        "category": "Cooling",
        "icon": "❄️",
        "power_rating_kw": 1.5,
        "daily_hours": 6.0,
        "quantity": 1,
        "duty_cycle": 0.60,  # Thermostat compressor cycling
        "benchmark": 30.0,
        "recommendation": "Set thermostat to 24°C instead of 18°C to save ~24% cooling electricity.",
    },
    {
        "id": "refrigerator",
        "name": "Refrigerator",
        "category": "Refrigeration",
        "icon": "🧊",
        "power_rating_kw": 0.18,
        "daily_hours": 24.0,
        "quantity": 1,
        "duty_cycle": 0.35,  # Automatic compressor cycle
        "benchmark": 16.0,
        "recommendation": "Ensure 50mm airflow clearance around condenser coils and inspect door rubber gaskets.",
    },
    {
        "id": "water_heater",
        "name": "Water Heater / Geyser",
        "category": "Heating",
        "icon": "♨️",
        "power_rating_kw": 2.0,
        "daily_hours": 0.75,
        "quantity": 1,
        "duty_cycle": 1.0,
        "benchmark": 14.0,
        "recommendation": "Install an automatic timer to prevent leaving geyser on continuously. Consider solar water heater.",
    },
    {
        "id": "ceiling_fans",
        "name": "Ceiling Fans",
        "category": "Circulation",
        "icon": "🌀",
        "power_rating_kw": 0.075,
        "daily_hours": 12.0,
        "quantity": 3,
        "duty_cycle": 1.0,
        "benchmark": 12.0,
        "recommendation": "Upgrade to 28W BLDC fans to cut fan energy consumption by 60% with 1-year payback.",
    },
    {
        "id": "water_pump",
        "name": "Water Pump",
        "category": "Pumping",
        "icon": "💧",
        "power_rating_kw": 0.75,
        "daily_hours": 1.0,
        "quantity": 1,
        "duty_cycle": 1.0,
        "benchmark": 8.0,
        "recommendation": "Fit an automatic overhead tank sensor to prevent pump dry running and water overflow.",
    },
    {
        "id": "washing_machine",
        "name": "Washing Machine",
        "category": "Laundry",
        "icon": "🧺",
        "power_rating_kw": 0.50,
        "daily_hours": 1.0,
        "quantity": 1,
        "duty_cycle": 0.80,
        "benchmark": 5.0,
        "recommendation": "Run on eco/cold wash mode and wash full laundry loads to optimize cycles.",
    },
    {
        "id": "television",
        "name": "Television",
        "category": "Entertainment",
        "icon": "📺",
        "power_rating_kw": 0.10,
        "daily_hours": 5.0,
        "quantity": 1,
        "duty_cycle": 1.0,
        "benchmark": 4.0,
        "recommendation": "Turn off main wall switch when not in use to avoid parasitic standby drain.",
    },
    {
        "id": "induction_stove",
        "name": "Induction Stove",
        "category": "Kitchen",
        "icon": "🍲",
        "power_rating_kw": 1.5,
        "daily_hours": 0.5,
        "quantity": 1,
        "duty_cycle": 0.80,
        "benchmark": 4.0,
        "recommendation": "Use flat-bottomed ferromagnetic cookware for maximum heat transfer efficiency.",
    },
    {
        "id": "electric_iron",
        "name": "Electric Iron",
        "category": "Laundry",
        "icon": "👔",
        "power_rating_kw": 1.0,
        "daily_hours": 0.4,
        "quantity": 1,
        "duty_cycle": 0.70,
        "benchmark": 3.0,
        "recommendation": "Iron garments in batches to minimize heating/cooling cycle losses.",
    },
    {
        "id": "microwave",
        "name": "Microwave Oven",
        "category": "Kitchen",
        "icon": "📻",
        "power_rating_kw": 1.2,
        "daily_hours": 0.3,
        "quantity": 1,
        "duty_cycle": 1.0,
        "benchmark": 3.0,
        "recommendation": "Keep interior clean and cover food containers to retain steam and heat faster.",
    },
    {
        "id": "led_lights",
        "name": "LED Lights",
        "category": "Lighting",
        "icon": "💡",
        "power_rating_kw": 0.012,
        "daily_hours": 6.0,
        "quantity": 6,
        "duty_cycle": 1.0,
        "benchmark": 3.0,
        "recommendation": "Utilize natural daylight in daytime and install occupancy sensors in bathrooms.",
    },
    {
        "id": "computer_laptop",
        "name": "Computer / Laptop",
        "category": "Work & IT",
        "icon": "💻",
        "power_rating_kw": 0.08,
        "daily_hours": 6.0,
        "quantity": 1,
        "duty_cycle": 0.90,
        "benchmark": 3.0,
        "recommendation": "Enable OS sleep mode after 10 minutes of inactivity and unplug chargers when full.",
    },
    {
        "id": "dishwasher",
        "name": "Dishwasher",
        "category": "Kitchen",
        "icon": "🍽️",
        "power_rating_kw": 1.2,
        "daily_hours": 0.4,
        "quantity": 1,
        "duty_cycle": 0.75,
        "benchmark": 2.0,
        "recommendation": "Run dishwasher on eco-cycle with full load during off-peak morning hours.",
    },
    {
        "id": "other_appliances",
        "name": "Other Appliances",
        "category": "Miscellaneous",
        "icon": "🔌",
        "power_rating_kw": 0.15,
        "daily_hours": 2.0,
        "quantity": 1,
        "duty_cycle": 0.80,
        "benchmark": 2.0,
        "recommendation": "Unplug phone chargers, routers and peripheral adapters when away from home.",
    },
]


class DisaggregationEngine:
    def disaggregate(self, request: DisaggregationRequest) -> DisaggregationResponse:
        total_kwh = max(1.0, float(request.monthly_consumption_kwh))
        total_cost, _, _ = calculate_energy_charge(total_kwh, days=30)
        effective_rate = total_cost / total_kwh if total_kwh > 0 else 4.5

        # Calculate unscaled theoretical monthly consumption for each appliance
        unscaled_items = []
        for app in DEFAULT_14_APPLIANCES:
            # Skip AC if user explicitly has no AC
            if app["id"] == "ac" and not request.has_air_conditioner:
                continue
            duty = app.get("duty_cycle", 1.0)
            kwh_raw = app["power_rating_kw"] * app["daily_hours"] * 30.0 * app["quantity"] * duty
            unscaled_items.append((app, kwh_raw))

        raw_sum = sum(kwh for _, kwh in unscaled_items)

        # Reconcile with aggregate billed kWh:
        # If raw_sum <= total_kwh: keep estimated draws, remaining is "Unallocated Household Baseline"
        # If raw_sum > total_kwh: normalize down so appliances match aggregate bill
        appliances: List[ApplianceShare] = []
        potential_savings_kwh = 0.0

        if raw_sum > total_kwh:
            scaling = total_kwh / raw_sum
            unallocated_kwh = 0.0
        else:
            scaling = 1.0
            unallocated_kwh = round(total_kwh - raw_sum, 1)

        total_allocated_kwh = 0.0

        for app, raw_kwh in unscaled_items:
            app_kwh = round(raw_kwh * scaling, 1)
            total_allocated_kwh += app_kwh
            app_cost = round(app_kwh * effective_rate, 2)
            pct = round((app_kwh / total_kwh) * 100, 1)
            bm_pct = app["benchmark"]

            is_excess = pct > (bm_pct + 4.0)
            status = "High Consumption" if is_excess else ("Optimal" if pct <= bm_pct else "Average")

            advice = app["recommendation"]
            if is_excess:
                potential_savings_kwh += app_kwh * 0.20

            appliances.append(
                ApplianceShare(
                    id=app["id"],
                    name=app["name"],
                    category=app["category"],
                    icon=app["icon"],
                    power_rating_kw=app["power_rating_kw"],
                    daily_hours=app["daily_hours"],
                    quantity=app["quantity"],
                    monthly_kwh=app_kwh,
                    monthly_cost_inr=app_cost,
                    share_percentage=pct,
                    benchmark_percentage=bm_pct,
                    is_excessive=is_excess,
                    efficiency_status=status,
                    recommendation=advice,
                )
            )

        appliances.sort(key=lambda x: x.monthly_kwh, reverse=True)
        top_app = appliances[0].name if appliances else "General Baseline"
        potential_savings_inr = round(potential_savings_kwh * effective_rate, 2)
        unallocated_pct = round((unallocated_kwh / total_kwh) * 100, 1)

        summary = (
            f"Top consumer is {top_app} at {appliances[0].share_percentage}% of total energy (₹{appliances[0].monthly_cost_inr}/mo). "
            f"Estimated monthly efficiency savings: {round(potential_savings_kwh, 1)} kWh (approx. ₹{potential_savings_inr})."
        )

        return DisaggregationResponse(
            total_consumption_kwh=round(total_kwh, 1),
            total_cost_inr=round(total_cost, 2),
            total_allocated_kwh=round(total_allocated_kwh, 1),
            unallocated_kwh=unallocated_kwh,
            unallocated_percentage=unallocated_pct,
            appliances=appliances,
            top_consuming_appliance=top_app,
            potential_appliance_savings_kwh=round(potential_savings_kwh, 1),
            potential_appliance_savings_inr=potential_savings_inr,
            summary=summary,
        )

    def custom_disaggregate(self, request: CustomDisaggregationRequest) -> DisaggregationResponse:
        total_kwh = max(1.0, float(request.monthly_consumption_kwh))
        total_cost, _, _ = calculate_energy_charge(total_kwh, days=30)
        effective_rate = total_cost / total_kwh if total_kwh > 0 else 4.5

        unscaled_items = []
        for app in request.appliances:
            kwh_raw = app.power_rating_kw * app.daily_hours * 30.0 * app.quantity
            unscaled_items.append((app, kwh_raw))

        raw_sum = sum(kwh for _, kwh in unscaled_items)

        if raw_sum > total_kwh:
            scaling = total_kwh / raw_sum if raw_sum > 0 else 1.0
            unallocated_kwh = 0.0
        else:
            scaling = 1.0
            unallocated_kwh = round(total_kwh - raw_sum, 1)

        appliances: List[ApplianceShare] = []
        potential_savings_kwh = 0.0
        total_allocated_kwh = 0.0

        for app, raw_kwh in unscaled_items:
            app_kwh = round(raw_kwh * scaling, 1)
            total_allocated_kwh += app_kwh
            app_cost = round(app_kwh * effective_rate, 2)
            pct = round((app_kwh / total_kwh) * 100, 1)

            # Benchmark lookup
            bm_match = next((d for d in DEFAULT_14_APPLIANCES if d["id"] == app.id or d["name"].lower() == app.name.lower()), None)
            bm_pct = bm_match["benchmark"] if bm_match else 5.0
            advice = bm_match["recommendation"] if bm_match else "Consider turning off when not actively utilized."

            is_excess = pct > (bm_pct + 4.0)
            status = "High Consumption" if is_excess else ("Optimal" if pct <= bm_pct else "Average")

            if is_excess:
                potential_savings_kwh += app_kwh * 0.18

            appliances.append(
                ApplianceShare(
                    id=app.id,
                    name=app.name,
                    category=app.category or "General",
                    icon=app.icon or "⚡",
                    power_rating_kw=app.power_rating_kw,
                    daily_hours=app.daily_hours,
                    quantity=app.quantity,
                    monthly_kwh=app_kwh,
                    monthly_cost_inr=app_cost,
                    share_percentage=pct,
                    benchmark_percentage=bm_pct,
                    is_excessive=is_excess,
                    efficiency_status=status,
                    recommendation=advice,
                )
            )

        appliances.sort(key=lambda x: x.monthly_kwh, reverse=True)
        top_app = appliances[0].name if appliances else "General Baseline"
        potential_savings_inr = round(potential_savings_kwh * effective_rate, 2)
        unallocated_pct = round((unallocated_kwh / total_kwh) * 100, 1)

        summary = (
            f"Custom appliance audit: {top_app} represents {appliances[0].share_percentage}% of aggregate energy. "
            f"Estimated monthly efficiency savings: ₹{potential_savings_inr}."
        )

        return DisaggregationResponse(
            total_consumption_kwh=round(total_kwh, 1),
            total_cost_inr=round(total_cost, 2),
            total_allocated_kwh=round(total_allocated_kwh, 1),
            unallocated_kwh=unallocated_kwh,
            unallocated_percentage=unallocated_pct,
            appliances=appliances,
            top_consuming_appliance=top_app,
            potential_appliance_savings_kwh=round(potential_savings_kwh, 1),
            potential_appliance_savings_inr=potential_savings_inr,
            summary=summary,
        )


disaggregation_engine = DisaggregationEngine()
