import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  FileCheck,
  UserCheck
} from 'lucide-react';
import { IncidentItem, AlertSeverity, IncidentStatus } from '../../types';
import { api } from '../../services/api';

interface IncidentsViewProps {
  incidents: IncidentItem[];
  onRefresh: () => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({ incidents, onRefresh }) => {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IncidentStatus>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | AlertSeverity>('ALL');

  // Create Incident Modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [incType, setIncType] = useState<string>('PPE Violation');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<AlertSeverity>('HIGH');
  const [location, setLocation] = useState<string>('Main Synthesis Lab 3B');
  const [reporter, setReporter] = useState<string>('Lab Safety Inspector');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Resolve Modal
  const [resolvingIncident, setResolvingIncident] = useState<IncidentItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const filtered = incidents.filter(inc => {
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return inc.title.toLowerCase().includes(q) || inc.description.toLowerCase().includes(q) || inc.location?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;
    setIsSubmitting(true);
    try {
      await api.createIncident({
        incident_type: incType,
        title,
        description,
        severity,
        location,
        reported_by: reporter
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIncident) return;
    setIsSubmitting(true);
    try {
      await api.resolveIncident(resolvingIncident.id, resolutionNotes || 'Investigated and resolved');
      setResolvingIncident(null);
      setResolutionNotes('');
      onRefresh();
    } catch (e) {
      console.error(e);
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

  const statusBadge = (st: IncidentStatus) => {
    const config = {
      OPEN: 'bg-rose-50 text-rose-700 border-rose-200',
      INVESTIGATING: 'bg-amber-50 text-amber-700 border-amber-200',
      RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }[st];
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${config}`}>
        {st}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Incident Management & Investigation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Log, track, investigate, and document corrective resolution actions for laboratory safety occurrences.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Severity filter */}
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

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'] as const).map(st => (
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

      {/* Incidents List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No matching incidents</h3>
            <p className="text-xs text-slate-500 mt-1">Zero open occurrences matching the current filter criteria.</p>
          </div>
        ) : (
          filtered.map(inc => (
            <div
              key={inc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">{inc.id}</span>
                    <h3 className="text-sm font-bold text-slate-900">{inc.title}</h3>
                    {severityBadge(inc.severity)}
                    {statusBadge(inc.status)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="font-medium text-slate-600">Category: {inc.incident_type}</span>
                    <span>·</span>
                    <span>Location: {inc.location || 'Main Chemistry Lab'}</span>
                    <span>·</span>
                    <span>Reported by: {inc.reported_by || 'AI System'}</span>
                    <span>·</span>
                    <span>{new Date(inc.date_time).toLocaleString()}</span>
                  </div>
                </div>

                {inc.status !== 'RESOLVED' && (
                  <button
                    onClick={() => {
                      setResolvingIncident(inc);
                      setResolutionNotes('');
                    }}
                    className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors shrink-0"
                  >
                    Resolve Incident
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                {inc.description}
              </p>

              {inc.resolution_notes && (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2.5">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Investigation & Resolution Notes:</strong>
                    <p className="mt-0.5 text-slate-700">{inc.resolution_notes}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Incident Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Log New Safety Incident</h3>
            <p className="text-xs text-slate-500">Record a formal laboratory safety event for EHS compliance auditing.</p>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Type</label>
                  <select
                    value={incType}
                    onChange={e => setIncType(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="PPE Violation">PPE Violation</option>
                    <option value="Chemical Spill">Chemical Spill</option>
                    <option value="Thermal / Fire Risk">Thermal / Fire Risk</option>
                    <option value="Gas Leak">Gas Leak</option>
                    <option value="Equipment Hazard">Equipment Hazard</option>
                    <option value="Near Miss">Near Miss</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as AlertSeverity)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Unshielded Solvent Transfer during Reflux"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reported By</label>
                  <input
                    type="text"
                    required
                    value={reporter}
                    onChange={e => setReporter(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe reagents, personnel actions, and initial containment..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
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
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Recording...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolvingIncident && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Resolve Safety Incident</h3>
            <p className="text-xs text-slate-600">
              Enter formal investigation resolution for: <strong>{resolvingIncident.title}</strong>
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Investigation & Corrective Resolution Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g., Containment verified; contaminated glassware neutralized and technician received EHS safety briefing."
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResolvingIncident(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Resolve Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
