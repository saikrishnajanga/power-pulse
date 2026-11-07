"""
Eco-Alternatives, Subsidies & Multi-Year ROI Calculation Engine.
Implements PRISM-M Epic E-09 recommendations with PM Surya Ghar Muft Bijli Yojana subsidies.
"""
from typing import List
from .models import RecommendationItem, RecommendationsResponse
from ..tariffs.engine import calculate_energy_charge

# Emission factor for Southern Indian Grid (~0.82 kg CO2 per kWh)
GRID_EMISSION_FACTOR_KG_PER_KWH = 0.82


def calculate_solar_subsidy_pm_surya_ghar(capacity_kw: float) -> float:
    """
    Central Government PM Surya Ghar Muft Bijli Yojana:
    - 1 kW: ₹30,000
    - 2 kW: ₹60,000
    - 3 kW and above: ₹78,000 (capped)
    """
    if capacity_kw <= 0:
        return 0.0
    elif capacity_kw < 1.5:
        return 30000.0
    elif capacity_kw < 2.5:
        return 60000.0
    else:
        return 78000.0


def generate_recommendations(
    monthly_consumption_kwh: float,
    current_monthly_bill_inr: float,
    has_air_conditioner: bool = True,
    household_size: int = 4,
) -> RecommendationsResponse:
    """
    Ranks eco-friendly alternatives based on user consumption profile and ROI payback.
    """
    items: List[RecommendationItem] = []
    effective_kwh_rate = (
        current_monthly_bill_inr / monthly_consumption_kwh
        if monthly_consumption_kwh > 0
        else 6.0
    )

    # 1. Rooftop Solar Recommendation
    # Recommended capacity: ~80% of monthly consumption (average 125 kWh/month per 1 kW in Telangana)
    rec_capacity_kw = round(min(5.0, max(1.0, (monthly_consumption_kwh * 0.85) / 125.0)), 1)
    solar_gen_monthly_kwh = rec_capacity_kw * 125.0
    solar_savings_kwh = min(monthly_consumption_kwh, solar_gen_monthly_kwh)
    solar_savings_inr = round(solar_savings_kwh * effective_kwh_rate, 2)

    gross_solar_cost = rec_capacity_kw * 60000.0  # Approx ₹60k/kW turn-key installed
    solar_subsidy = calculate_solar_subsidy_pm_surya_ghar(rec_capacity_kw)
    net_solar_cost = max(10000.0, gross_solar_cost - solar_subsidy)

    solar_annual_savings = solar_savings_inr * 12.0
    solar_payback = round(net_solar_cost / solar_annual_savings, 1) if solar_annual_savings > 0 else 99.0
    solar_5yr = round((solar_annual_savings * 5.0) - net_solar_cost, 2)
    solar_10yr = round((solar_annual_savings * 10.0) - net_solar_cost, 2)
    solar_co2 = round(solar_savings_kwh * 12.0 * GRID_EMISSION_FACTOR_KG_PER_KWH, 1)

    items.append(
        RecommendationItem(
            id="solar_rooftop",
            title=f"{rec_capacity_kw} kW Grid-Tied Rooftop Solar System",
            category="Renewable Generation",
            description=(
                f"Install a high-efficiency {rec_capacity_kw} kW on-grid solar plant on your roof. "
                f"Includes Telangana TSSPDCL net-metering approvals and smart bi-directional meter."
            ),
            estimated_monthly_savings_kwh=round(solar_savings_kwh, 1),
            estimated_monthly_savings_inr=solar_savings_inr,
            gross_investment_inr=round(gross_solar_cost, 2),
            subsidy_amount_inr=round(solar_subsidy, 2),
            net_investment_inr=round(net_solar_cost, 2),
            payback_years=solar_payback,
            five_year_net_savings_inr=solar_5yr,
            ten_year_net_savings_inr=solar_10yr,
            annual_co2_offset_kg=solar_co2,
            suitability_score=95.0 if monthly_consumption_kwh >= 150 else 70.0,
            key_assumptions=[
                f"PM Surya Ghar Central Subsidy of ₹{int(solar_subsidy):,} deducted.",
                "Assumes Telangana average solar insolation of 4.5 Peak Sun Hours/day.",
                "25-year panel performance warranty.",
            ],
        )
    )

    # 2. 5-Star Inverter AC Upgrade (if AC present and consumption > 180 kWh)
    if has_air_conditioner and monthly_consumption_kwh >= 150:
        ac_savings_kwh = round(min(monthly_consumption_kwh * 0.25, 80.0), 1)
        ac_savings_inr = round(ac_savings_kwh * effective_kwh_rate, 2)
        gross_ac_cost = 42000.0
        ac_annual_savings = ac_savings_inr * 12.0
        ac_payback = round(gross_ac_cost / ac_annual_savings, 1) if ac_annual_savings > 0 else 99.0

        items.append(
            RecommendationItem(
                id="inverter_ac_upgrade",
                title="5-Star Inverter AC Upgrade with Smart Eco-Sensors",
                category="Energy Efficient Appliances",
                description=(
                    "Replace an aging non-inverter air conditioner with a BEE 5-star inverter unit. "
                    "Features dual rotary compressors and variable speed cooling."
                ),
                estimated_monthly_savings_kwh=ac_savings_kwh,
                estimated_monthly_savings_inr=ac_savings_inr,
                gross_investment_inr=gross_ac_cost,
                subsidy_amount_inr=0.0,
                net_investment_inr=gross_ac_cost,
                payback_years=ac_payback,
                five_year_net_savings_inr=round((ac_annual_savings * 5.0) - gross_ac_cost, 2),
                ten_year_net_savings_inr=round((ac_annual_savings * 10.0) - gross_ac_cost, 2),
                annual_co2_offset_kg=round(ac_savings_kwh * 12.0 * GRID_EMISSION_FACTOR_KG_PER_KWH, 1),
                suitability_score=85.0,
                key_assumptions=[
                    "35% energy reduction compared to conventional 3-star non-inverter ACs.",
                    "Estimated 6 hours daily runtime during warmer months.",
                ],
            )
        )

    # 3. Solar Water Heater (100L / 200L)
    swh_capacity = "100L" if household_size <= 4 else "200L"
    swh_savings_kwh = 45.0 if swh_capacity == "100L" else 75.0
    swh_savings_inr = round(swh_savings_kwh * effective_kwh_rate, 2)
    gross_swh_cost = 24000.0 if swh_capacity == "100L" else 35000.0
    swh_annual = swh_savings_inr * 12.0
    swh_payback = round(gross_swh_cost / swh_annual, 1) if swh_annual > 0 else 99.0

    items.append(
        RecommendationItem(
            id="solar_water_heater",
            title=f"{swh_capacity} Evacuated Tube Solar Water Heater",
            category="Water Heating Retrofit",
            description=(
                f"Replace resistive electric geysers with a roof-mounted {swh_capacity} ETC solar water heater. "
                "Delivers pressurized hot water throughout winter mornings."
            ),
            estimated_monthly_savings_kwh=swh_savings_kwh,
            estimated_monthly_savings_inr=swh_savings_inr,
            gross_investment_inr=gross_swh_cost,
            subsidy_amount_inr=0.0,
            net_investment_inr=gross_swh_cost,
            payback_years=swh_payback,
            five_year_net_savings_inr=round((swh_annual * 5.0) - gross_swh_cost, 2),
            ten_year_net_savings_inr=round((swh_annual * 10.0) - gross_swh_cost, 2),
            annual_co2_offset_kg=round(swh_savings_kwh * 12.0 * GRID_EMISSION_FACTOR_KG_PER_KWH, 1),
            suitability_score=80.0,
            key_assumptions=[
                "Eliminates electric geyser morning peak spikes.",
                "Saves approximately 1.5 - 2.5 kWh per day per bath cycle.",
            ],
        )
    )

    # 4. Behavioral Shift Recommendation (Zero Cost)
    behavioral_savings_kwh = round(monthly_consumption_kwh * 0.08, 1)
    behavioral_savings_inr = round(behavioral_savings_kwh * effective_kwh_rate, 2)
    items.append(
        RecommendationItem(
            id="behavioral_tuning",
            title="Smart Load Shifting & Temperature Optimization (Zero Investment)",
            category="Behavioral Efficiency",
            description=(
                "Set AC thermostat to 24°C instead of 18°C–20°C, clean condenser filters every month, "
                "and shift washing machine & water pump operation to afternoon hours."
            ),
            estimated_monthly_savings_kwh=behavioral_savings_kwh,
            estimated_monthly_savings_inr=behavioral_savings_inr,
            gross_investment_inr=0.0,
            subsidy_amount_inr=0.0,
            net_investment_inr=0.0,
            payback_years=0.0,
            five_year_net_savings_inr=round(behavioral_savings_inr * 12.0 * 5.0, 2),
            ten_year_net_savings_inr=round(behavioral_savings_inr * 12.0 * 10.0, 2),
            annual_co2_offset_kg=round(behavioral_savings_kwh * 12.0 * GRID_EMISSION_FACTOR_KG_PER_KWH, 1),
            suitability_score=99.0,
            key_assumptions=[
                "Each 1°C increase in AC thermostat saves ~6% on cooling power.",
                "Zero capital expense.",
            ],
        )
    )

    # Sort by payback years (fastest payback first)
    items.sort(key=lambda x: x.payback_years)
    total_savings = sum(i.estimated_monthly_savings_inr for i in items[:2])

    return RecommendationsResponse(
        user_monthly_consumption_kwh=monthly_consumption_kwh,
        user_estimated_monthly_bill_inr=current_monthly_bill_inr,
        recommended_solutions=items,
        total_potential_monthly_savings_inr=round(total_savings, 2),
        best_payback_solution_id=items[0].id,
    )

