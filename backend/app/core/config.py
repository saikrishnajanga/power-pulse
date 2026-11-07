"""
Application Configuration and Constants.
PRISM-M Epic E-01 / Core Config.
"""
from pathlib import Path
from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
BASE_DIR = PROJECT_ROOT

class Settings(BaseSettings):
    PROJECT_ROOT: Path = PROJECT_ROOT
    BASE_DIR: Path = PROJECT_ROOT
    PROJECT_NAME: str = "PowerPulse: AI-Driven Energy & Cost Optimization"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Regional Scoping: Telangana, India
    TARGET_COUNTRY: str = "IN"
    TARGET_STATE: str = "TS"
    DEFAULT_LATITUDE: float = 17.3850   # Hyderabad
    DEFAULT_LONGITUDE: float = 78.4870  # Hyderabad
    CDD_BASE_C: float = 24.0            # Cooling Degree Day baseline (degrees C)
    
    # Gruha Jyothi Zero-Electricity Scheme Limit
    GRUHA_JYOTHI_MONTHLY_LIMIT_KWH: float = 200.0
    
    # ML Model Hyperparameters (as calibrated in notebooks)
    ANOMALY_CONTAMINATION: float = 0.02
    ANOMALY_N_ESTIMATORS: int = 200
    FORECAST_N_ESTIMATORS: int = 300
    FORECAST_MAX_DEPTH: int = 6
    FORECAST_LEARNING_RATE: float = 0.05
    
    # Storage Paths
    DATA_DIR: Path = BASE_DIR / "data"
    MODELS_DIR: Path = BASE_DIR / "data" / "models"
    SEEDS_DIR: Path = BASE_DIR / "data" / "seed"

    class Config:
        case_sensitive = True

settings = Settings()

