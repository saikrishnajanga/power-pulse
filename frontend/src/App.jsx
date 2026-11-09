import React, { useState, useEffect } from 'react';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Sun,
  FileText,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  Info,
  Calendar,
  IndianRupee,
  Activity,
  Layers,
  Sparkles,
  Sliders,
  Upload,
  FileUp,
  Check,
  Edit2,
  FileDown,
  ShieldAlert,
  User,
  Settings,
  Trash2,
  Lock,
  Cpu,
  Database,
  Award,
  CheckSquare,
  X,
  Users
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from 'recharts';

const API_BASE = '/api/v1';

// Initial Mock/Fallback Data in case backend is offline
const INITIAL_TARIFF = {
  units_consumed_kwh: 185,
  billing_days: 30,
  category: "LT-I(B)(i) Domestic (up to 200 units)",
  energy_charges_inr: 748.0,
  fixed_charges_inr: 50.0,
  electricity_duty_inr: 11.1,
  gross_total_inr: 809.1,
  net_payable_inr: 0.0,
  is_gruha_jyothi_applied: true,
  gruha_jyothi_headroom_kwh: 15.0,
  slab_breakdown: [
    { slab_range: "0-100", units_in_slab: 100, rate_per_kwh: 3.4, amount_inr: 340.0 },
    { slab_range: "100-200", units_in_slab: 85, rate_per_kwh: 4.8, amount_inr: 408.0 }
  ]
};

