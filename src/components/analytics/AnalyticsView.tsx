import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Clock,
  PieChart,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';

export const AnalyticsView: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [data, setData] = useState<any>(null);
  const [hoveredDay, setHoveredDay] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    try {
      const res = await api.getAnalytics(timeframe);
      setData(res);
    } catch (e) {
      console.error(e);
    }
  };

  if (!data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium">Computing safety analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Timeframe Switcher */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Safety & Compliance Analytics Intelligence</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical aggregation across inspections, violation patterns, and hazard mitigation metrics.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['daily', 'weekly', 'monthly'] as const).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                timeframe === tf ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Average Compliance</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{data.overall_compliance_avg}%</div>
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> +2.4% vs last reporting period
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Automated Inspections</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{data.total_inspections}</div>
          <p className="text-xs text-slate-500 mt-2">Continuous 24/7 vision monitoring</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Violations Recorded</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{data.total_violations_recorded}</div>
          <p className="text-xs text-slate-500 mt-2">Resolved across all zones</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Mean Time to Resolution</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{data.mean_time_to_resolution_mins}m</div>
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" /> 92% resolved &lt;15 mins
          </p>
        </div>
      </div>

      {/* Main Charts: Compliance Timeline & Violations Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Timeline (Interactive SVG Line & Bar Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">PPE Compliance Trend & Violation Count</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hover on data points to view detailed daily metrics</p>
            </div>
            {hoveredDay && (
              <div className="text-xs bg-slate-900 text-white px-3 py-1 rounded-lg">
                {hoveredDay.period}: <strong>{hoveredDay.compliance}%</strong> · {hoveredDay.violations} violations
              </div>
            )}
          </div>

          <div className="h-64 w-full pt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200">
              <line x1="40" y1="20" x2="580" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">100%</text>
              <line x1="40" y1="80" x2="580" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <text x="30" y="84" fill="#94a3b8" fontSize="10" textAnchor="end">90%</text>
              <line x1="40" y1="140" x2="580" y2="140" stroke="#f1f5f9" strokeWidth="1" />
              <text x="30" y="144" fill="#94a3b8" fontSize="10" textAnchor="end">80%</text>
              <line x1="40" y1="180" x2="580" y2="180" stroke="#e2e8f0" strokeWidth="1" />

              {/* Violation Bars */}
              {data.timeline.map((pt: any, i: number) => {
                const x = 70 + i * 78;
                const barHeight = pt.violations * 10;
                const barY = 180 - barHeight;

                return (
                  <g
                    key={i}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredDay(pt)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    <rect
                      x={x - 14}
                      y={barY}
                      width="28"
                      height={barHeight}
                      rx="4"
                      fill="#fca5a5"
                      opacity="0.85"
                    />
                    <text x={x} y="195" fill="#64748b" fontSize="11" fontWeight="600" textAnchor="middle">
                      {pt.period}
                    </text>
                  </g>
                );
              })}

              {/* Compliance Line */}
              {(() => {
                const points = data.timeline.map((pt: any, i: number) => {
                  const x = 70 + i * 78;
                  const y = 180 - ((pt.compliance - 75) / 25) * 150;
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

              {/* Data points */}
              {data.timeline.map((pt: any, i: number) => {
                const x = 70 + i * 78;
                const y = 180 - ((pt.compliance - 75) / 25) * 150;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="#4f46e5"
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-7 transition-all"
                    onMouseEnter={() => setHoveredDay(pt)}
                    onMouseLeave={() => setHoveredDay(null)}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* PPE Violation Types Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Violation Categories</h3>
            <p className="text-xs text-slate-500 mb-4">Breakdown by protective gear omission</p>

            <div className="space-y-3">
              {data.violation_types.map((v: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{v.type}</span>
                    <span className="text-slate-500 font-mono">
                      {v.count} ({v.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        v.severity === 'HIGH'
                          ? 'bg-orange-500'
                          : v.severity === 'CRITICAL'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${v.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Eye protection (goggles) remains primary risk factor in synthesis areas.
          </div>
        </div>
      </div>

      {/* Bottom Grid: Risk Distribution & Zone Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Risk Level Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.risk_distribution.map((r: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 text-center space-y-1"
              >
                <div
                  className="w-3 h-3 rounded-full mx-auto"
                  style={{ backgroundColor: r.color }}
                />
                <div className="text-2xl font-bold text-slate-900">{r.percentage}%</div>
                <div className="text-[11px] text-slate-600 font-medium">{r.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance by Zone */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Compliance Rating by Laboratory Zone</h3>
          <div className="space-y-3">
            {data.compliance_by_zone.map((z: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{z.zone}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Rating: {z.status}</div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{z.rate}%</span>
                  <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${z.rate >= 95 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${z.rate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
