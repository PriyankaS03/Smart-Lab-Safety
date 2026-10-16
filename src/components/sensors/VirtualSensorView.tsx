import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Thermometer,
  Droplets,
  Wind,
  Flame,
  Activity,
  Play,
  Pause,
  RotateCcw,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Check,
  BarChart3,
  ArrowUpRight,
  Clock,
  Info
} from 'lucide-react';
import {
  SensorReading,
  SensorThreshold,
  SensorAlert,
  RiskFusionEvent,
  SimulationStatus,
  NavItem
} from '../../types';
import { api } from '../../services/api';

interface VirtualSensorViewProps {
  onNavigate?: (tab: NavItem) => void;
}

export const VirtualSensorView: React.FC<VirtualSensorViewProps> = ({ onNavigate }) => {
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [riskFusion, setRiskFusion] = useState<RiskFusionEvent | null>(null);
  const [simStatus, setSimStatus] = useState<SimulationStatus | null>(null);
  const [thresholds, setThresholds] = useState<SensorThreshold[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [selectedSensorChart, setSelectedSensorChart] = useState<
    'temperature' | 'humidity' | 'gas_concentration' | 'smoke_level' | 'air_quality'
  >('temperature');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'alerts' | 'fusion'>('overview');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchInterval = useRef<number | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [curr, hist, alts, fusion, status, ths] = await Promise.all([
        api.getSensorCurrent().catch(() => null),
        api.getSensorHistory(30).catch(() => []),
        api.getSensorAlerts().catch(() => []),
        api.getRiskFusion().catch(() => null),
        api.getSimulationStatus().catch(() => null),
        api.getSensorThresholds().catch(() => []),
      ]);

      if (curr) setReading(curr);
      if (hist && hist.length > 0) setHistory(hist);
      if (alts) setAlerts(alts);
      if (fusion) setRiskFusion(fusion);
      if (status) setSimStatus(status);
      if (ths) setThresholds(ths);
    } catch (err) {
      console.error('Error fetching sensor data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 3 seconds for live readings
    fetchInterval.current = window.setInterval(loadData, 3000);
    return () => {
      if (fetchInterval.current) clearInterval(fetchInterval.current);
    };
  }, [loadData]);

  // Simulation Controls
  const handleStartSim = async () => {
    try {
      await api.startSimulation();
      showNotification('Simulation started (live generating)');
      await loadData();
    } catch {
      showNotification('Failed to start simulation');
    }
  };

  const handlePauseSim = async () => {
    try {
      await api.pauseSimulation();
      showNotification('Simulation paused');
      await loadData();
    } catch {
      showNotification('Failed to pause simulation');
    }
  };

  const handleResetSim = async () => {
    try {
      await api.resetSimulation();
      showNotification('Simulation reset to normal baseline conditions');
      await loadData();
    } catch {
      showNotification('Failed to reset simulation');
    }
  };

  const handleTriggerEvent = async (eventType: string, label: string) => {
    try {
      await api.triggerTestEvent(eventType);
      showNotification(`Test event injected: ${label}`);
      await loadData();
    } catch {
      showNotification(`Failed to trigger ${label}`);
    }
  };

  const handleResolveAlert = async (id: number) => {
    setResolvingId(id);
    try {
      await api.resolveSensorAlert(id);
      showNotification('Sensor alert marked as resolved');
      await loadData();
    } catch {
      showNotification('Failed to resolve alert');
    } finally {
      setResolvingId(null);
    }
  };

  // Helper formatting & status evaluations
  const getThresholdFor = (key: string) => thresholds.find(t => t.sensor_name === key);

  const getStatusBadge = (val: number, key: string) => {
    const th = getThresholdFor(key);
    if (!th) return { label: 'NORMAL', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

    if (th.direction === 'LOW') {
      if (val <= th.critical_threshold) return { label: 'CRITICAL', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      if (val <= th.warn_threshold) return { label: 'WARNING', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      return { label: 'NORMAL', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    } else {
      if (val >= th.critical_threshold) return { label: 'CRITICAL', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      if (val >= th.warn_threshold) return { label: 'WARNING', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      return { label: 'NORMAL', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
  };

  const activeSensorAlerts = alerts.filter(a => a.status === 'ACTIVE');

  // Sparkline generator for SVG
  const renderSparkline = (key: 'temperature' | 'humidity' | 'gas_concentration' | 'smoke_level' | 'air_quality') => {
    if (!history || history.length < 2) return null;
    const values = history.map(h => (h as any)[key] ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 120;
    const height = 32;

    const points = values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const lastVal = values[values.length - 1];
    const status = getStatusBadge(lastVal, key);
    const strokeColor = status.label === 'CRITICAL' ? '#e11d48' : status.label === 'WARNING' ? '#d97706' : '#10b981';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  // Large chart generator
  const renderLargeChart = () => {
    if (!history || history.length < 2) {
      return (
        <div className="flex h-56 items-center justify-center text-slate-400 text-sm">
          Awaiting simulation data points...
        </div>
      );
    }

    const key = selectedSensorChart;
    const values = history.map(h => (h as any)[key] ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const th = getThresholdFor(key);

    const minDisplay = Math.floor(Math.min(min, th?.warn_threshold ?? min) * 0.9);
    const maxDisplay = Math.ceil(Math.max(max, th?.critical_threshold ?? max) * 1.1) || 10;
    const range = maxDisplay - minDisplay || 1;

    const width = 760;
    const height = 200;

    const points = values
      .map((val, idx) => {
        const x = (idx / (values.length - 1)) * (width - 60) + 40;
        const y = height - 30 - ((val - minDisplay) / range) * (height - 60);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const warnY = th ? height - 30 - ((th.warn_threshold - minDisplay) / range) * (height - 60) : null;
    const critY = th ? height - 30 - ((th.critical_threshold - minDisplay) / range) * (height - 60) : null;

    return (
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56 select-none">
          {/* Horizontal Grid lines */}
          <line x1="40" y1="20" x2={width} y2="20" stroke="#f1f5f9" strokeWidth="1" />
          <line x1="40" y1="80" x2={width} y2="80" stroke="#f1f5f9" strokeWidth="1" />
          <line x1="40" y1="140" x2={width} y2="140" stroke="#f1f5f9" strokeWidth="1" />
          <line x1="40" y1={height - 30} x2={width} y2={height - 30} stroke="#cbd5e1" strokeWidth="1" />

          {/* Threshold lines */}
          {warnY !== null && warnY >= 20 && warnY <= height - 30 && (
            <g>
              <line x1="40" y1={warnY} x2={width} y2={warnY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x={width - 70} y={warnY - 4} fill="#d97706" fontSize="10" fontWeight="600">
                WARN: {th?.warn_threshold}
              </text>
            </g>
          )}

          {critY !== null && critY >= 20 && critY <= height - 30 && (
            <g>
              <line x1="40" y1={critY} x2={width} y2={critY} stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
              <text x={width - 70} y={critY - 4} fill="#e11d48" fontSize="10" fontWeight="600">
                CRIT: {th?.critical_threshold}
              </text>
            </g>
          )}

          {/* Value Area / Polyline */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />

          {/* Points */}
          {values.map((val, idx) => {
            const x = (idx / (values.length - 1)) * (width - 60) + 40;
            const y = height - 30 - ((val - minDisplay) / range) * (height - 60);
            const isLast = idx === values.length - 1;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r={isLast ? 4.5 : 2.5}
                fill={isLast ? '#1d4ed8' : '#3b82f6'}
                stroke="#fff"
                strokeWidth={isLast ? 2 : 1}
              />
            );
          })}

          {/* Y Axis labels */}
          <text x="5" y="24" fill="#94a3b8" fontSize="10">{maxDisplay}</text>
          <text x="5" y={height - 28} fill="#94a3b8" fontSize="10">{minDisplay}</text>
        </svg>
      </div>
    );
  };

  const currentVentStatus = reading?.ventilation_status || 'NORMAL';
  const ventBadgeColor =
    currentVentStatus === 'NORMAL'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : currentVentStatus === 'REDUCED'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-800">
            ×
          </button>
        </div>
      )}

      {/* Header & Simulation Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Cpu className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Virtual Sensor Monitoring & Fusion Engine
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 rounded-md border border-blue-200">
                    SIMULATED
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Software-in-the-loop physics simulation of laboratory environmental variables, automatic threshold alerts, and multi-modal risk fusion.
                </p>
              </div>
            </div>
          </div>

          {/* Live Engine Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  simStatus?.is_running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="font-semibold text-slate-800">
                {simStatus?.is_running ? 'Sim Running' : 'Sim Paused'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono ml-1">
                Tick #{simStatus?.tick_count ?? 0}
              </span>
            </div>

            {simStatus?.is_running ? (
              <button
                onClick={handlePauseSim}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                title="Pause simulated sensor readings"
              >
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                Pause
              </button>
            ) : (
              <button
                onClick={handleStartSim}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                title="Start or resume simulated sensor updates"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume
              </button>
            )}

            <button
              onClick={handleResetSim}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              title="Reset physics simulator to normal laboratory ambient baselines"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset Normal
            </button>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Poll latest reading now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Test Event Injection Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Trigger Safety Scenario:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleTriggerEvent('gas_leak', 'Gas Leak (Methane/VOC 85 ppm)')}
              className="px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all active:scale-95 flex items-center gap-1"
            >
              <Wind className="w-3 h-3 text-amber-600" />
              Gas Leak Event
            </button>

            <button
              onClick={() => handleTriggerEvent('thermal_runaway', 'Thermal Runaway (Hotplate 44.5°C)')}
              className="px-2.5 py-1 text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 rounded-lg hover:bg-rose-100 transition-all active:scale-95 flex items-center gap-1"
            >
              <Thermometer className="w-3 h-3 text-rose-600" />
              Thermal Runaway
            </button>

            <button
              onClick={() => handleTriggerEvent('smoke_incident', 'Smoke / Smoldering Reaction')}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-1"
            >
              <Flame className="w-3 h-3 text-orange-600" />
              Smoke Outbreak
            </button>

            <button
              onClick={() => handleTriggerEvent('ventilation_failure', 'HVAC Exhaust Failure')}
              className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all active:scale-95 flex items-center gap-1"
            >
              <AlertTriangle className="w-3 h-3 text-purple-600" />
              Ventilation Failure
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('settings')}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 ml-auto"
              >
                <Sliders className="w-3 h-3" />
                Configure Thresholds
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          Live Sensor Telemetry
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Historical Charts
        </button>

        <button
          onClick={() => setActiveTab('alerts')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'alerts'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Sensor Alerts
          {activeSensorAlerts.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
              {activeSensorAlerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('fusion')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'fusion'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Sensor Fusion Risk Engine
          {riskFusion && (
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                riskFusion.risk_level === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-700'
                  : riskFusion.risk_level === 'HIGH'
                  ? 'bg-orange-100 text-orange-700'
                  : riskFusion.risk_level === 'MEDIUM'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              Score: {riskFusion.fused_score}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW & LIVE CARDS ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 6 Sensor Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Temperature */}
            {(() => {
              const val = reading?.temperature ?? 22.4;
              const status = getStatusBadge(val, 'temperature');
              const th = getThresholdFor('temperature');
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Thermometer className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">Room Temperature</h3>
                        <p className="text-[11px] text-slate-400">Target Range: 18 – 24 °C</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {val.toFixed(1)}
                      </span>
                      <span className="text-slate-500 font-medium ml-1">°C</span>
                    </div>
                    <div>{renderSparkline('temperature')}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Warn: &gt;{th?.warn_threshold ?? 28}°C | Crit: &gt;{th?.critical_threshold ?? 35}°C
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSensorChart('temperature');
                        setActiveTab('analytics');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                    >
                      Chart <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 2. Humidity */}
            {(() => {
              const val = reading?.humidity ?? 45.2;
              const status = getStatusBadge(val, 'humidity');
              const th = getThresholdFor('humidity');
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">Relative Humidity</h3>
                        <p className="text-[11px] text-slate-400">Optimum: 40% – 60%</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {val.toFixed(1)}
                      </span>
                      <span className="text-slate-500 font-medium ml-1">%</span>
                    </div>
                    <div>{renderSparkline('humidity')}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Warn: &gt;{th?.warn_threshold ?? 65}% | Crit: &gt;{th?.critical_threshold ?? 75}%
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSensorChart('humidity');
                        setActiveTab('analytics');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                    >
                      Chart <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 3. Gas Concentration */}
            {(() => {
              const val = reading?.gas_concentration ?? 12.0;
              const status = getStatusBadge(val, 'gas_concentration');
              const th = getThresholdFor('gas_concentration');
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Wind className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">Gas / VOC Level</h3>
                        <p className="text-[11px] text-slate-400">Organic Vapors & Gases</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {val.toFixed(1)}
                      </span>
                      <span className="text-slate-500 font-medium ml-1">ppm</span>
                    </div>
                    <div>{renderSparkline('gas_concentration')}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Warn: &gt;{th?.warn_threshold ?? 50} | Crit: &gt;{th?.critical_threshold ?? 100} ppm
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSensorChart('gas_concentration');
                        setActiveTab('analytics');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                    >
                      Chart <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 4. Smoke Level */}
            {(() => {
              const val = reading?.smoke_level ?? 4.2;
              const status = getStatusBadge(val, 'smoke_level');
              const th = getThresholdFor('smoke_level');
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">Smoke & Particulate</h3>
                        <p className="text-[11px] text-slate-400">Optical Density Index 0–100</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {val.toFixed(1)}
                      </span>
                      <span className="text-slate-500 font-medium ml-1">/ 100</span>
                    </div>
                    <div>{renderSparkline('smoke_level')}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Warn: &gt;{th?.warn_threshold ?? 20} | Crit: &gt;{th?.critical_threshold ?? 40}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSensorChart('smoke_level');
                        setActiveTab('analytics');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                    >
                      Chart <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 5. Air Quality Index (AQI) */}
            {(() => {
              const val = reading?.air_quality ?? 32;
              const status = getStatusBadge(val, 'air_quality');
              const th = getThresholdFor('air_quality');
              return (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-sm">Air Quality (AQI)</h3>
                        <p className="text-[11px] text-slate-400">EPA Standard Scale</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${status.bg}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {Math.round(val)}
                      </span>
                      <span className="text-slate-500 font-medium ml-1">AQI</span>
                    </div>
                    <div>{renderSparkline('air_quality')}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Warn: &gt;{th?.warn_threshold ?? 100} | Crit: &gt;{th?.critical_threshold ?? 150}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedSensorChart('air_quality');
                        setActiveTab('analytics');
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5"
                    >
                      Chart <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* 6. Ventilation & Fume Hood HVAC Status */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm">Ventilation & Exhaust</h3>
                    <p className="text-[11px] text-slate-400">Fume Hood Airflow Status</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase ${ventBadgeColor}`}
                >
                  {currentVentStatus}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-bold text-slate-900">
                    {currentVentStatus === 'NORMAL'
                      ? '100 fpm (Optimal)'
                      : currentVentStatus === 'REDUCED'
                      ? '65 fpm (Degraded)'
                      : '0 fpm (Offline)'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Auto-monitored differential pressure</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    currentVentStatus === 'NORMAL'
                      ? 'bg-emerald-500'
                      : currentVentStatus === 'REDUCED'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Combined Sensor Status & Risk Overview Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real-time Fused Risk Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-sm">Fused Risk Assessment</h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    riskFusion?.risk_level === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : riskFusion?.risk_level === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : riskFusion?.risk_level === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {riskFusion?.risk_level || 'LOW'}
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold tracking-tight text-white">
                  {riskFusion?.fused_score ?? 18}
                </span>
                <span className="text-slate-400 text-sm">/ 100 Risk Index</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-700/60 rounded-full h-2 mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    (riskFusion?.fused_score ?? 18) > 75
                      ? 'bg-rose-500'
                      : (riskFusion?.fused_score ?? 18) > 50
                      ? 'bg-orange-500'
                      : (riskFusion?.fused_score ?? 18) > 25
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, riskFusion?.fused_score ?? 18))}%` }}
                />
              </div>

              {/* Sub-component break down */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-700/60 text-center">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400">Sensors</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {riskFusion?.sensor_score ?? 10}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400">YOLO PPE</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {riskFusion?.ppe_score ?? 15}%
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-slate-400">Incidents</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {riskFusion?.incident_score ?? 0}%
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('fusion')}
                className="mt-4 w-full py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                Inspect Fusion Engine Factors <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Active Sensor Alerts Summary */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-slate-800 text-sm">
                      Active Sensor Threshold Violations
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {activeSensorAlerts.length} unresolved
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {activeSensorAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">All Virtual Sensors Normal</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        No configured warning or critical safety thresholds are currently breached.
                      </p>
                    </div>
                  ) : (
                    activeSensorAlerts.map(alert => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 capitalize">
                                {alert.sensor_name.replace('_', ' ')}: {alert.reading_value} {alert.unit}
                              </span>
                              <span className="px-1.5 py-0.2 rounded font-bold uppercase text-[9px] bg-rose-100 text-rose-700">
                                {alert.severity}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-0.5">{alert.explanation}</p>
                            <p className="text-rose-800 font-medium mt-1">
                              Action: {alert.recommended_action}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          disabled={resolvingId === alert.id}
                          className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3 h-3" />
                          {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Thresholds evaluated automatically on every physics tick.</span>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View Full Alert Log <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: HISTORICAL CHARTS ────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Live Sensor Telemetry Trends
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time chart streaming historical readings from SQLite database with warning & critical thresholds.
              </p>
            </div>

            {/* Sensor selector buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(
                [
                  { key: 'temperature', label: 'Temperature (°C)' },
                  { key: 'humidity', label: 'Humidity (%)' },
                  { key: 'gas_concentration', label: 'Gas (ppm)' },
                  { key: 'smoke_level', label: 'Smoke' },
                  { key: 'air_quality', label: 'AQI' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedSensorChart(opt.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    selectedSensorChart === opt.key
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Large Chart Canvas */}
          <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100">
            {renderLargeChart()}
          </div>

          {/* Recent Records Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Recent Recorded Simulation Ticks (Last 10)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Temp (°C)</th>
                    <th className="py-2.5 px-3">Humidity (%)</th>
                    <th className="py-2.5 px-3">Gas (ppm)</th>
                    <th className="py-2.5 px-3">Smoke Index</th>
                    <th className="py-2.5 px-3">AQI</th>
                    <th className="py-2.5 px-3">Ventilation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {history.slice(0, 10).map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-3 text-slate-400">
                        {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : 'Just now'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{h.temperature?.toFixed(1)}</td>
                      <td className="py-2 px-3">{h.humidity?.toFixed(1)}%</td>
                      <td className="py-2 px-3">{h.gas_concentration?.toFixed(1)}</td>
                      <td className="py-2 px-3">{h.smoke_level?.toFixed(1)}</td>
                      <td className="py-2 px-3">{Math.round(h.air_quality ?? 0)}</td>
                      <td className="py-2 px-3 font-sans">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            h.ventilation_status === 'NORMAL'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {h.ventilation_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: SENSOR ALERTS ─────────────────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Sensor Threshold Safety Alerts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically triggered whenever environmental readings exceed warning or critical boundaries.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Total Recorded: {alerts.length}
            </span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No sensor threshold alerts recorded in database yet.
              </div>
            ) : (
              alerts.map(a => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    a.status === 'ACTIVE'
                      ? 'border-rose-200 bg-rose-50/30'
                      : 'border-slate-200 bg-slate-50/50 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${
                          a.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-700 border-rose-300'
                            : 'bg-amber-100 text-amber-700 border-amber-300'
                        }`}
                      >
                        {a.severity}
                      </span>
                      <span className="font-bold text-slate-900 text-sm capitalize">
                        {a.sensor_name.replace('_', ' ')} Breach
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          a.status === 'ACTIVE'
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700">
                      Reading:{' '}
                      <span className="font-bold font-mono text-slate-900">
                        {a.reading_value} {a.unit}
                      </span>{' '}
                      (Threshold: {a.threshold_value} {a.unit}) — {a.explanation}
                    </div>

                    <div className="text-xs text-blue-700 font-medium">
                      Recommended Action: {a.recommended_action}
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 pt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(a.timestamp).toLocaleString()}</span>
                      {a.resolved_at && (
                        <span>• Resolved at {new Date(a.resolved_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>

                  {a.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleResolveAlert(a.id)}
                      disabled={resolvingId === a.id}
                      className="shrink-0 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {resolvingId === a.id ? 'Resolving...' : 'Mark Resolved'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: SENSOR FUSION ENGINE BREAKDOWN ─────────────────────────────────── */}
      {activeTab === 'fusion' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Explainable Multi-Modal Risk Fusion Engine
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mathematical fusion combining Virtual Environmental Sensors (40%), YOLO PPE Compliance (40%), and Open Safety Incident Alerts (20%).
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 font-mono">
                {riskFusion?.fused_score ?? 18} / 100
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                  riskFusion?.risk_level === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-700'
                    : riskFusion?.risk_level === 'HIGH'
                    ? 'bg-orange-100 text-orange-700'
                    : riskFusion?.risk_level === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                Level: {riskFusion?.risk_level || 'LOW'}
              </span>
            </div>
          </div>

          {/* Fusion Component Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Environmental Sensors</span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Weight: 40%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {riskFusion?.sensor_score ?? 10} <span className="text-sm font-normal text-slate-500">/ 100</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Derived from temperature deviations, gas leaks, optical smoke index, and fume hood ventilation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">YOLO PPE Detection</span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Weight: 40%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {riskFusion?.ppe_score ?? 15} <span className="text-sm font-normal text-slate-500">/ 100</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Inverted compliance score from computer vision tracking lab coats, safety goggles, gloves, and masks.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-500">Active Safety Incidents</span>
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Weight: 20%
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                {riskFusion?.incident_score ?? 0} <span className="text-sm font-normal text-slate-500">/ 100</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Cumulative weight of currently open chemical spills, fire hazards, and unacknowledged alerts.
              </p>
            </div>
          </div>

          {/* Contributing Explanations Breakdown */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Explainability Audit Trail (Contributing Factors)
            </h4>

            <div className="space-y-2">
              {riskFusion?.explanation && Array.isArray(riskFusion.explanation) && riskFusion.explanation.length > 0 ? (
                riskFusion.explanation.map((fact: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="font-semibold text-slate-800">
                        {typeof fact === 'string' ? fact : fact.factor || JSON.stringify(fact)}
                      </span>
                    </div>
                    {fact.impact && (
                      <span className="font-mono text-slate-500 text-[11px]">
                        Impact: +{fact.impact} pts
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  Normal baseline operations. No high-risk anomalies or severe threshold violations detected.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
