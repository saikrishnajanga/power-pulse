"""
Forecasting Engine with XGBoost & Dynamic MAD Spike Detection.
Directly adapts Saikrishna notebook (Cells 33, 34, 40) with clean object-oriented design
and tariff integration.
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

from .models import ForecastResponse, HourlyForecastPoint, ModelMetrics, SynchronizedAnomaly
from .features import FEATURE_COLUMNS, TELANGANA_HOLIDAYS
from ..tariffs.engine import calculate_energy_charge
from ..anomaly.detector import AnomalyDetector
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
        hist_vals = list(history.values.astype(float))
        feat_buf = np.empty((1, 11), dtype=np.float32)

        for _ in range(horizon_hours):
            next_time = last_time + timedelta(hours=1)
            is_hol = 1 if next_time.date() in TELANGANA_HOLIDAYS else 0

            # Exact feature order: lag_1, lag_2, lag_3, lag_24, lag_168, rolling_mean_24, rolling_mean_168, hour, day_of_week, month, is_holiday
            feat_buf[0, 0] = hist_vals[-1]
            feat_buf[0, 1] = hist_vals[-2]
            feat_buf[0, 2] = hist_vals[-3]
            feat_buf[0, 3] = hist_vals[-24]
            feat_buf[0, 4] = hist_vals[-168]
            feat_buf[0, 5] = sum(hist_vals[-24:]) / 24.0
            feat_buf[0, 6] = sum(hist_vals[-168:]) / 168.0
            feat_buf[0, 7] = next_time.hour
            feat_buf[0, 8] = next_time.dayofweek
            feat_buf[0, 9] = next_time.month
            feat_buf[0, 10] = is_hol

            # Lightning-fast next-hour prediction
            prediction = float(self.model.predict(feat_buf)[0])
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
            hist_vals.append(prediction)
            last_time = next_time

        # Run synchronized Anomaly Detection on the identical historical dataset
        anomaly_map = {}
        anomalies_list: List[SynchronizedAnomaly] = []
        try:
            detector = AnomalyDetector()
            hist_dts = [dt.to_pydatetime() if hasattr(dt, "to_pydatetime") else dt for dt in history.index]
            hist_vals_raw = [float(v) for v in history.values]
            anomaly_summary = detector.analyze(hist_dts, hist_vals_raw)
            for ap in anomaly_summary.points:
                if ap.is_anomaly:
                    dt_key = ap.timestamp.isoformat()
                    anomaly_map[dt_key] = ap
                    anomalies_list.append(
                        SynchronizedAnomaly(
                            timestamp=ap.timestamp,
                            actual_kwh=round(ap.actual_kwh, 3),
                            expected_normal_kwh=round(ap.rolling_baseline_kwh, 3),
                            difference_kwh=round(ap.actual_kwh - ap.rolling_baseline_kwh, 3),
                            anomaly_type="High Spike" if ap.is_high_spike else ("Surge" if ap.actual_kwh > ap.rolling_baseline_kwh else "Drop"),
                            likely_cause=ap.likely_cause or "Abnormal consumption deviating from 24h baseline",
                            severity="High" if ap.is_high_spike else "Medium",
                        )
                    )
        except Exception:
            pass

        # Build seamless continuous timeline:
        # 1. Historical actual points (past 24 hours of baseline)
        # 2. Transition anchor point at T_0 (Now) with identical actual & predicted values (Zero Prediction Gap)
        # 3. Future forecasted points (T_1 to T_horizon)
        points: List[HourlyForecastPoint] = []
        hist_slice = history_series.iloc[-24:]

        for dt, actual_val in hist_slice.items():
            dt_py = dt.to_pydatetime() if hasattr(dt, "to_pydatetime") else dt
            h_hr = dt_py.hour
            med = float(hour_stats.loc[h_hr, "median"])
            mad = float(hour_stats.loc[h_hr, "mad"])
            th = round(med + 3.0 * 1.4826 * mad, 3)
            dt_key = dt_py.isoformat()
            hist_anom = anomaly_map.get(dt_key)
            is_anom = hist_anom is not None or (actual_val > th)
            anom_cause = hist_anom.likely_cause if hist_anom else ("Dynamic MAD threshold breach" if actual_val > th else None)
            anom_type = "High Spike" if (hist_anom and hist_anom.is_high_spike) or (actual_val > th) else ("Surge" if is_anom else None)

            points.append(
                HourlyForecastPoint(
                    timestamp=dt_py,
                    actual_kwh=round(float(actual_val), 3),
                    predicted_kwh=None,
                    potential_spike=bool(is_anom),
                    status="Historical Spike" if is_anom else "Normal",
                    spike_threshold_kwh=th,
                    point_type="actual",
                    is_anomaly=bool(is_anom),
                    expected_normal_kwh=round(hist_anom.rolling_baseline_kwh if hist_anom else med, 3),
                    difference_kwh=round(float(actual_val) - (hist_anom.rolling_baseline_kwh if hist_anom else med), 3) if is_anom else None,
                    anomaly_cause=anom_cause,
                    anomaly_type=anom_type,
                )
            )

        # Transition anchor point at T_0 (Current time / Now)
        transition_dt = history_series.index[-1].to_pydatetime() if hasattr(history_series.index[-1], "to_pydatetime") else history_series.index[-1]
        t0_val = round(float(history_series.iloc[-1]), 3)
        t0_med = float(hour_stats.loc[transition_dt.hour, "median"])
        t0_mad = float(hour_stats.loc[transition_dt.hour, "mad"])
        t0_th = round(t0_med + 3.0 * 1.4826 * t0_mad, 3)
        t0_anom = anomaly_map.get(transition_dt.isoformat())
        t0_is_anom = t0_anom is not None or (t0_val > t0_th)

        if points:
            points[-1] = HourlyForecastPoint(
                timestamp=transition_dt,
                actual_kwh=t0_val,
                predicted_kwh=t0_val,  # Anchor coordinate eliminates the visual prediction gap
                potential_spike=bool(t0_is_anom),
                status="Now (Transition)",
                spike_threshold_kwh=t0_th,
                point_type="transition",
                is_anomaly=bool(t0_is_anom),
                expected_normal_kwh=round(t0_med, 3),
                difference_kwh=round(t0_val - t0_med, 3) if t0_is_anom else None,
                anomaly_cause=t0_anom.likely_cause if t0_anom else None,
                anomaly_type="Peak Demand Transition" if t0_is_anom else None,
            )

        # Future forecast points
        for dt, p, s, th in zip(future_times, predictions, spike_flags, thresholds):
            h_med = float(hour_stats.loc[dt.hour, "median"])
            diff = round(p - th, 3) if s else None
            anom_cause = (
                f"Predicted demand of {p} kWh breaches dynamic hourly MAD ceiling ({th} kWh). Risk of peak slab surcharge."
                if s else None
            )
            if s:
                anomalies_list.append(
                    SynchronizedAnomaly(
                        timestamp=dt,
                        actual_kwh=p,
                        expected_normal_kwh=th,
                        difference_kwh=diff,
                        anomaly_type="Forecasted Peak Spike",
                        likely_cause=anom_cause,
                        severity="High",
                    )
                )

            points.append(
                HourlyForecastPoint(
                    timestamp=dt,
                    actual_kwh=None,
                    predicted_kwh=p,
                    potential_spike=s,
                    status="Potential Spike" if s else "Normal",
                    spike_threshold_kwh=th,
                    point_type="predicted",
                    is_anomaly=s,
                    expected_normal_kwh=th if s else round(h_med, 3),
                    difference_kwh=diff,
                    anomaly_cause=anom_cause,
                    anomaly_type="Forecasted Peak Spike" if s else None,
                )
            )

        total_kwh = round(float(sum(predictions)), 2)
        days = max(1, horizon_hours // 24)
        cost_est, _, _ = calculate_energy_charge(total_kwh, days=days)
        spike_count = sum(1 for s in spike_flags if s)

        summary_msg = (
            f"Projected consumption for the next {days} days is {total_kwh} kWh (approx. ₹{cost_est}). "
            f"Identified {len(anomalies_list)} synchronized anomaly/spike events across continuous dataset."
        )

        return ForecastResponse(
            horizon_name=horizon_name,
            horizon_hours=horizon_hours,
            start_time=points[0].timestamp,
            end_time=future_times[-1],
            transition_time=transition_dt,
            total_predicted_kwh=total_kwh,
            estimated_cost_inr=cost_est,
            potential_spike_count=spike_count,
            points=points,
            anomalies=anomalies_list,
            is_preliminary=False,
            summary_message=summary_msg,
        )

