"""
Weather Service & Cooling Degree Days (CDD).
Directly adapted from Zoheba notebook (Section 12, Cell 28).
Calculates Cooling Degree Days based on 24°C threshold for Hyderabad/Telangana.
"""
import json
import logging
import urllib.request
from datetime import datetime, date
from typing import Optional
import numpy as np
import pandas as pd

from ...core.config import settings

logger = logging.getLogger(__name__)


def fetch_open_meteo_temperatures(
    lat: float, lon: float, start_date: date, end_date: date
) -> Optional[pd.Series]:
    """
    Downloads historical/archive daily mean temperatures from Open-Meteo (free, no API key).
    """
    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start_date.isoformat()}&end_date={end_date.isoformat()}"
        "&daily=temperature_2m_mean&timezone=Asia%2FKolkata"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PowerPulse/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        
        times = pd.to_datetime(data["daily"]["time"])
        temps = pd.Series(data["daily"]["temperature_2m_mean"], index=times, dtype=float).dropna()
        return temps
    except Exception as e:
        logger.warning(f"Failed to fetch Open-Meteo temperature: {e}. Using fallback climatology.")
        return None


def calculate_cooling_degree_days(
    temperatures: pd.Series, base_c: float = settings.CDD_BASE_C
) -> pd.Series:
    """
    CDD = max(0, Daily_Mean_Temp - Base_Temp).
    Captures AC/Cooling weather sensitivity in Indian summers.
    """
    return (temperatures - base_c).clip(lower=0.0)

