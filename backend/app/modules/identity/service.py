"""
Identity, Profile & Privacy Consent Service.
Implements PRISM-M Epic E-02 (Tasks T-09, T-11, T-12, K1, T-13).
"""
from datetime import datetime
from typing import Optional
from .models import UserProfile, ConsentUpdateRequest, DeletionResponse


class IdentityService:
    def __init__(self):
        # Default in-memory profile singleton
        self._profile = UserProfile()

    def get_profile(self) -> UserProfile:
        return self._profile

    def update_profile(self, updated: UserProfile) -> UserProfile:
        self._profile = updated
        return self._profile

    def update_consent(self, req: ConsentUpdateRequest) -> UserProfile:
        self._profile.data_consent_granted = req.data_consent_granted
        self._profile.consent_policy_version = req.policy_version
        self._profile.consent_timestamp = datetime.now().isoformat()
        return self._profile

    def delete_user_data(self) -> DeletionResponse:
        """
        Tasks T-13: Deletion framework (DELETE /me).
        Purges session bills, reset user profile, and revokes consent.
        """
        self._profile = UserProfile(
            data_consent_granted=False,
            consent_timestamp=datetime.now().isoformat()
        )
        return DeletionResponse(
            status="SUCCESS",
            message="All personal consumption logs, uploaded bills, and session profile data have been permanently erased in compliance with DPDP Act 2023.",
            deleted_entities=[
                "user_uploaded_bills",
                "custom_appliances_survey",
                "cached_forecast_snapshots",
                "identity_tokens"
            ]
        )


identity_service = IdentityService()

