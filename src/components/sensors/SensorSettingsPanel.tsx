import React, { useState, useEffect } from 'react';
import {
  Thermometer, Droplets, Wind, Flame, Eye,
  Save, CheckCircle2, Sliders, Info, RefreshCw
} from 'lucide-react';
import { SensorThreshold } from '../../types';
import { api } from '../../services/api';

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  temperature:       <Thermometer className="w-4 h-4" />,
  humidity:          <Droplets className="w-4 h-4" />,
  gas_concentration: <Wind className="w-4 h-4" />,
  smoke_level:       <Flame className="w-4 h-4" />,
  air_quality:       <Eye className="w-4 h-4" />,
};

const SENSOR_DESCRIPTIONS: Record<string, string> = {
  temperature:       'Lab room ambient air temperature. Warn when reaching heat-stress levels; critical near fire/explosion risk.',
  humidity:          'Relative humidity. High values promote mould/corrosion; low values increase static discharge risk.',
  gas_concentration: 'Mixed hazardous gas ppm. Any significant spike risks asphyxiation or explosion hazard.',
  smoke_level:       'Optical particle scatter smoke index. Elevated levels indicate combustion or chemical fumes.',
  air_quality:       'Composite Air Quality Index (AQI). Values above 100 require respiratory protection.',
};

export const SensorSettingsPanel: React.FC = () => {
  const [thresholds, setThresholds] = useState<SensorThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadThresholds();
  }, []);

  const loadThresholds = async () => {
    setLoading(true);
    try {
      const data = await api.getSensorThresholds();
      setThresholds(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateThreshold = (index: number, field: keyof SensorThreshold, value: number | string) => {
    setThresholds(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.saveSensorThresholds(thresholds);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading sensor thresholds...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Virtual Sensor Thresholds</h3>
            <p className="text-[11px] text-slate-500">
              Warning and Critical levels for each simulated sensor. Changes take effect on the next simulation tick.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          {saved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Thresholds'}
        </button>
      </div>

      {/* Threshold rows */}
      <div className="space-y-4">
        {thresholds.map((thr, idx) => (
          <div key={thr.sensor_name} className="rounded-xl border border-slate-200 p-4 bg-slate-50/40 space-y-3">
            {/* Sensor name row */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                {SENSOR_ICONS[thr.sensor_name] ?? <Sliders className="w-4 h-4" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">{thr.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{SENSOR_DESCRIPTIONS[thr.sensor_name] ?? ''}</div>
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                Unit: {thr.unit}
              </div>
            </div>

            {/* Threshold inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">
                  ⚠ Warning Threshold
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={thr.warn_threshold}
                    onChange={e => updateThreshold(idx, 'warn_threshold', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-amber-300 rounded-xl bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{thr.unit}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-rose-700 mb-1">
                  🔴 Critical Threshold
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={thr.critical_threshold}
                    onChange={e => updateThreshold(idx, 'critical_threshold', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold border border-rose-300 rounded-xl bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{thr.unit}</span>
                </div>
              </div>
            </div>

            {/* Threshold bar preview */}
            <div className="space-y-1">
              <div className="text-[10px] text-slate-400 font-medium">Threshold scale preview</div>
              <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono">
                <span>0</span>
                <div className="flex-1 h-3 bg-emerald-100 rounded-full relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-amber-400 rounded-full opacity-70"
                    style={{ width: `${Math.min(100, (thr.warn_threshold / (thr.critical_threshold * 1.5)) * 100)}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-rose-500 rounded-full opacity-70"
                    style={{ width: `${Math.min(100, (thr.critical_threshold / (thr.critical_threshold * 1.5)) * 100)}%` }}
                  />
                </div>
                <span>{(thr.critical_threshold * 1.5).toFixed(0)}{thr.unit}</span>
              </div>
              <div className="flex text-[9px] text-slate-400 justify-between">
                <span className="text-emerald-600">Normal &lt; {thr.warn_threshold}</span>
                <span className="text-amber-600">Warn ≥ {thr.warn_threshold}</span>
                <span className="text-rose-600">Critical ≥ {thr.critical_threshold}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info footer */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>
          All sensor data is software-simulated (VIRTUAL_SENSOR). Thresholds stored in SQLite and applied on each
          simulation tick. When crossed, a SensorAlert is created and also mirrored to the Safety Alerts page.
        </span>
      </div>
    </div>
  );
};
