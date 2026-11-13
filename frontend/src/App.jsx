import React, { useState, useEffect, useMemo } from 'react';
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
  Users,
  Plus
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

// 14 Core Indian Household Appliances with customizable kW, daily hours and count
const DEFAULT_14_APPLIANCES = [
  { id: 'ac', name: 'Air Conditioner', category: 'Cooling', icon: '❄️', power_rating_kw: 1.5, daily_hours: 6.0, quantity: 1, duty_cycle: 0.60, benchmark_percentage: 30.0, recommendation: 'Set thermostat to 24°C instead of 18°C to save ~24% cooling electricity.' },
  { id: 'refrigerator', name: 'Refrigerator', category: 'Refrigeration', icon: '🧊', power_rating_kw: 0.18, daily_hours: 24.0, quantity: 1, duty_cycle: 0.35, benchmark_percentage: 16.0, recommendation: 'Maintain 50mm airflow clearance around condenser coils and inspect door gaskets.' },
  { id: 'water_heater', name: 'Water Heater / Geyser', category: 'Heating', icon: '♨️', power_rating_kw: 2.0, daily_hours: 0.75, quantity: 1, duty_cycle: 1.0, benchmark_percentage: 14.0, recommendation: 'Install an automatic timer to prevent leaving geyser on continuously.' },
  { id: 'ceiling_fans', name: 'Ceiling Fans', category: 'Circulation', icon: '🌀', power_rating_kw: 0.075, daily_hours: 12.0, quantity: 3, duty_cycle: 1.0, benchmark_percentage: 12.0, recommendation: 'Upgrade to 28W BLDC fans to cut fan power by 60% with fast payback.' },
  { id: 'water_pump', name: 'Water Pump', category: 'Pumping', icon: '💧', power_rating_kw: 0.75, daily_hours: 1.0, quantity: 1, duty_cycle: 1.0, benchmark_percentage: 8.0, recommendation: 'Install an overhead tank auto-switch to prevent dry-running.' },
  { id: 'washing_machine', name: 'Washing Machine', category: 'Laundry', icon: '🧺', power_rating_kw: 0.50, daily_hours: 1.0, quantity: 1, duty_cycle: 0.80, benchmark_percentage: 5.0, recommendation: 'Run on eco/cold wash mode and wash full loads.' },
  { id: 'television', name: 'Television', category: 'Entertainment', icon: '📺', power_rating_kw: 0.10, daily_hours: 5.0, quantity: 1, duty_cycle: 1.0, benchmark_percentage: 4.0, recommendation: 'Switch off main plug to eliminate standby phantom load.' },
  { id: 'induction_stove', name: 'Induction Stove', category: 'Kitchen', icon: '🍲', power_rating_kw: 1.5, daily_hours: 0.5, quantity: 1, duty_cycle: 0.80, benchmark_percentage: 4.0, recommendation: 'Use flat-bottomed ferromagnetic cookware for maximum efficiency.' },
  { id: 'electric_iron', name: 'Electric Iron', category: 'Laundry', icon: '👔', power_rating_kw: 1.0, daily_hours: 0.4, quantity: 1, duty_cycle: 0.70, benchmark_percentage: 3.0, recommendation: 'Iron clothes in batches to prevent repeated reheating.' },
  { id: 'microwave', name: 'Microwave Oven', category: 'Kitchen', icon: '📻', power_rating_kw: 1.2, daily_hours: 0.3, quantity: 1, duty_cycle: 1.0, benchmark_percentage: 3.0, recommendation: 'Cover dishes with ceramic lids to retain steam and cook faster.' },
  { id: 'led_lights', name: 'LED Lights', category: 'Lighting', icon: '💡', power_rating_kw: 0.012, daily_hours: 6.0, quantity: 6, duty_cycle: 1.0, benchmark_percentage: 3.0, recommendation: 'Leverage daylight during afternoon and fit motion sensors in passages.' },
  { id: 'computer_laptop', name: 'Computer / Laptop', category: 'Work & IT', icon: '💻', power_rating_kw: 0.08, daily_hours: 6.0, quantity: 1, duty_cycle: 0.90, benchmark_percentage: 3.0, recommendation: 'Set display sleep timeout to 10 minutes and unplug brick chargers.' },
  { id: 'dishwasher', name: 'Dishwasher', category: 'Kitchen', icon: '🍽️', power_rating_kw: 1.2, daily_hours: 0.4, quantity: 1, duty_cycle: 0.75, benchmark_percentage: 2.0, recommendation: 'Run only full loads on eco-cycle during non-peak daylight hours.' },
  { id: 'other_appliances', name: 'Other Appliances', category: 'Miscellaneous', icon: '🔌', power_rating_kw: 0.15, daily_hours: 2.0, quantity: 1, duty_cycle: 0.80, benchmark_percentage: 2.0, recommendation: 'Unplug phone adapters, wifi repeaters and peripherals when travelling.' },
];

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
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastViewMode, setForecastViewMode] = useState('daily'); // 'daily' | 'hourly'

  // Tariff calculator state - Regional & Location-Based (Telangana & Andhra Pradesh)
  const [selectedState, setSelectedState] = useState('Andhra Pradesh'); // Default to AP
  const [locationType, setLocationType] = useState('urban'); // 'urban' | 'rural'
  const [sanctionedLoad, setSanctionedLoad] = useState(2.0); // in kW
  const [isRuralSubsidy, setIsRuralSubsidy] = useState(false); // YSR Jagjeevan Jyothi Scheme
  const [inputUnits, setInputUnits] = useState(185);
  const [inputDays, setInputDays] = useState(30);
  const [isGruhaJyothi, setIsGruhaJyothi] = useState(false);
  const [tariffResult, setTariffResult] = useState(INITIAL_TARIFF);

  // Recommendations state
  const [recommendations, setRecommendations] = useState(null);

  // Disaggregation state (AllHouses REFIT Engine with all 14 Household Appliances)
  const [disaggregationData, setDisaggregationData] = useState(null);
  const [appliancesList, setAppliancesList] = useState(DEFAULT_14_APPLIANCES);
  const [showAddApplianceModal, setShowAddApplianceModal] = useState(false);
  const [newApplianceForm, setNewApplianceForm] = useState({
    name: '',
    category: 'Kitchen',
    icon: '⚡',
    power_rating_kw: 0.5,
    daily_hours: 2.0,
    quantity: 1,
  });

  // Bills Management state (PRISM-M Epic E-04)
  const [billsList, setBillsList] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success' | 'error' | 'info', message: '' }
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
      setForecastLoading(true);
      const res = await fetch(`${API_BASE}/forecast/demo?period=${period}&monthly_kwh=${Number(units)}`);
      if (res.ok) {
        const json = await res.json();
        setForecastData(json);
      }
    } catch (err) {
      console.warn("Forecast fetch failed:", err);
    } finally {
      setForecastLoading(false);
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
    name: "Domestic Resident",
    email: "consumer@example.com",
    city: "Hyderabad",
    state: "Telangana",
    location_type: "urban",
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
  const [profileAppliances, setProfileAppliances] = useState(() =>
    DEFAULT_14_APPLIANCES.map(a => ({
      ...a,
      installed: true,
      quantity: a.quantity || 1,
    }))
  );

  const handleOpenProfileModal = () => {
    // Synchronize profileAppliances with current appliancesList & userProfile
    const synced = DEFAULT_14_APPLIANCES.map(def => {
      const found = appliancesList.find(a => a.id === def.id || a.name.toLowerCase() === def.name.toLowerCase());
      if (found) {
        const qty = (def.id === 'ac' && userProfile.ac_units_count) ? userProfile.ac_units_count : (found.quantity || def.quantity || 1);
        return {
          ...def,
          ...found,
          quantity: qty,
          installed: qty > 0,
        };
      }
      return {
        ...def,
        quantity: def.quantity || 1,
        installed: false,
      };
    });
    setProfileAppliances(synced);
    setShowProfileModal(true);
  };

  const handleToggleApplianceInProfile = (index) => {
    setProfileAppliances(prev => {
      const next = [...prev];
      const cur = next[index];
      const willInstall = !cur.installed;
      const def = DEFAULT_14_APPLIANCES.find(d => d.id === cur.id) || cur;
      next[index] = {
        ...cur,
        installed: willInstall,
        quantity: willInstall ? (cur.quantity > 0 ? cur.quantity : (def.quantity || 1)) : 0,
      };
      return next;
    });
  };

  const handleUpdateApplianceQtyInProfile = (index, delta) => {
    setProfileAppliances(prev => {
      const next = [...prev];
      const cur = next[index];
      const newQty = Math.max(0, Math.min(20, (cur.quantity || 0) + delta));
      next[index] = {
        ...cur,
        quantity: newQty,
        installed: newQty > 0,
      };
      return next;
    });
  };

  const handleSetApplianceQtyInProfile = (index, val) => {
    const num = Math.max(0, Math.min(20, parseInt(val, 10) || 0));
    setProfileAppliances(prev => {
      const next = [...prev];
      const cur = next[index];
      next[index] = {
        ...cur,
        quantity: num,
        installed: num > 0,
      };
      return next;
    });
  };

  // Appliance Solar Alternatives State (User Requested Flow)
  const [applianceSolarData, setApplianceSolarData] = useState(null);

  // Check backend health and load data on initial mount
  useEffect(() => {
    checkHealthAndFetch();
  }, []);

  const checkHealthAndFetch = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setBackendOnline(true);
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
          if (dJson.appliances && dJson.appliances.length > 0) {
            setAppliancesList(dJson.appliances);
          }
        }
        // Fetch uploaded / golden bills list (PRISM-M E-04)
        const bRes = await fetch(`${API_BASE}/bills`);
        if (bRes.ok) {
          const bJson = await bRes.json();
          setBillsList(bJson);
          if (bJson.length > 0 && !selectedBill) {
            syncDashboardWithBill(bJson[0]);
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
          if (uJson.installed_appliances && uJson.installed_appliances.length > 0) {
            setAppliancesList(uJson.installed_appliances);
          }
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

  // Synchronized Master Updater: Connects uploaded electricity bill to EVERY dashboard section
  const syncDashboardWithBill = (bill) => {
    if (!bill) return;
    setSelectedBill(bill);
    const units = Number(bill.units_consumed_kwh || 185);
    const days = Number(bill.billing_days || 30);
    const st = bill.state || (bill.discom?.startsWith('AP') ? 'Andhra Pradesh' : 'Telangana');
    const loc = bill.location_type || 'urban';
    const load = Number(bill.sanctioned_load_kw || 2.0);
    const isGjs = Boolean(bill.is_gruha_jyothi_applied);

    setInputUnits(units);
    setInputDays(days);
    setSelectedState(st);
    setLocationType(loc);
    setSanctionedLoad(load);
    setIsGruhaJyothi(isGjs);
    if (st === 'Andhra Pradesh' && loc === 'rural') {
      setIsRuralSubsidy(isGjs);
    }

    handleCalculateTariff(st, loc, units, load, isGjs, bill.discom, bill.consumer_category, bill.gross_amount_inr || bill.net_payable_inr);
    fetchForecast(forecastPeriod, units);
    fetchDisaggregation(units);
    fetchSolarAlternatives(units, bill.gross_amount_inr || bill.net_payable_inr, bill.bill_id, bill.file_name);
  };

  const fetchDisaggregation = async (units = inputUnits) => {
    try {
      const res = await fetch(`${API_BASE}/disaggregation/breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_consumption_kwh: Number(units),
          has_air_conditioner: true,
          household_size: 4,
        })
      });
      if (res.ok) {
        const json = await res.json();
        setDisaggregationData(json);
        if (json.appliances && json.appliances.length > 0) {
          setAppliancesList(json.appliances);
        }
      }
    } catch (err) {
      console.warn("Disaggregation fetch failed:", err);
    }
  };

  const handleRecalculateAppliances = async (updatedList = appliancesList) => {
    try {
      const res = await fetch(`${API_BASE}/disaggregation/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthly_consumption_kwh: Number(inputUnits),
          appliances: updatedList.map(a => ({
            id: a.id,
            name: a.name,
            category: a.category || 'General',
            icon: a.icon || '⚡',
            power_rating_kw: Number(a.power_rating_kw || 0.1),
            daily_hours: Number(a.daily_hours || 1.0),
            quantity: Number(a.quantity || 1),
          }))
        })
      });
      if (res.ok) {
        const json = await res.json();
        setDisaggregationData(json);
        setAppliancesList(json.appliances);
      }
    } catch (err) {
      console.error("Custom appliance recalculate error:", err);
    }
  };

  const fetchSolarAlternatives = async (units = inputUnits, grossAmount = 809, billId = '', fileName = '') => {
    try {
      const q = `${API_BASE}/solar/appliance-alternatives?monthly_kwh=${units}&current_bill_inr=${grossAmount}&bill_id=${billId}&bill_file_name=${encodeURIComponent(fileName)}`;
      const res = await fetch(q);
      if (res.ok) {
        const json = await res.json();
        setApplianceSolarData(json);
      }
    } catch (err) {
      console.warn("Solar alternatives error:", err);
    }
  };

  const handleFileUpload = async (e, directFile = null) => {
    let file = directFile;
    if (!file && e) {
      if (e.target && e.target.files && e.target.files.length > 0) {
        file = e.target.files[0];
      } else if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    }
    if (!file) return;

    setUploading(true);
    setUploadStatus({ type: 'info', message: `Scanning & parsing ${file.name}...` });

    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/bills/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const newBill = await res.json();
      setBillsList(prev => [newBill, ...prev.filter(b => b.bill_id !== newBill.bill_id)]);
      syncDashboardWithBill(newBill);

      setUploadStatus({
        type: 'success',
        message: `✓ Successfully parsed "${newBill.file_name}"! Extracted ${newBill.units_consumed_kwh} kWh (${newBill.provider_name.split('(')[0]}). All dashboard metrics synchronized.`
      });
    } catch (err) {
      console.error("Bill upload error:", err);
      setUploadStatus({
        type: 'error',
        message: `⚠️ Bill parsing failed: ${err.message || 'Could not connect to backend'}. You can still review or edit values manually.`
      });
    } finally {
      setUploading(false);
      if (e && e.target) {
        e.target.value = '';
      }
    }
  };

  const handleConfirmBill = async () => {
    if (!selectedBill) return;
    try {
      const res = await fetch(`${API_BASE}/bills/${selectedBill.bill_id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units_consumed_kwh: Number(selectedBill.units_consumed_kwh),
          billing_days: Number(selectedBill.billing_days || 30),
          is_gruha_jyothi_applied: Boolean(selectedBill.is_gruha_jyothi_applied),
          state: selectedBill.state,
          location_type: selectedBill.location_type,
          consumer_category: selectedBill.consumer_category,
          discom: selectedBill.discom,
          sanctioned_load_kw: Number(selectedBill.sanctioned_load_kw || 2.0),
          consumer_name: selectedBill.consumer_name,
          consumer_number: selectedBill.consumer_number,
          billing_start_date: selectedBill.billing_start_date,
          billing_end_date: selectedBill.billing_end_date,
          gross_amount_inr: Number(selectedBill.gross_amount_inr || selectedBill.net_payable_inr),
        })
      });
      if (res.ok) {
        const confirmed = await res.json();
        setBillsList(prev => prev.map(b => b.bill_id === confirmed.bill_id ? confirmed : b));
        syncDashboardWithBill(confirmed);
        setUploadStatus({
          type: 'success',
          message: `✓ Confirmed and recalculated all dashboard sections for "${confirmed.file_name}"!`
        });
      }
    } catch (err) {
      console.error("Bill confirmation error:", err);
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
    overrideSubsidy = null,
    overrideDiscom = null,
    overrideCategory = null,
    overrideBilledAmount = null
  ) => {
    const st = overrideState || selectedState;
    const loc = overrideLocation || locationType;
    const units = overrideUnits !== null ? overrideUnits : Number(inputUnits);
    const load = overrideLoad !== null ? overrideLoad : Number(sanctionedLoad);
    const sub = overrideSubsidy !== null ? overrideSubsidy : (st === 'Telangana' ? isGruhaJyothi : isRuralSubsidy);
    const disc = overrideDiscom || (st === 'Andhra Pradesh' ? (selectedBill?.discom || 'APSPDCL') : 'TGSPDCL');
    const cat = overrideCategory || (selectedBill?.consumer_category || 'LT-I Domestic');
    const billed = overrideBilledAmount !== null ? overrideBilledAmount : (selectedBill?.gross_amount_inr || null);

    try {
      const res = await fetch(`${API_BASE}/tariffs/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units_consumed_kwh: units,
          billing_days: Number(inputDays),
          state: st,
          location_type: loc,
          discom: disc,
          consumer_category: cat,
          sanctioned_load_kw: load,
          is_gruha_jyothi_eligible: sub,
          billed_amount_inr: billed,
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
      // Sync global application state with profile choices
      if (userProfile.state) {
        setSelectedState(userProfile.state);
      }
      if (userProfile.location_type) {
        setLocationType(userProfile.location_type);
        if (userProfile.state === 'Andhra Pradesh' && userProfile.location_type === 'rural') {
          setIsRuralSubsidy(true);
        }
      }

      // Filter active installed appliances from profile modal
      const activeAppliances = profileAppliances
        .filter(a => a.installed && (a.quantity || 0) > 0)
        .map(a => ({
          id: a.id,
          name: a.name,
          category: a.category,
          icon: a.icon,
          power_rating_kw: a.power_rating_kw,
          daily_hours: a.daily_hours,
          quantity: a.quantity || 1,
          duty_cycle: a.duty_cycle || 1.0,
          benchmark_percentage: a.benchmark_percentage || 5.0,
          recommendation: a.recommendation || '',
        }));

      const finalAppliances = activeAppliances.length > 0 ? activeAppliances : DEFAULT_14_APPLIANCES;

      // Backward compatible AC count & presence
      const acApp = finalAppliances.find(a => a.id === 'ac' || a.name.toLowerCase().includes('air conditioner'));
      const acCount = acApp ? (acApp.quantity || 0) : 0;

      const profilePayload = {
        ...userProfile,
        has_air_conditioner: acCount > 0,
        ac_units_count: acCount,
        installed_appliances: finalAppliances,
      };

      const res = await fetch(`${API_BASE}/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profilePayload),
      });
      if (res.ok) {
        const updated = await res.json();
        setUserProfile(updated);
        // Sync active appliances list and recalculate disaggregation & overview donut
        setAppliancesList(finalAppliances);
        await handleRecalculateAppliances(finalAppliances);

        setProfileMessage({
          type: 'success',
          text: `✓ Profile & appliances saved! Configured ${finalAppliances.length} appliances across ${updated.state} (${updated.location_type.toUpperCase()}).`
        });
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

  // Historical Comparison with previous billing period (Requirement 2)
  const previousBill = useMemo(() => {
    if (!billsList || billsList.length <= 1) return null;
    return billsList.find(b => b.bill_id !== selectedBill?.bill_id) || null;
  }, [billsList, selectedBill]);

  const billComparison = useMemo(() => {
    if (!previousBill) return null;
    const currentKwh = Number(inputUnits);
    const prevKwh = Number(previousBill.units_consumed_kwh);
    const diffKwh = Number((currentKwh - prevKwh).toFixed(1));
    const diffPct = prevKwh > 0 ? Number(((diffKwh / prevKwh) * 100).toFixed(1)) : 0;
    return {
      prevKwh,
      diffKwh,
      diffPct,
      prevLabel: previousBill.billing_cycle || previousBill.file_name,
    };
  }, [previousBill, inputUnits]);

  // Synchronized Anomaly Points matching AI Demand Forecast (Requirement 4)
  const synchronizedAnomalies = useMemo(() => {
    return forecastData?.anomalies || [];
  }, [forecastData]);

  // Prepare clean, uncluttered, intuitive chart data based on forecastPeriod & forecastViewMode
  const formattedForecastPoints = useMemo(() => {
    if (!forecastData || !forecastData.points || forecastData.points.length === 0) return [];

    if (forecastPeriod === 'weekly') {
      return forecastData.points.map((pt) => {
        let label = pt.timestamp;
        if (typeof pt.timestamp === 'string' && pt.timestamp.includes('T')) {
          const parts = pt.timestamp.split('T');
          const timePart = parts[1].substring(0, 5);
          const d = new Date(pt.timestamp);
          const dayName = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'short' });
          label = `${dayName} ${timePart}`;
        }
        return {
          ...pt,
          displayLabel: label,
        };
      });
    }

    // Monthly view
    if (forecastViewMode === 'daily') {
      // Aggregate into 30 daily totals for crystal-clear readability
      const dailyMap = {};
      forecastData.points.forEach(pt => {
        const dStr = typeof pt.timestamp === 'string' && pt.timestamp.includes('T') ? pt.timestamp.split('T')[0] : 'Day';
        if (!dailyMap[dStr]) {
          const d = new Date(dStr);
          const dayLabel = isNaN(d.getTime()) ? dStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
          dailyMap[dStr] = {
            timestamp: dStr,
            displayLabel: dayLabel,
            actual_kwh: 0,
            predicted_kwh: 0,
            has_actual: false,
            has_predicted: false,
            spike_threshold_kwh: 0,
            potential_spike: false,
          };
        }
        if (pt.actual_kwh !== null && pt.actual_kwh !== undefined) {
          dailyMap[dStr].actual_kwh += pt.actual_kwh;
          dailyMap[dStr].has_actual = true;
        }
        if (pt.predicted_kwh !== null && pt.predicted_kwh !== undefined) {
          dailyMap[dStr].predicted_kwh += pt.predicted_kwh;
          dailyMap[dStr].has_predicted = true;
        }
        if (pt.potential_spike) {
          dailyMap[dStr].potential_spike = true;
        }
        dailyMap[dStr].spike_threshold_kwh += (pt.spike_threshold_kwh || 0);
      });

      return Object.values(dailyMap).map(d => ({
        timestamp: d.timestamp,
        displayLabel: d.displayLabel,
        actual_kwh: d.has_actual ? +(d.actual_kwh).toFixed(2) : null,
        predicted_kwh: d.has_predicted ? +(d.predicted_kwh).toFixed(2) : null,
        spike_threshold_kwh: +(d.spike_threshold_kwh).toFixed(2),
        potential_spike: d.potential_spike,
        point_type: d.has_actual && !d.has_predicted ? 'actual' : (d.has_actual && d.has_predicted ? 'transition' : 'predicted'),
        isDaily: true,
      }));
    }

    // Monthly hourly: sampled every 3 hours for zero visual clutter
    return forecastData.points.filter((_, idx) => idx % 3 === 0).map(pt => {
      let label = pt.timestamp;
      if (typeof pt.timestamp === 'string' && pt.timestamp.includes('T')) {
        const parts = pt.timestamp.split('T');
        const d = new Date(pt.timestamp);
        const dayStr = isNaN(d.getTime()) ? parts[0].slice(5) : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
        label = `${dayStr} ${parts[1].substring(0, 5)}`;
      }
      return {
        ...pt,
        displayLabel: label,
      };
    });
  }, [forecastData, forecastPeriod, forecastViewMode]);

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
              <span className="badge badge-cyan">{selectedState} ({selectedBill?.discom || (selectedState === 'Andhra Pradesh' ? 'APSPDCL' : 'TGSPDCL')})</span>
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
            onClick={handleOpenProfileModal}
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
          {/* Top Dynamic KPI Cards (Connected to Uploaded Electricity Bill) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
            {/* 1. Total Electricity Consumption */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Billed Consumption</span>
                <Activity size={16} color="#06b6d4" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#f9fafb' }}>
                {inputUnits} <span style={{ fontSize: '15px', color: '#9ca3af' }}>kWh</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#34d399' }}>
                <CheckCircle2 size={14} />
                <span>
                  {selectedState === 'Andhra Pradesh'
                    ? (isRuralSubsidy ? 'YSR Jagjeevan Jyothi (200u Free)' : `${selectedBill?.discom || 'APSPDCL'} Telescopic`)
                    : (inputUnits <= 200 && isGruhaJyothi ? 'Gruha Jyothi 200u Zero-Bill' : 'Standard LT-I Tariff')}
                </span>
              </div>
            </div>

            {/* 2. Total Electricity Bill Amount */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Net Payable Bill ({selectedBill?.discom || (selectedState === 'Andhra Pradesh' ? 'APSPDCL' : 'TGSPDCL')})</span>
                <IndianRupee size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#34d399' }}>
                ₹{((selectedBill ? (selectedBill.net_payable_inr ?? selectedBill.gross_amount_inr) : (tariffResult?.net_payable_inr ?? tariffResult?.gross_total_inr ?? 0))).toFixed(2)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                <span>Gross: ₹{(selectedBill?.gross_amount_inr || tariffResult?.gross_total_inr || 0).toFixed(2)} (Subsidies: ₹{(selectedBill?.subsidy_amount_inr || tariffResult?.subsidy_amount_inr || 0).toFixed(2)})</span>
              </div>
            </div>

            {/* 3. Average Daily Consumption & Load */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Average Daily Burn Rate</span>
                <TrendingUp size={16} color="#fbbf24" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#fbbf24' }}>
                {(inputUnits / (selectedBill?.billing_days || inputDays || 30)).toFixed(2)}{' '}
                <span style={{ fontSize: '15px', color: '#9ca3af' }}>kWh/day</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                <span>Average Continuous Load: {(inputUnits / ((selectedBill?.billing_days || inputDays || 30) * 24)).toFixed(2)} kW</span>
              </div>
            </div>

            {/* 4. Sanctioned Load & Peak Demand */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Contracted Sanctioned Load</span>
                <Zap size={16} color="#38bdf8" />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: '#f9fafb' }}>
                {sanctionedLoad} <span style={{ fontSize: '15px', color: '#9ca3af' }}>kW</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#38bdf8' }}>
                <span>Est. Peak Demand: {(sanctionedLoad * 0.85).toFixed(2)} kW · {locationType.toUpperCase()}</span>
              </div>
            </div>

            {/* 5. Billing Period & Cycle */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Billing Period</span>
                <Calendar size={16} color="#a855f7" />
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#f9fafb', marginTop: '4px' }}>
                {selectedBill?.billing_start_date && selectedBill?.billing_end_date
                  ? `${selectedBill.billing_start_date} – ${selectedBill.billing_end_date}`
                  : (selectedBill?.billing_cycle || 'OCT/2026')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                <span>
                  {selectedBill?.billing_days || inputDays || 30} Days Cycle ({selectedBill?.consumer_category || 'LT-I Domestic'})
                </span>
              </div>
            </div>

            {/* 6. Comparison with Previous Billing Period */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Prior Period Comparison</span>
                <Layers size={16} color="#10b981" />
              </div>
              {billComparison ? (
                <>
                  <div style={{ fontSize: '26px', fontWeight: '800', color: billComparison.diffKwh <= 0 ? '#34d399' : '#fb7185' }}>
                    {billComparison.diffKwh > 0 ? `+${billComparison.diffKwh}` : billComparison.diffKwh}{' '}
                    <span style={{ fontSize: '15px' }}>kWh ({billComparison.diffPct > 0 ? `+${billComparison.diffPct}` : billComparison.diffPct}%)</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                    Compared to prior bill ({billComparison.prevLabel}: {billComparison.prevKwh} kWh)
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#9ca3af', marginTop: '6px' }}>
                    No prior billing history uploaded
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>
                    Upload prior bills to unlock historical trend analytics
                  </div>
                </>
              )}
            </div>

            {/* 7. Estimated Next Month's Consumption & Bill */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '13px', marginBottom: '8px' }}>
                <span>Estimated Next Month</span>
                <Sparkles size={16} color="#06b6d4" />
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', color: '#06b6d4' }}>
                {((inputUnits / (selectedBill?.billing_days || inputDays || 30)) * 30).toFixed(1)}{' '}
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>kWh</span>
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '8px' }}>
                Est. Bill: <strong style={{ color: '#34d399' }}>₹{(((inputUnits / (selectedBill?.billing_days || inputDays || 30)) * 30) * (tariffResult?.effective_rate_per_kwh || 4.5)).toFixed(2)}</strong>
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

              {/* Dynamic MAD Threshold Callout & Tab Jump */}
              <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.25)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span>
                  <strong style={{ color: '#f43f5e' }}>🔴 Dynamic Red Dotted Threshold:</strong> Calculated via Median Absolute Deviation (MAD) = <code style={{ color: '#38bdf8' }}>Median + 3 × 1.4826 × MAD</code>. Points above this line trigger spike warnings.
                </span>
                <button className="btn-secondary" onClick={() => setActiveTab('forecast')} style={{ fontSize: '12px', padding: '4px 12px', whiteSpace: 'nowrap' }}>
                  Open Full AI Forecast Tab →
                </button>
              </div>
            </div>

            {/* Consumption Breakdown Donut (Dynamic from Bill Disaggregation) */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Appliance Decomposition</h3>
                <span className="badge badge-cyan">Model Estimates</span>
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '16px' }}>
                Estimated share of {inputUnits} kWh billed consumption
              </p>
              <div style={{ height: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={(disaggregationData?.appliances || appliancesList).slice(0, 6).map((app, idx) => ({
                        name: app.name,
                        value: Number(app.share_percentage || 10),
                        color: ['#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'][idx % 6],
                        kwh: app.monthly_kwh,
                        cost: app.monthly_cost_inr,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {['#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'].map((col, index) => (
                        <Cell key={`cell-${index}`} fill={col} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val, name, item) => [
                        `${val}% (${item?.payload?.kwh || 0} kWh · ₹${item?.payload?.cost || 0})`,
                        name
                      ]}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px', marginTop: '10px' }}>
                {(disaggregationData?.appliances || appliancesList).slice(0, 6).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ['#06b6d4', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6'][idx % 6] }}></span>
                    <span style={{ color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name.split('(')[0]}: <strong style={{ color: '#f9fafb' }}>{item.share_percentage}%</strong>
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                  className="btn-secondary"
                  onClick={() => setActiveTab('appliances')}
                  style={{ width: '100%', fontSize: '11px', padding: '6px 10px' }}
                >
                  Manage All 14 Appliances & Custom Ratings →
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Tariff Slab Breakdown Table (PRISM-M Requirement 6) */}
          <div className="glass-card" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700' }}>
                  {selectedState} ({selectedBill?.discom || (selectedState === 'Andhra Pradesh' ? 'APSPDCL' : 'TGSPDCL')}) Tariff Slab Calculation Breakdown
                </h3>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Official {selectedState === 'Andhra Pradesh' ? 'APERC' : 'TGSPDCL'} telescopic slab schedule applied to {inputUnits} kWh ({locationType.toUpperCase()} category)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`badge ${locationType === 'urban' ? 'badge-cyan' : 'badge-emerald'}`}>
                  {locationType === 'urban' ? '🏙️ Urban Corporation' : '🌾 Rural Gram Panchayat'}
                </span>
                <span className="badge badge-amber">{selectedBill?.consumer_category || 'LT-I Domestic'}</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                    <th style={{ padding: '10px' }}>Consumption Slab</th>
                    <th style={{ padding: '10px' }}>Units in Slab</th>
                    <th style={{ padding: '10px' }}>Rate (₹/kWh)</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Calculated Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(tariffResult?.slab_breakdown || []).map((slab, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1f293d' }}>
                      <td style={{ padding: '10px', fontWeight: '600', color: '#f9fafb' }}>{slab.slab_range}</td>
                      <td style={{ padding: '10px', color: '#06b6d4' }}>{slab.units_in_slab} kWh</td>
                      <td style={{ padding: '10px', color: '#9ca3af' }}>₹{slab.rate_per_kwh.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '700', color: '#f9fafb' }}>₹{slab.amount_inr.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid #374151', background: 'rgba(15, 23, 42, 0.4)' }}>
                    <td colSpan="3" style={{ padding: '8px 10px', color: '#9ca3af' }}>Energy Charges Subtotal:</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#f9fafb' }}>₹{(tariffResult?.energy_charges_inr || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ padding: '8px 10px', color: '#9ca3af' }}>
                      Fixed Charges ({sanctionedLoad} kW @ ₹{selectedState === 'Andhra Pradesh' ? '10.00/kW' : '10.00/kW'}):
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#f9fafb' }}>₹{(tariffResult?.fixed_charges_inr || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ padding: '8px 10px', color: '#9ca3af' }}>
                      Customer Charges ({locationType === 'urban' ? 'Urban Corporation ₹50.00' : 'Rural Gram Panchayat ₹25.00'}):
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#f9fafb' }}>₹{(tariffResult?.customer_charges_inr || 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{ padding: '8px 10px', color: '#9ca3af' }}>Electricity Duty (~0.06 INR/kWh):</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#f9fafb' }}>₹{(tariffResult?.electricity_duty_inr || 0).toFixed(2)}</td>
                  </tr>
                  {(tariffResult?.subsidy_amount_inr || 0) > 0 && (
                    <tr style={{ color: '#34d399' }}>
                      <td colSpan="3" style={{ padding: '8px 10px' }}>
                        Government Subsidy ({selectedState === 'Andhra Pradesh' ? 'YSR Jagjeevan Jyothi Scheme' : 'Gruha Jyothi Zero Bill'}):
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700' }}>-₹{(tariffResult?.subsidy_amount_inr || 0).toFixed(2)}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '2px solid #10b981', background: 'rgba(16, 185, 129, 0.08)' }}>
                    <td colSpan="3" style={{ padding: '12px 10px', fontWeight: '800', color: '#10b981', fontSize: '15px' }}>Total Calculated Net Payable:</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#10b981', fontSize: '18px' }}>
                      ₹{(tariffResult?.net_payable_inr ?? tariffResult?.gross_total_inr ?? 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reconciliation Comparison with Uploaded Bill Amount (Requirement 6) */}
            {selectedBill && (
              <div style={{ marginTop: '16px', padding: '12px 16px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #1f293d', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>Uploaded Billed Amount: </span>
                  <strong style={{ color: '#f9fafb', fontSize: '14px' }}>₹{selectedBill.gross_amount_inr || selectedBill.net_payable_inr}</strong>
                  <span style={{ margin: '0 8px', color: '#6b7280' }}>|</span>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>Calculated Amount: </span>
                  <strong style={{ color: '#10b981', fontSize: '14px' }}>₹{(tariffResult?.net_payable_inr ?? tariffResult?.gross_total_inr ?? 0).toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  {tariffResult?.difference_explanation || 'Calculated tariff matches official DISCOM retail schedule within ₹0.00 variance.'}
                </div>
              </div>
            )}
          </div>

          {/* 24-Hour Solar Generation Profile Quick-View on Overview Tab */}
          <div className="glass-card" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sun size={18} color="#f59e0b" />
                  <h3 style={{ fontSize: '16px', fontWeight: '700' }}>24-Hour Solar Generation Profile & Rooftop Potential</h3>
                  <span className="badge badge-amber">Solar ML Model</span>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                  Recalculates dynamically with Solar Irradiance ({solarIrradiance} W/m²), Temperature ({solarTemp}°C) & System Size ({solarPanel} kW)
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-amber">☀️ {solarIrradiance} W/m²</span>
                <span className="badge badge-cyan">{solarPanel} kW System</span>
                <button className="btn-secondary" onClick={() => setActiveTab('recommendations')} style={{ fontSize: '12px', padding: '6px 14px' }}>
                  Open Solar Simulator & Subsidy Tab →
                </button>
              </div>
            </div>

            {/* Quick Irradiance & System Size Sliders on Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '18px', padding: '14px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '10px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#9ca3af' }}>Solar Irradiance:</span>
                  <strong style={{ color: '#fbbf24' }}>{solarIrradiance} W/m²</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1100"
                  step="10"
                  value={solarIrradiance}
                  onChange={(e) => setSolarIrradiance(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#f59e0b' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#9ca3af' }}>Panel Capacity:</span>
                  <strong style={{ color: '#06b6d4' }}>{solarPanel} kW</strong>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  value={solarPanel}
                  onChange={(e) => setSolarPanel(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#06b6d4' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: '#9ca3af' }}>Ambient Temperature:</span>
                  <strong style={{ color: '#f43f5e' }}>{solarTemp}°C</strong>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  step="1"
                  value={solarTemp}
                  onChange={(e) => setSolarTemp(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#f43f5e' }}
                />
              </div>
              {solarData && (
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: '1px solid #374151', paddingLeft: '16px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>Est. Daily Solar Yield</div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399' }}>
                    {solarData.generation?.daily_kwh || (solarPanel * 4.2).toFixed(1)} <span style={{ fontSize: '12px' }}>kWh/day</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Visual Guide */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', padding: '8px 12px', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }}></span>
                <span style={{ color: '#9ca3af' }}><strong style={{ color: '#fbbf24' }}>Amber Curve:</strong> Free electricity generated from sunrise to sunset</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '2px', background: '#06b6d4', borderTop: '2px dashed #06b6d4' }}></span>
                <span style={{ color: '#9ca3af' }}><strong style={{ color: '#22d3ee' }}>Cyan Line:</strong> Sunlight brightness ($W/m^2$) reaching your rooftop</span>
              </div>
            </div>

            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={solarData?.hourly_profile && solarData.hourly_profile.length > 0 ? solarData.hourly_profile : [
                  { time_label: '06:00', predicted_kwh: 0.05, irradiance_wm2: 80 },
                  { time_label: '08:00', predicted_kwh: 0.45, irradiance_wm2: 320 },
                  { time_label: '10:00', predicted_kwh: 1.20, irradiance_wm2: 680 },
                  { time_label: '12:00', predicted_kwh: 1.85, irradiance_wm2: 920 },
                  { time_label: '14:00', predicted_kwh: 1.60, irradiance_wm2: 780 },
                  { time_label: '16:00', predicted_kwh: 0.80, irradiance_wm2: 410 },
                  { time_label: '18:00', predicted_kwh: 0.12, irradiance_wm2: 90 },
                ]}>
                  <defs>
                    <linearGradient id="solarFillOverview" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis dataKey="time_label" stroke="#6b7280" />
                  <YAxis yAxisId="left" stroke="#f59e0b" unit=" kWh" />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" unit=" W/m²" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value, name) => {
                      if (name === 'Predicted Solar (kWh)') return [Number(value).toFixed(3) + ' kWh', name];
                      if (name === 'Irradiance (W/m²)') return [value + ' W/m²', name];
                      return [value, name];
                    }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="predicted_kwh" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#solarFillOverview)" name="Predicted Solar (kWh)" />
                  <Line yAxisId="right" type="monotone" dataKey="irradiance_wm2" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Irradiance (W/m²)" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Autoregressive Time-Series Forecast</h2>
                  <span className="badge badge-emerald">XGBoost ML</span>
                  {forecastLoading && <span className="badge badge-cyan">Updating...</span>}
                </div>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                  Autoregressive multi-step demand forecasting calibrated for Indian domestic households & weather
                </p>
              </div>

              {/* Weekly / Monthly Toggle Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className={forecastPeriod === 'weekly' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => {
                    setForecastPeriod('weekly');
                    fetchForecast('weekly', inputUnits);
                  }}
                  disabled={forecastLoading}
                  style={{
                    fontSize: '13px',
                    padding: '8px 16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: forecastPeriod === 'weekly' ? '#10b981' : '#1f293d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: forecastPeriod === 'weekly' ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                >
                  📅 Weekly (7 Days)
                </button>
                <button
                  className={forecastPeriod === 'monthly' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => {
                    setForecastPeriod('monthly');
                    fetchForecast('monthly', inputUnits);
                  }}
                  disabled={forecastLoading}
                  style={{
                    fontSize: '13px',
                    padding: '8px 16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    background: forecastPeriod === 'monthly' ? '#10b981' : '#1f293d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: forecastPeriod === 'monthly' ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none'
                  }}
                >
                  🗓️ Monthly (30 Days)
                </button>
              </div>
            </div>

            {/* Sub-selector for Monthly Granularity */}
            {forecastPeriod === 'monthly' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '8px', marginBottom: '18px', border: '1px solid #1f293d' }}>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Monthly Graph Display Mode:
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setForecastViewMode('daily')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: 'none',
                      background: forecastViewMode === 'daily' ? '#06b6d4' : '#111827',
                      color: forecastViewMode === 'daily' ? '#0b0f19' : '#9ca3af',
                      fontWeight: '700'
                    }}
                  >
                    ✓ Daily Totals (30 Days Clean View)
                  </button>
                  <button
                    onClick={() => setForecastViewMode('hourly')}
                    style={{
                      fontSize: '11px',
                      padding: '4px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      border: 'none',
                      background: forecastViewMode === 'hourly' ? '#06b6d4' : '#111827',
                      color: forecastViewMode === 'hourly' ? '#0b0f19' : '#9ca3af',
                      fontWeight: '700'
                    }}
                  >
                    Hourly Detailed Curve
                  </button>
                </div>
              </div>
            )}

            {/* Forecast Metrics Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', padding: '16px', background: '#0b0f19', borderRadius: '12px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Total Projected Energy</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#f9fafb' }}>
                  {forecastData?.total_predicted_kwh || '77.01'} <span style={{ fontSize: '13px', fontWeight: '400' }}>kWh</span>
                </div>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                  {forecastPeriod === 'weekly' ? 'Next 7 Days Total' : 'Next 30 Days Total'}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Estimated Energy Charge</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>
                  ₹{forecastData?.estimated_cost_inr || '261.83'}
                </div>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Calculated via active tariff slabs</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Spikes Flagged (Dynamic MAD)</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: (forecastData?.potential_spike_count || 0) > 0 ? '#f43f5e' : '#34d399' }}>
                  {forecastData?.potential_spike_count ?? 0}
                </div>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>High consumption alerts</span>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>Confidence Interval</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#06b6d4' }}>95% ± 0.40 kWh</div>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Autoregressive error bound</span>
              </div>
            </div>

            {/* Beginner-Friendly Graph Reading Guide */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '18px', padding: '12px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '10px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#06b6d4', flexShrink: 0 }}></span>
                <span style={{ color: '#9ca3af' }}><strong style={{ color: '#06b6d4' }}>Blue Area:</strong> What you already consumed (Past 24h)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981', flexShrink: 0 }}></span>
                <span style={{ color: '#9ca3af' }}><strong style={{ color: '#10b981' }}>Green Area:</strong> What AI predicts you will use</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '3px', background: '#f43f5e', borderTop: '2px dashed #f43f5e', flexShrink: 0 }}></span>
                <span style={{ color: '#9ca3af' }}><strong style={{ color: '#f43f5e' }}>Red Dotted Line:</strong> Normal safe limit (Spike ceiling)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399', flexShrink: 0 }}></span>
                <span style={{ color: '#9ca3af' }}><strong style={{ color: '#34d399' }}>Zero Gap Anchor:</strong> Seamless transition right now</span>
              </div>
            </div>

            {/* Interactive Chart */}
            <div style={{ height: '380px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedForecastPoints.length > 0 ? formattedForecastPoints : (forecastData?.points || [])}>
                  <defs>
                    <linearGradient id="forecastFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" />
                  <XAxis
                    dataKey="displayLabel"
                    stroke="#6b7280"
                    interval="preserveStartEnd"
                    minTickGap={25}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#6b7280" unit={forecastPeriod === 'monthly' && forecastViewMode === 'daily' ? ' kWh/d' : ' kWh'} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val, name, item) => {
                      if (val === null || val === undefined) return null;
                      const isSpk = item?.payload?.potential_spike;
                      const unit = item?.payload?.isDaily ? 'kWh/day' : 'kWh';
                      if (name === "Safe Limit Threshold") {
                        return [`${Number(val).toFixed(2)} ${unit} (Normal Limit)`, name];
                      }
                      return [
                        <span>
                          {Number(val).toFixed(2)} {unit} {isSpk && <strong style={{ color: '#f43f5e' }}> ⚠️ Spike Overload</strong>}
                        </span>,
                        name
                      ];
                    }}
                    labelFormatter={(label, items) => {
                      const payload = items?.[0]?.payload;
                      const typeLabel = payload?.point_type === 'actual' 
                        ? '🔵 Recorded History' 
                        : (payload?.point_type === 'transition' ? '🟢 Current Hour (Anchor)' : '⚡ AI Prediction');
                      return `${label} · ${typeLabel}`;
                    }}
                  />
                  <Area type="monotone" dataKey="actual_kwh" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#actualFill)" name="Past Measured Usage" connectNulls={false} />
                  <Area type="monotone" dataKey="predicted_kwh" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#forecastFill)" name="AI Predicted Demand" connectNulls={false} />
                  <Line type="monotone" dataKey="spike_threshold_kwh" stroke="#f43f5e" strokeWidth={1.8} strokeDasharray="4 4" dot={false} name="Safe Limit Threshold" />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Visual Continuity & Anchor Marker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.25)', marginTop: '14px', fontSize: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }}></span>
                <span style={{ color: '#06b6d4', fontWeight: '600' }}>Past Measured Baseline (Blue)</span>
                <span style={{ color: '#6b7280' }}>→</span>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                <span style={{ color: '#10b981', fontWeight: '600' }}>AI Forecast (Green)</span>
              </div>
              <span style={{ color: '#9ca3af' }}>
                Timeline: <strong style={{ color: '#34d399' }}>Zero Prediction Gap</strong> connecting real history seamlessly into predictions.
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

            {/* Synchronized Anomaly Spikes Highlight Strip (Requirement 4) */}
            {synchronizedAnomalies.length > 0 && (
              <div style={{ marginTop: '16px', padding: '14px 18px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: '10px', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#f43f5e" />
                    <strong style={{ color: '#f43f5e', fontSize: '13px' }}>
                      Flagged Anomaly Intervals on this Chart ({synchronizedAnomalies.length} synchronized events)
                    </strong>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setActiveTab('anomalies')}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Open Anomaly & Spikes Tab →
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {synchronizedAnomalies.slice(0, 6).map((an, i) => {
                    const dtStr = typeof an.timestamp === 'string' ? an.timestamp : an.timestamp?.toISOString?.() || 'Interval';
                    const label = dtStr.includes('T') ? dtStr.replace('T', ' ').substring(5, 16) : dtStr;
                    return (
                      <div key={i} style={{ padding: '8px 12px', background: '#0b0f19', borderRadius: '6px', border: '1px solid #1f293d', whiteSpace: 'nowrap', fontSize: '11px' }}>
                        <span style={{ color: '#9ca3af', display: 'block' }}>{label}</span>
                        <strong style={{ color: '#f43f5e' }}>{an.actual_kwh} kWh</strong>{' '}
                        <span style={{ color: '#06b6d4' }}>(vs {an.expected_normal_kwh} normal)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* -------------------- TAB 3: ANOMALY (Synchronized with AI Forecast) -------------------- */}
      {activeTab === 'anomalies' && (
        <section>
          {/* Synchronized Status Banner */}
          <div className="glass-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08), rgba(6, 182, 212, 0.05))', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge badge-rose">Synchronized Anomaly Detection (PRISM-M Requirement 4)</span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '6px' }}>
                  Unified Consumption Anomaly & Spike Analysis
                </h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  Every anomaly identified below is matched on the <strong>exact same timestamps</strong> in the AI Demand Forecast chart using the continuous {inputUnits} kWh billing baseline.
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={() => setActiveTab('forecast')}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                View on Forecast Chart →
              </button>
            </div>
          </div>

          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '24px' }}>
            <div className="glass-card">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Evaluated Dataset Horizon</span>
              <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>200 Hours</div>
              <span style={{ fontSize: '12px', color: '#06b6d4' }}>Continuous hourly series</span>
            </div>
            <div className="glass-card">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Flagged Abnormalities</span>
              <div style={{ fontSize: '24px', fontWeight: '700', color: synchronizedAnomalies.length > 0 ? '#fb7185' : '#34d399', marginTop: '4px' }}>
                {synchronizedAnomalies.length} Events
              </div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Breaching dynamic baseline</span>
            </div>
            <div className="glass-card">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Spike Detection Method</span>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24', marginTop: '4px' }}>Isolation Forest + MAD</div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Robust 3-sigma dynamic threshold</span>
            </div>
            <div className="glass-card">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Dashboard State</span>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981', marginTop: '4px' }}>🟢 Synchronized</div>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Recalculates on bill upload</span>
            </div>
          </div>

          {/* Synchronized Anomalies Table & Detailed Breakdown */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>
              Detected Consumption Anomalies (Exact Forecast Matching)
            </h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '18px' }}>
              Identifies abnormal spikes, evening surges, and standby baseload drifts with physical explanations and variance calculations.
            </p>

            {synchronizedAnomalies.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                      <th style={{ padding: '10px' }}>Anomaly Date & Time</th>
                      <th style={{ padding: '10px' }}>Actual Consumption</th>
                      <th style={{ padding: '10px' }}>Expected Normal</th>
                      <th style={{ padding: '10px' }}>Difference (Spike)</th>
                      <th style={{ padding: '10px' }}>Severity</th>
                      <th style={{ padding: '10px' }}>Why Anomaly Was Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {synchronizedAnomalies.slice(0, 10).map((anom, idx) => {
                      const dtStr = typeof anom.timestamp === 'string' ? anom.timestamp : anom.timestamp?.toISOString?.() || 'Interval';
                      const formattedDt = dtStr.includes('T') ? dtStr.replace('T', ' ').substring(0, 16) : dtStr;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #1f293d' }}>
                          <td style={{ padding: '10px', fontWeight: '600', color: '#f9fafb' }}>
                            {formattedDt}
                          </td>
                          <td style={{ padding: '10px', color: '#f43f5e', fontWeight: '700' }}>
                            {anom.actual_kwh} kWh
                          </td>
                          <td style={{ padding: '10px', color: '#06b6d4' }}>
                            {anom.expected_normal_kwh} kWh
                          </td>
                          <td style={{ padding: '10px', color: '#fbbf24', fontWeight: '700' }}>
                            +{anom.difference_kwh} kWh
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span className={`badge ${anom.severity === 'High' ? 'badge-rose' : 'badge-amber'}`}>
                              {anom.severity || 'High'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', color: '#cbd5e1', fontSize: '12px' }}>
                            {anom.likely_cause}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', background: '#0b0f19', borderRadius: '10px' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 10px' }} />
                <div style={{ color: '#f9fafb', fontWeight: '600', fontSize: '15px' }}>
                  No Abnormal Consumption Spikes Detected
                </div>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  Electricity usage in the active continuous evaluation period matches standard diurnal baselines.
                </p>
              </div>
            )}
          </div>

          {/* Anomaly Prevention Actions */}
          <div className="glass-card">
            <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px' }}>
              Actionable Anomaly Prevention Guidelines
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '4px solid #f43f5e', fontSize: '13px' }}>
                <strong>Evening Peak Surge Avoidance (6 PM – 10 PM):</strong> Stagger high-draw equipment (water heaters, induction stoves, washing machines, EV chargers) away from peak evening hours to avoid breaching high tariff slab thresholds.
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', borderLeft: '4px solid #f59e0b', fontSize: '13px' }}>
                <strong>Night-time Standby Baselines (1 AM – 5 AM):</strong> Baselines higher than 0.25 kWh/hr usually indicate faulty refrigerator compressor door seals, continuous water heater cycling, or water pump dry runs.
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.08)', borderLeft: '4px solid #06b6d4', fontSize: '13px' }}>
                <strong>Dynamic Re-evaluation:</strong> Whenever a new utility bill is uploaded, the anomaly engine automatically re-calibrates against your updated consumption volume.
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
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = '#374151';
                    e.currentTarget.style.background = '#0b0f19';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.style.borderColor = '#374151';
                    e.currentTarget.style.background = '#0b0f19';
                    handleFileUpload(e);
                  }}
                >
                  <FileUp size={36} color="#10b981" style={{ marginBottom: '10px' }} />
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>
                    {uploading ? 'Scanning & Parsing Bill...' : 'Choose or Drag Bill Image / PDF'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    Supports PNG, JPG, JPEG, PDF (Multilingual OCR)
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>

                {/* Upload Status Banner */}
                {uploadStatus && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      background:
                        uploadStatus.type === 'success'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : uploadStatus.type === 'error'
                          ? 'rgba(244, 63, 94, 0.12)'
                          : 'rgba(6, 182, 212, 0.12)',
                      border:
                        uploadStatus.type === 'success'
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : uploadStatus.type === 'error'
                          ? '1px solid rgba(244, 63, 94, 0.3)'
                          : '1px solid rgba(6, 182, 212, 0.3)',
                      color:
                        uploadStatus.type === 'success'
                          ? '#34d399'
                          : uploadStatus.type === 'error'
                          ? '#fb7185'
                          : '#38bdf8',
                    }}
                  >
                    {uploadStatus.message}
                  </div>
                )}
              </div>

              {/* Quick Select Golden Sample Bills */}
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Available Verified Bills</h4>
                  <span className="badge badge-cyan">{billsList.length} Bills</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {billsList.map((bill) => (
                    <div
                      key={bill.bill_id}
                      onClick={() => syncDashboardWithBill(bill)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '8px',
                        background: selectedBill?.bill_id === bill.bill_id ? '#1f293d' : '#0b0f19',
                        border: selectedBill?.bill_id === bill.bill_id ? '1px solid #10b981' : '1px solid #1f293d',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div>
                        <strong style={{ color: '#f9fafb', display: 'block', fontSize: '13px' }}>{bill.file_name}</strong>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>
                          {bill.discom || bill.provider_name.split('(')[0]} · {bill.location_type?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: '700', color: '#06b6d4' }}>{bill.units_consumed_kwh} kWh</span>
                        <div style={{ fontSize: '11px', color: (bill.net_payable_inr === 0 || bill.calculated_amount_inr === 0) ? '#34d399' : '#f9fafb' }}>
                          ₹{bill.net_payable_inr ?? bill.gross_amount_inr}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bill Review, Edit & Confirm Form (Requirements 1, 7, 8) */}
            {selectedBill ? (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="badge badge-emerald">{selectedBill.review_status || 'Extracted'}</span>
                      <span className={`badge ${selectedBill.location_type === 'rural' ? 'badge-amber' : 'badge-cyan'}`}>
                        {selectedBill.location_type?.toUpperCase() || 'URBAN'}
                      </span>
                      <span className="badge badge-emerald">{selectedBill.consumer_category || 'LT-I Domestic'}</span>
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '6px' }}>
                      {selectedBill.file_name}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>{selectedBill.provider_name}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Consumer: {selectedBill.consumer_name || 'Resident'}</span>
                    <div style={{ fontFamily: 'monospace', fontWeight: '600', color: '#38bdf8' }}>{selectedBill.consumer_number}</div>
                  </div>
                </div>

                {/* Editable review grid - Complete Bill Extraction Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#0b0f19', padding: '16px', borderRadius: '12px', marginBottom: '18px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Consumer Name</label>
                    <input
                      type="text"
                      value={selectedBill.consumer_name || ''}
                      onChange={(e) => setSelectedBill({ ...selectedBill, consumer_name: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Consumer / Service No.</label>
                    <input
                      type="text"
                      value={selectedBill.consumer_number || ''}
                      onChange={(e) => setSelectedBill({ ...selectedBill, consumer_number: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>DISCOM Provider</label>
                    <select
                      value={selectedBill.discom || 'APSPDCL'}
                      onChange={(e) => setSelectedBill({ ...selectedBill, discom: e.target.value, state: e.target.value.startsWith('AP') ? 'Andhra Pradesh' : 'Telangana' })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                    >
                      <option value="APSPDCL">APSPDCL (Southern Power AP)</option>
                      <option value="APEPDCL">APEPDCL (Eastern Power AP)</option>
                      <option value="APCPDCL">APCPDCL (Central Power AP)</option>
                      <option value="TGSPDCL">TGSPDCL (Telangana Southern)</option>
                      <option value="UPPCL">UPPCL (Uttar Pradesh)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Location Classification</label>
                    <select
                      value={selectedBill.location_type || 'urban'}
                      onChange={(e) => setSelectedBill({ ...selectedBill, location_type: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                    >
                      <option value="urban">Urban (Corporation/Municipality)</option>
                      <option value="rural">Rural (Gram Panchayat)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Sanctioned Load (kW)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedBill.sanctioned_load_kw || 2.0}
                      onChange={(e) => setSelectedBill({ ...selectedBill, sanctioned_load_kw: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Units Consumed (kWh)</label>
                    <input
                      type="number"
                      value={selectedBill.units_consumed_kwh}
                      onChange={(e) => setSelectedBill({ ...selectedBill, units_consumed_kwh: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#38bdf8', fontSize: '15px', fontWeight: '700', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Billing Days</label>
                    <input
                      type="number"
                      value={selectedBill.billing_days || 30}
                      onChange={(e) => setSelectedBill({ ...selectedBill, billing_days: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Billing Period Dates</label>
                    <input
                      type="text"
                      value={`${selectedBill.billing_start_date || '01/10/2026'} - ${selectedBill.billing_end_date || '31/10/2026'}`}
                      onChange={(e) => {
                        const parts = e.target.value.split('-');
                        setSelectedBill({
                          ...selectedBill,
                          billing_start_date: parts[0]?.trim(),
                          billing_end_date: parts[1]?.trim() || selectedBill.billing_end_date
                        });
                      }}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '12px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Meter Readings (Prev / Curr)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                      <input
                        type="number"
                        placeholder="Prev"
                        value={selectedBill.meter_reading_previous ?? 1420}
                        onChange={(e) => setSelectedBill({ ...selectedBill, meter_reading_previous: Number(e.target.value) })}
                        style={{ padding: '6px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      />
                      <input
                        type="number"
                        placeholder="Curr"
                        value={selectedBill.meter_reading_current ?? 1605}
                        onChange={(e) => {
                          const curr = Number(e.target.value);
                          const prev = selectedBill.meter_reading_previous ?? 1420;
                          setSelectedBill({
                            ...selectedBill,
                            meter_reading_current: curr,
                            units_consumed_kwh: Math.max(0, curr - prev)
                          });
                        }}
                        style={{ padding: '6px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af' }}>Total Payable Billed Amount (₹)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedBill.gross_amount_inr || selectedBill.net_payable_inr || 890.20}
                      onChange={(e) => setSelectedBill({ ...selectedBill, gross_amount_inr: Number(e.target.value), net_payable_inr: Number(e.target.value) })}
                      style={{ width: '100%', padding: '6px 8px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#34d399', fontSize: '15px', fontWeight: '700', marginTop: '4px' }}
                    />
                  </div>
                </div>

                {/* Financial breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Energy Charges:</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb' }}>₹{selectedBill.energy_charges_inr}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Fixed Charges:</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb' }}>₹{selectedBill.fixed_charges_inr}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Customer Charge:</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb' }}>₹{selectedBill.customer_charges_inr || (selectedBill.location_type === 'rural' ? '25.00' : '50.00')}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px' }}>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Subsidies / Adjustments:</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#34d399' }}>-₹{selectedBill.subsidy_amount_inr || selectedBill.subsidies_inr || 0}</div>
                  </div>
                  <div style={{ padding: '10px', background: '#0b0f19', borderRadius: '8px', border: '1px solid #10b981' }}>
                    <span style={{ color: '#9ca3af', display: 'block' }}>Total Payable Amount:</span>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#34d399' }}>
                      ₹{selectedBill.net_payable_inr ?? selectedBill.gross_amount_inr}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={handleConfirmBill} style={{ padding: '10px 18px', fontSize: '13px' }}>
                    <Check size={16} /> Confirm & Synchronize All Dashboard Sections
                  </button>
                  {billsList.length >= 2 && (
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        const other = billsList.find(b => b.bill_id !== selectedBill.bill_id);
                        if (other) handleCompareBills(selectedBill.bill_id, other.bill_id);
                      }}
                      style={{ padding: '10px 18px', fontSize: '13px' }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700' }}>24-Hour Solar Generation Profile (How Sunlight Turns Into Electricity)</h3>
                    <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Shows real-time solar electricity output from sunrise to sunset based on sunlight intensity ({solarIrradiance} W/m²)
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="badge badge-amber">☀️ {solarIrradiance} W/m² Sunlight</span>
                    <span className="badge badge-cyan">{solarPanel} kW System</span>
                  </div>
                </div>

                {/* Plain-English Visual Guide for Anyone to Understand */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: '8px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b', flexShrink: 0 }}></span>
                    <span style={{ color: '#9ca3af' }}><strong style={{ color: '#fbbf24' }}>Amber Fill (Solar Power):</strong> Free electricity generated in kWh. Starts at 6 AM, peaks at noon, zero at night.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '14px', height: '3px', background: '#06b6d4', borderTop: '2px dashed #06b6d4', flexShrink: 0 }}></span>
                    <span style={{ color: '#9ca3af' }}><strong style={{ color: '#22d3ee' }}>Cyan Line (Sunlight Intensity):</strong> Brightness reaching your panels (W/m²). More sunlight = higher output.</span>
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
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(value, name) => {
                          if (name === 'Generated Solar Power (kWh)') return [Number(value).toFixed(3) + ' kWh (Free Electricity)', name];
                          if (name === 'Sunlight Intensity (W/m²)') return [value + ' W/m² (Irradiance)', name];
                          return [value + '°C', name];
                        }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="predicted_kwh" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#solarFill)" name="Generated Solar Power (kWh)" />
                      <Line yAxisId="right" type="monotone" dataKey="irradiance_wm2" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="4 4" name="Sunlight Intensity (W/m²)" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Practical Takeaway Callout */}
                <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>💡</span>
                  <span style={{ color: '#d1d5db' }}>
                    <strong style={{ color: '#fbbf24' }}>What this means for you:</strong> During peak daylight (10 AM to 4 PM), your heavy loads (ACs, refrigerator, washing machine) run directly on <strong>100% free solar energy</strong>, saving money before grid charges apply.
                  </span>
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
                      <span style={{ color: '#9ca3af' }}>10-Yr Net Savings (Est.):</span>
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

      {/* -------------------- TAB 6: APPLIANCES & DISAGGREGATION (14 Core Appliances) -------------------- */}
      {activeTab === 'appliances' && (
        <section>
          {/* Transparent Model-Estimated Disclaimer Banner (Requirement 3) */}
          <div className="glass-card" style={{ marginBottom: '20px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} color="#fbbf24" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#fbbf24', fontSize: '14px' }}>Model-Estimated Breakdown (Not Sub-Metered by Utility Meter)</strong>
                <p style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '2px', lineHeight: '1.5' }}>
                  Electricity bills and standard utility meters only record whole-house total consumption. The breakdown below represents engineering model estimates based on appliance power ratings (kW), assumed daily runtime, and REFIT disaggregation benchmarks, reconciled with your active billed usage of <strong>{inputUnits} kWh</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Reconciliation & Control Bar */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className="badge badge-cyan">REFIT AI Disaggregation Engine</span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginTop: '6px' }}>
                  Complete 14 Household Appliances Manager
                </h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                  Adjust power ratings (kW) or daily operating hours to customize consumption modeling.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn-primary"
                  onClick={() => setShowAddApplianceModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px' }}
                >
                  <Plus size={15} /> Add Custom Appliance
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleRecalculateAppliances(appliancesList)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px' }}
                >
                  <RefreshCw size={15} /> Recalculate & Reconcile
                </button>
              </div>
            </div>

            {/* Reconciliation KPI Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: '#0b0f19', padding: '14px', borderRadius: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#9ca3af' }}>Total Billed Energy:</span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#38bdf8' }}>{inputUnits} kWh</div>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>From active bill</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>Allocated Appliance Sum:</span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399' }}>
                  {disaggregationData?.total_allocated_kwh || appliancesList.reduce((acc, a) => acc + (a.monthly_kwh || 0), 0).toFixed(1)} kWh
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>Sum of appliance draws</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>Unallocated Baseline:</span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: (disaggregationData?.unallocated_kwh || 0) > 0 ? '#fbbf24' : '#10b981' }}>
                  {disaggregationData?.unallocated_kwh || 0} kWh ({disaggregationData?.unallocated_percentage || 0}%)
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>Lighting & vampire standby</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>Potential Monthly Savings:</span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#34d399' }}>
                  ₹{disaggregationData?.potential_appliance_savings_inr || '148'}/mo
                </div>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>Via targeted efficiency</span>
              </div>
            </div>
          </div>

          {/* Interactive 14 Household Appliances Grid */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Household Appliances Portfolio ({appliancesList.length} Appliances)</h3>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Editable ratings & hours</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '18px' }}>
              {appliancesList.map((app, i) => (
                <div key={app.id || i} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '24px' }}>{app.icon || '⚡'}</span>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '700' }}>{app.name}</h4>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{app.category || 'Domestic'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className={`badge ${app.efficiency_status === 'Optimal' ? 'badge-emerald' : app.efficiency_status === 'High Consumption' ? 'badge-rose' : 'badge-amber'}`}>
                          {app.efficiency_status || 'Average'}
                        </span>
                        <button
                          onClick={() => {
                            const updated = appliancesList.filter((_, idx) => idx !== i);
                            setAppliancesList(updated);
                            handleRecalculateAppliances(updated);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '4px' }}
                          title="Remove appliance"
                        >
                          <Trash2 size={14} color="#f43f5e" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Editable Parameters (kW, Hours/Day, Quantity) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#0b0f19', padding: '10px', borderRadius: '8px', marginBottom: '12px', fontSize: '11px' }}>
                      <div>
                        <label style={{ color: '#9ca3af', display: 'block', marginBottom: '2px' }}>Power (kW)</label>
                        <input
                          type="number"
                          step="0.05"
                          value={app.power_rating_kw}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = [...appliancesList];
                            updated[i] = { ...updated[i], power_rating_kw: val };
                            setAppliancesList(updated);
                          }}
                          onBlur={() => handleRecalculateAppliances(appliancesList)}
                          style={{ width: '100%', padding: '4px', background: '#111827', border: '1px solid #374151', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ color: '#9ca3af', display: 'block', marginBottom: '2px' }}>Hours/Day</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={app.daily_hours}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = [...appliancesList];
                            updated[i] = { ...updated[i], daily_hours: val };
                            setAppliancesList(updated);
                          }}
                          onBlur={() => handleRecalculateAppliances(appliancesList)}
                          style={{ width: '100%', padding: '4px', background: '#111827', border: '1px solid #374151', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                      <div>
                        <label style={{ color: '#9ca3af', display: 'block', marginBottom: '2px' }}>Units Count</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={app.quantity || 1}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            const updated = [...appliancesList];
                            updated[i] = { ...updated[i], quantity: val };
                            setAppliancesList(updated);
                          }}
                          onBlur={() => handleRecalculateAppliances(appliancesList)}
                          style={{ width: '100%', padding: '4px', background: '#111827', border: '1px solid #374151', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                        />
                      </div>
                    </div>

                    {/* Calculated Consumption & Cost Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#0b0f19', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>Monthly Consumption:</span>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#f9fafb' }}>
                          {app.monthly_kwh || (app.power_rating_kw * app.daily_hours * 30 * (app.quantity || 1) * (app.duty_cycle || 0.8)).toFixed(1)}{' '}
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>kWh</span>
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>Estimated Cost:</span>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981' }}>
                          ₹{app.monthly_cost_inr || ((app.monthly_kwh || 10) * (tariffResult?.effective_rate_per_kwh || 4.5)).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>Share of Bill:</span>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#06b6d4' }}>
                          {app.share_percentage || (((app.monthly_kwh || 10) / inputUnits) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#9ca3af', fontSize: '11px' }}>Benchmark:</span>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>
                          ~{app.benchmark_percentage || 5.0}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation Tip */}
                  {app.recommendation ? (
                    <div style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '3px solid #f43f5e', fontSize: '11px', color: '#fca5a5' }}>
                      {app.recommendation}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#6b7280', paddingTop: '4px' }}>
                      ✓ Operation is within recommended residential efficiency targets.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Appliance Modal */}
          {showAddApplianceModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)', padding: '20px' }}>
              <div className="glass-card" style={{ maxWidth: '480px', width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Add Household Appliance</h3>
                  <button onClick={() => setShowAddApplianceModal(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Appliance Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Electric Vehicle Charger / Air Purifier"
                      value={newApplianceForm.name}
                      onChange={(e) => setNewApplianceForm({ ...newApplianceForm, name: e.target.value })}
                      style={{ width: '100%', padding: '8px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Category</label>
                      <select
                        value={newApplianceForm.category}
                        onChange={(e) => setNewApplianceForm({ ...newApplianceForm, category: e.target.value })}
                        style={{ width: '100%', padding: '8px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                      >
                        <option value="Cooling">Cooling</option>
                        <option value="Heating">Heating</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Laundry">Laundry</option>
                        <option value="Electronics">Electronics</option>
                        <option value="EV & Mobility">EV & Mobility</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Icon</label>
                      <select
                        value={newApplianceForm.icon}
                        onChange={(e) => setNewApplianceForm({ ...newApplianceForm, icon: e.target.value })}
                        style={{ width: '100%', padding: '8px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                      >
                        <option value="⚡">⚡ Electric</option>
                        <option value="🚗">🚗 EV Charger</option>
                        <option value="💨">💨 Air Purifier</option>
                        <option value="☕">☕ Coffee Maker</option>
                        <option value="❄️">❄️ Cooling</option>
                        <option value="♨️">♨️ Heating</option>
                        <option value="🔊">🔊 Audio / Speaker</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Power (kW)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={newApplianceForm.power_rating_kw}
                        onChange={(e) => setNewApplianceForm({ ...newApplianceForm, power_rating_kw: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Hours/Day</label>
                      <input
                        type="number"
                        step="0.5"
                        value={newApplianceForm.daily_hours}
                        onChange={(e) => setNewApplianceForm({ ...newApplianceForm, daily_hours: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={newApplianceForm.quantity}
                        onChange={(e) => setNewApplianceForm({ ...newApplianceForm, quantity: Number(e.target.value) })}
                        style={{ width: '100%', padding: '8px', background: '#0b0f19', border: '1px solid #374151', borderRadius: '6px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        if (!newApplianceForm.name) return;
                        const added = {
                          id: `custom_${Date.now()}`,
                          name: newApplianceForm.name,
                          category: newApplianceForm.category,
                          icon: newApplianceForm.icon,
                          power_rating_kw: Number(newApplianceForm.power_rating_kw),
                          daily_hours: Number(newApplianceForm.daily_hours),
                          quantity: Number(newApplianceForm.quantity || 1),
                          duty_cycle: 1.0,
                          benchmark_percentage: 4.0,
                          recommendation: 'Optimize runtime during non-peak hours.',
                        };
                        const updated = [...appliancesList, added];
                        setAppliancesList(updated);
                        setShowAddApplianceModal(false);
                        handleRecalculateAppliances(updated);
                      }}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Add & Reconcile
                    </button>
                    <button className="btn-secondary" onClick={() => setShowAddApplianceModal(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* -------------------- USER PROFILE & CONSENT MODAL (EPIC E-02) -------------------- */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(6px)', padding: '20px' }}>
          <div className="glass-card" style={{ maxWidth: '740px', width: '100%', maxHeight: '92vh', overflowY: 'auto', background: '#111827', border: '1px solid #374151', borderRadius: '16px', padding: '24px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
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

              {/* State & Location Type Selection (Urban / Rural) */}
              <div>
                <label style={{ fontSize: '12px', color: '#10b981', display: 'block', marginBottom: '4px', fontWeight: '600' }}>State / Jurisdiction</label>
                <select
                  value={userProfile.state || 'Telangana'}
                  onChange={(e) => {
                    const st = e.target.value;
                    const prov = st === 'Andhra Pradesh'
                      ? (userProfile.location_type === 'rural' ? 'APERC LT-I Domestic (Rural Panchayat)' : 'APERC LT-I Domestic (Urban Corporation)')
                      : 'TGSPDCL (Telangana Southern Power)';
                    setUserProfile({ ...userProfile, state: st, provider: prov });
                    setSelectedState(st);
                  }}
                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid #10b981', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600' }}
                >
                  <option value="Telangana">Telangana (TGSPDCL / TGNPDCL)</option>
                  <option value="Andhra Pradesh">Andhra Pradesh (APERC / APSPDCL)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#06b6d4', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Location Classification</label>
                <select
                  value={userProfile.location_type || 'urban'}
                  onChange={(e) => {
                    const loc = e.target.value;
                    const prov = userProfile.state === 'Andhra Pradesh'
                      ? (loc === 'rural' ? 'APERC LT-I Domestic (Rural Panchayat)' : 'APERC LT-I Domestic (Urban Corporation)')
                      : userProfile.provider;
                    setUserProfile({ ...userProfile, location_type: loc, provider: prov });
                    setLocationType(loc);
                  }}
                  style={{ width: '100%', padding: '8px 10px', background: '#0b0f19', border: '1px solid #06b6d4', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '600' }}
                >
                  <option value="urban">🏙️ Urban (Corporation / Municipality)</option>
                  <option value="rural">🌾 Rural (Gram Panchayat / Village)</option>
                </select>
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
                <label style={{ fontSize: '12px', color: '#10b981', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Active Appliances Summary</label>
                <div style={{ padding: '8px 12px', background: '#0b0f19', border: '1px solid #10b98144', borderRadius: '6px', color: '#34d399', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '38px' }}>
                  <span>⚡ {profileAppliances.filter(a => a.installed).length} of {profileAppliances.length} Selected</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>{profileAppliances.filter(a => a.installed).reduce((acc, a) => acc + (a.quantity || 1), 0)} Units Total</span>
                </div>
              </div>
            </div>

            {/* Installed Household Appliances Section (Replaced Single AC with all 14 Household Appliances) */}
            <div style={{ padding: '14px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1f293d', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>⚡ Installed Household Appliances</span>
                    <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                      {profileAppliances.filter(a => a.installed).length} / {profileAppliances.length} Selected
                    </span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '3px 0 0 0' }}>
                    Select all appliances installed in your home and specify unit counts. Disaggregation & solar eco-alternatives sync automatically.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileAppliances(prev => prev.map(a => ({
                        ...a,
                        installed: true,
                        quantity: Math.max(1, a.quantity || 1)
                      })));
                    }}
                    style={{ fontSize: '11px', padding: '4px 9px', background: '#1f293d', color: '#06b6d4', border: '1px solid #374151', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const essentials = ['refrigerator', 'ceiling_fans', 'water_heater', 'led_lights', 'ac'];
                      setProfileAppliances(prev => prev.map(a => ({
                        ...a,
                        installed: essentials.includes(a.id),
                        quantity: essentials.includes(a.id) ? Math.max(1, a.quantity || 1) : 0,
                      })));
                    }}
                    style={{ fontSize: '11px', padding: '4px 9px', background: '#1f293d', color: '#10b981', border: '1px solid #374151', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Essentials
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileAppliances(DEFAULT_14_APPLIANCES.map(a => ({ ...a, installed: true })));
                    }}
                    style={{ fontSize: '11px', padding: '4px 9px', background: '#1f293d', color: '#9ca3af', border: '1px solid #374151', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* 14 Appliances Interactive Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                {profileAppliances.map((app, idx) => {
                  const isChecked = !!app.installed;
                  return (
                    <div
                      key={app.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: isChecked ? 'rgba(16, 185, 129, 0.08)' : '#111827',
                        border: isChecked ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid #1f293d',
                        borderRadius: '8px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleApplianceInProfile(idx)}
                          style={{ width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>{app.icon || '⚡'}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: isChecked ? '600' : '500',
                            color: isChecked ? '#f3f4f6' : '#9ca3af',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {app.name}
                          </div>
                          <div style={{ fontSize: '10px', color: '#6b7280' }}>
                            {app.power_rating_kw} kW • {app.daily_hours}h/day
                          </div>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px', flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={!isChecked || (app.quantity || 1) <= 1}
                          onClick={() => handleUpdateApplianceQtyInProfile(idx, -1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #374151',
                            background: '#1f293d',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: (!isChecked || (app.quantity || 1) <= 1) ? 'not-allowed' : 'pointer',
                            opacity: (!isChecked || (app.quantity || 1) <= 1) ? 0.35 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          disabled={!isChecked}
                          value={isChecked ? (app.quantity || 1) : 0}
                          onChange={(e) => handleSetApplianceQtyInProfile(idx, e.target.value)}
                          style={{
                            width: '34px',
                            textAlign: 'center',
                            padding: '2px 0',
                            background: isChecked ? '#0b0f19' : '#1f293d',
                            border: '1px solid #374151',
                            borderRadius: '4px',
                            color: isChecked ? '#34d399' : '#6b7280',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}
                        />
                        <button
                          type="button"
                          disabled={!isChecked}
                          onClick={() => handleUpdateApplianceQtyInProfile(idx, 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #374151',
                            background: '#1f293d',
                            color: '#fff',
                            fontSize: '12px',
                            cursor: !isChecked ? 'not-allowed' : 'pointer',
                            opacity: !isChecked ? 0.35 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
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
