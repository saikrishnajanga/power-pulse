"""
PowerPulse AI Backend - Main FastAPI Application.
Integrates ML Forecasting, Anomaly Detection, TGSPDCL Tariffs & Solar Recommendations.
PRISM-M Epic E-01, E-06, E-07, E-09.
"""
from datetime import datetime, timedelta, date
from typing import List, Optional
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from .core.config import settings
from .modules.tariffs.models import TariffCalculationRequest, TariffCalculationResult
from .modules.tariffs.engine import calculate_bill, TARIFF_CATEGORIES
from .modules.anomaly.models import AnomalyDetectionRequest, AnomalySummary
from .modules.anomaly.detector import AnomalyDetector
from .modules.forecasting.models import ForecastResponse
from .modules.forecasting.engine import ForecastingEngine
from .modules.recommendations.models import RecommendationsResponse
from .modules.recommendations.engine import generate_recommendations
from .modules.disaggregation.models import DisaggregationRequest, DisaggregationResponse
from .modules.disaggregation.engine import disaggregation_engine
from .modules.bills.models import DEFAULT_TELANGANA_BILL, ElectricityBillJSON
from .modules.bills.extractor import ExtractedBillRecord
from .modules.bills.service import bill_service, BillComparisonResult
from .modules.reports.pdf_generator import generate_energy_audit_pdf
from .modules.recommendations.solar_prediction import (
    predict_single_hour,
    predict_daily_profile,
    predict_with_savings,
    predict_today_live,
    SUPPORTED_CITIES,
)
from .modules.recommendations.solar_alternatives import (
    compute_appliance_solar_alternatives,
    BillAnalysisAndSolarRecommendations,
)
from .modules.monitoring.service import monitoring_service
from .modules.monitoring.models import PrismMMonitoringResponse
from .modules.benchmark.engine import calculate_household_benchmark
from .modules.benchmark.models import BenchmarkComparisonResponse
from .modules.identity.service import identity_service
from .modules.identity.models import UserProfile, ConsentUpdateRequest, DeletionResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack AI-Driven Energy Consumption & Cost Optimization Engine.",
)

# Enable CORS for frontend web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cached Forecasting & Anomaly Singleton Engines
forecasting_engine = ForecastingEngine()
anomaly_detector = AnomalyDetector()


@app.get(f"{settings.API_V1_STR}/health")
def api_health():
    """Health check endpoint."""
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "region": f"{settings.TARGET_STATE}, {settings.TARGET_COUNTRY}",
        "status": "online",
        "docs_url": "/docs",
    }


# -------------------------------------------------------------
# 1. Tariff & Gruha Jyothi Cost Engine Endpoints
# -------------------------------------------------------------
@app.get(f"{settings.API_V1_STR}/tariffs/categories")
def get_tariff_categories(state: str = Query("Telangana")):
    """
    Returns domestic tariff structures and slab limits for Telangana (TGSPDCL)
    and Andhra Pradesh (APERC Approved Urban & Rural Telescopic Slabs).
    """
    if "andhra" in state.lower() or "ap" in state.lower():
        from .modules.tariffs.engine import APERC_DOMESTIC_SLABS
        return {
            "provider": "APERC (APSPDCL / APEPDCL / APCPDCL)",
            "state": "Andhra Pradesh",
            "rural_subsidy_scheme": "YSR Jagjeevan Jyothi Scheme (200 units/mo free electricity for rural/BPL)",
            "categories": [
                {
                    "category_name": "APERC LT-I Domestic (Urban Corporation)",
                    "location_type": "urban",
                    "fixed_charge_per_kw": 10.0,
                    "customer_charge_inr": 50.0,
                    "slabs": [
                        {"slab_range": f"{int(s[0] - (30 if i==0 else [30,45,50,100,175][i-1]))}-{int(s[0]) if s[0] != float('inf') else 'Above'}", "upper_limit": u if u != float("inf") else "Above", "rate_inr_per_kwh": r}
                        for i, (u, r) in enumerate(APERC_DOMESTIC_SLABS)
                    ],
                },
                {
                    "category_name": "APERC LT-I Domestic (Rural Panchayat)",
                    "location_type": "rural",
                    "fixed_charge_per_kw": 10.0,
                    "customer_charge_inr": 25.0,
                    "slabs": [
                        {"slab_range": f"{int(s[0] - (30 if i==0 else [30,45,50,100,175][i-1]))}-{int(s[0]) if s[0] != float('inf') else 'Above'}", "upper_limit": u if u != float("inf") else "Above", "rate_inr_per_kwh": r}
                        for i, (u, r) in enumerate(APERC_DOMESTIC_SLABS)
                    ],
                },
            ],
        }

    return {
        "provider": "TGSPDCL (Telangana Southern Power Distribution Company Ltd)",
        "state": "Telangana",
        "gruha_jyothi_monthly_limit_kwh": settings.GRUHA_JYOTHI_MONTHLY_LIMIT_KWH,
        "categories": [
            {
                "category_name": name,
                "location_type": "all",
                "monthly_units_limit": None if limit == float("inf") else limit,
                "slabs": [{"upper_limit": u if u != float("inf") else "Above", "rate_inr_per_kwh": r} for u, r in slabs],
            }
            for name, limit, slabs in TARIFF_CATEGORIES
        ],
    }


