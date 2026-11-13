"""
Regional Electricity Tariff & Cost Engine.
Implements exact tariff slabs, customer charges, load-based fixed charges,
and subsidy schemes for:
 1. Andhra Pradesh APERC (APSPDCL, APEPDCL, APCPDCL) - Urban & Rural, Domestic (LT-I) & Commercial (LT-II)
 2. Telangana TGSPDCL / TGNPDCL (Domestic LT-I categories, Gruha Jyothi scheme)
Features configurable tariff schedules by effective date.
"""
from typing import Tuple, List, Optional, Dict, Any
from .models import (
    TariffCalculationRequest,
    TariffCalculationResult,
    SlabDetail,
    TariffScheduleConfig,
)
from ...core.config import settings

INF = float("inf")

# ── 1. Andhra Pradesh APERC Approved Tariff Schedules ─────────────────────
# Source: APERC Retail Supply Tariff Orders for APSPDCL, APEPDCL, APCPDCL

# APERC LT-I Domestic Telescopic Slabs (2024-25 / 2023-24)
APERC_DOMESTIC_SLABS_2024_25 = [
    (30.0, 1.90),    # Slab 1: 0 to 30 units   @ ₹1.90 / kWh
    (75.0, 3.00),    # Slab 2: 31 to 75 units  @ ₹3.00 / kWh
    (125.0, 4.50),   # Slab 3: 76 to 125 units @ ₹4.50 / kWh
    (225.0, 6.00),   # Slab 4: 126 to 225 units @ ₹6.00 / kWh
    (400.0, 8.75),   # Slab 5: 226 to 400 units @ ₹8.75 / kWh
    (INF, 9.75),     # Slab 6: Above 400 units @ ₹9.75 / kWh
]

# APERC LT-II Non-Domestic / Commercial Slabs
APERC_COMMERCIAL_SLABS_2024_25 = [
    (50.0, 6.85),    # Slab 1: 0 to 50 units   @ ₹6.85 / kWh
    (100.0, 7.80),   # Slab 2: 51 to 100 units @ ₹7.80 / kWh
    (INF, 9.50),     # Slab 3: Above 100 units @ ₹9.50 / kWh
]

# ── 2. Telangana TGSPDCL Domestic Tariff Structure ─────────────────────────
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

# Configurable Tariff Registry (keyed by state, category, effective_date)
TARIFF_REGISTRY: Dict[str, Dict[str, Any]] = {
    "AP_DOMESTIC_2024_25": {
        "state": "Andhra Pradesh",
        "category": "LT-I Domestic",
        "effective_date": "2024-25",
        "slabs": APERC_DOMESTIC_SLABS_2024_25,
        "fixed_charge_per_kw": 10.0,
        "customer_charge_urban": 50.0,
        "customer_charge_rural": 25.0,
        "duty_rate": 0.06,
        "subsidy_name": "YSR Jagjeevan Jyothi Scheme (AP)",
        "subsidy_limit_kwh": 200.0,
    },
    "AP_COMMERCIAL_2024_25": {
        "state": "Andhra Pradesh",
        "category": "LT-II Commercial",
        "effective_date": "2024-25",
        "slabs": APERC_COMMERCIAL_SLABS_2024_25,
        "fixed_charge_per_kw": 60.0,
        "customer_charge_urban": 75.0,
        "customer_charge_rural": 50.0,
        "duty_rate": 0.06,
        "subsidy_name": None,
        "subsidy_limit_kwh": None,
    },
}

APERC_DOMESTIC_SLABS = APERC_DOMESTIC_SLABS_2024_25
TARIFF_CATEGORIES = TELANGANA_TARIFF_CATEGORIES


