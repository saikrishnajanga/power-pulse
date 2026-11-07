"""
Anomaly Detection Module.
Implements Isolation Forest & 24h rolling threshold from Saikrishna notebook (Cells 16-20)
and shape metrics from Zoheba notebook (Cell 9).
"""
import numpy as np
import pandas as pd
from typing import List, Optional
from datetime import datetime
from sklearn.ensemble import IsolationForest

from .models import AnomalyPoint, AnomalySummary
from ...core.config import settings


class AnomalyDetector:
    def __init__(self, contamination: Optional[float] = None, n_estimators: Optional[int] = None):
        self.contamination = contamination or settings.ANOMALY_CONTAMINATION
        self.n_estimators = n_estimators or settings.ANOMALY_N_ESTIMATORS
        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=42,
        )

    def analyze(self, timestamps: List[datetime], readings_kwh: List[float]) -> AnomalySummary:
        """
        Runs Isolation Forest anomaly detection on chronological hourly series.
        """
        if len(readings_kwh) < 24:
            raise ValueError("At least 24 hourly readings are required to calculate baselines.")

        df = pd.DataFrame({"Datetime": pd.to_datetime(timestamps), "Hourly_energy_kWh": readings_kwh})
        df = df.sort_values("Datetime").reset_index(drop=True)

        target = "Hourly_energy_kWh"
        df["rolling_mean_24h"] = df[target].shift(1).rolling(24, min_periods=1).mean().bfill()
        df["rolling_std_24h"] = df[target].shift(1).rolling(24, min_periods=1).std().fillna(0.0)
        df["hour"] = df["Datetime"].dt.hour
        df["dayofweek"] = df["Datetime"].dt.dayofweek

        # Feature matrix for Isolation Forest
        feature_cols = [target, "rolling_mean_24h", "hour", "dayofweek"]
        X = df[feature_cols].copy()

        # Train & predict
        self.model.fit(X)
        predictions = self.model.predict(X)

        df["Anomaly"] = predictions == -1
        df["Status"] = np.where(df["Anomaly"], "Abnormal", "Normal")
        
        # High spike = Anomaly + reading significantly higher than 24h rolling average
        df["High_spike"] = df["Anomaly"] & (df[target] > (df["rolling_mean_24h"] + 1.5 * df["rolling_std_24h"]))

        points: List[AnomalyPoint] = []
        for _, row in df.iterrows():
            cause = None
            if row["High_spike"]:
                hr = row["hour"]
                if 22 <= hr or hr <= 5:
                    cause = "Abnormal night-time baseline (check AC/water pump/refrigerator seal)"
                elif 18 <= hr <= 22:
                    cause = "Severe evening peak spike (multiple high-wattage appliances operating simultaneously)"
                else:
                    cause = "Sudden daytime surge above household baseline"
            elif row["Anomaly"]:
                cause = "Irregular consumption pattern deviating from standard schedule"

            points.append(
                AnomalyPoint(
                    timestamp=row["Datetime"],
                    actual_kwh=round(float(row[target]), 3),
                    rolling_baseline_kwh=round(float(row["rolling_mean_24h"]), 3),
                    is_anomaly=bool(row["Anomaly"]),
                    is_high_spike=bool(row["High_spike"]),
                    status=str(row["Status"]),
                    likely_cause=cause,
                )
            )

        total = len(points)
        abnormal = int(df["Anomaly"].sum())
        high_spikes = int(df["High_spike"].sum())
        pct = round((abnormal / total) * 100, 2) if total > 0 else 0.0

        recommendations: List[str] = []
        if high_spikes > 0:
            recommendations.append(
                f"Identified {high_spikes} high consumption spikes. Stagger high-draw appliances "
                f"(water heaters, washing machines, EV charging) away from peak evening hours (6 PM - 10 PM)."
            )
        if abnormal > high_spikes:
            recommendations.append(
                "Unusual standby variations detected. Verify timer settings or check for appliance standby leakage."
            )
        if abnormal == 0:
            recommendations.append("Consumption is consistent with no significant abnormalities.")

        return AnomalySummary(
            total_hours_analyzed=total,
            abnormal_count=abnormal,
            high_spike_count=high_spikes,
            anomaly_percentage=pct,
            points=points,
            recommendations=recommendations,
        )

