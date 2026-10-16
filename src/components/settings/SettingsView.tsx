import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sliders,
  Shield,
  Bell,
  Activity,
  Save,
  CheckCircle2,
  HardDrive,
  Sparkles
} from 'lucide-react';
import { SystemSettings } from '../../types';
import { api } from '../../services/api';
import { SensorSettingsPanel } from '../sensors/SensorSettingsPanel';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    confidence_threshold: 0.45,
    model_path: 'backend/models/best.pt',
    require_lab_coat: true,
    require_gloves: true,
    require_safety_goggles: true,
    require_mask: true,
    auto_alert_violations: true,
    sound_alerts_enabled: true,
    risk_level_critical_threshold: 80,
    risk_level_high_threshold: 60,
    risk_level_medium_threshold: 30,
    demo_mode_default: true
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      setSettings(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.saveSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">System Configuration & Safety Policies</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calibrate detection sensitivities, mandatory PPE mandates, alert escalations, and risk grading thresholds.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Saving...' : savedSuccess ? 'Configuration Saved!' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: YOLO Computer Vision Inference */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">YOLO Model Sensitivity</h3>
              <p className="text-[11px] text-slate-500">Computer vision confidence gating</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
              <span>Confidence Threshold</span>
              <strong className="font-mono text-blue-600 font-bold">{(settings.confidence_threshold * 100).toFixed(0)}%</strong>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.90"
              step="0.05"
              value={settings.confidence_threshold}
              onChange={e => setSettings({ ...settings, confidence_threshold: parseFloat(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Detections with confidence below this threshold will be filtered out to eliminate false positives.
            </p>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Weights Path</label>
            <input
              type="text"
              value={settings.model_path}
              onChange={e => setSettings({ ...settings, model_path: e.target.value })}
              className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-xl bg-slate-50"
            />
          </div>
        </div>

        {/* Module 2: Mandatory PPE Policy */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Mandatory PPE Regulations</h3>
              <p className="text-[11px] text-slate-500">Toggle required gear for zone entry</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {[
              { key: 'require_safety_goggles', label: 'Safety Goggles (ANSI Z87.1)', desc: 'Required in synthesis and splash zones' },
              { key: 'require_lab_coat', label: 'Buttoned Lab Coat', desc: 'Required across all chemical/biological benches' },
              { key: 'require_gloves', label: 'Nitrile Gloves', desc: 'Required for reagent dispensing and transfer' },
              { key: 'require_mask', label: 'Face Mask / Vapor Respirator', desc: 'Required in powder and volatile bays' }
            ].map(item => (
              <label key={item.key} className="flex items-start justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
                <div>
                  <div className="font-bold text-slate-900">{item.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={(settings as any)[item.key]}
                  onChange={e => setSettings({ ...settings, [item.key]: e.target.checked })}
                  className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Module 3: Alert & Notification Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Alert Dispatch Policy</h3>
              <p className="text-[11px] text-slate-500">Automated alarm triggering</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">Auto-Alert PPE Violations</span>
                <span className="text-[11px] text-slate-500">Automatically broadcast alert when missing gear is verified</span>
              </div>
              <input
                type="checkbox"
                checked={settings.auto_alert_violations}
                onChange={e => setSettings({ ...settings, auto_alert_violations: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
              <div>
                <span className="font-bold text-slate-900 block">Audio / Sound Notifications</span>
                <span className="text-[11px] text-slate-500">Play chime on high/critical hazard detection</span>
              </div>
              <input
                type="checkbox"
                checked={settings.sound_alerts_enabled}
                onChange={e => setSettings({ ...settings, sound_alerts_enabled: e.target.checked })}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Module 4: Risk Thresholds */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Risk Assessment Boundaries</h3>
              <p className="text-[11px] text-slate-500">Escalation thresholds (0 to 100 index)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Medium Risk</label>
              <input
                type="number"
                value={settings.risk_level_medium_threshold}
                onChange={e => setSettings({ ...settings, risk_level_medium_threshold: parseInt(e.target.value) || 30 })}
                className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Default: 30</span>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">High Risk</label>
              <input
                type="number"
                value={settings.risk_level_high_threshold}
                onChange={e => setSettings({ ...settings, risk_level_high_threshold: parseInt(e.target.value) || 60 })}
                className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold text-orange-600"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Default: 60</span>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Critical Risk</label>
              <input
                type="number"
                value={settings.risk_level_critical_threshold}
                onChange={e => setSettings({ ...settings, risk_level_critical_threshold: parseInt(e.target.value) || 80 })}
                className="w-full p-2 border border-slate-200 rounded-lg text-center font-bold text-rose-600"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Default: 80</span>
            </div>
          </div>
        </div>
      </form>

      {/* Module 5: Virtual Sensor Thresholds */}
      <div className="md:col-span-2">
        <SensorSettingsPanel />
      </div>
    </div>
  );
};

