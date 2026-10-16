import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Flame,
  AlertCircle,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  Check,
  Clock,
  Sparkles,
  FileCheck
} from 'lucide-react';
import { AlertItem, AlertSeverity, AlertStatus } from '../../types';
import { api } from '../../services/api';

interface AlertsViewProps {
  alerts: AlertItem[];
  onRefresh: () => void;
  onResolveAlert: (id: string, notes: string) => Promise<void>;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ alerts, onRefresh, onResolveAlert }) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | AlertStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resolvingAlert, setResolvingAlert] = useState<AlertItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Manual Alert Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newAlertType, setNewAlertType] = useState<string>('Chemical spill');
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('HIGH');
  const [newMessage, setNewMessage] = useState<string>('');

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.alert_type.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setIsSubmitting(true);
    try {
      await onResolveAlert(resolvingAlert.id, resolutionNotes || 'Safety confirmed and risk mitigated');
      setResolvingAlert(null);
      setResolutionNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage) return;
    setIsSubmitting(true);
    try {
      await api.createAlert({
        alert_type: newAlertType,
        severity: newSeverity,
        message: newMessage,
        source: 'MANUAL_REPORT'
      });
      setIsCreateOpen(false);
      setNewMessage('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityBadge = (sev: AlertSeverity) => {
    const config = {
      CRITICAL: 'bg-rose-100 text-rose-800 border-rose-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-amber-100 text-amber-800 border-amber-200',
      LOW: 'bg-slate-100 text-slate-700 border-slate-200'
    }[sev];
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${config}`}>
        {sev}
      </span>
    );
  };

  const statusBadge = (status: AlertStatus) => {
    if (status === 'RESOLVED') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>RESOLVED</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        <span>ACTIVE</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Laboratory Safety Alert Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated detection alarms, environmental sensors, and operator hazard escalation.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Dispatch Safety Alert</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search alerts by title or source..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                severityFilter === sev ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No matching safety alerts</h3>
            <p className="text-xs text-slate-500 mt-1">All monitored criteria within nominal parameters.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-white rounded-2xl p-5 border shadow-xs transition-all hover:border-slate-300 ${
                alert.status === 'ACTIVE'
                  ? alert.severity === 'CRITICAL'
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200/80'
                  : 'border-slate-100 bg-slate-50/40 opacity-85'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-500 text-white'
                        : alert.severity === 'HIGH'
                        ? 'bg-orange-500 text-white'
                        : alert.severity === 'MEDIUM'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-400 text-white'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{alert.alert_type}</h3>
                      {severityBadge(alert.severity)}
                      {statusBadge(alert.status)}
                    </div>

                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{alert.message}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>Source: <strong className="text-slate-600">{alert.source}</strong></span>
                      <span>·</span>
                      <span>{new Date(alert.time).toLocaleString()}</span>
                      {alert.detection_id && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-slate-500">Frame: {alert.detection_id}</span>
                        </>
                      )}
                    </div>

                    {alert.resolution_notes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 flex items-start gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Resolution Notes: </span>
                          <span>{alert.resolution_notes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {alert.status === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      setResolvingAlert(alert);
                      setResolutionNotes('');
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors shrink-0"
                  >
                    Resolve Alert
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Resolve Safety Alert</h3>
            <p className="text-xs text-slate-600">
              Confirm corrective action taken for: <strong>{resolvingAlert.alert_type}</strong>
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes & Corrective Action
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Worker donned splash goggles from safety station; verified compliance."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Mark as Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Dispatch Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Dispatch Laboratory Safety Alert</h3>
            <p className="text-xs text-slate-500">Broadcast immediate safety notification across monitoring consoles.</p>

            <form onSubmit={handleCreateAlert} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alert Category</label>
                <select
                  value={newAlertType}
                  onChange={e => setNewAlertType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="Chemical spill">Chemical spill</option>
                  <option value="Fire">Fire / Open Flame</option>
                  <option value="Gas leak">Gas leak / Cryogenic Vapor</option>
                  <option value="Multiple PPE violations">Multiple PPE violations</option>
                  <option value="High-risk situations">High-risk situations</option>
                  <option value="Critical safety events">Critical safety events</option>
                  <option value="Missing safety goggles">Missing safety goggles</option>
                  <option value="Missing lab coat">Missing lab coat</option>
                  <option value="Missing gloves">Missing gloves</option>
                  <option value="Missing mask">Missing mask</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Severity Level</label>
                <select
                  value={newSeverity}
                  onChange={e => setNewSeverity(e.target.value as AlertSeverity)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Evacuation / Life Hazard)</option>
                  <option value="HIGH">HIGH (Urgent Containment / Stand-down)</option>
                  <option value="MEDIUM">MEDIUM (Corrective Intervention Required)</option>
                  <option value="LOW">LOW (Advisory / Observation)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Message & Location</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe location, chemical involved, or observation..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Dispatching...' : 'Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
