import React, { useState, useEffect } from 'react';
import {
  Bell,
  RefreshCw,
  Building2,
  Clock,
  Shield,
  AlertTriangle,
  Flame,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { RiskLevel } from '../../types';

interface NavbarProps {
  currentRiskLevel: RiskLevel;
  currentRiskScore: number;
  activeAlertCount: number;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  onRefresh: () => void;
  onNavigateAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRiskLevel,
  currentRiskScore,
  activeAlertCount,
  isDemoMode,
  setIsDemoMode,
  onRefresh,
  onNavigateAlerts
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const riskBadgeConfig = {
    LOW: { label: 'LOW RISK', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
    MEDIUM: { label: 'MEDIUM RISK', bg: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500' },
    HIGH: { label: 'HIGH RISK', bg: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
    CRITICAL: { label: 'CRITICAL RISK', bg: 'bg-rose-50 border-rose-200 text-rose-700', dot: 'bg-rose-500 animate-ping' }
  }[currentRiskLevel];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
      {/* Left: Lab Location Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Main Chemistry Lab 3B</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-500 text-xs font-normal">Synthesis & Hazardous Operations</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeStr || '12:00:00'}</span>
        </div>

        {/* Demo Mode Toggle */}
        <button
          onClick={() => setIsDemoMode(!isDemoMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isDemoMode
              ? 'bg-amber-50 text-amber-800 border-amber-300'
              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
          }`}
          title="Toggle interactive demonstration data vs strict raw inference"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Demo Data: {isDemoMode ? 'ON' : 'OFF'}</span>
        </button>

        {/* Risk Level Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${riskBadgeConfig.bg}`}
        >
          <span className={`w-2 h-2 rounded-full ${riskBadgeConfig.dot}`} />
          <span>{riskBadgeConfig.label}</span>
          <span className="text-[11px] font-mono opacity-80">({currentRiskScore.toFixed(0)}/100)</span>
        </div>

        {/* Alerts Bell Button */}
        <button
          onClick={onNavigateAlerts}
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="View Safety Alerts"
        >
          <Bell className="w-5 h-5" />
          {activeAlertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
          )}
        </button>

        {/* Refresh Sync Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Sync & Refresh Dashboard"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