@app.post(f"{settings.API_V1_STR}/tariffs/calculate", response_model=TariffCalculationResult)
def calculate_electricity_bill(request: TariffCalculationRequest):
    """Calculates rupee bill amount with telescopic slabs and Gruha Jyothi eligibility."""
    return calculate_bill(request)


# -------------------------------------------------------------
# 2. Anomaly & Spike Detection Endpoints
# -------------------------------------------------------------
@app.post(f"{settings.API_V1_STR}/anomaly/analyze", response_model=AnomalySummary)
def analyze_anomalies(request: AnomalyDetectionRequest):
    """Runs Isolation Forest anomaly detection and identifies spike causes."""
    try:
        return anomaly_detector.analyze(request.timestamps, request.readings_kwh)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------
# 3. Forecasting Endpoints
# -------------------------------------------------------------
class ForecastRequest(BaseModel):
    timestamps: List[datetime]
    readings_kwh: List[float]
    horizon_hours: int = 168  # 168 for 7 days, 720 for 30 days


@app.post(f"{settings.API_V1_STR}/forecast/generate", response_model=ForecastResponse)
def generate_forecast_endpoint(request: ForecastRequest):
    """Generates autoregressive hourly predictions with MAD dynamic spike detection."""
    if len(request.readings_kwh) < 169:
        raise HTTPException(
            status_code=400,
            detail=f"At least 169 hourly readings required for lag features (received {len(request.readings_kwh)}).",
        )
    series = pd.Series(request.readings_kwh, index=pd.to_datetime(request.timestamps))
    name = "Weekly Forecast (7 Days)" if request.horizon_hours <= 168 else "Monthly Forecast (30 Days)"
    return forecasting_engine.generate_forecast(series, horizon_hours=request.horizon_hours, horizon_name=name)


@app.get(f"{settings.API_V1_STR}/forecast/demo", response_model=ForecastResponse)
def get_demo_forecast(
    period: str = Query("weekly", pattern="^(weekly|monthly)$"),
    monthly_kwh: Optional[float] = Query(None, ge=10, le=10000),
):
    """
    Returns instant demo forecast generated from calibrated Indian household profiles.
    Dynamically scales with user monthly consumption so updates are never static.
    """
    horizon = 168 if period == "weekly" else 720
    name = "Weekly Forecast (Next 7 Days)" if period == "weekly" else "Monthly Forecast (Next 30 Days)"

    user_units = float(monthly_kwh) if monthly_kwh is not None else 185.0
    daily_target_kwh = user_units / 30.0
    hourly_mean = max(0.05, daily_target_kwh / 24.0)

    # Generate 200 hours of realistic historical baseline up to current clock hour
    now = datetime.now().replace(minute=0, second=0, microsecond=0)
    start_dt = now - timedelta(hours=200)
    times = pd.date_range(start=start_dt, periods=200, freq="h")
    hours = times.hour.to_numpy()

    # Calibrated Indian domestic diurnal shape: morning wake peak (7-9 AM) and evening cooling peak (7-10 PM)
    diurnal_curve = (
        0.35 * np.sin((hours - 6) * np.pi / 12)
        + 0.25 * np.exp(-((hours - 20) ** 2) / 8)
        + 0.15 * np.exp(-((hours - 8) ** 2) / 6)
    )
    # Scale to match user's actual consumption level dynamically
    base_values = hourly_mean * (1.0 + diurnal_curve) + np.random.normal(0, max(0.01, hourly_mean * 0.08), len(times))
    base_values = np.clip(base_values, max(0.02, hourly_mean * 0.2), hourly_mean * 3.5)

    series = pd.Series(base_values, index=times)
    return forecasting_engine.generate_forecast(series, horizon_hours=horizon, horizon_name=name)