def get_tariff_schedule_config(
    state: str = "Andhra Pradesh",
    category: str = "LT-I Domestic",
    effective_date: str = "2024-25",
    location_type: str = "urban",
) -> TariffScheduleConfig:
    """Returns the applicable tariff configuration schedule."""
    is_ap = "andhra" in state.lower() or "ap" in state.lower()
    is_comm = "commercial" in category.lower() or "lt-ii" in category.lower()
    key = "AP_COMMERCIAL_2024_25" if (is_ap and is_comm) else ("AP_DOMESTIC_2024_25" if is_ap else "TS_DOMESTIC")

    if is_ap:
        cfg = TARIFF_REGISTRY[key]
        cust_charge = cfg["customer_charge_rural"] if location_type.lower() == "rural" else cfg["customer_charge_urban"]
        return TariffScheduleConfig(
            state="Andhra Pradesh",
            discom="APSPDCL / APEPDCL / APCPDCL",
            effective_date=effective_date,
            consumer_category="LT-II Commercial" if is_comm else "LT-I Domestic",
            location_type=location_type.lower(),
            slabs=[
                {
                    "slab_range": f"{int(s[0] - (30 if i==0 else [30,45,50,100,175][i-1]))}-{int(s[0]) if s[0] != INF else 'Above'}",
                    "upper_limit": s[0] if s[0] != INF else "Above",
                    "rate_per_kwh": s[1],
                }
                for i, s in enumerate(cfg["slabs"])
            ],
            fixed_charge_per_kw=cfg["fixed_charge_per_kw"],
            customer_charge_inr=cust_charge,
            electricity_duty_rate=cfg["duty_rate"],
            subsidy_scheme_name=cfg["subsidy_name"],
            subsidy_unit_limit=cfg["subsidy_limit_kwh"],
        )
    else:
        return TariffScheduleConfig(
            state="Telangana",
            discom="TGSPDCL / TGNPDCL",
            effective_date=effective_date,
            consumer_category="LT-I Domestic",
            location_type="all",
            slabs=[
                {"slab_range": "Category Telescopic", "upper_limit": 200, "rate_per_kwh": 4.80}
            ],
            fixed_charge_per_kw=10.0,
            customer_charge_inr=30.0,
            electricity_duty_rate=0.06,
            subsidy_scheme_name="Gruha Jyothi Scheme (TS)",
            subsidy_unit_limit=200.0,
        )


