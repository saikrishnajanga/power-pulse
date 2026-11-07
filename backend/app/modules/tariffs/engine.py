"""
Telangana TGSPDCL Domestic Electricity Tariff Engine.
Implements exact tariff slabs & Gruha Jyothi scheme from PRISM-M Epic E-06 and Zoheba notebook.
"""
from typing import Tuple, List
from .models import TariffCalculationRequest, TariffCalculationResult, SlabDetail
from ...core.config import settings

INF = float("inf")

# TGSPDCL Domestic Tariff Structure:
# (Category Name, Max Monthly Units Ceiling, [(Slab Upper Limit in kWh, Rate in INR/kWh)])
TARIFF_CATEGORIES = [
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


def calculate_energy_charge(units_used: float, days: int = 30) -> Tuple[float, str, List[SlabDetail]]:
    """
    Computes energy charge across telescopic slabs.
    Slabs are scaled proportionally by (days / 30).
    """
    if units_used <= 0:
        return 0.0, TARIFF_CATEGORIES[0][0], []

    scale = max(days, 1) / 30.0
    monthly_equiv = units_used / scale

    # Select appropriate category based on 30-day equivalent consumption
    category_name, _, slabs = next(c for c in TARIFF_CATEGORIES if monthly_equiv <= c[1])

    charge = 0.0
    lower = 0.0
    breakdown: List[SlabDetail] = []

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
    Calculates gross & net electricity bill including fixed charges,
    state duty, and Gruha Jyothi zero-electricity subsidy.
    """
    units = max(0.0, request.units_consumed_kwh)
    days = max(1, request.billing_days)
    scale = days / 30.0
    monthly_equiv = units / scale

    energy_charge, category, breakdown = calculate_energy_charge(units, days)
    fixed_charge = round(request.fixed_charges * scale, 2)
    duty_charge = round(request.electricity_duty_per_kwh * units, 2)
    gross_total = round(energy_charge + fixed_charge + duty_charge, 2)

    # Gruha Jyothi Scheme: 100% subsidy if monthly-equivalent <= 200 units
    is_free = request.is_gruha_jyothi_eligible and (monthly_equiv <= settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH)
    net_payable = 0.0 if is_free else gross_total

    notes: List[str] = [f"Calculated under Telangana TGSPDCL category: {category}"]
    headroom = None

    if request.is_gruha_jyothi_eligible:
        if is_free:
            headroom = round(settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH - monthly_equiv, 2)
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

    return TariffCalculationResult(
        units_consumed_kwh=round(units, 2),
        billing_days=days,
        category=category,
        energy_charges_inr=energy_charge,
        fixed_charges_inr=fixed_charge,
        electricity_duty_inr=duty_charge,
        gross_total_inr=gross_total,
        net_payable_inr=net_payable,
        is_gruha_jyothi_applied=is_free,
        gruha_jyothi_headroom_kwh=headroom,
        slab_breakdown=breakdown,
        notes=notes,
    )

