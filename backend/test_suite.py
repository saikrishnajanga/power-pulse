import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print("=== STARTING END-TO-END SCENARIO VERIFICATION ===")

# SCENARIO 1: Health Check
res = client.get("/api/v1/health")
assert res.status_code == 200, f"Health failed: {res.text}"
print("✓ Health check passed.")

# SCENARIO 2: AP Urban Domestic Tariff Calculation
ap_u_req = {
    "units_consumed_kwh": 185.0,
    "sanctioned_load_kw": 2.0,
    "billing_days": 30,
    "state": "Andhra Pradesh",
    "location_type": "urban",
    "discom": "APSPDCL",
    "consumer_category": "LT-I Domestic",
    "billed_amount_inr": 858.10,
}
res = client.post("/api/v1/tariffs/calculate", json=ap_u_req)
assert res.status_code == 200, f"AP Urban failed: {res.text}"
data = res.json()
print("✓ AP Urban Domestic:")
print(f"   Energy: ₹{data['energy_charges_inr']}, Fixed: ₹{data['fixed_charges_inr']}, Cust: ₹{data['customer_charges_inr']}")
print(f"   Net Payable: ₹{data['net_payable_inr']}, Diff: ₹{data['difference_inr']}")
assert data["customer_charges_inr"] == 50.0, "Urban customer charge must be 50.0"
assert data["fixed_charges_inr"] == 20.0, "2 kW fixed charge must be 20.0"
assert len(data["slab_breakdown"]) >= 4, "Must have at least 4 slabs"

# SCENARIO 3: AP Rural Domestic with YSR Jagjeevan Jyothi Subsidy
ap_r_req = {
    "units_consumed_kwh": 185.0,
    "sanctioned_load_kw": 2.0,
    "billing_days": 30,
    "state": "Andhra Pradesh",
    "location_type": "rural",
    "discom": "APEPDCL",
    "consumer_category": "LT-I Domestic",
    "is_gruha_jyothi_eligible": True,
    "billed_amount_inr": 0.0,
}
res = client.post("/api/v1/tariffs/calculate", json=ap_r_req)
assert res.status_code == 200
data_r = res.json()
print("✓ AP Rural Domestic (YSR Jagjeevan Jyothi):")
print(f"   Cust Charge: ₹{data_r['customer_charges_inr']}, Subsidies: ₹{data_r['subsidy_amount_inr']}, Net: ₹{data_r['net_payable_inr']}")
assert data_r["customer_charges_inr"] == 25.0, "Rural customer charge must be 25.0"
assert data_r["net_payable_inr"] == 0.0, "Eligible 185 kWh rural household gets 100% free power under YSR Jagjeevan Jyothi"

# SCENARIO 4: 14 Household Appliances Disaggregation
res = client.post("/api/v1/disaggregation/breakdown", json={"monthly_consumption_kwh": 185.0, "has_air_conditioner": True, "household_size": 4})
assert res.status_code == 200
d_data = res.json()
print(f"✓ Disaggregation: {len(d_data['appliances'])} appliances disaggregated, top: {d_data['top_consuming_appliance']}")
assert len(d_data["appliances"]) >= 14, f"Expected 14 appliances, got {len(d_data['appliances'])}"

# SCENARIO 5: Custom Appliance Adjustment & Reconciliation
custom_req = {
    "monthly_consumption_kwh": 185.0,
    "appliances": [
        {"id": "ac", "name": "Air Conditioner", "power_rating_kw": 1.0, "daily_hours": 2.0, "quantity": 1},
        {"id": "refrigerator", "name": "Refrigerator", "power_rating_kw": 0.15, "daily_hours": 10.0, "quantity": 1},
        {"id": "ceiling_fans", "name": "Ceiling Fans", "power_rating_kw": 0.075, "daily_hours": 6.0, "quantity": 2},
    ],
}
res = client.post("/api/v1/disaggregation/custom", json=custom_req)
assert res.status_code == 200
cd_data = res.json()
print(f"✓ Custom Appliance Reconciled: Allocated {cd_data['total_allocated_kwh']} kWh, Unallocated Baseline: {cd_data['unallocated_kwh']} kWh ({cd_data['unallocated_percentage']}%)")
assert cd_data["unallocated_kwh"] > 0, "Should show unallocated baseline when custom appliance sum < total bill"

