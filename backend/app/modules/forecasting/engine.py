"""
Forecasting Engine with XGBoost & Dynamic MAD Spike Detection.
Directly adapts Saikrishna notebook (Cells 33, 34, 40) with clean object-oriented design
and tariff integration.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

from .models import ForecastResponse, HourlyForecastPoint, ModelMetrics
from .features import FEATURE_COLUMNS, TELANGANA_HOLIDAYS
from ..tariffs.engine import calculate_energy_charge
from ...core.config import settings


class ForecastingEngine:
    def __init__(
        self,
        n_estimators: Optional[int] = None,
        max_depth: Optional[int] = None,
        learning_rate: Optional[float] = None,
    ):
        self.n_estimators = n_estimators or settings.FORECAST_N_ESTIMATORS
        self.max_depth = max_depth or settings.FORECAST_MAX_DEPTH
        self.learning_rate = learning_rate or settings.FORECAST_LEARNING_RATE
        self.model: Optional[Any] = None
        self.is_trained: bool = False

    def train(self, X_train: pd.DataFrame, y_train: pd.Series) -> None:
        """
        Trains XGBoost regressor on feature matrix.
        """
        from xgboost import XGBRegressor

        self.model = XGBRegressor(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train[FEATURE_COLUMNS], y_train)
        self.is_trained = True

    def evaluate(self, X_test: pd.DataFrame, y_test: pd.Series) -> ModelMetrics:
        """
        Computes regression metrics on hold-out evaluation period.
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Model must be trained before evaluation.")

        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

        y_pred = self.model.predict(X_test[FEATURE_COLUMNS])
        mae = float(mean_absolute_error(y_test, y_pred))
        mse = float(mean_squared_error(y_test, y_pred))
        rmse = float(np.sqrt(mse))
        r2 = float(r2_score(y_test, y_pred))

        return ModelMetrics(
            mae_kwh=round(mae, 4),
            rmse_kwh=round(rmse, 4),
            r2_score=round(r2, 4),
            train_samples=len(X_test),
            test_samples=len(y_test),
        )

    def generate_forecast(
        self,
        history_series: pd.Series,
        horizon_hours: int = 168,
        horizon_name: str = "Weekly Forecast (Next 7 Days)",
    ) -> ForecastResponse:
        """
        Autoregressive multi-step forward forecast using lagged feedback and MAD thresholding.
        Directly implements Saikrishna notebook Cell 40 logic.
        """
        if len(history_series) < 169:
            raise ValueError("At least 169 hourly readings (7 days + 1 hour) are required for lag_168.")

        history = history_series.dropna().astype(float).copy()
        if not isinstance(history.index, pd.DatetimeIndex):
            raise ValueError("History series must have a DatetimeIndex.")

        # If model is not explicitly trained, train on history
        if not self.is_trained or self.model is None:
            from .features import prepare_training_features

            X, y = prepare_training_features(pd.DataFrame({"Hourly_energy_kWh": history}))
            self.train(X, y)

        # Dynamic spike thresholds per hour of day from historical distribution
        hour_stats = history.groupby(history.index.hour).agg(
            median="median",
            mad=lambda x: np.median(np.abs(x - np.median(x)))
        )

        predictions: List[float] = []
        future_times: List[datetime] = []
        spike_flags: List[bool] = []
        thresholds: List[float] = []

        last_time = history.index[-1]

        for _ in range(horizon_hours):
            next_time = last_time + timedelta(hours=1)
            is_hol = 1 if next_time.date() in TELANGANA_HOLIDAYS else 0

            # Exact feature order
            feat_dict = {
                "lag_1": float(history.iloc[-1]),
                "lag_2": float(history.iloc[-2]),
                "lag_3": float(history.iloc[-3]),
                "lag_24": float(history.iloc[-24]),
                "lag_168": float(history.iloc[-168]),
                "rolling_mean_24": float(history.iloc[-24:].mean()),
                "rolling_mean_168": float(history.iloc[-168:].mean()),
                "hour": next_time.hour,
                "day_of_week": next_time.dayofweek,
                "month": next_time.month,
                "is_holiday": is_hol,
            }
            features_df = pd.DataFrame([feat_dict])[FEATURE_COLUMNS]

            # Next-hour prediction
            prediction = float(self.model.predict(features_df)[0])
            prediction = max(0.01, prediction)  # Ensure non-negative and minimum standby

            # Dynamic MAD threshold calculation: median + 3 * 1.4826 * MAD
            med = float(hour_stats.loc[next_time.hour, "median"])
            mad = float(hour_stats.loc[next_time.hour, "mad"])
            threshold = med + 3.0 * 1.4826 * mad
            is_spike = prediction > threshold

            predictions.append(round(prediction, 3))
            future_times.append(next_time)
            spike_flags.append(bool(is_spike))
            thresholds.append(round(threshold, 3))

            # Roll prediction forward into history for next iteration
            history.loc[next_time] = prediction
            last_time = next_time

        points: List[HourlyForecastPoint] = []
        for dt, p, s, th in zip(future_times, predictions, spike_flags, thresholds):
            points.append(
                HourlyForecastPoint(
                    timestamp=dt,
                    predicted_kwh=p,
                    potential_spike=s,
                    status="Potential Spike" if s else "Normal",
                    spike_threshold_kwh=th,
                )
            )

        total_kwh = round(float(sum(predictions)), 2)
        days = max(1, horizon_hours // 24)
        cost_est, _, _ = calculate_energy_charge(total_kwh, days=days)
        spike_count = sum(1 for s in spike_flags if s)

        summary_msg = (
            f"Projected consumption for the next {days} days is {total_kwh} kWh (approx. ₹{cost_est}). "
            f"Identified {spike_count} potential spike intervals."
        )

        return ForecastResponse(
            horizon_name=horizon_name,
            horizon_hours=horizon_hours,
            start_time=future_times[0],
            end_time=future_times[-1],
            total_predicted_kwh=total_kwh,
            estimated_cost_inr=cost_est,
            potential_spike_count=spike_count,
            points=points,
            summary_message=summary_msg,
        )

