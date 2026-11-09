"""
Regional Domestic Electricity Tariff Engine.
Implements exact tariff slabs & subsidy schemes for:
 1. Telangana TGSPDCL (PRISM-M Epic E-06, Gruha Jyothi scheme)
 2. Andhra Pradesh APERC LT-I Domestic (Urban & Rural location-based telescopic tariff)
"""
from typing import Tuple, List, Optional
from .models import TariffCalculationRequest, TariffCalculationResult, SlabDetail
from ...core.config import settings

INF = float("inf")

# ── Telangana TGSPDCL Domestic Tariff Structure ─────────────────────────────
# (Category Name, Max Monthly Units Ceiling, [(Slab Upper Limit in kWh, Rate in INR/kWh)])
TELANGANA_TARIFF_CATEGORIES = [
    (
        "LT-I(A) Domestic (up to 100 units)",
        100.0,
        [(50.0, 1.95), (100.0, 3.10)],
    ),
    (
        "LT-I(B)(i) Domestic (up to 200 units)",
        200.0,
        [(100.0, 3.40), (200.0, 4.80)],
    ),
    (
        "LT-I(B)(ii) Domestic (above 200 units)",
        INF,
        [
            (200.0, 5.10),
            (300.0, 7.70),
            (400.0, 9.00),
            (800.0, 9.50),
            (INF, 10.00),
        ],
    ),
]

# ── Andhra Pradesh APERC Approved LT-I Domestic Tariff Structure ───────────
# Approved Retail Supply Tariff Order (APSPDCL, APEPDCL, APCPDCL)
# Telescopic slab structure:
APERC_DOMESTIC_SLABS = [
    (30.0, 1.90),    # Slab 1: 0 to 30 units   @ ₹1.90 / kWh
    (75.0, 3.00),    # Slab 2: 31 to 75 units  @ ₹3.00 / kWh
    (125.0, 4.50),   # Slab 3: 76 to 125 units @ ₹4.50 / kWh
    (225.0, 6.00),   # Slab 4: 126 to 225 units @ ₹6.00 / kWh
    (400.0, 8.75),   # Slab 5: 226 to 400 units @ ₹8.75 / kWh
    (INF, 9.75),     # Slab 6: Above 400 units @ ₹9.75 / kWh
]

TARIFF_CATEGORIES = TELANGANA_TARIFF_CATEGORIES


def calculate_energy_charge(
    units_used: float,
    days: int = 30,
    state: str = "Telangana",
    location_type: str = "urban",
) -> Tuple[float, str, List[SlabDetail]]:
    """
    Computes energy charge across telescopic slabs.
    Supports Telangana (TGSPDCL) and Andhra Pradesh (APERC LT-I).
    Slabs are scaled proportionally by (days / 30).
    """
    if units_used <= 0:
        cat_name = "LT-I Domestic (APERC)" if "andhra" in state.lower() else TELANGANA_TARIFF_CATEGORIES[0][0]
        return 0.0, cat_name, []

    scale = max(days, 1) / 30.0
    monthly_equiv = units_used / scale
    charge = 0.0
    lower = 0.0
    breakdown: List[SlabDetail] = []

    if "andhra" in state.lower() or "ap" in state.lower():
        # Andhra Pradesh APERC Telescopic Slab Engine
        loc_str = "Rural Panchayat" if location_type.lower() == "rural" else "Urban Corporation"
        category_name = f"APERC LT-I Domestic ({loc_str})"

        for upper, rate in APERC_DOMESTIC_SLABS:
            scaled_upper = upper * scale if upper != INF else INF
            if units_used > lower:
                slab_units = min(units_used, scaled_upper) - lower
                slab_amt = slab_units * rate
                charge += slab_amt
                breakdown.append(
                    SlabDetail(
                        slab_range=f"{int(lower)}-{int(scaled_upper) if scaled_upper != INF else 'Above'}",
                        units_in_slab=round(slab_units, 2),
                        rate_per_kwh=rate,
                        amount_inr=round(slab_amt, 2),
                    )
                )
            lower = scaled_upper
    else:
        # Telangana TGSPDCL Domestic Category Engine
        category_name, _, slabs = next(c for c in TELANGANA_TARIFF_CATEGORIES if monthly_equiv <= c[1])

        for upper, rate in slabs:
            scaled_upper = upper * scale if upper != INF else INF
            if units_used > lower:
                slab_units = min(units_used, scaled_upper) - lower
                slab_amt = slab_units * rate
                charge += slab_amt
                breakdown.append(
                    SlabDetail(
                        slab_range=f"{int(lower)}-{int(scaled_upper) if scaled_upper != INF else 'Above'}",
                        units_in_slab=round(slab_units, 2),
                        rate_per_kwh=rate,
                        amount_inr=round(slab_amt, 2),
                    )
                )
            lower = scaled_upper

    return round(charge, 2), category_name, breakdown