# -------------------------------------------------------------
# 4. Eco-Alternatives & ROI Engine Endpoints
# -------------------------------------------------------------
class RecommendationsRequest(BaseModel):
    monthly_consumption_kwh: float
    current_monthly_bill_inr: float
    has_air_conditioner: bool = True
    household_size: int = 4


@app.post(f"{settings.API_V1_STR}/recommendations", response_model=RecommendationsResponse)
def get_recommendations_endpoint(request: RecommendationsRequest):
    """Calculates ROI, PM Surya Ghar solar subsidies, and ranked green alternatives."""
    return generate_recommendations(
        monthly_consumption_kwh=request.monthly_consumption_kwh,
        current_monthly_bill_inr=request.current_monthly_bill_inr,
        has_air_conditioner=request.has_air_conditioner,
        household_size=request.household_size,
    )


# -------------------------------------------------------------
# 5. Appliance Disaggregation Endpoints (PRISM-M Epic E-08)
# -------------------------------------------------------------
@app.post(f"{settings.API_V1_STR}/disaggregation/breakdown", response_model=DisaggregationResponse)
def get_appliance_breakdown(request: DisaggregationRequest):
    """Disaggregates aggregate consumption into sub-metered appliance categories with costs."""
    return disaggregation_engine.disaggregate(request)


@app.get(f"{settings.API_V1_STR}/disaggregation/demo", response_model=DisaggregationResponse)
def get_demo_disaggregation():
    """Returns sample golden disaggregation breakdown for default 185 kWh household."""
    return disaggregation_engine.disaggregate(DisaggregationRequest(monthly_consumption_kwh=185.0))


# -------------------------------------------------------------
# 6. Bill Ingestion & Management Endpoints (PRISM-M Epic E-04)
# -------------------------------------------------------------
@app.get(f"{settings.API_V1_STR}/bills", response_model=List[ExtractedBillRecord])
def list_uploaded_bills():
    """Lists all extracted and confirmed utility bills (PRISM-M I8, I9)."""
    return bill_service.list_bills()


@app.get(f"{settings.API_V1_STR}/bills/compare", response_model=BillComparisonResult)
def compare_bills_endpoint(
    curr_id: str = Query(..., description="Current bill ID"),
    prev_id: str = Query(..., description="Previous bill ID"),
):
    """Compares two billing periods side by side with trends (PRISM-M I10)."""
    try:
        return bill_service.compare_bills(curr_id, prev_id)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get(f"{settings.API_V1_STR}/bills/{{bill_id}}", response_model=ExtractedBillRecord)
