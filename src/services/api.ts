import {
  DashboardStats,
  DetectionResult,
  AlertItem,
  IncidentItem,
  AssistantAnswer,
  SafetyDocument,
  SystemSettings,
  SensorReading,
  SensorThreshold,
  SensorAlert,
  RiskFusionEvent,
  SimulationStatus,
} from '../types';

export const api = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/dashboard/stats');
    if (!res.ok) throw new Error('Failed to load dashboard statistics');
    return res.json();
  },

  // ── Detection ──────────────────────────────────────────────────────────────
  async runDetection(params: {
    image_base64?: string;
    source?: string;
    is_demo?: boolean;
    scenario?: string;
    confidence_threshold?: number;
  }): Promise<DetectionResult> {
    const res = await fetch('/api/detection/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to run PPE detection');
    return res.json();
  },

  async getModelStatus(): Promise<{
    model_path: string;
    exists_on_disk: boolean;
    custom_weights_loaded: boolean;
    classes: Record<number, string>;
    expected_classes_count: number;
    status_label: string;
  }> {
    const res = await fetch('/api/detection/model-status');
    if (!res.ok) throw new Error('Failed to load model status');
    return res.json();
  },

  // ── Alerts ─────────────────────────────────────────────────────────────────
  async getAlerts(params?: { status?: string; severity?: string }): Promise<AlertItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.severity) query.append('severity', params.severity);
    const res = await fetch(`/api/alerts?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load alerts');
    return res.json();
  },

  async createAlert(data: {
    alert_type: string;
    severity: string;
    message: string;
    source?: string;
  }): Promise<AlertItem> {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create alert');
    return res.json();
  },

  async resolveAlert(id: string, notes: string): Promise<AlertItem> {
    const res = await fetch(`/api/alerts/${id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_notes: notes })
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    return res.json();
  },

  // ── Incidents ──────────────────────────────────────────────────────────────
  async getIncidents(params?: { status?: string; severity?: string; search?: string }): Promise<IncidentItem[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.severity) query.append('severity', params.severity);
    if (params?.search) query.append('search', params.search);
    const res = await fetch(`/api/incidents?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load incidents');
    return res.json();
  },

  async createIncident(data: {
    incident_type: string;
    title: string;
    description: string;
    severity: string;
    location?: string;
    reported_by?: string;
  }): Promise<IncidentItem> {
    const res = await fetch('/api/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create incident');
    return res.json();
  },

  async resolveIncident(id: string, notes: string): Promise<IncidentItem> {
    const res = await fetch(`/api/incidents/${id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution_notes: notes })
    });
    if (!res.ok) throw new Error('Failed to resolve incident');
    return res.json();
  },

  // ── Analytics ──────────────────────────────────────────────────────────────
  async getAnalytics(timeframe = 'weekly'): Promise<any> {
    const res = await fetch(`/api/analytics?timeframe=${timeframe}`);
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },

  // ── Assistant / Gemi Chatbot ──────────────────────────────────────────────
  async askSafetyAssistant(question: string, apiKey?: string): Promise<AssistantAnswer> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-gemini-key'] = apiKey;

    const res = await fetch('/api/assistant/query', {
      method: 'POST',
      headers,
      body: JSON.stringify({ question, apiKey })
    });
    if (!res.ok) throw new Error('Failed to get safety answer');
    return res.json();
  },

  async askGemi(req: {
    question: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    apiKey?: string;
    labContext?: any;
  }): Promise<AssistantAnswer & { suggested_prompts?: string[]; model_used?: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.apiKey) headers['x-gemini-key'] = req.apiKey;

    const res = await fetch('/api/gemi/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      // Fallback to assistant query
      return this.askSafetyAssistant(req.question, req.apiKey) as any;
    }
    return res.json();
  },

  // ── Safety Docs ────────────────────────────────────────────────────────────
  async getSafetyDocs(): Promise<SafetyDocument[]> {
    const res = await fetch('/api/safety-docs');
    if (!res.ok) throw new Error('Failed to load safety documents');
    return res.json();
  },

  // ── Settings ───────────────────────────────────────────────────────────────
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to load system settings');
    return res.json();
  },

  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to save settings');
    return res.json();
  },

  // ── Virtual Sensors ────────────────────────────────────────────────────────

  async getSensorCurrent(): Promise<SensorReading> {
    const res = await fetch('/api/sensors/current');
    if (!res.ok) throw new Error('Failed to get sensor reading');
    return res.json();
  },

  async getSensorHistory(limit = 100): Promise<SensorReading[]> {
    const res = await fetch(`/api/sensors/history?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to get sensor history');
    return res.json();
  },

  async getSensorThresholds(): Promise<SensorThreshold[]> {
    const res = await fetch('/api/sensors/thresholds');
    if (!res.ok) throw new Error('Failed to get thresholds');
    return res.json();
  },

  async saveSensorThresholds(thresholds: SensorThreshold[]): Promise<{ status: string; count: number }> {
    const res = await fetch('/api/sensors/thresholds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(thresholds)
    });
    if (!res.ok) throw new Error('Failed to save thresholds');
    return res.json();
  },

  async getSensorAlerts(status?: string): Promise<SensorAlert[]> {
    const q = status ? `?status=${status}` : '';
    const res = await fetch(`/api/sensors/alerts${q}`);
    if (!res.ok) throw new Error('Failed to get sensor alerts');
    return res.json();
  },

  async resolveSensorAlert(id: number): Promise<{ status: string; id: number }> {
    const res = await fetch(`/api/sensors/alerts/${id}/resolve`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resolve sensor alert');
    return res.json();
  },

  async getRiskFusion(): Promise<RiskFusionEvent> {
    const res = await fetch('/api/sensors/risk');
    if (!res.ok) throw new Error('Failed to get risk fusion');
    return res.json();
  },

  async getRiskHistory(limit = 50): Promise<RiskFusionEvent[]> {
    const res = await fetch(`/api/sensors/risk/history?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to get risk history');
    return res.json();
  },

  async startSimulation(): Promise<{ status: string }> {
    const res = await fetch('/api/sensors/simulation/start', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start simulation');
    return res.json();
  },

  async pauseSimulation(): Promise<{ status: string }> {
    const res = await fetch('/api/sensors/simulation/pause', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause simulation');
    return res.json();
  },

  async resetSimulation(): Promise<{ status: string }> {
    const res = await fetch('/api/sensors/simulation/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset simulation');
    return res.json();
  },

  async triggerTestEvent(event_type: string): Promise<{ status: string; event_type: string }> {
    const res = await fetch('/api/sensors/simulation/trigger-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type })
    });
    if (!res.ok) throw new Error('Failed to trigger test event');
    return res.json();
  },

  async getSimulationStatus(): Promise<SimulationStatus> {
    const res = await fetch('/api/sensors/simulation/status');
    if (!res.ok) throw new Error('Failed to get simulation status');
    return res.json();
  },
};
