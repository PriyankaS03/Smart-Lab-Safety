import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Flame,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Building2,
  Check,
  Zap,
  Sparkles,
  Thermometer,
  Droplets,
  Wind,
  Cpu,
  Bot,
  Eye,
  RefreshCw,
  Sliders,
  X,
  FileText,
  ChevronRight,
  ShieldAlert,
  Play,
  RotateCcw,
  Info
} from 'lucide-react';
import { DashboardStats, AlertItem, RiskLevel, SensorReading, RiskFusionEvent, ZoneStatus, User } from '../../types';
import { api } from '../../services/api';

interface DashboardViewProps {
  stats: DashboardStats;
  onNavigate: (tab: any) => void;
  onResolveAlert: (id: string, notes: string) => Promise<void>;
  isDemoMode: boolean;
  onOpenGemiWithPrompt?: (prompt: string) => void;
  currentUser?: User | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  onNavigate,
  onResolveAlert,
  isDemoMode,
  onOpenGemiWithPrompt,
  currentUser
}) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [sensorData, setSensorData] = useState<SensorReading | null>(null);
  const [riskFusion, setRiskFusion] = useState<RiskFusionEvent | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<'live' | 'today' | 'week' | 'month'>('live');
  const [chartMode, setChartMode] = useState<'compliance' | 'violations' | 'fused'>('compliance');
  const [selectedZone, setSelectedZone] = useState<ZoneStatus | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'CRITICAL' | 'PPE' | 'ENV'>('ALL');
  const [gemiInput, setGemiInput] = useState('');
  const [simulatingSpike, setSimulatingSpike] = useState(false);
  const [spikeNotification, setSpikeNotification] = useState<string | null>(null);

  // Load live sensor data
  useEffect(() => {
    const fetchSensor = async () => {
      try {
        const [curr, fusion] = await Promise.all([
          api.getSensorCurrent().catch(() => null),
          api.getRiskFusion().catch(() => null)
        ]);
        if (curr) setSensorData(curr);
        if (fusion) setRiskFusion(fusion);
      } catch {
        // silent fallback
      }
    };
    fetchSensor();
    const interval = setInterval(fetchSensor, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleQuickResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await onResolveAlert(id, 'Resolved via Dashboard Interactive Triage');
    } finally {
      setResolvingId(null);
    }
  };

  const handleTriggerSimulation = async (type: 'GAS_LEAK' | 'FIRE' | 'VENTILATION_FAILURE') => {
    setSimulatingSpike(true);
    setSpikeNotification(`Simulating ${type.replace('_', ' ')} incident...`);
    try {
      await fetch('/api/sensors/simulation/trigger-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: type })
      });
      // Refresh sensor immediately
      const [curr, fusion] = await Promise.all([
        api.getSensorCurrent().catch(() => null),
        api.getRiskFusion().catch(() => null)
      ]);
      if (curr) setSensorData(curr);
      if (fusion) setRiskFusion(fusion);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => {
        setSimulatingSpike(false);
        setTimeout(() => setSpikeNotification(null), 3500);
      }, 1000);
    }
  };

  const handleResetSimulation = async () => {
    try {
      await fetch('/api/sensors/simulation/reset', { method: 'POST' });
      const [curr, fusion] = await Promise.all([
        api.getSensorCurrent().catch(() => null),
        api.getRiskFusion().catch(() => null)
      ]);
      if (curr) setSensorData(curr);
      if (fusion) setRiskFusion(fusion);
      setSpikeNotification('Environmental sensors reset to safe nominal baselines.');
      setTimeout(() => setSpikeNotification(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAskGemiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gemiInput.trim()) return;
    if (onOpenGemiWithPrompt) {
      onOpenGemiWithPrompt(gemiInput);
    } else {
      onNavigate('assistant');
    }
    setGemiInput('');
  };

  const handleChipClick = (prompt: string) => {
    if (onOpenGemiWithPrompt) {
      onOpenGemiWithPrompt(prompt);
    } else {
      onNavigate('assistant');
    }
  };

  // Color schemes
  const riskColor = {
    LOW: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    MEDIUM: 'text-amber-700 bg-amber-50 border-amber-200',
    HIGH: 'text-orange-700 bg-orange-50 border-orange-200',
    CRITICAL: 'text-rose-700 bg-rose-50 border-rose-200'
  }[stats.current_risk_level];

  // Filtered alerts
  const sampleAlerts: {
    id: string;
    alert_type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'PPE' | 'ENV' | 'GENERAL';
    message: string;
    time: string;
    zone: string;
    status: string;
  }[] = [
    {
      id: 'alt_001',
      alert_type: 'Missing Safety Goggles',
      severity: 'HIGH',
      category: 'PPE',
      message: 'Technician operating in Synthesis bay without ANSI Z87.1 chemical splash eye protection.',
      time: '12m ago',
      zone: 'Zone A - Organic Synthesis',
      status: 'ACTIVE'
    },
    {
      id: 'alt_002',
      alert_type: 'Missing Nitrile Gloves',
      severity: 'MEDIUM',
      category: 'PPE',
      message: 'Researcher handling solvent transfer without chemical-resistant handwear.',
      time: '28m ago',
      zone: 'Zone B - Analytical Testing',
      status: 'ACTIVE'
    },
    {
      id: 'alt_003',
      alert_type: 'Elevated Gas Concentration',
      severity: 'HIGH',
      category: 'ENV',
      message: 'VOC sensor detected 48.5 ppm (above 30 ppm warning threshold) near fume hood 2B.',
      time: '34m ago',
      zone: 'Zone A - Organic Synthesis',
      status: 'ACTIVE'
    }
  ];

  const filteredAlerts = sampleAlerts.filter(a => {
    if (alertFilter === 'CRITICAL') return a.severity === 'HIGH' || a.severity === 'CRITICAL';
    if (alertFilter === 'PPE') return a.category === 'PPE';
    if (alertFilter === 'ENV') return a.category === 'ENV';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Simulation Feedback Alert Pill */}
      {spikeNotification && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
            <span>{spikeNotification}</span>
          </div>
          <button
            onClick={() => setSpikeNotification(null)}
            className="text-amber-700 hover:text-amber-950 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Role-Specific Operational Context Banner */}
      {currentUser && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ${
          currentUser.role === 'admin'
            ? 'bg-indigo-50/70 border-indigo-200/90 text-indigo-950'
            : currentUser.role === 'assistant'
            ? 'bg-sky-50/70 border-sky-200/90 text-sky-950'
            : 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
              currentUser.role === 'admin' ? 'bg-indigo-600 shadow-sm shadow-indigo-500/25' : currentUser.role === 'assistant' ? 'bg-sky-600 shadow-sm shadow-sky-500/25' : 'bg-emerald-600 shadow-sm shadow-emerald-500/25'
            }`}>
              {currentUser.role === 'admin' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : currentUser.role === 'assistant' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {currentUser.role === 'admin'
                    ? 'Lab Supervisor Active Session'
                    : currentUser.role === 'assistant'
                    ? 'Lab Assistant Operational Shift'
                    : 'Student / Researcher Safety Portal'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white border border-current/20">
                  {currentUser.full_name}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-0.5">
                {currentUser.role === 'admin'
                  ? 'Full administrative governance active. You can monitor all feeds, manage incident dispatches, and provision user accounts.'
                  : currentUser.role === 'assistant'
                  ? 'Active shift for Chemistry Lab 3B. Real-time PPE violation triage, sensor thresholds, and alert resolutions enabled.'
                  : 'Personal laboratory compliance mode. Verify safety goggles, lab coat, and nitrile gloves prior to active bench experiments.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser.role === 'admin' && (
              <button
                onClick={() => onNavigate('users')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Manage Accounts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {currentUser.role === 'assistant' && (
              <button
                onClick={() => onNavigate('alerts')}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Review Active Alerts</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {currentUser.role === 'student' && (
              <button
                onClick={() => onNavigate('detection')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Run PPE Self-Check</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Interactive Command Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
                LIVE COMMAND SYSTEM ONLINE
              </span>
              <span className="text-slate-500 text-xs">|</span>
              <span className="text-xs text-indigo-200">Facility: Bio-Chemical Research Hub 3</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Smart Laboratory Safety Center
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Integrated real-time AI computer vision for PPE compliance, multi-sensor physics telemetry, and automated hazard mitigation.
            </p>
          </div>

          {/* Quick Action Interactive Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleChipClick('Summarize current laboratory hazard level')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white font-semibold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98"
            >
              <Bot className="w-4 h-4" />
              <span>Ask Gemi AI</span>
            </button>

            <button
              onClick={() => onNavigate('detection')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-indigo-300" />
              <span>Vision Scan</span>
            </button>

            <button
              onClick={() => handleTriggerSimulation('GAS_LEAK')}
              disabled={simulatingSpike}
              className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Gas Spike</span>
            </button>

            <button
              onClick={handleResetSimulation}
              title="Reset Simulated Telemetry"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Gemi Quick-Prompt Bar */}
        <div className="relative z-10 mt-5 pt-4 border-t border-indigo-900/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <form onSubmit={handleAskGemiSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Bot className="w-4 h-4 text-indigo-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={gemiInput}
                onChange={e => setGemiInput(e.target.value)}
                placeholder="Ask Gemi AI: e.g. 'What is the acid spill protocol?' or 'Check current risks'..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white/15 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Ask Gemi
            </button>
          </form>

          {/* Quick Prompt Pill Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-[10px] uppercase font-bold text-indigo-300/80 shrink-0">Try:</span>
            {[
              '🚨 Spill Procedure',
              '🥽 PPE Checklist',
              '🔥 Fire R.A.C.E.',
              '📊 Lab Hazards'
            ].map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(chip.replace(/^[^\w]+/, '').trim())}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-200 text-[11px] font-medium border border-white/10 transition-colors shrink-0 cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Ultra-Attractive Interactive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monitored Personnel */}
        <div
          onClick={() => onNavigate('detection')}
          className="group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">People Monitored</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.total_people_detected}</span>
            <span className="text-xs text-slate-500 font-medium">active personnel</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              4 Zones Online
            </span>
            <span className="text-indigo-600 font-medium group-hover:underline flex items-center gap-0.5">
              <span>View Vision</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Interactive PPE Compliance Gauge */}
        <div
          onClick={() => onNavigate('detection')}
          className="group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">PPE Compliance</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.ppe_compliance_percentage}%</span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Target: ≥90%
            </span>
          </div>

          {/* Breakdown Mini-Bars */}
          <div className="mt-3 space-y-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700"
                style={{ width: `${stats.ppe_compliance_percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium pt-0.5">
              <span>Coats: 96%</span>
              <span>Goggles: 88%</span>
              <span>Gloves: 85%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Active Safety Alerts */}
        <div
          onClick={() => onNavigate('alerts')}
          className="group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Safety Alerts</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.active_alerts_count}</span>
            <span className="text-xs text-rose-600 font-bold">requiring action</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="text-rose-600 font-semibold">Critical: {stats.alert_statistics.critical}</span>
            <span className="text-amber-600 font-medium">High: {stats.alert_statistics.high}</span>
            <span className="text-indigo-600 font-medium group-hover:underline flex items-center gap-0.5">
              <span>Triage</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Current Risk Level & Fused Score */}
        <div
          onClick={() => onNavigate('sensors')}
          className="group bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:border-purple-300 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fused Risk Level</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center transition-transform group-hover:scale-110">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-xl font-black px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${riskColor}`}>
              {stats.current_risk_level}
            </span>
            <span className="text-xs text-slate-500 font-mono font-bold">
              Score: {stats.current_risk_score.toFixed(0)}/100
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Fusion: Sensors+PPE</span>
            <span className="text-purple-600 font-medium group-hover:underline flex items-center gap-0.5">
              <span>Telemetry</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Environmental Physics Telemetry Strip */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Virtual Environmental Telemetry & Multi-Factor Fusion</h3>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200">
                  REAL-TIME SENSORS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Physics engine calculating continuous temperature, chemical VOCs, smoke density, and airflow status.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleTriggerSimulation('FIRE')}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
            >
              Simulate Smoke
            </button>
            <button
              onClick={() => onNavigate('sensors')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Sensor Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 6 Sensor Metric Dials */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Temperature */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/90 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                Temperature
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                (sensorData?.temperature ?? 22.4) > 28 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {(sensorData?.temperature ?? 22.4) > 28 ? 'HIGH' : 'OK'}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {(sensorData?.temperature ?? 22.4).toFixed(1)} <span className="text-xs font-normal text-slate-500">°C</span>
            </div>
          </div>

          {/* Humidity */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/90 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                Humidity
              </span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                SAFE
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {(sensorData?.humidity ?? 45.2).toFixed(1)} <span className="text-xs font-normal text-slate-500">%</span>
            </div>
          </div>

          {/* Gas Concentration */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/90 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Wind className="w-3.5 h-3.5 text-emerald-500" />
                Gas / VOC
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                (sensorData?.gas_concentration ?? 14.5) > 30 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {(sensorData?.gas_concentration ?? 14.5) > 30 ? 'WARNING' : 'NORMAL'}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {(sensorData?.gas_concentration ?? 14.5).toFixed(1)} <span className="text-xs font-normal text-slate-500">ppm</span>
            </div>
          </div>

          {/* Smoke Level */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/90 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                Smoke / Fumes
              </span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                (sensorData?.smoke_level ?? 2.1) > 15 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {(sensorData?.smoke_level ?? 2.1) > 15 ? 'ALERT' : 'CLEAR'}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {(sensorData?.smoke_level ?? 2.1).toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </div>
          </div>

          {/* Air Quality (AQI) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/90 hover:bg-slate-100/70 transition-colors">
            <div className="flex items-center justify-between text-slate-500 text-[11px]">
              <span className="flex items-center gap-1.5 font-medium">
                <Activity className="w-3.5 h-3.5 text-teal-500" />
                Air Quality
              </span>
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                GOOD
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1.5 font-mono">
              {Math.round(sensorData?.air_quality ?? 35)} <span className="text-xs font-normal text-slate-500">AQI</span>
            </div>
          </div>

          {/* Fused Composite Risk */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 border border-indigo-200/80">
            <div className="flex items-center justify-between text-indigo-900 text-[11px]">
              <span className="font-bold flex items-center gap-1">Fused Score</span>
              <span className="text-[9px] font-bold text-indigo-800 bg-indigo-200/70 px-1.5 py-0.2 rounded uppercase">
                {riskFusion?.risk_level ?? 'LOW'}
              </span>
            </div>
            <div className="text-xl font-black text-indigo-950 mt-1.5 font-mono">
              {riskFusion?.fused_score ?? 18} <span className="text-xs font-normal text-indigo-600">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Interactive Lab Zone Status & 7-Day Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Lab Zones Status */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Monitored Laboratory Zones</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Click any zone for active inspection</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                4 Zones
              </span>
            </div>

            <div className="space-y-2.5">
              {stats.zones.map((zone, idx) => {
                const isSelected = selectedZone?.name === zone.name;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedZone(zone)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-100 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">{zone.name}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                          zone.status === 'NOMINAL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {zone.status}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>Staff: <strong className="text-slate-700">{zone.people}</strong></span>
                        <span>·</span>
                        <span>Risk: <strong className="text-slate-700">{zone.risk}</strong></span>
                      </div>
                      <span className="font-bold text-slate-700">{zone.compliance}% compliant</span>
                    </div>

                    <div className="mt-1.5 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          zone.compliance >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${zone.compliance}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Vision Scan Frequency: <strong>15 FPS</strong></span>
            <button
              onClick={() => onNavigate('detection')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Zone Feeds</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 7-Day PPE Compliance & Hazard Timeline (Interactive SVG) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>PPE Compliance & Violation Timeline (7-Day Overview)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated computer vision compliance score with day-by-day hover inspection
                </p>
              </div>

              {/* Mode Toggles */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs">
                  <button
                    onClick={() => setChartMode('compliance')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      chartMode === 'compliance' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Compliance %
                  </button>
                  <button
                    onClick={() => setChartMode('violations')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      chartMode === 'violations' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Violations
                  </button>
                </div>
              </div>
            </div>

            {/* SVG Interactive Chart */}
            <div className="h-56 w-full pt-2 overflow-hidden rounded-2xl relative">
              <svg className="w-full h-full overflow-hidden" viewBox="0 0 600 190">
                <defs>
                  <clipPath id="chart-inner-clip">
                    <rect x="0" y="0" width="600" height="190" />
                  </clipPath>
                </defs>

                {/* Horizontal reference grid */}
                <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">100%</text>

                <line x1="40" y1="70" x2="580" y2="70" stroke="#f1f5f9" strokeWidth="1" />
                <text x="30" y="74" fill="#94a3b8" fontSize="10" textAnchor="end">90%</text>

                <line x1="40" y1="120" x2="580" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                <text x="30" y="124" fill="#94a3b8" fontSize="10" textAnchor="end">80%</text>

                <line x1="40" y1="160" x2="580" y2="160" stroke="#e2e8f0" strokeWidth="1" />

                <g clipPath="url(#chart-inner-clip)">
                  {/* Day Columns */}
                  {(() => {
                    const maxV = Math.max(...stats.compliance_trend.map(p => p.violations || 0), 8);
                    return stats.compliance_trend.map((pt, i) => {
                      const x = 70 + i * 78;
                      // Keep bar height strictly bounded between 0 and 52px so it never collides with upper chart
                      const barHeight = pt.violations > 0
                        ? Math.min(Math.max((pt.violations / maxV) * 52, 6), 52)
                        : 0;
                      const barY = 160 - barHeight;
                      const isHovered = hoveredDay === i;

                      return (
                        <g
                          key={i}
                          onMouseEnter={() => setHoveredDay(i)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className="cursor-pointer"
                        >
                          {/* Highlight column strip on hover */}
                          {isHovered && (
                            <rect
                              x={x - 24}
                              y="15"
                              width="48"
                              height="148"
                              rx="8"
                              fill="#f8fafc"
                              stroke="#cbd5e1"
                              strokeWidth="1"
                            />
                          )}

                          {/* Violation Bar (strictly contained) */}
                          {barHeight > 0 && (
                            <rect
                              x={x - 10}
                              y={barY}
                              width="20"
                              height={barHeight}
                              rx="4"
                              fill={isHovered ? '#f43f5e' : '#fda4af'}
                              opacity="0.85"
                            />
                          )}

                          {/* Day Label */}
                          <text
                            x={x}
                            y="178"
                            fill={isHovered ? '#1e293b' : '#64748b'}
                            fontSize="11"
                            fontWeight={isHovered ? 'bold' : '600'}
                            textAnchor="middle"
                          >
                            {pt.day}
                          </text>

                          {/* Violation count safely above bar */}
                          {pt.violations > 0 && (
                            <text
                              x={x}
                              y={Math.max(barY - 4, 110)}
                              fill="#e11d48"
                              fontSize="10"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {pt.violations}v
                            </text>
                          )}
                        </g>
                      );
                    });
                  })()}

                  {/* Polyline Path for Compliance */}
                  {(() => {
                    const points = stats.compliance_trend.map((pt, i) => {
                      const x = 70 + i * 78;
                      const safeComp = Math.max(70, Math.min(100, pt.compliance));
                      const y = 160 - ((safeComp - 70) / 30) * 135;
                      return `${x},${y}`;
                    });
                    return (
                      <polyline
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={points.join(' ')}
                      />
                    );
                  })()}

                  {/* Compliance Data Points */}
                  {stats.compliance_trend.map((pt, i) => {
                    const x = 70 + i * 78;
                    const safeComp = Math.max(70, Math.min(100, pt.compliance));
                    const y = 160 - ((safeComp - 70) / 30) * 135;
                    const isHovered = hoveredDay === i;

                    return (
                      <g key={`pt-${i}`} className="cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 6.5 : 4.5}
                          fill="#4f46e5"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                        <text
                          x={x}
                          y={Math.max(y - 8, 16)}
                          fill="#312e81"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {pt.compliance}%
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                Compliance Rate (%)
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-md bg-rose-400 inline-block" />
                Violations Recorded
              </span>
            </div>

            <button
              onClick={() => onNavigate('analytics')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Analytics Deep-Dive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Alerts Triage & Recent Incidents Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Active Alerts Feed */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Active Safety Alerts</h3>
              <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {stats.active_alerts_count} Active
              </span>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px]">
              {(['ALL', 'CRITICAL', 'PPE', 'ENV'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAlertFilter(tab)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                    alertFilter === tab ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'ENV' ? 'Sensors' : tab}
                </button>
              ))}
            </div>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-slate-600">No active alerts matching filter</p>
              <p className="text-xs text-slate-400">All monitored equipment and PPE standards in compliance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-2xl border border-rose-100 bg-rose-50/30 hover:bg-rose-50/60 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{alert.alert_type}</span>
                        <span className="text-[9px] font-bold uppercase bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded border border-rose-200">
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{alert.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{alert.message}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                        <span>Zone: <strong className="text-slate-700">{alert.zone}</strong></span>
                        <button
                          onClick={() => handleChipClick(`How do I resolve alert: ${alert.alert_type}?`)}
                          className="text-indigo-600 hover:underline flex items-center gap-0.5 font-medium"
                        >
                          <Bot className="w-3 h-3" />
                          <span>Ask Gemi Protocol</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleQuickResolve(alert.id)}
                    disabled={resolvingId === alert.id}
                    className="px-3 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shrink-0 transition-colors shadow-2xs cursor-pointer"
                  >
                    {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Laboratory Incidents Log */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Incident Records & Audits</h3>
            <button
              onClick={() => onNavigate('incidents')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Incidents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {stats.recent_incidents.slice(0, 3).map(inc => (
              <div
                key={inc.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 line-clamp-1">{inc.title}</span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                      inc.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {inc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{inc.description}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Type: <strong className="text-slate-700">{inc.incident_type}</strong></span>
                  <span>{inc.location || 'Main Lab 3B'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Zone Inspector Modal (when a user clicks a zone) */}
      {selectedZone && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedZone.name}</h4>
                  <span className="text-[11px] text-slate-500">Live Zone Inspector Telemetry</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Zone Telemetry Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Occupancy</span>
                <p className="text-lg font-black text-slate-900">{selectedZone.people} Workers</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Compliance</span>
                <p className="text-lg font-black text-emerald-600">{selectedZone.compliance}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Risk Rating</span>
                <p className="text-lg font-black text-slate-800">{selectedZone.risk}</p>
              </div>
            </div>

            {/* Required Zone PPE Checklist */}
            <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100">
              <span className="text-xs font-bold text-indigo-950 block mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Mandatory PPE Checklist for this Zone:
              </span>
              <ul className="text-xs text-indigo-900 space-y-1.5">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Knee-length flame-resistant lab coat fully fastened</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>ANSI Z87.1 Chemical splash goggles (indirect vent)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Compatible chemical-resistant gloves (Nitrile/Neoprene)</span>
                </li>
              </ul>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedZone(null);
                  handleChipClick(`What are the specific safety guidelines for ${selectedZone.name}?`);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1.5"
              >
                <Bot className="w-4 h-4" />
                <span>Ask Gemi About Zone</span>
              </button>
              <button
                onClick={() => {
                  setSelectedZone(null);
                  onNavigate('detection');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs"
              >
                Open Camera Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