def calculate_energy_charge(
    units_used: float,
    days: int = 30,
    state: str = "Andhra Pradesh",
    location_type: str = "urban",
    category: str = "LT-I Domestic",
    effective_date: str = "2024-25",
) -> Tuple[float, str, List[SlabDetail]]:
    """
    Computes energy charge across telescopic slabs.
    Accurately supports Andhra Pradesh (APERC LT-I Domestic & LT-II Commercial)
    and Telangana (TGSPDCL LT-I). Slabs are scaled proportionally by (days / 30).
    """
    if units_used <= 0:
        cat_name = f"APERC {category}" if "andhra" in state.lower() else TELANGANA_TARIFF_CATEGORIES[0][0]
        return 0.0, cat_name, []

    scale = max(days, 1) / 30.0
    monthly_equiv = units_used / scale
    charge = 0.0
    lower = 0.0
    breakdown: List[SlabDetail] = []

    is_ap = "andhra" in state.lower() or "ap" in state.lower()
    is_comm = "commercial" in category.lower() or "lt-ii" in category.lower()

    if is_ap:
        # Andhra Pradesh APERC Telescopic Slab Engine
        loc_str = "Rural Panchayat" if location_type.lower() == "rural" else "Urban Corporation"
        cat_label = "LT-II Commercial" if is_comm else "LT-I Domestic"
        category_name = f"APERC {cat_label} ({loc_str})"

        slabs_to_use = APERC_COMMERCIAL_SLABS_2024_25 if is_comm else APERC_DOMESTIC_SLABS_2024_25

        for upper, rate in slabs_to_use:
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
    Calculates gross & net electricity bill with full transparency:
     - Exact telescopic slab energy charges (APERC / TGSPDCL)
     - Urban vs. Rural location differentiation (APERC customer charges: ₹50 urban vs ₹25 rural)
     - Connected load fixed charges (Domestic ₹10/kW, Commercial ₹60/kW)
     - Statutory Electricity Duty (~₹0.06/kWh)
     - Government Welfare Subsidies:
         * AP: YSR Jagjeevan Jyothi Scheme (free electricity up to 200 units/mo for eligible rural/BPL consumers)
         * TS: Gruha Jyothi Scheme (free electricity up to 200 units/mo)
     - Transparent reconciliation against uploaded billed amount
    """
    units = max(0.0, request.units_consumed_kwh)
    days = max(1, request.billing_days)
    scale = days / 30.0
    monthly_equiv = units / scale

    is_ap = "andhra" in request.state.lower() or "ap" in request.state.lower()
    is_rural = request.location_type.lower() == "rural"
    is_comm = "commercial" in request.consumer_category.lower() or "lt-ii" in request.consumer_category.lower()
    state_name = "Andhra Pradesh" if is_ap else "Telangana"
    location_label = "rural" if is_rural else "urban"
    category_name = "LT-II Commercial" if is_comm else "LT-I Domestic"

    energy_charge, category, breakdown = calculate_energy_charge(
        units_used=units,
        days=days,
        state=state_name,
        location_type=location_label,
        category=category_name,
        effective_date=request.effective_date,
    )

    sanctioned_load = max(0.5, float(request.sanctioned_load_kw))

    # Location-based Fixed & Customer Charges
    if is_ap:
        discom_name = request.discom if request.discom else ("APSPDCL" if is_rural else "APCPDCL")
        provider = f"{discom_name} (Andhra Pradesh - {location_label.title()})"

        # Fixed charge: Domestic ₹10/kW/month across AP (waived for rural lifeline usage <= 50 units)
        if not is_comm and is_rural and monthly_equiv <= 50:
            fixed_charge = 0.0
        elif is_comm:
            fixed_charge = round(60.0 * sanctioned_load * scale, 2)
        else:
            fixed_charge = round(10.0 * sanctioned_load * scale, 2)

        if request.fixed_charges is not None:
            fixed_charge = round(request.fixed_charges * scale, 2)

        # Customer charges: Urban ₹50/mo vs Rural ₹25/mo for Domestic (APERC Schedule)
        if is_comm:
            customer_charge = round((50.0 if is_rural else 75.0) * scale, 2)
        else:
            customer_charge = round((25.0 if is_rural else 50.0) * scale, 2)

        # Duty: ~₹0.06/unit statutory duty
        duty_charge = round(request.electricity_duty_per_kwh * units, 2)
        other_charges = 0.0
        gross_total = round(energy_charge + fixed_charge + customer_charge + duty_charge, 2)

        # AP Welfare Subsidy: YSR Jagjeevan Jyothi Scheme
        is_subsidized = (not is_comm) and request.is_gruha_jyothi_eligible and (monthly_equiv <= 200.0)
        subsidy_amount = gross_total if is_subsidized else 0.0
        net_payable = 0.0 if is_subsidized else gross_total
        subsidy_name = "YSR Jagjeevan Jyothi Scheme (AP)" if request.is_gruha_jyothi_eligible else None
        headroom = round(200.0 - monthly_equiv, 2) if (request.is_gruha_jyothi_eligible and is_subsidized) else None

        notes: List[str] = [
            f"Calculated under APERC {request.effective_date} {category_name} ({location_label.upper()}) Schedule.",
            f"DISCOM: {discom_name} | Sanctioned Load: {sanctioned_load} kW (Fixed charge ₹{fixed_charge}).",
            f"Customer Service Charge: ₹{customer_charge} ({location_label.title()} schedule rate).",
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
        discom_name = request.discom if request.discom else "TGSPDCL"
        provider = f"{discom_name} (Telangana Southern Power Distribution)"
        fixed_charge = round((request.fixed_charges if request.fixed_charges is not None else 50.0) * scale, 2)
        customer_charge = round(30.0 * scale, 2)
        duty_charge = round(request.electricity_duty_per_kwh * units, 2)
        other_charges = 0.0
        gross_total = round(energy_charge + fixed_charge + customer_charge + duty_charge, 2)

        is_subsidized = request.is_gruha_jyothi_eligible and (monthly_equiv <= settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH)
        subsidy_amount = gross_total if is_subsidized else 0.0
        net_payable = 0.0 if is_subsidized else gross_total
        subsidy_name = "Gruha Jyothi Scheme (Telangana)" if request.is_gruha_jyothi_eligible else None
        headroom = round(settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH - monthly_equiv, 2) if is_subsidized else None

        notes = [
            f"Calculated under Telangana TGSPDCL category: {category}",
            f"Sanctioned Load: {sanctioned_load} kW | Customer Charge: ₹{customer_charge}.",
        ]
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

    # Bill reconciliation
    diff_val = 0.0
    diff_expl = "Calculated amount matches billed total."
    if request.billed_amount_inr is not None and request.billed_amount_inr > 0:
        diff_val = round(request.billed_amount_inr - net_payable, 2)
        if abs(diff_val) > 1.0:
            diff_expl = (
                f"Variance of ₹{diff_val:+.2f} between uploaded bill (₹{request.billed_amount_inr:.2f}) "
                f"and standard APERC/TGSPDCL calculation (₹{net_payable:.2f}). "
                f"This difference is attributable to fuel price adjustment (FPPCA), delayed payment interest, or municipal taxes."
            )

    return TariffCalculationResult(
        state=state_name,
        location_type=location_label,
        discom=discom_name,
        provider=provider,
        units_consumed_kwh=round(units, 2),
        billing_days=days,
        category=category,
        sanctioned_load_kw=sanctioned_load,
        energy_charges_inr=energy_charge,
        fixed_charges_inr=fixed_charge,
        customer_charges_inr=customer_charge,
        electricity_duty_inr=duty_charge,
        other_charges_inr=other_charges,
        gross_total_inr=gross_total,
        subsidy_amount_inr=subsidy_amount,
        net_payable_inr=net_payable,
        billed_amount_inr=request.billed_amount_inr,
        difference_inr=diff_val,
        difference_explanation=diff_expl,
        is_gruha_jyothi_applied=is_subsidized,
        gruha_jyothi_headroom_kwh=headroom,
        subsidy_name=subsidy_name,
        effective_rate_per_kwh=eff_rate,
        slab_breakdown=breakdown,
        notes=notes,
    )