def get_single_bill(bill_id: str):
    """Retrieves a specific bill record."""
    bill = bill_service.get_bill(bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@app.post(f"{settings.API_V1_STR}/bills/upload", response_model=ExtractedBillRecord)
async def upload_bill_file(file: UploadFile = File(...)):
    """
    Uploads an electricity bill (JPG, PNG, PDF) and runs extraction pipeline (PRISM-M I2, I3, I6, I7).
    """
    content = await file.read()
    record = bill_service.process_upload(file.filename, content)
    return record


class ConfirmBillRequest(BaseModel):
    units_consumed_kwh: Optional[float] = None
    billing_days: Optional[int] = None
    is_gruha_jyothi_applied: Optional[bool] = None


@app.post(f"{settings.API_V1_STR}/bills/{{bill_id}}/confirm", response_model=ExtractedBillRecord)
def confirm_bill_endpoint(bill_id: str, request: ConfirmBillRequest):
    """Allows user to review, correct, and confirm extracted bill values (PRISM-M I8, I9)."""
    try:
        updated = {k: v for k, v in request.model_dump().items() if v is not None}
        return bill_service.confirm_bill(bill_id, updated)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get(f"{settings.API_V1_STR}/bills/sample", response_model=ElectricityBillJSON)
def get_sample_bill():
    """Returns sample golden Telangana TSSPDCL domestic bill."""
    return DEFAULT_TELANGANA_BILL


# -------------------------------------------------------------
# 7. Solar Energy Prediction Engine (from solar_energy.ipynb)
# -------------------------------------------------------------
class SolarPredictRequest(BaseModel):
    panel_capacity_kw: float = 5.0
    irradiance_wm2: float = 600.0
    temperature_c: float = 30.0
    cloud_cover_pct: float = 25.0
    battery_installed: bool = False
    occupants: int = 3
    hour: int = 12
    city: str = "Hyderabad"
    target_date: Optional[str] = None  # ISO date string


class SolarDailyRequest(BaseModel):
    panel_capacity_kw: float = 5.0
    irradiance_wm2: Optional[float] = 600.0
    temperature_c: Optional[float] = 30.0
    cloud_cover_pct: float = 25.0
    battery_installed: bool = False
    occupants: int = 3
    city: str = "Hyderabad"
    target_date: Optional[str] = None


class SolarSavingsRequest(BaseModel):
    panel_capacity_kw: float = 5.0
    irradiance_wm2: Optional[float] = 600.0
    temperature_c: Optional[float] = 30.0
    cloud_cover_pct: float = 25.0
    battery_installed: bool = False
    monthly_consumption_kwh: float = 185.0
    effective_tariff_inr: float = 4.8
    city: str = "Hyderabad"


@app.get(f"{settings.API_V1_STR}/solar/cities")
def get_supported_solar_cities():
    """Returns the list of cities supported by the solar prediction model."""
    return {"cities": SUPPORTED_CITIES, "default": "Hyderabad"}


@app.post(f"{settings.API_V1_STR}/solar/predict-hour")
def solar_predict_hour(request: SolarPredictRequest):
    """
    Predicts solar generation for a single hour.
    Mirrors Cell 10 interactive simulator from solar_energy.ipynb.
    """
    td = None
    if request.target_date:
        try:
            td = date.fromisoformat(request.target_date)
        except ValueError:
            pass
    return predict_single_hour(
        panel_capacity_kw=request.panel_capacity_kw,
        irradiance_wm2=request.irradiance_wm2,
        temperature_c=request.temperature_c,
        cloud_cover_pct=request.cloud_cover_pct,
        battery_installed=request.battery_installed,
        occupants=request.occupants,
        hour=request.hour,
        city=request.city,
        target_date=td,
    )


@app.post(f"{settings.API_V1_STR}/solar/predict-daily")
def solar_predict_daily(request: SolarDailyRequest):
    """
    Generates 24-hour diurnal solar generation profile.
    Returns hourly predictions with irradiance and temperature curves scaled to input irradiance.
    """
    td = None
    if request.target_date:
        try:
            td = date.fromisoformat(request.target_date)
        except ValueError:
            pass
    return predict_daily_profile(
        panel_capacity_kw=request.panel_capacity_kw,
        irradiance_wm2=request.irradiance_wm2,
        temperature_c=request.temperature_c,
        cloud_cover_pct=request.cloud_cover_pct,
        battery_installed=request.battery_installed,
        occupants=request.occupants,
        city=request.city,
        target_date=td,
    )


@app.post(f"{settings.API_V1_STR}/solar/predict-savings")
def solar_predict_savings(request: SolarSavingsRequest):
    """
    Full solar ROI analysis: ML generation + financial savings + CO₂ offset.
    Recalculates based on solar irradiance, panel size, and local tariffs.
    """
    return predict_with_savings(
        panel_capacity_kw=request.panel_capacity_kw,
        irradiance_wm2=request.irradiance_wm2,
        temperature_c=request.temperature_c,
        cloud_cover_pct=request.cloud_cover_pct,
        battery_installed=request.battery_installed,
        monthly_consumption_kwh=request.monthly_consumption_kwh,
        effective_tariff_inr=request.effective_tariff_inr,
        city=request.city,
    )


@app.get(f"{settings.API_V1_STR}/solar/today-live")
def solar_today_live(
    panel_capacity_kw: float = Query(5.0),
    battery_installed: bool = Query(False),
):
    """
    Predicts today's solar generation using LIVE Open-Meteo weather data.
    Falls back to typical Hyderabad irradiance profile if API is unreachable.
    """
    return predict_today_live(
        panel_capacity_kw=panel_capacity_kw,
        battery_installed=battery_installed,
    )


@app.get(f"{settings.API_V1_STR}/solar/demo")
def solar_demo(
    irradiance_wm2: float = Query(600.0),
    panel_capacity_kw: float = Query(3.0),
    temperature_c: float = Query(30.0),
):
    """
    Returns solar analysis with default conditions or query overrides.
    """
    return predict_with_savings(
        panel_capacity_kw=panel_capacity_kw,
        irradiance_wm2=irradiance_wm2,
        temperature_c=temperature_c,
        cloud_cover_pct=25.0,
        battery_installed=False,
        monthly_consumption_kwh=185.0,
        effective_tariff_inr=4.8,
        city="Hyderabad",
    )


@app.get(f"{settings.API_V1_STR}/solar/appliance-alternatives", response_model=BillAnalysisAndSolarRecommendations)
def get_appliance_solar_alternatives(
    monthly_kwh: float = Query(185.0),
    current_bill_inr: float = Query(809.0),
    bill_id: str = Query("BILL_CURRENT"),
    bill_file_name: str = Query("Uploaded Bill"),
):
    """
    Analyzes consumption from uploaded bill, ranks highest-consuming appliances,
    and provides dedicated solar alternatives with exact rupee savings.
    Directly satisfies user requirement from mentor discussion.
    """
    return compute_appliance_solar_alternatives(
        monthly_consumption_kwh=monthly_kwh,
        current_monthly_bill_inr=current_bill_inr,
        bill_id=bill_id,
        bill_file_name=bill_file_name,
    )


# -------------------------------------------------------------
# 8. Energy Audit PDF Reporting (PRISM-M Epic E-11, P1, P2)
# -------------------------------------------------------------
@app.get(f"{settings.API_V1_STR}/reports/pdf")
def download_energy_audit_pdf(
    monthly_kwh: float = Query(185.0),
    is_gruha_jyothi: bool = Query(True),
):
    """Generates and downloads executive PDF Energy Audit Report (PRISM-M Epic E-11, P1, P2)."""
    pdf_buffer = generate_energy_audit_pdf(monthly_kwh=monthly_kwh, is_gruha_jyothi=is_gruha_jyothi)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PowerPulse_Energy_Audit_{datetime.now().strftime('%Y%m%d')}.pdf"},
    )