# SCENARIO 6: Forecast & Anomaly Synchronization
res = client.get("/api/v1/forecast/demo?period=weekly&monthly_kwh=185")
assert res.status_code == 200
f_data = res.json()
print(f"✓ Synchronized Forecast & Anomaly: {len(f_data['points'])} forecast points, {len(f_data['anomalies'])} synchronized anomalies")
assert len(f_data["points"]) > 0
assert "anomalies" in f_data
if len(f_data["anomalies"]) > 0:
    first_anom = f_data["anomalies"][0]
    print(f"   Sample Anomaly: {first_anom['timestamp']} | Actual: {first_anom['actual_kwh']} kWh | Baseline: {first_anom['expected_normal_kwh']} kWh | Cause: {first_anom['likely_cause']}")

# SCENARIO 7: Bill Ingestion & Confirmation
res = client.get("/api/v1/bills")
assert res.status_code == 200
bills = res.json()
print(f"✓ Loaded {len(bills)} verified utility bills from repository.")
test_bill = bills[0]
confirm_req = {
    "units_consumed_kwh": 200.0,
    "sanctioned_load_kw": 3.0,
    "location_type": "urban",
    "state": "Andhra Pradesh",
    "discom": "APSPDCL",
    "consumer_name": "K. Ramesh Babu",
    "gross_amount_inr": 980.0,
}
res = client.post(f"/api/v1/bills/{test_bill['bill_id']}/confirm", json=confirm_req)
assert res.status_code == 200
conf_bill = res.json()
print(f"✓ Bill confirmed & reconciled: Consumer '{conf_bill['consumer_name']}', {conf_bill['units_consumed_kwh']} kWh, Sanctioned Load: {conf_bill['sanctioned_load_kw']} kW")
assert conf_bill["units_consumed_kwh"] == 200.0
assert conf_bill["sanctioned_load_kw"] == 3.0

# SCENARIO 8: Profile Multi-Appliance Configuration & DPDP Consent
prof_req = {
    "user_id": "user_demo_01",
    "name": "Telangana Resident",
    "email": "consumer@example.com",
    "city": "Hyderabad",
    "state": "Telangana",
    "location_type": "rural",
    "provider": "TGSPDCL (Telangana Southern Power)",
    "tariff_category": "LT-I Domestic",
    "household_size": 4,
    "has_air_conditioner": True,
    "ac_units_count": 2,
    "installed_appliances": [
        {"id": "ac", "name": "Air Conditioner", "quantity": 2, "power_rating_kw": 1.5, "daily_hours": 6.0},
        {"id": "refrigerator", "name": "Refrigerator", "quantity": 1, "power_rating_kw": 0.18, "daily_hours": 24.0},
        {"id": "ceiling_fans", "name": "Ceiling Fans", "quantity": 4, "power_rating_kw": 0.075, "daily_hours": 12.0},
    ],
    "data_consent_granted": True,
    "consent_policy_version": "DPDP-Act-2023-v1.2",
    "consent_timestamp": "2026-11-13T09:00:00"
}
res = client.put("/api/v1/me/profile", json=prof_req)
assert res.status_code == 200, f"Profile update failed: {res.text}"
saved_prof = res.json()
assert len(saved_prof["installed_appliances"]) == 3, "Should store 3 installed appliances"
assert saved_prof["installed_appliances"][0]["id"] == "ac"
print(f"✓ Profile Multi-Appliance persistence: {len(saved_prof['installed_appliances'])} appliances saved and verified via API.")

print("=== ALL 8 SCENARIOS VERIFIED SUCCESSFULLY! ===")