def calculate_bill(request: TariffCalculationRequest) -> TariffCalculationResult:
    """
    Calculates gross & net electricity bill including:
     - Telescopic slab energy charges for Telangana or Andhra Pradesh
     - Urban vs. Rural location differentiation (fixed charges & customer charges)
     - State-specific subsidies (Gruha Jyothi in TS, YSR Jagjeevan Jyothi in AP)
    """
    units = max(0.0, request.units_consumed_kwh)
    days = max(1, request.billing_days)
    scale = days / 30.0
    monthly_equiv = units / scale

    is_ap = "andhra" in request.state.lower() or "ap" in request.state.lower()
    is_rural = request.location_type.lower() == "rural"
    state_name = "Andhra Pradesh" if is_ap else "Telangana"
    location_label = "rural" if is_rural else "urban"

    energy_charge, category, breakdown = calculate_energy_charge(
        units_used=units,
        days=days,
        state=state_name,
        location_type=location_label,
    )

    sanctioned_load = max(0.5, request.sanctioned_load_kw)

    # Location-based Fixed & Customer Charges
    if is_ap:
        provider = "APSPDCL / APEPDCL (Rural Gram Panchayat)" if is_rural else "APCPDCL / APSPDCL (Urban Corporation)"
        # Fixed charge: ₹10/kW/month across AP (waived for rural lifeline usage <= 50 units)
        if is_rural and monthly_equiv <= 50:
            fixed_charge = 0.0
        else:
            fixed_charge = round(10.0 * sanctioned_load * scale, 2)

        # Customer charges: Urban ₹50/mo vs Rural ₹25/mo
        customer_charge = round((25.0 if is_rural else 50.0) * scale, 2)
        if request.fixed_charges is not None:
            fixed_charge = round(request.fixed_charges * scale, 2)

        # Duty: ~₹0.06/unit or 6% statutory duty
        duty_charge = round(request.electricity_duty_per_kwh * units, 2)
        gross_total = round(energy_charge + fixed_charge + customer_charge + duty_charge, 2)

        # AP Lifeline Welfare: YSR Jagjeevan Jyothi Scheme (free electricity up to 200 units for eligible rural/BPL)
        is_subsidized = request.is_gruha_jyothi_eligible and (monthly_equiv <= 200.0)
        subsidy_amount = gross_total if is_subsidized else 0.0
        net_payable = 0.0 if is_subsidized else gross_total
        subsidy_name = "YSR Jagjeevan Jyothi Scheme (AP)" if request.is_gruha_jyothi_eligible else None
        headroom = round(200.0 - monthly_equiv, 2) if (request.is_gruha_jyothi_eligible and is_subsidized) else None

        notes: List[str] = [
            f"Calculated under {state_name} ({location_label.upper()}) APERC Domestic Tariff Schedule.",
            f"Connected Load: {sanctioned_load} kW (Fixed charge ₹10/kW = ₹{fixed_charge}).",
            f"Location Customer Service Charge: ₹{customer_charge} ({location_label.title()} schedule).",
        ]

        if request.is_gruha_jyothi_eligible:
            if is_subsidized:
                notes.append(
                    f"YSR Jagjeevan Jyothi Subsidy Applied: Net bill ₹0! "
                    f"You have {headroom} units of subsidized electricity headroom remaining this month."
                )
            else:
                excess = round(monthly_equiv - 200.0, 2)
                notes.append(
                    f"Rural Subsidy Threshold Exceeded: Usage ({round(monthly_equiv, 1)} units) "
                    f"exceeds the 200 units/mo quota by {excess} units. Full bill of ₹{gross_total} is payable."
                )

    else:
        # Telangana (TGSPDCL)
        provider = "TGSPDCL (Telangana Southern Power Distribution)"
        fixed_charge = round((request.fixed_charges if request.fixed_charges is not None else 50.0) * scale, 2)
        customer_charge = round(30.0 * scale, 2)
        duty_charge = round(request.electricity_duty_per_kwh * units, 2)
        gross_total = round(energy_charge + fixed_charge + duty_charge, 2)

        is_subsidized = request.is_gruha_jyothi_eligible and (monthly_equiv <= settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH)
        subsidy_amount = gross_total if is_subsidized else 0.0
        net_payable = 0.0 if is_subsidized else gross_total
        subsidy_name = "Gruha Jyothi Scheme (Telangana)" if request.is_gruha_jyothi_eligible else None
        headroom = round(settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH - monthly_equiv, 2) if is_subsidized else None

        notes = [f"Calculated under Telangana TGSPDCL category: {category}"]
        if request.is_gruha_jyothi_eligible:
            if is_subsidized:
                notes.append(
                    f"Gruha Jyothi Subsidy Applied: Net bill ₹0! "
                    f"You have {headroom} units of free headroom remaining this month."
                )
            else:
                excess = round(monthly_equiv - settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH, 2)
                notes.append(
                    f"Gruha Jyothi Threshold Exceeded: Usage ({round(monthly_equiv, 1)} units) "
                    f"exceeds the 200 units/mo limit by {excess} units. Full bill of ₹{gross_total} is payable."
                )

    eff_rate = round(energy_charge / units, 2) if units > 0 else 0.0

    return TariffCalculationResult(
        state=state_name,
        location_type=location_label,
        provider=provider,
        units_consumed_kwh=round(units, 2),
        billing_days=days,
        category=category,
        energy_charges_inr=energy_charge,
        fixed_charges_inr=fixed_charge,
        customer_charges_inr=customer_charge,
        electricity_duty_inr=duty_charge,
        gross_total_inr=gross_total,
        subsidy_amount_inr=subsidy_amount,
        net_payable_inr=net_payable,
        is_gruha_jyothi_applied=is_subsidized,
        gruha_jyothi_headroom_kwh=headroom,
        subsidy_name=subsidy_name,
        effective_rate_per_kwh=eff_rate,
        slab_breakdown=breakdown,
        notes=notes,
    )