# -------------------------------------------------------------
# 9. PRISM-M Maintenance, Monitoring & Risk Register (PDF 1 & 2)
# -------------------------------------------------------------
@app.get(f"{settings.API_V1_STR}/monitoring/prism-m", response_model=PrismMMonitoringResponse)
def get_prism_m_monitoring_dashboard():
    """
    Returns full PRISM-M system health, Model A/B/Solar telemetry,
    risk register status (A1-A7, B1-B8), and pre-run audit checklist.
    """
    return monitoring_service.get_monitoring_report()


# -------------------------------------------------------------
# 10. Household Consumption Benchmark Engine (Charter Weeks 3-4, Task B2)
# -------------------------------------------------------------
@app.get(f"{settings.API_V1_STR}/benchmark/compare", response_model=BenchmarkComparisonResponse)
def get_household_benchmark(
    monthly_kwh: float = Query(185.0),
    household_size: int = Query(4),
    has_ac: bool = Query(True),
    city: str = Query("Hyderabad"),
):
    """
    Compares household monthly consumption against regional distributions
    in Hyderabad/Telangana domestic consumers (25th, 50th, 75th, 90th percentiles).
    """
    return calculate_household_benchmark(
        user_consumption_kwh=monthly_kwh,
        household_size=household_size,
        has_air_conditioner=has_ac,
        city=city,
    )


# -------------------------------------------------------------
# 11. Identity, User Profile, Consent & Data Privacy (PRISM-M Epic E-02)
# -------------------------------------------------------------
@app.get(f"{settings.API_V1_STR}/me", response_model=UserProfile)
def get_my_profile():
    """Returns the current user profile and consent settings (Task T-09)."""
    return identity_service.get_profile()


@app.put(f"{settings.API_V1_STR}/me/profile", response_model=UserProfile)
def update_my_profile(profile: UserProfile):
    """Updates household size, AC count, provider and tariff settings (Task T-11)."""
    return identity_service.update_profile(profile)


@app.post(f"{settings.API_V1_STR}/me/consent", response_model=UserProfile)
def update_data_consent(request: ConsentUpdateRequest):
    """Records or revokes user DPDP-Act-2023 data processing consent (Task T-12, K1)."""
    return identity_service.update_consent(request)


@app.delete(f"{settings.API_V1_STR}/me", response_model=DeletionResponse)
def delete_my_data():
    """Permanent user data purging and DPDP 'Right to be Forgotten' execution (Task T-13)."""
    return identity_service.delete_user_data()


# -------------------------------------------------------------
# 12. Frontend Static Assets Serving (PRISM-M Epic E-10)
# -------------------------------------------------------------
FRONTEND_DIST = settings.BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/manifest.json", include_in_schema=False)
    def serve_manifest():
        manifest_file = FRONTEND_DIST / "manifest.json"
        if manifest_file.exists():
            return FileResponse(manifest_file, media_type="application/manifest+json")
        raise HTTPException(status_code=404, detail="Manifest not found")

    @app.get("/{file_name:path}", include_in_schema=False)
    def serve_root_files(file_name: str):
        target = FRONTEND_DIST / file_name
        if target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_DIST / "index.html")

    @app.get("/", include_in_schema=False)
    def serve_frontend():
        """Serves the built React Web Application dashboard."""
        return FileResponse(FRONTEND_DIST / "index.html")

