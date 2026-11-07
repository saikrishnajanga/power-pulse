"""
Pydantic Schemas for PRISM-M Maintenance, Monitoring & Risk Register.
Directly derived from:
 - PRISM_Document_PowerPulse_Models.pdf
 - PRISM_M_Maintenance_Monitoring_Risks.pdf
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ModelSnapshot(BaseModel):
    name: str
    code: str
    algorithm: str
    purpose: str
    granularity: str
    target: str
    status: str
    test_mae: Optional[float] = None
    test_rmse: Optional[float] = None
    test_r2: Optional[float] = None
    dataset_coverage: str
    retraining_cadence: str


class RiskItem(BaseModel):
    id: str
    title: str
    model: str
    severity: str  # High, Medium, Low
    evidence_in_code: str
    mitigation_action: str
    powerpulse_status: str  # "Fully Mitigated", "Monitored", "Resolved"


class MonitoringSignal(BaseModel):
    model_code: str
    signal_name: str
    metric_value: str
    threshold_alert: str
    status: str  # "Normal", "Warning", "Optimal"


class RetrainingTrigger(BaseModel):
    trigger_id: str
    condition: str
    urgency: str
    last_checked: str
    action_required: str


class AuditChecklistItem(BaseModel):
    item_id: str
    description: str
    verified: bool
    notes: str


class PrismMMonitoringResponse(BaseModel):
    system_status: str
    active_models: List[ModelSnapshot]
    monitoring_signals: List[MonitoringSignal]
    risk_register: List[RiskItem]
    retraining_triggers: List[RetrainingTrigger]
    audit_checklist: List[AuditChecklistItem]
    timestamp: str

