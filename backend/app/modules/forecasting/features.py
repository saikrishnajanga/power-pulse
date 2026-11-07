"""
Feature Engineering for Electricity Demand Forecasting.
Combines Saikrishna notebook (Cell 31) features with Zoheba notebook (Cell 30) Indian holiday flags.
"""
from typing import Tuple, List
import numpy as np
import pandas as pd
import holidays

from ...core.config import settings

# Initialize India / Telangana holiday calendar
TELANGANA_HOLIDAYS = holidays.country_holidays(
    settings.TARGET_COUNTRY, subdiv=settings.TARGET_STATE
)

FEATURE_COLUMNS: List[str] = [
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_24",
    "lag_168",
    "rolling_mean_24",
    "rolling_mean_168",
    "hour",
    "day_of_week",
    "month",
    "is_holiday",
]


def prepare_training_features(df_hourly: pd.DataFrame, target_col: str = "Hourly_energy_kWh") -> Tuple[pd.DataFrame, pd.Series]:
    """
    Transforms hourly series into feature matrix X and target y (next-hour energy).
    """
    df = df_hourly[[target_col]].copy()
    if not isinstance(df.index, pd.DatetimeIndex):
        if "Datetime" in df.columns:
            df["Datetime"] = pd.to_datetime(df["Datetime"])
            df = df.set_index("Datetime")
        else:
            raise ValueError("Dataframe must have a Datetime index or column.")

    df = df.sort_index()

    # Lag features from Saikrishna Cell 31
    df["lag_1"] = df[target_col].shift(1)
    df["lag_2"] = df[target_col].shift(2)
    df["lag_3"] = df[target_col].shift(3)
    df["lag_24"] = df[target_col].shift(24)
    df["lag_168"] = df[target_col].shift(168)

    # Rolling averages
    df["rolling_mean_24"] = df[target_col].shift(1).rolling(24).mean()
    df["rolling_mean_168"] = df[target_col].shift(1).rolling(168).mean()

    # Calendar features
    df["hour"] = df.index.hour
    df["day_of_week"] = df.index.dayofweek
    df["month"] = df.index.month

    # Indian / Telangana Holiday feature
    df["is_holiday"] = df.index.map(lambda dt: 1 if dt.date() in TELANGANA_HOLIDAYS else 0)

    # Next-hour target
    df["target_next_hour"] = df[target_col].shift(-1)

    # Drop incomplete rows
    clean_df = df.replace([np.inf, -np.inf], np.nan).dropna()

    X = clean_df[FEATURE_COLUMNS]
    y = clean_df["target_next_hour"]
    return X, y