const APPLIANCE_DECOMPOSITION = [
  { name: 'Air Conditioning (HVAC)', value: 42, color: '#06b6d4' },
  { name: 'Water Heating (Geyser)', value: 24, color: '#f59e0b' },
  { name: 'Refrigeration', value: 16, color: '#10b981' },
  { name: 'Lighting & Fans', value: 12, color: '#6366f1' },
  { name: 'Standby / Electronics', value: 6, color: '#94a3b8' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forecast state
  const [forecastPeriod, setForecastPeriod] = useState('weekly');
  const [forecastData, setForecastData] = useState(null);

  // Tariff calculator state - Regional & Location-Based (Telangana & Andhra Pradesh)
  const [selectedState, setSelectedState] = useState('Telangana'); // 'Telangana' | 'Andhra Pradesh'
  const [locationType, setLocationType] = useState('urban'); // 'urban' | 'rural'
  const [sanctionedLoad, setSanctionedLoad] = useState(2.0); // in kW
  const [isRuralSubsidy, setIsRuralSubsidy] = useState(false); // YSR Jagjeevan Jyothi Scheme
  const [inputUnits, setInputUnits] = useState(185);
  const [inputDays, setInputDays] = useState(30);
  const [isGruhaJyothi, setIsGruhaJyothi] = useState(true);
  const [tariffResult, setTariffResult] = useState(INITIAL_TARIFF);

  // Recommendations state
  const [recommendations, setRecommendations] = useState(null);

  // Disaggregation state (AllHouses REFIT Engine)
  const [disaggregationData, setDisaggregationData] = useState(null);

  // Bills Management state (PRISM-M Epic E-04)
  const [billsList, setBillsList] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [compareResult, setCompareResult] = useState(null);

  // Solar Simulator state (from solar_energy.ipynb)
  const [solarPanel, setSolarPanel] = useState(3.0);
  const [solarIrradiance, setSolarIrradiance] = useState(600);
  const [solarTemp, setSolarTemp] = useState(30);
  const [solarCloud, setSolarCloud] = useState(25);
  const [solarBattery, setSolarBattery] = useState(false);
  const [solarCity, setSolarCity] = useState('Hyderabad');
  const [solarHour, setSolarHour] = useState(12);
  const [solarData, setSolarData] = useState(null);
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarHourPrediction, setSolarHourPrediction] = useState(null);

  // Dedicated fast forecast fetcher - eliminates delayed/static updates
  const fetchForecast = async (period = forecastPeriod, units = inputUnits) => {
    try {
      const res = await fetch(`${API_BASE}/forecast/demo?period=${period}&monthly_kwh=${Number(units)}`);
      if (res.ok) {
        const json = await res.json();
        setForecastData(json);
      }
    } catch (err) {
      console.warn("Forecast fetch failed:", err);
    }
  };

  // Immediate forecast update when period or units change
  useEffect(() => {
    fetchForecast(forecastPeriod, inputUnits);
  }, [forecastPeriod, inputUnits]);

  // Household Benchmark State (Charter Weeks 3-4, Task B2)
  const [benchmarkData, setBenchmarkData] = useState(null);

  // User Profile & Consent State (Epic E-02)
  const [userProfile, setUserProfile] = useState({
    name: "Telangana Resident",
    email: "consumer@example.com",
    city: "Hyderabad",
    provider: "TGSPDCL (Telangana Southern Power)",
    tariff_category: "LT-I(B)(i) Domestic (up to 200 units)",
    household_size: 4,
    has_air_conditioner: true,
    ac_units_count: 2,
    has_solar_rooftop: false,
    is_gruha_jyothi_registered: true,
    data_consent_granted: true,
    consent_policy_version: "DPDP-Act-2023-v1.2",
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Appliance Solar Alternatives State (User Requested Flow)
  const [applianceSolarData, setApplianceSolarData] = useState(null);

  // Check backend health and load data
  useEffect(() => {
    checkHealthAndFetch();
  }, [forecastPeriod, inputUnits]);

  const checkHealthAndFetch = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setBackendOnline(true);
        // Fetch demo forecast
        const fRes = await fetch(`${API_BASE}/forecast/demo?period=${forecastPeriod}`);
        if (fRes.ok) {
          const fJson = await fRes.json();
          setForecastData(fJson);
        }
        // Fetch recommendations
        const rRes = await fetch(`${API_BASE}/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthly_consumption_kwh: Number(inputUnits),
            current_monthly_bill_inr: tariffResult?.gross_total_inr || 809,
            has_air_conditioner: true,
            household_size: 4
          })
        });
        if (rRes.ok) {
          const rJson = await rRes.json();
          setRecommendations(rJson);
        }
        // Fetch appliance disaggregation (AllHouses model)
        const dRes = await fetch(`${API_BASE}/disaggregation/breakdown`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthly_consumption_kwh: Number(inputUnits),
            has_air_conditioner: true,
            household_size: 4
          })
        });
        if (dRes.ok) {
          const dJson = await dRes.json();
          setDisaggregationData(dJson);
        }
        // Fetch uploaded / golden bills list (PRISM-M E-04)
        const bRes = await fetch(`${API_BASE}/bills`);
        if (bRes.ok) {
          const bJson = await bRes.json();
          setBillsList(bJson);
          if (bJson.length > 0 && !selectedBill) {
            setSelectedBill(bJson[0]);
          }
        }
        // Fetch solar demo analysis (solar_energy.ipynb)
        const sRes = await fetch(`${API_BASE}/solar/demo`);
        if (sRes.ok) {
          const sJson = await sRes.json();
          setSolarData(sJson);
        }

        // Fetch Household Benchmark comparison (Charter Weeks 3-4, Task B2)
        const benchRes = await fetch(`${API_BASE}/benchmark/compare?monthly_kwh=${Number(inputUnits)}&household_size=${userProfile.household_size}`);
        if (benchRes.ok) {
          const benchJson = await benchRes.json();
          setBenchmarkData(benchJson);
        }

        // Fetch User Profile (Epic E-02)
        const uRes = await fetch(`${API_BASE}/me`);
        if (uRes.ok) {
          const uJson = await uRes.json();
          setUserProfile(uJson);
        }

        // Fetch Appliance Solar Alternatives for current bill
        const solRes = await fetch(`${API_BASE}/solar/appliance-alternatives?monthly_kwh=${Number(inputUnits)}&current_bill_inr=${tariffResult?.gross_total_inr || 809}`);
        if (solRes.ok) {
          const solJson = await solRes.json();
          setApplianceSolarData(solJson);
        }
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/bills/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const newBill = await res.json();
        setBillsList(prev => [newBill, ...prev]);
        setSelectedBill(newBill);
        setInputUnits(newBill.units_consumed_kwh);
        setIsGruhaJyothi(newBill.is_gruha_jyothi_applied);

        // Instantly re-calculate appliance solar alternatives and forecast for this bill
        const solRes = await fetch(`${API_BASE}/solar/appliance-alternatives?monthly_kwh=${newBill.units_consumed_kwh}&current_bill_inr=${newBill.gross_amount_inr}&bill_id=${newBill.bill_id}&bill_file_name=${encodeURIComponent(newBill.file_name)}`);
        if (solRes.ok) {
          const solJson = await solRes.json();
          setApplianceSolarData(solJson);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmBill = async () => {
    if (!selectedBill) return;
    try {
      const res = await fetch(`${API_BASE}/bills/${selectedBill.bill_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units_consumed_kwh: selectedBill.units_consumed_kwh,
          billing_days: selectedBill.billing_days,
          is_gruha_jyothi_applied: selectedBill.is_gruha_jyothi_applied
        })
      });
      if (res.ok) {
        const confirmed = await res.json();
        setSelectedBill(confirmed);
        setBillsList(prev => prev.map(b => b.bill_id === confirmed.bill_id ? confirmed : b));
        setInputUnits(confirmed.units_consumed_kwh);
        setIsGruhaJyothi(confirmed.is_gruha_jyothi_applied);

        // Update appliance solar alternatives for confirmed bill
        const solRes = await fetch(`${API_BASE}/solar/appliance-alternatives?monthly_kwh=${confirmed.units_consumed_kwh}&current_bill_inr=${confirmed.gross_amount_inr}&bill_id=${confirmed.bill_id}&bill_file_name=${encodeURIComponent(confirmed.file_name)}`);
        if (solRes.ok) {
          const solJson = await solRes.json();
          setApplianceSolarData(solJson);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompareBills = async (id1, id2) => {
    try {
      const res = await fetch(`${API_BASE}/bills/compare?curr_id=${id1}&prev_id=${id2}`);
      if (res.ok) {
        const cJson = await res.json();
        setCompareResult(cJson);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Solar Simulator: fetch full savings analysis with daily profile
  const fetchSolarAnalysis = async (
    customIrr = null,
    customPanel = null,
    customTemp = null,
    customCloud = null,
    customBat = null,
    customCity = null
  ) => {
    setSolarLoading(true);
    const irr = customIrr !== null ? customIrr : solarIrradiance;
    const panel = customPanel !== null ? customPanel : solarPanel;
    const temp = customTemp !== null ? customTemp : solarTemp;
    const cloud = customCloud !== null ? customCloud : solarCloud;
    const bat = customBat !== null ? customBat : solarBattery;
    const city = customCity !== null ? customCity : solarCity;

    try {
      const res = await fetch(`${API_BASE}/solar/predict-savings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel_capacity_kw: panel,
          irradiance_wm2: irr,
          temperature_c: temp,
          cloud_cover_pct: cloud,
          battery_installed: bat,
          monthly_consumption_kwh: Number(inputUnits),
          effective_tariff_inr: tariffResult?.effective_rate_per_kwh || 4.8,
          city: city,
        })
      });
      if (res.ok) {
        const json = await res.json();
        setSolarData(json);
      }
    } catch (err) {
      console.error('Solar analysis fetch failed:', err);
    } finally {
      setSolarLoading(false);
    }
  };

  // Recalculate solar generation graph & single hour prediction dynamically on input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSolarAnalysis();
      fetchSolarHourPrediction();
    }, 150);
    return () => clearTimeout(timer);
  }, [solarIrradiance, solarPanel, solarTemp, solarCloud, solarBattery, solarCity, inputUnits]);

  // Solar Simulator: predict single hour
  const fetchSolarHourPrediction = async () => {
    try {
      const res = await fetch(`${API_BASE}/solar/predict-hour`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel_capacity_kw: solarPanel,
          irradiance_wm2: solarIrradiance,
          temperature_c: solarTemp,
          cloud_cover_pct: solarCloud,
          battery_installed: solarBattery,
          hour: solarHour,
          city: solarCity,
        })
      });
      if (res.ok) {
        const json = await res.json();
        setSolarHourPrediction(json);
      }
    } catch (err) {
      console.error('Solar hour prediction failed:', err);
    }
  };

  // Regional & Location-Based Tariff Calculator (Telangana & Andhra Pradesh)
  const handleCalculateTariff = async (
    overrideState = null,
    overrideLocation = null,
    overrideUnits = null,
    overrideLoad = null,
    overrideSubsidy = null
  ) => {
    const st = overrideState || selectedState;
    const loc = overrideLocation || locationType;
    const units = overrideUnits !== null ? overrideUnits : Number(inputUnits);
    const load = overrideLoad !== null ? overrideLoad : Number(sanctionedLoad);
    const sub = overrideSubsidy !== null ? overrideSubsidy : (st === 'Telangana' ? isGruhaJyothi : isRuralSubsidy);

    try {
      const res = await fetch(`${API_BASE}/tariffs/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units_consumed_kwh: units,
          billing_days: Number(inputDays),
          state: st,
          location_type: loc,
          sanctioned_load_kw: load,
          is_gruha_jyothi_eligible: sub,
        })
      });
      if (res.ok) {
        const json = await res.json();
        setTariffResult(json);
      }
    } catch (err) {
      console.warn("Using offline calculator fallback", err);
    }
  };

  // Re-calculate bill whenever state, location, units, load, or subsidy status changes
  useEffect(() => {
    handleCalculateTariff();
  }, [selectedState, locationType, sanctionedLoad, inputUnits, inputDays, isGruhaJyothi, isRuralSubsidy]);

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userProfile),
      });
      if (res.ok) {
        const updated = await res.json();
        setUserProfile(updated);
        setProfileMessage({ type: 'success', text: 'Household profile saved successfully!' });
        setTimeout(() => setProfileMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setProfileMessage({ type: 'error', text: 'Failed to save profile' });
    }
  };

  const handleToggleConsent = async (val) => {
    try {
      const res = await fetch(`${API_BASE}/me/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_consent_granted: val }),
      });
      if (res.ok) {
        const updated = await res.json();
        setUserProfile(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete all personal logs, uploaded bills and profile data? (DPDP Act 2023 - Right to be Forgotten)")) return;
    try {
      const res = await fetch(`${API_BASE}/me`, { method: 'DELETE' });
      if (res.ok) {
        const json = await res.json();
        alert(json.message);
        setShowProfileModal(false);
        checkHealthAndFetch();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid #1f293d', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' }}>
            <Zap size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>PowerPulse</h1>
              <span className="badge badge-emerald">AI Intelligence</span>
              <span className="badge badge-cyan">Telangana (TGSPDCL)</span>
            </div>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>AI-Driven Energy Consumption, Anomaly Detection & ROI Optimization</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: backendOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}` }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: backendOnline ? '#10b981' : '#f43f5e', boxShadow: `0 0 8px ${backendOnline ? '#10b981' : '#f43f5e'}` }}></span>
            <span style={{ fontSize: '12px', fontWeight: '600', color: backendOnline ? '#34d399' : '#fb7185' }}>
              {backendOnline ? 'FastAPI Backend Online' : 'Local Standalone Mode'}
            </span>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setShowProfileModal(true)}
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <User size={15} color="#06b6d4" />
            <span>Profile & Consent</span>
          </button>
          <a
            href={`${API_BASE}/reports/pdf?monthly_kwh=${inputUnits}&is_gruha_jyothi=${isGruhaJyothi}`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '13px', padding: '8px 14px' }}
          >
            <FileDown size={15} /> Download PDF Audit Report
          </a>
          <button className="btn-secondary" onClick={checkHealthAndFetch} style={{ padding: '8px 12px' }}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid #1f293d', paddingBottom: '12px', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'forecast', label: 'AI Demand Forecast', icon: TrendingUp },
          { id: 'anomalies', label: 'Anomaly & Spikes', icon: AlertTriangle },
          { id: 'tariffs', label: 'Tariff & Subsidies (TS & AP)', icon: IndianRupee },
          { id: 'bills', label: 'Upload & Scan Bills', icon: FileUp },
          { id: 'recommendations', label: 'Solar & Eco-Alternatives', icon: Sun },
          { id: 'appliances', label: 'Appliance Breakdown', icon: PieChart }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                background: isActive ? '#1f293d' : 'transparent',
                color: isActive ? '#f9fafb' : '#9ca3af',
                border: isActive ? '1px solid #374151' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={16} color={isActive ? '#10b981' : '#6b7280'} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* -------------------- TAB 1: OVERVIEW -------------------- */}
      {activeTab === 'overview' && (
        <section>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '28px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Monthly Consumption</span>
                <Activity size={16} color="#06b6d4" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#f9fafb' }}>185.0 <span style={{ fontSize: '15px', color: '#9ca3af' }}>kWh</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#34d399' }}>
                <CheckCircle2 size={14} /> Within Gruha Jyothi 200u Limit
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Net Payable Bill (TGSPDCL)</span>
                <IndianRupee size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#34d399' }}>₹0.00</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                <span>Gross: ₹809.10 (₹809.10 subsidized)</span>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Solar Payback Period</span>
                <Sun size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#fbbf24' }}>3.2 <span style={{ fontSize: '15px', color: '#9ca3af' }}>Years</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#34d399' }}>
                <ArrowUpRight size={14} /> PM Surya Ghar Subsidy: ₹60,000
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Clean Energy Offset</span>
                <ShieldCheck size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#f9fafb' }}>1.82 <span style={{ fontSize: '15px', color: '#9ca3af' }}>tonnes</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                <span>CO₂ offset annually with Solar</span>
              </div>
            </div>
          </div>

          {/* Main Overview Visualizations */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* 7-Day Demand Trend */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Hourly Electricity Demand & Baseline</h3>
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>Real-time demand with dynamic Median Absolute Deviation (MAD) spike detection</p>
                </div>
                <span className="badge badge-cyan">XGBoost Engine</span>
              </div>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData ? forecastData.points.slice(0, 48) : [
                    { timestamp: '00:00', predicted_kwh: 0.35, spike_threshold_kwh: 0.8 },
                    { timestamp: '04:00', predicted_kwh: 0.28, spike_threshold_kwh: 0.8 },
                    { timestamp: '08:00', predicted_kwh: 0.65, spike_threshold_kwh: 1.1 },
                    { timestamp: '12:00', predicted_kwh: 0.72, spike_threshold_kwh: 1.2 },
                    { timestamp: '16:00', predicted_kwh: 0.85, spike_threshold_kwh: 1.2 },
                    { timestamp: '20:00', predicted_kwh: 1.15, spike_threshold_kwh: 1.3 },
                    { timestamp: '23:00', predicted_kwh: 0.45, spike_threshold_kwh: 0.9 },
                  ]}>
                    <defs>
                      <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                    <XAxis dataKey="timestamp" stroke="#6b7280" tickFormatter={(t) => typeof t === 'string' && t.includes('T') ? t.split('T')[1].substring(0, 5) : t} />
                    <YAxis stroke="#6b7280" unit=" kWh" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="actual_kwh" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Actual Baseline" connectNulls={false} />
                    <Area type="monotone" dataKey="predicted_kwh" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorKwh)" name="Forecasted Demand" connectNulls={false} />
                    <Line type="monotone" dataKey="spike_threshold_kwh" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Dynamic Spike Threshold" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Consumption Breakdown Donut */}
            <div className="glass-card">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Energy Decomposition</h3>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '18px' }}>End-use share modeled from appliance questionnaire</p>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={APPLIANCE_DECOMPOSITION}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {APPLIANCE_DECOMPOSITION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', marginTop: '10px' }}>
                {APPLIANCE_DECOMPOSITION.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></span>
                    <span style={{ color: '#9ca3af' }}>{item.name}: <strong style={{ color: '#f9fafb' }}>{item.value}%</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Household Consumption Benchmark (PRISM-M Task B2 / Charter Weeks 3-4) */}
          {benchmarkData && (
            <div className="glass-card" style={{ marginTop: '24px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.05))', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="#10b981" />
                    <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Similar Household Benchmark (Hyderabad Peer Distribution)</h3>
                    <span className="badge badge-emerald">{benchmarkData.efficiency_category}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Benchmarked against {benchmarkData.household_size}-person {benchmarkData.property_type} domestic consumers in {benchmarkData.city}.
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Your Peer Percentile</span>
                  <div style={{ fontSize: '22px', fontWeight: '800', color: benchmarkData.user_percentile <= 50 ? '#34d399' : '#fbbf24' }}>
                    {benchmarkData.user_percentile}th <span style={{ fontSize: '12px', color: '#9ca3af' }}>percentile</span>
                  </div>
                </div>
              </div>

              {/* Horizontal Percentile Range Bar */}
              <div style={{ margin: '20px 0 10px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                  <span>Efficient (P25: {benchmarkData.benchmark_distribution[0]?.monthly_kwh} kWh)</span>
                  <span>Regional Median (P50: {benchmarkData.median_benchmark_kwh} kWh)</span>
                  <span>High Usage (P75: {benchmarkData.benchmark_distribution[2]?.monthly_kwh} kWh)</span>
                  <span>Heavy Surge (P90: {benchmarkData.benchmark_distribution[3]?.monthly_kwh} kWh)</span>
                </div>
                <div style={{ position: 'relative', width: '100%', height: '12px', background: '#1f293d', borderRadius: '6px', overflow: 'visible' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '6px', background: 'linear-gradient(90deg, #10b981 0%, #06b6d4 35%, #fbbf24 70%, #f43f5e 100%)' }}></div>
                  {/* User marker pin */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      left: `${Math.min(96, Math.max(4, benchmarkData.user_percentile))}%`,
                      transform: 'translateX(-50%)',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '3px solid #10b981',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: '800',
                      color: '#0b0f19'
                    }}
                    title={`You: ${benchmarkData.user_consumption_kwh} kWh`}
                  >
                    You
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
                <span style={{ color: '#e5e7eb' }}>
                  <strong>Key Finding:</strong> {benchmarkData.key_insight}
                </span>
                <span style={{ color: benchmarkData.variance_from_median_kwh <= 0 ? '#34d399' : '#fb7185', fontWeight: '700' }}>
                  {benchmarkData.variance_from_median_kwh <= 0 ? '▼' : '▲'} {Math.abs(benchmarkData.variance_from_median_kwh)} kWh ({Math.abs(benchmarkData.variance_from_median_pct)}% vs median)
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* -------------------- TAB 2: FORECAST -------------------- */}
      {activeTab === 'forecast' && (
        <section>
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Autoregressive Time-Series Forecast</h2>
                <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                  XGBoost model with 168-hour lags, Indian/Telangana calendar holidays & Open-Meteo CDD weather
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={forecastPeriod === 'weekly' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setForecastPeriod('weekly')}
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                >
                  Weekly (7 Days)
                </button>
                <button
                  className={forecastPeriod === 'monthly' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setForecastPeriod('monthly')}
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                >
                  Monthly (30 Days)
                </button>
              </div>
            </div>

            {/* Forecast Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '16px', background: '#0b0f19', borderRadius: '12px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Total Projected Energy</span>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#f9fafb' }}>
                  {forecastData?.total_predicted_kwh || '77.01'} <span style={{ fontSize: '13px' }}>kWh</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Estimated Energy Charge</span>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                  ₹{forecastData?.estimated_cost_inr || '261.83'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Spikes Flagged (Dynamic MAD)</span>
                <div style={{ fontSize: '20px', fontWeight: '700', color: (forecastData?.potential_spike_count || 0) > 0 ? '#f43f5e' : '#34d399' }}>
                  {forecastData?.potential_spike_count ?? 0}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Confidence Interval</span>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#06b6d4' }}>95% ± 0.40 kWh</div>
              </div>
            </div>

            {/* Interactive Chart */}
            <div style={{ height: '360px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData?.points || []}>
                  <defs>
                    <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#6b7280"
                    tickFormatter={(t) => {
                      if (typeof t === 'string' && t.includes('T')) {
                        const [d, time] = t.split('T');
                        return `${d.slice(5)} ${time.substring(0, 5)}`;
                      }
                      return t;
                    }}
                  />
                  <YAxis stroke="#6b7280" unit=" kWh" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val, name, item) => {
                      if (val === null || val === undefined) return null;
                      const isSpk = item?.payload?.potential_spike;
                      if (name === "Dynamic MAD Anomaly Ceiling") {
                        return [`${Number(val).toFixed(3)} kWh (3σ Threshold)`, name];
                      }
                      return [
                        <span>
                          {Number(val).toFixed(3)} kWh {isSpk && <strong style={{ color: '#f43f5e' }}> ⚠️ Spike</strong>}
                        </span>,
                        name
                      ];
                    }}
                    labelFormatter={(label, items) => {
                      const payload = items?.[0]?.payload;
                      const typeLabel = payload?.point_type === 'actual' ? '🔵 Historical Baseline' : (payload?.point_type === 'transition' ? '🟢 Current Hour (Anchor - No Gap)' : '⚡ AI Forecast');
                      return `${label} · ${typeLabel}`;
                    }}
                  />
                  <Area type="monotone" dataKey="actual_kwh" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#actualFill)" name="Past Actual Baseline" connectNulls={false} />
                  <Area type="monotone" dataKey="predicted_kwh" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#forecastFill)" name="AI Forecasted Demand" connectNulls={false} />
                  <Line type="monotone" dataKey="spike_threshold_kwh" stroke="#f43f5e" strokeWidth={1.8} strokeDasharray="4 4" dot={false} name="Dynamic MAD Anomaly Ceiling" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Visual Continuity & Anchor Marker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.25)', marginTop: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }}></span>
                <span style={{ color: '#06b6d4', fontWeight: '600' }}>Past 24h Baseline (Cyan)</span>
                <span style={{ color: '#6b7280' }}>→</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>AI Forecast (Green)</span>
              </div>
              <span style={{ color: '#9ca3af' }}>
                Anchor Point: <strong style={{ color: '#34d399' }}>Zero Prediction Gap</strong> at current clock hour
              </span>
            </div>

            {/* Threshold Behavior & Explanation Guide Card */}
            <div style={{ marginTop: '20px', padding: '18px', background: '#0b0f19', borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <div style={{ width: '18px', height: '0px', borderTop: '2px dashed #f43f5e' }}></div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#f43f5e' }}>
                  What is the Red Dotted Threshold? (Dynamic Hourly MAD Anomaly Ceiling)
                </h4>
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '12px' }}>
                The <strong>red dotted line</strong> is not a static limit. It is an automated <strong>Dynamic Hourly Median Absolute Deviation (MAD) Anomaly Threshold</strong> derived from your historical consumption distribution for every hour of the day:
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '10px', background: '#111827', borderRadius: '8px', borderLeft: '3px solid #06b6d4' }}>
                  <strong style={{ color: '#06b6d4', display: 'block', marginBottom: '4px' }}>1. Mathematical Formula</strong>
                  <code style={{ color: '#f9fafb', fontSize: '11px', background: '#1f293d', padding: '2px 4px', borderRadius: '4px' }}>
                    Threshold(h) = Median(h) + 3.0 × 1.4826 × MAD(h)
                  </code>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    1.4826 × MAD is the robust estimator of standard deviation (σ), creating an adaptive 3-sigma ceiling resistant to outliers.
                  </p>
                </div>

                <div style={{ padding: '10px', background: '#111827', borderRadius: '8px', borderLeft: '3px solid #fbbf24' }}>
                  <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '4px' }}>2. Why It Curves Dynamically</strong>
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Power demand naturally fluctuates: high at 8:00 AM (breakfast/cooking) and 8:00 PM (HVAC/TV), but low at 3:00 AM (sleep). The threshold curves to mirror healthy human routines instead of using a rigid flat line.
                  </p>
                </div>

                <div style={{ padding: '10px', background: '#111827', borderRadius: '8px', borderLeft: '3px solid #f43f5e' }}>
                  <strong style={{ color: '#f43f5e', display: 'block', marginBottom: '4px' }}>3. Spike Alerts & Cost Protection</strong>
                  <p style={{ fontSize: '11px', color: '#9ca3af' }}>
                    Whenever forecasted demand breaches this red ceiling, the engine flags a <strong>Potential Spike</strong>. This prevents expensive tariff slab jumps, equipment overload, and unexpected utility demand charges.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* -------------------- TAB 3: ANOMALY -------------------- */}
      {activeTab === 'anomalies' && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', marginBottom: '24px' }}>
            <div className="glass-card">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Isolation Forest Config</span>
              <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>200 Trees</div>
              <span style={{ fontSize: '12px', color: '#06b6d4' }}>2.0% Contamination Rate</span>
            </div>
            <div className="glass-card">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Flagged Abnormalities</span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#fb7185', marginTop: '4px' }}>2 Intervals</div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Over 100 evaluation hours</span>
            </div>
            <div className="glass-card">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Likely Driver</span>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24', marginTop: '4px' }}>Night-time Base Load</div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Possible AC compressor cycling fault</span>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Anomaly Prevention Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '4px solid #f43f5e', fontSize: '13px' }}>
                <strong>Evening Peak Surge Warning:</strong> High load detected between 7:00 PM and 10:00 PM. Stagger washing machines and water geysers to non-peak daylight hours.
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', borderLeft: '4px solid #f59e0b', fontSize: '13px' }}>
                <strong>Standby Power Drift:</strong> Baselines between 2:00 AM and 5:00 AM rose by 0.18 kWh. Check refrigerator door gaskets and TV standby plugs.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* -------------------- TAB 4: TARIFFS & REGIONAL SUBSIDIES -------------------- */}
      {activeTab === 'tariffs' && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Input Controls */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Regional Electricity Tariff Simulator</h3>
                <span className="badge badge-cyan">{selectedState}</span>
              </div>

              {/* State Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Select State / Regulatory Board</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState('Telangana');
                      handleCalculateTariff('Telangana', locationType);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: selectedState === 'Telangana' ? '1px solid #10b981' : '1px solid #374151',
                      background: selectedState === 'Telangana' ? 'rgba(16, 185, 129, 0.15)' : '#0b0f19',
                      color: selectedState === 'Telangana' ? '#34d399' : '#9ca3af',
                    }}
                  >
                    Telangana (TGSPDCL)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedState('Andhra Pradesh');
                      handleCalculateTariff('Andhra Pradesh', locationType);
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      border: selectedState === 'Andhra Pradesh' ? '1px solid #06b6d4' : '1px solid #374151',
                      background: selectedState === 'Andhra Pradesh' ? 'rgba(6, 182, 212, 0.15)' : '#0b0f19',
                      color: selectedState === 'Andhra Pradesh' ? '#22d3ee' : '#9ca3af',
                    }}
                  >
                    Andhra Pradesh (APERC)
                  </button>
                </div>
              </div>

              {/* Location Type (Urban vs Rural) - Specially required for Andhra Pradesh */}
              {selectedState === 'Andhra Pradesh' && (
                <div style={{ marginBottom: '16px', padding: '12px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#fbbf24', fontWeight: '700', marginBottom: '6px' }}>
                    📍 Location Classification (Andhra Pradesh)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationType('urban');
                        handleCalculateTariff('Andhra Pradesh', 'urban');
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: locationType === 'urban' ? '1px solid #06b6d4' : '1px solid #374151',
                        background: locationType === 'urban' ? 'rgba(6, 182, 212, 0.2)' : '#111827',
                        color: locationType === 'urban' ? '#22d3ee' : '#9ca3af',
                      }}
                    >
                      🏙️ Urban (Corporation)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLocationType('rural');
                        handleCalculateTariff('Andhra Pradesh', 'rural');
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: locationType === 'rural' ? '1px solid #10b981' : '1px solid #374151',
                        background: locationType === 'rural' ? 'rgba(16, 185, 129, 0.2)' : '#111827',
                        color: locationType === 'rural' ? '#34d399' : '#9ca3af',
                      }}
                    >
                      🌾 Rural (Panchayat)
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                    {locationType === 'urban'
                      ? '• Urban: ₹50/mo customer service charge · Municipal Corporation grid standards.'
                      : '• Rural: Concessional ₹25/mo customer service charge · Gram Panchayat lifeline schedule.'}
                  </div>
                </div>
              )}

              {/* Sanctioned Load (kW) */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  <span>Sanctioned Load (Connected Capacity)</span>
                  <strong style={{ color: '#f9fafb' }}>{sanctionedLoad} kW</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={sanctionedLoad}
                  onChange={(e) => setSanctionedLoad(Number(e.target.value))}
                  style={{ width: '100%', accentColor: selectedState === 'Andhra Pradesh' ? '#06b6d4' : '#10b981' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
                  <span>1 kW (₹10/mo)</span>
                  <span>3 kW (₹30/mo)</span>
                  <span>10 kW (₹100/mo)</span>
                </div>
              </div>

              {/* Units Consumed */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Units Consumed (kWh)</label>
                <input
                  type="number"
                  value={inputUnits}
                  onChange={(e) => setInputUnits(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '8px', color: '#fff', fontSize: '16px', fontWeight: '600' }}
                />
              </div>

              {/* Billing Days */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>Billing Cycle (Days)</label>
                <input
                  type="number"
                  value={inputDays}
                  onChange={(e) => setInputDays(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '8px', color: '#fff', fontSize: '16px' }}
                />
              </div>

              {/* Subsidy Scheme Checkboxes (State-Specific) */}
              {selectedState === 'Telangana' ? (
                <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1f293d' }}>
                  <input
                    type="checkbox"
                    id="gj_check"
                    checked={isGruhaJyothi}
                    onChange={(e) => setIsGruhaJyothi(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                  />
                  <label htmlFor="gj_check" style={{ fontSize: '13px', cursor: 'pointer' }}>
                    <strong>Gruha Jyothi Scheme (Telangana)</strong>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>100% free electricity up to 200 units/mo for eligible homes</div>
                  </label>
                </div>
              ) : (
                <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1f293d' }}>
                  <input
                    type="checkbox"
                    id="ap_sub_check"
                    checked={isRuralSubsidy}
                    onChange={(e) => setIsRuralSubsidy(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#06b6d4' }}
                  />
                  <label htmlFor="ap_sub_check" style={{ fontSize: '13px', cursor: 'pointer' }}>
                    <strong>YSR Jagjeevan Jyothi Scheme (AP)</strong>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>100% free power up to 200 units/mo for eligible {locationType} / BPL households</div>
                  </label>
                </div>
              )}

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleCalculateTariff()}>
                Recalculate Bill
              </button>
            </div>

            {/* Bill Output & Slab Breakdown */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="badge badge-cyan">{tariffResult?.category || 'Domestic'}</span>
                    <span className="badge badge-emerald">{tariffResult?.state || selectedState}</span>
                    {selectedState === 'Andhra Pradesh' && (
                      <span className="badge badge-amber">{locationType.toUpperCase()}</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '6px' }}>
                    Net Payable: <span style={{ color: tariffResult?.net_payable_inr === 0 ? '#34d399' : '#f9fafb' }}>₹{tariffResult?.net_payable_inr?.toFixed(2)}</span>
                  </h3>
                  <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Provider: {tariffResult?.provider || (selectedState === 'Telangana' ? 'TGSPDCL' : 'APERC')}
                  </p>
                </div>
                {tariffResult?.is_gruha_jyothi_applied && (
                  <span className="badge badge-emerald">100% Subsidized (₹0 Bill)</span>
                )}
              </div>

              {/* Financial Component Breakdown Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Energy Charges:</span>
                  <strong style={{ fontSize: '14px', color: '#f9fafb' }}>₹{tariffResult?.energy_charges_inr?.toFixed(2)}</strong>
                </div>
                <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Fixed Charges ({sanctionedLoad} kW):</span>
                  <strong style={{ fontSize: '14px', color: '#f9fafb' }}>₹{tariffResult?.fixed_charges_inr?.toFixed(2)}</strong>
                </div>
                <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Customer Service Charge:</span>
                  <strong style={{ fontSize: '14px', color: '#f9fafb' }}>₹{tariffResult?.customer_charges_inr?.toFixed(2) || '50.00'}</strong>
                </div>
                <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                  <span style={{ color: '#9ca3af', display: 'block', fontSize: '11px' }}>Electricity Duty:</span>
                  <strong style={{ fontSize: '14px', color: '#f9fafb' }}>₹{tariffResult?.electricity_duty_inr?.toFixed(2)}</strong>
                </div>
              </div>

              {/* Subsidy Quota Progress Bar */}
              <div style={{ marginBottom: '24px', padding: '16px', background: '#0b0f19', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>{selectedState === 'Telangana' ? 'Gruha Jyothi Quota (TS)' : 'YSR Jagjeevan Jyothi Quota (AP)'}</span>
                  <strong>{inputUnits} / 200 kWh</strong>
                </div>
                <div style={{ width: '100%', height: '10px', background: '#1f293d', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, (inputUnits / 200) * 100)}%`,
                    height: '100%',
                    background: inputUnits <= 200 ? 'linear-gradient(90deg, #10b981, #06b6d4)' : '#f43f5e'
                  }}></div>
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                  {inputUnits <= 200 ? (
                    <span style={{ color: '#34d399' }}>✓ Safe: You have {200 - inputUnits} units of free electricity headroom left under {selectedState} lifeline limits.</span>
                  ) : (
                    <span style={{ color: '#fb7185' }}>⚠ Threshold Exceeded: Usage exceeded 200 units. Full ₹{tariffResult?.gross_total_inr?.toFixed(2)} is payable.</span>
                  )}
                </div>
              </div>

              {/* Official Telescopic Slab Breakdown Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600' }}>
                  {selectedState === 'Andhra Pradesh' ? 'APERC LT-I Domestic Telescopic Slabs' : 'TGSPDCL Domestic Telescopic Slabs'}
                </h4>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                  Effective Avg Rate: <strong style={{ color: '#06b6d4' }}>₹{tariffResult?.effective_rate_per_kwh || '4.69'}/kWh</strong>
                </span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1f293d', color: '#9ca3af', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Slab (kWh)</th>
                    <th style={{ padding: '8px' }}>Units In Slab</th>
                    <th style={{ padding: '8px' }}>Rate (₹/kWh)</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(tariffResult?.slab_breakdown || []).map((slab, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #161e2e' }}>
                      <td style={{ padding: '8px', color: '#e5e7eb' }}>{slab.slab_range}</td>
                      <td style={{ padding: '8px' }}>{slab.units_in_slab}</td>
                      <td style={{ padding: '8px', color: '#fbbf24' }}>₹{slab.rate_per_kwh.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: '600' }}>₹{slab.amount_inr.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Regulatory Notes Box */}
              {tariffResult?.notes && tariffResult.notes.length > 0 && (
                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '8px', borderLeft: '3px solid #06b6d4', fontSize: '12px' }}>
                  <div style={{ fontWeight: '700', color: '#22d3ee', marginBottom: '4px' }}>Tariff Order Compliance Notes:</div>
                  <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1' }}>
                    {tariffResult.notes.map((note, idx) => (
                      <li key={idx} style={{ marginTop: '2px' }}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* -------------------- TAB: BILLS UPLOAD & SCAN (PRISM-M E-04) -------------------- */}
      {activeTab === 'bills' && (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
            {/* Upload & Quick Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Upload Electricity Bill</h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
                  Upload your bill image (JPG/PNG) or PDF. Features automatic multilingual OCR (Telugu, Hindi, Kannada, etc.) & PII redaction.
                </p>

                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '28px 16px',
                    border: '2px dashed #374151',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: '#0b0f19',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = '#10b981')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = '#374151')}
                >
                  <FileUp size={36} color="#10b981" style={{ marginBottom: '10px' }} />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>
                    {uploading ? 'Scanning & Parsing Bill...' : 'Choose or Drag Bill Image'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    Supports PNG, JPG, JPEG, PDF
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {/* Quick Select Golden Sample Bills */}
              <div className="glass-card">
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>Loaded Bills (BILLS Folder)</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {billsList.map((bill) => (
                    <div
                      key={bill.bill_id}
                      onClick={() => setSelectedBill(bill)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: selectedBill?.bill_id === bill.bill_id ? '#1f293d' : '#0b0f19',
                        border: selectedBill?.bill_id === bill.bill_id ? '1px solid #10b981' : '1px solid #1f293d',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#f9fafb', display: 'block' }}>{bill.file_name}</strong>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>{bill.provider_name.split('(')[0]}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '700', color: '#06b6d4' }}>{bill.units_consumed_kwh} kWh</span>
                        <div style={{ fontSize: '11px', color: bill.net_payable_inr === 0 ? '#34d399' : '#f9fafb' }}>
                          ₹{bill.net_payable_inr}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bill Review, Edit & Confirm Form (PRISM-M I8, I9, U4, U5) */}
            {selectedBill ? (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge badge-emerald">{selectedBill.review_status}</span>
                      {selectedBill.is_gruha_jyothi_applied && (
                        <span className="badge badge-cyan">Gruha Jyothi Zero-Bill</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px' }}>
                      {selectedBill.file_name}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>{selectedBill.provider_name}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Consumer (Masked PII)</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: '600' }}>{selectedBill.consumer_number}</div>
                  </div>
                </div>

                {/* Editable review grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', background: '#0b0f19', padding: '16px', borderRadius: '12px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Units Consumed (kWh)</label>
                    <input
                      type="number"
                      value={selectedBill.units_consumed_kwh}
                      onChange={(e) => setSelectedBill({ ...selectedBill, units_consumed_kwh: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '15px', fontWeight: '700', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Billing Days</label>
                    <input
                      type="number"
                      value={selectedBill.billing_days}
                      onChange={(e) => setSelectedBill({ ...selectedBill, billing_days: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '15px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Gruha Jyothi Subsidy</label>
                    <div style={{ marginTop: '10px' }}>
                      <input
                        type="checkbox"
                        id="b_gjs"
                        checked={selectedBill.is_gruha_jyothi_applied}
                        onChange={(e) => setSelectedBill({ ...selectedBill, is_gruha_jyothi_applied: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#10b981', verticalAlign: 'middle', marginRight: '6px' }}
                      />
                      <label htmlFor="b_gjs" style={{ fontSize: '12px', cursor: 'pointer' }}>Eligible</label>
                    </div>
                  </div>
                </div>

                {/* Financial breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af' }}>Energy Charges:</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f9fafb' }}>₹{selectedBill.energy_charges_inr}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af' }}>Fixed Charges:</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f9fafb' }}>₹{selectedBill.fixed_charges_inr}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af' }}>Gross Billed:</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#f9fafb' }}>₹{selectedBill.gross_amount_inr}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af' }}>Net Payable:</span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: selectedBill.net_payable_inr === 0 ? '#34d399' : '#f9fafb' }}>
                      ₹{selectedBill.net_payable_inr}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button className="btn-primary" onClick={handleConfirmBill}>
                    <Check size={16} /> Confirm & Apply to Dashboard
                  </button>
                  {billsList.length >= 2 && (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        const other = billsList.find(b => b.bill_id !== selectedBill.bill_id);
                        if (other) handleCompareBills(selectedBill.bill_id, other.bill_id);
                      }}
                    >
                      Compare with {billsList.find(b => b.bill_id !== selectedBill.bill_id)?.file_name}
                    </button>
                  )}
                </div>

                {/* Comparison Card (PRISM-M I10) */}
                {compareResult && (
                  <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.3)', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#22d3ee', marginBottom: '8px' }}>
                      Bill Comparison (Task I10)
                    </h4>
                    <p style={{ fontSize: '13px', color: '#e5e7eb', marginBottom: '10px' }}>
                      {compareResult.trend_description}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px' }}>
                      <div>Units Difference: <strong style={{ color: compareResult.units_diff_kwh > 0 ? '#f43f5e' : '#34d399' }}>{compareResult.units_diff_kwh} kWh ({compareResult.units_diff_pct}%)</strong></div>
                      <div>Cost Difference: <strong style={{ color: compareResult.cost_diff_inr > 0 ? '#f43f5e' : '#34d399' }}>₹{compareResult.cost_diff_inr} ({compareResult.cost_diff_pct}%)</strong></div>
                      <div>Daily Average: <strong>{compareResult.daily_avg_current_kwh} kWh/day</strong> vs {compareResult.daily_avg_previous_kwh}</div>
                    </div>
                  </div>
                )}

                {/* Direct Solar Minimization & Appliance Alternatives for Uploaded Bill */}
                {applianceSolarData && (
                  <div style={{ marginTop: '20px', padding: '18px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(16, 185, 129, 0.05))', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sun size={20} color="#fbbf24" />
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#fbbf24' }}>
                            Solar Energy Minimization for Uploaded Bill
                          </h4>
                          <span className="badge badge-amber">Auto-Generated</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                          {applianceSolarData.summary_advice}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Potential Annual Savings</span>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399' }}>
                          ₹{applianceSolarData.total_potential_annual_savings_inr.toLocaleString()} <span style={{ fontSize: '12px', color: '#9ca3af' }}>/yr</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      <div style={{ padding: '10px 14px', background: '#0b0f19', borderRadius: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Highest Consuming Appliance</span>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#06b6d4' }}>
                          {applianceSolarData.highest_consuming_appliance}
                        </div>
                      </div>
                      <div style={{ padding: '10px 14px', background: '#0b0f19', borderRadius: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>Predicted Next Month Bill</span>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24' }}>
                          {applianceSolarData.predicted_next_month_kwh} kWh (₹{applianceSolarData.predicted_next_month_inr})
                        </div>
                      </div>
                    </div>

                    <h5 style={{ fontSize: '13px', fontWeight: '700', color: '#f9fafb', marginBottom: '10px' }}>
                      Appliance Breakdown & Matching Solar Alternatives:
                    </h5>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {applianceSolarData.appliance_solar_solutions.map((app) => (
                        <div key={app.appliance_id} style={{ padding: '12px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1f293d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>{app.icon}</span>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ fontSize: '14px', color: '#f9fafb' }}>{app.appliance_name}</strong>
                                <span className="badge badge-cyan">{app.share_percentage}% of bill</span>
                                {app.consumption_rank === 1 && (
                                  <span className="badge badge-rose">Top Consumer</span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                Currently consuming <span style={{ color: '#fff', fontWeight: '600' }}>{app.current_monthly_kwh} kWh</span> (₹{app.current_monthly_cost_inr}/mo)
                              </div>
                              <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '4px' }}>
                                ☀️ <strong>Solar Alternative:</strong> {app.solar_alternative_name}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Estimated Rupee Savings</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#34d399' }}>
                              Saves ₹{app.estimated_monthly_savings_inr}/mo
                            </div>
                            <div style={{ fontSize: '11px', color: '#06b6d4' }}>
                              (₹{app.estimated_annual_savings_inr.toLocaleString()}/yr · {app.payback_years} yr payback)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                Select or upload a bill to review details.
              </div>
            )}
          </div>
        </section>
      )}

      {/* -------------------- TAB 5: SOLAR & ECO-ALTERNATIVES -------------------- */}
      {activeTab === 'recommendations' && (
        <section>
          {/* Solar Simulator Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Solar Generation Simulator & Eco-Alternatives</h2>
              <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                ML-powered solar prediction engine (HistGradientBoostingRegressor, R²=0.9994) with PM Surya Ghar subsidies
              </p>
            </div>
            <span className="badge badge-amber">From solar_energy.ipynb</span>
          </div>

          {/* Solar Simulator Controls + Live Prediction */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '28px' }}>
            {/* Interactive Controls Panel */}
            <div className="glass-card">
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} color="#10b981" /> Solar Simulator
              </h3>

              {/* Panel Capacity */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  <span>Panel Capacity</span>
                  <strong style={{ color: '#f9fafb' }}>{solarPanel} kW</strong>
                </div>
                <input type="range" min="1" max="10" step="0.5" value={solarPanel}
                  onChange={(e) => setSolarPanel(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#10b981' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
                  <span>1 kW</span><span>5 kW</span><span>10 kW</span>
                </div>
              </div>

              {/* Irradiance */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  <span>Solar Irradiance</span>
                  <strong style={{ color: '#fbbf24' }}>{solarIrradiance} W/m²</strong>
                </div>
                <input type="range" min="0" max="1100" step="10" value={solarIrradiance}
                  onChange={(e) => setSolarIrradiance(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#f59e0b' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
                  <span>0</span><span>550</span><span>1100 W/m²</span>
                </div>
              </div>

              {/* Temperature */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  <span>Temperature</span>
                  <strong style={{ color: '#f43f5e' }}>{solarTemp}°C</strong>
                </div>
                <input type="range" min="5" max="46" step="1" value={solarTemp}
                  onChange={(e) => setSolarTemp(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#f43f5e' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
                  <span>5°C</span><span>25°C (STC)</span><span>46°C</span>
                </div>
              </div>

              {/* Cloud Cover */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  <span>Cloud Cover</span>
                  <strong style={{ color: '#94a3b8' }}>{solarCloud}%</strong>
                </div>
                <input type="range" min="0" max="100" step="5" value={solarCloud}
                  onChange={(e) => setSolarCloud(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#94a3b8' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
                  <span>Clear</span><span>Partly</span><span>Overcast</span>
                </div>
              </div>

              {/* Hour Selector */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
                  <span>Time of Day</span>
                  <strong style={{ color: '#06b6d4' }}>{solarHour}:00</strong>
                </div>
                <input type="range" min="0" max="23" step="1" value={solarHour}
                  onChange={(e) => setSolarHour(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#06b6d4' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
                  <span>00:00</span><span>12:00</span><span>23:00</span>
                </div>
              </div>

              {/* Battery Toggle */}
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1f293d' }}>
                <input type="checkbox" id="solar_bat" checked={solarBattery}
                  onChange={(e) => setSolarBattery(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                />
                <label htmlFor="solar_bat" style={{ fontSize: '13px', cursor: 'pointer' }}>
                  <strong>Battery Storage</strong>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Enable battery for self-consumption optimization</div>
                </label>
              </div>

              {/* City */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px', display: 'block' }}>City</label>
                <select value={solarCity} onChange={(e) => setSolarCity(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '8px', color: '#fff', fontSize: '14px' }}>
                  {['Hyderabad', 'Ahmedabad', 'Bengaluru', 'Chennai', 'Delhi', 'Jaipur', 'Kolkata', 'Mumbai'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                  onClick={fetchSolarAnalysis} disabled={solarLoading}>
                  <Sun size={15} /> {solarLoading ? 'Analyzing...' : 'Run Full Analysis'}
                </button>
                <button className="btn-secondary" style={{ padding: '8px 12px' }}
                  onClick={fetchSolarHourPrediction}>
                  <Sparkles size={15} /> Predict Hour
                </button>
              </div>

              {/* Single Hour Prediction Result */}
              {solarHourPrediction && (
                <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>Predicted Solar Generation @ {solarHour}:00</div>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: '#34d399' }}>
                    {solarHourPrediction.predicted_generation_kwh.toFixed(3)} <span style={{ fontSize: '14px' }}>kWh</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    Model: HistGradientBoostingRegressor (R²=0.9994)
                  </div>
                </div>
              )}
            </div>

            {/* Right: Daily Profile Chart + KPIs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* KPI Summary Cards */}
              {solarData && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                  <div style={{ padding: '14px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Daily Generation</span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#fbbf24' }}>{solarData.generation.daily_kwh} <span style={{ fontSize: '12px' }}>kWh</span></div>
                  </div>
                  <div style={{ padding: '14px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Monthly Yield</span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#06b6d4' }}>{solarData.generation.monthly_kwh} <span style={{ fontSize: '12px' }}>kWh</span></div>
                  </div>
                  <div style={{ padding: '14px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Monthly Savings</span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#34d399' }}>₹{solarData.savings.total_monthly_savings_inr.toLocaleString()}</div>
                  </div>
                  <div style={{ padding: '14px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Payback Period</span>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#fbbf24' }}>{solarData.investment.payback_years} <span style={{ fontSize: '12px' }}>Yrs</span></div>
                  </div>
                </div>
              )}

              {/* 24-Hour Solar Generation Profile Chart */}
              <div className="glass-card" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700' }}>24-Hour Solar Generation Profile</h3>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Dynamically recalculates with Solar Irradiance ({solarIrradiance} W/m²) & Temperature ({solarTemp}°C)
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="badge badge-amber">☀️ {solarIrradiance} W/m²</span>
                    <span className="badge badge-cyan">{solarPanel} kW System</span>
                  </div>
                </div>
                <div style={{ height: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={solarData?.hourly_profile || []}>
                      <defs>
                        <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                      <XAxis dataKey="time_label" stroke="#6b7280" />
                      <YAxis yAxisId="left" stroke="#f59e0b" unit=" kWh" />
                      <YAxis yAxisId="right" orientation="right" stroke="#6b7280" unit=" W/m²" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                        formatter={(value, name) => {
                          if (name === 'Predicted kWh') return [value.toFixed(3) + ' kWh', name];
                          if (name === 'Irradiance') return [value + ' W/m²', name];
                          return [value + '°C', name];
                        }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="predicted_kwh" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#solarFill)" name="Predicted kWh" />
                      <Line yAxisId="right" type="monotone" dataKey="irradiance_wm2" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Irradiance" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Financial & Environmental Analysis */}
          {solarData && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
              {/* Investment & ROI Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IndianRupee size={16} color="#10b981" /> Investment & ROI
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Gross System Cost:</span>
                    <strong>₹{solarData.investment.gross_cost_inr.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>PM Surya Ghar Subsidy:</span>
                    <strong style={{ color: '#34d399' }}>-₹{solarData.investment.pm_surya_ghar_subsidy_inr.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #1f293d', borderBottom: '1px solid #1f293d' }}>
                    <span style={{ color: '#f9fafb', fontWeight: '700' }}>Net Investment:</span>
                    <strong style={{ color: '#f9fafb', fontSize: '16px' }}>₹{solarData.investment.net_cost_inr.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Annual Savings:</span>
                    <strong style={{ color: '#10b981' }}>₹{solarData.savings.annual_savings_inr.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>5-Year Net:</span>
                    <strong style={{ color: solarData.investment.five_year_net_inr > 0 ? '#34d399' : '#fb7185' }}>₹{solarData.investment.five_year_net_inr.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>10-Year Net:</span>
                    <strong style={{ color: '#34d399' }}>₹{solarData.investment.ten_year_net_inr.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>25-Year Lifetime:</span>
                    <strong style={{ color: '#34d399' }}>₹{solarData.investment.twenty_five_year_net_inr.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Energy Flow Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="#06b6d4" /> Energy Flow (Monthly)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '12px', background: '#0b0f19', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Total Solar Generation</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#fbbf24' }}>{solarData.generation.monthly_kwh} kWh</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Self-Consumed</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>{solarData.savings.self_consumed_kwh} kWh</div>
                      <div style={{ fontSize: '11px', color: '#34d399' }}>Saves ₹{solarData.savings.monthly_self_savings_inr}/mo</div>
                    </div>
                    <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Grid Export</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#06b6d4' }}>{solarData.savings.exported_kwh} kWh</div>
                      <div style={{ fontSize: '11px', color: '#22d3ee' }}>Credit ₹{solarData.savings.monthly_export_credit_inr}/mo</div>
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Sunshine Hours/Day</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#fbbf24' }}>{solarData.generation.sunshine_hours} hrs</div>
                  </div>
                </div>
              </div>

              {/* Environment Impact Card */}
              <div className="glass-card">
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#10b981" /> Environmental Impact
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.1))', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Annual CO₂ Offset</div>
                    <div style={{ fontSize: '32px', fontWeight: '800', color: '#34d399' }}>{solarData.environment.annual_co2_offset_tonnes}</div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>tonnes CO₂/year</div>
                  </div>
                  <div style={{ padding: '12px', background: '#0b0f19', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🌳</span>
                    <div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Equivalent Trees Planted</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>{solarData.environment.equivalent_trees_planted} trees/year</div>
                    </div>
                  </div>
                  <div style={{ padding: '12px', background: '#0b0f19', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>Annual Clean Energy</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#06b6d4' }}>{solarData.generation.annual_kwh.toLocaleString()} kWh/year</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
                    Southern Grid Emission Factor: 0.82 kg CO₂/kWh
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Model Attribution Banner */}
          <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.3)', marginBottom: '24px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: '#fbbf24' }}>ML Model Source:</strong>{' '}
              <span style={{ color: '#9ca3af' }}>solar_energy.ipynb — HistGradientBoostingRegressor trained on 3.15M rows (360 households, 8 Indian cities) — MAE: 0.0137 kWh, R²: 0.9994</span>
            </div>
            <span className="badge badge-amber">Integrated</span>
          </div>

          {/* Eco-Alternatives Recommendations (existing) */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Ranked Eco-Alternatives & ROI</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Green retrofit options with central subsidies & net payback timelines</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {(recommendations?.recommended_solutions || [
              {
                id: 'solar_rooftop',
                title: '2.0 kW Grid-Tied Rooftop Solar System',
                category: 'Renewable Generation',
                description: 'High-efficiency rooftop solar with TSSPDCL bi-directional net meter.',
                estimated_monthly_savings_inr: 1200,
                gross_investment_inr: 120000,
                subsidy_amount_inr: 60000,
                net_investment_inr: 60000,
                payback_years: 4.2,
                five_year_net_savings_inr: 12000,
                ten_year_net_savings_inr: 84000,
                annual_co2_offset_kg: 2460,
                key_assumptions: ['PM Surya Ghar Subsidy of ₹60,000 applied', '4.5 Peak Sun Hours/day in Hyderabad']
              },
              {
                id: 'inverter_ac',
                title: '5-Star Inverter AC Upgrade',
                category: 'Energy Efficient Appliances',
                description: 'Replace old non-inverter cooling units with smart dual-rotary inverter compressors.',
                estimated_monthly_savings_inr: 450,
                gross_investment_inr: 42000,
                subsidy_amount_inr: 0,
                net_investment_inr: 42000,
                payback_years: 7.7,
                five_year_net_savings_inr: -15000,
                ten_year_net_savings_inr: 12000,
                annual_co2_offset_kg: 590,
                key_assumptions: ['35% energy reduction over 3-star AC']
              },
              {
                id: 'solar_water_heater',
                title: '100L ETC Solar Water Heater',
                category: 'Water Heating Retrofit',
                description: 'Evacuated tube rooftop solar water heater replacing resistive geysers.',
                estimated_monthly_savings_inr: 270,
                gross_investment_inr: 24000,
                subsidy_amount_inr: 0,
                net_investment_inr: 24000,
                payback_years: 7.4,
                five_year_net_savings_inr: -7800,
                ten_year_net_savings_inr: 8400,
                annual_co2_offset_kg: 442,
                key_assumptions: ['Saves ~1.5 kWh/day geyser morning spike']
              },
              {
                id: 'behavioral',
                title: 'Smart Load Shifting & 24°C AC Tuning',
                category: 'Behavioral Efficiency',
                description: 'Thermostat optimization and daytime load scheduling with zero capital expenditure.',
                estimated_monthly_savings_inr: 90,
                gross_investment_inr: 0,
                subsidy_amount_inr: 0,
                net_investment_inr: 0,
                payback_years: 0,
                five_year_net_savings_inr: 5400,
                ten_year_net_savings_inr: 10800,
                annual_co2_offset_kg: 147,
                key_assumptions: ['Zero capital investment required']
              }
            ]).map((item, idx) => (
              <div key={idx} className="glass-card glass-card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span className="badge badge-emerald">{item.category}</span>
                    {item.subsidy_amount_inr > 0 && (
                      <span className="badge badge-amber">₹{item.subsidy_amount_inr.toLocaleString()} Subsidy</span>
                    )}
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{item.title}</h3>
                  <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>{item.description}</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#0b0f19', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Net Cost:</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb' }}>₹{item.net_investment_inr.toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Monthly Savings:</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>₹{item.estimated_monthly_savings_inr.toLocaleString()}</div>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Payback Time:</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#fbbf24' }}>{item.payback_years} Yrs</div>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>10-Yr Net Profit:</span>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#34d399' }}>₹{item.ten_year_net_savings_inr.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1f293d', paddingTop: '10px', fontSize: '11px', color: '#6b7280' }}>
                  {item.key_assumptions[0]}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* -------------------- TAB 6: APPLIANCES & DISAGGREGATION -------------------- */}
      {activeTab === 'appliances' && (
        <section>
          {/* Disaggregation Executive Summary Banner */}
          <div className="glass-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(16, 185, 129, 0.05))', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <span className="badge badge-cyan">REFIT AI Disaggregation Engine (PRISM-M E-08)</span>
                <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '8px' }}>
                  {disaggregationData?.summary || 'Appliance-Level Energy Disaggregation Active'}
                </h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
                  Decomposed from your total monthly usage of {inputUnits} kWh using multi-house sub-metered regression models.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '14px' }}>
                <div style={{ padding: '10px 16px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Top Appliance</span>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#06b6d4' }}>{disaggregationData?.top_consuming_appliance || 'Air Conditioning'}</div>
                </div>
                <div style={{ padding: '10px 16px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d' }}>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>Identified Savings</span>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#34d399' }}>₹{disaggregationData?.potential_appliance_savings_inr || '148'}/mo</div>
                </div>
              </div>
            </div>
          </div>

          {/* Disaggregated Appliance Cards */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>Appliance Decomposition Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '18px' }}>
              {(disaggregationData?.appliances || []).map((app, i) => (
                <div key={i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{app.icon}</span>
                      <span className={`badge ${app.efficiency_status === 'Optimal' ? 'badge-emerald' : app.efficiency_status === 'High Consumption' ? 'badge-rose' : 'badge-amber'}`}>
                        {app.efficiency_status}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{app.name}</h4>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{app.category}</span>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#0b0f19', padding: '12px', borderRadius: '8px', margin: '14px 0', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#9ca3af' }}>Monthly kWh:</span>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#f9fafb' }}>{app.monthly_kwh} <span style={{ fontSize: '11px' }}>kWh</span></div>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af' }}>Estimated Cost:</span>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>₹{app.monthly_cost_inr}</div>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af' }}>Your Share:</span>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#06b6d4' }}>{app.share_percentage}%</div>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af' }}>Benchmark:</span>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>~{app.benchmark_percentage}%</div>
                      </div>
                    </div>
                  </div>

                  {app.recommendation ? (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '3px solid #f43f5e', fontSize: '11px', color: '#fca5a5' }}>
                      {app.recommendation}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#6b7280', paddingTop: '4px' }}>
                      ✓ Consumption aligns with optimal efficiency thresholds.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Appliance Survey */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>Declared Household Appliances</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
              Appliances identified in user survey; used to initialize prior feature distributions for disaggregation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              {[
                { name: '1.5 Ton Split AC', icon: '❄️', count: 2, hours: '6 hrs/day', star: '3-Star Non-Inverter' },
                { name: 'Double Door Refrigerator', icon: '🧊', count: 1, hours: '24 hrs/day', star: '4-Star Frost Free' },
                { name: 'Storage Water Geyser', icon: '♨️', count: 2, hours: '1.5 hrs/day', star: 'Standard Resistive' },
                { name: 'Front Load Washing Machine', icon: '🧺', count: 1, hours: '1 hr/day', star: '5-Star Inverter' },
                { name: 'LED Lights & Ceiling Fans', icon: '💡', count: 12, hours: '8 hrs/day', star: 'BLDC / LED' }
              ].map((app, i) => (
                <div key={i} style={{ padding: '14px', borderRadius: '10px', background: '#0b0f19', border: '1px solid #1f293d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px' }}>{app.icon}</span>
                    <strong style={{ fontSize: '13px' }}>{app.name}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Count: {app.count}</span>
                    <span>Runtime: {app.hours}</span>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#06b6d4' }}>Rating: {app.star}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -------------------- USER PROFILE & CONSENT MODAL (EPIC E-02) -------------------- */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #1f293d', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={20} color="#10b981" />
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Household Profile & Consent (DPDP Act)</h3>
              </div>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {profileMessage && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', background: profileMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: profileMessage.type === 'success' ? '#34d399' : '#fb7185', fontSize: '13px' }}>
                {profileMessage.text}
              </div>
            )}

            {/* Profile Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Consumer Name</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Electricity Provider</label>
                <input
                  type="text"
                  value={userProfile.provider}
                  disabled
                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid #1f293d', borderRadius: '6px', color: '#9ca3af', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Household Size (Persons)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={userProfile.household_size}
                  onChange={(e) => setUserProfile({ ...userProfile, household_size: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Air Conditioners Installed</label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={userProfile.ac_units_count}
                  onChange={(e) => setUserProfile({ ...userProfile, ac_units_count: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '14px' }}
                />
              </div>
            </div>

            {/* DPDP Act 2023 Consent Gate (Task T-12, K1) */}
            <div style={{ padding: '14px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="dpdp_consent"
                  checked={userProfile.data_consent_granted}
                  onChange={(e) => {
                    setUserProfile({ ...userProfile, data_consent_granted: e.target.checked });
                    handleToggleConsent(e.target.checked);
                  }}
                  style={{ width: '18px', height: '18px', accentColor: '#10b981', marginTop: '3px' }}
                />
                <label htmlFor="dpdp_consent" style={{ fontSize: '12px', color: '#e5e7eb', cursor: 'pointer' }}>
                  <strong>Data Processing Consent (Digital Personal Data Protection Act 2023)</strong>
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    I grant consent for PowerPulse to process utility bill consumption units and smart meter readings strictly for energy forecasting, slab tariff computation, and green ROI modeling. All consumer numbers and personal addresses are redacted. Policy: <code>{userProfile.consent_policy_version}</code>.
                  </p>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn-secondary"
                onClick={handleDeleteAccount}
                style={{ color: '#fb7185', borderColor: '#f43f5e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Trash2 size={14} /> Delete My Data (Right to be Forgotten)
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-secondary" onClick={() => setShowProfileModal(false)}>Close</button>
                <button className="btn-primary" onClick={handleSaveProfile}>Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: '48px', paddingTop: '20px', borderTop: '1px solid #1f293d', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
        <span>PowerPulse © 2026 — PRISM-M Milestone Execution</span>
        <span>Built with FastAPI + React + XGBoost + TGSPDCL Tariff Engine</span>
      </footer>
    </div>
  );
}
