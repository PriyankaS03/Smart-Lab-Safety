export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
export type PPEClass = 'person' | 'lab_coat' | 'gloves' | 'safety_goggles' | 'mask';
export type VentilationStatus = 'NORMAL' | 'REDUCED' | 'FAILED';

export type NavItem =
  | 'dashboard'
  | 'detection'
  | 'alerts'
  | 'incidents'
  | 'analytics'
  | 'sensors'
  | 'assistant'
  | 'procedures'
  | 'settings'
  | 'about';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class_id: number;
  class_name: PPEClass;
}

export interface PersonPPEStatus {
  person_index: number;
  bounding_box: BoundingBox;
  has_lab_coat: boolean;
  has_gloves: boolean;
  has_safety_goggles: boolean;
  has_mask: boolean;
  compliance_score: number;
  status: 'COMPLIANT' | 'PARTIAL' | 'VIOLATION';
  missing_items: string[];
}

export interface DetectionResult {
  detection_id: string;
  timestamp: string;
  is_demo: boolean;
  model_status: string;
  people_count: number;
  overall_compliance: number;
  risk_level: RiskLevel;
  persons: PersonPPEStatus[];
  raw_boxes: BoundingBox[];
  alerts_triggered: string[];
  lab_coat_count: number;
  gloves_count: number;
  goggles_count: number;
  mask_count: number;
}

export interface AlertItem {
  id: string;
  alert_type: string;
  severity: AlertSeverity;
  message: string;
  time: string;
  status: AlertStatus;
  source: string;
  resolution_notes?: string;
  resolved_at?: string;
  detection_id?: string;
}

export interface IncidentItem {
  id: string;
  incident_type: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  date_time: string;
  status: IncidentStatus;
  resolution_notes?: string;
  location?: string;
  reported_by?: string;
  related_detection?: string;
}

export interface ZoneStatus {
  name: string;
  status: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  compliance: number;
  people: number;
  risk: RiskLevel;
}

export interface DashboardStats {
  total_people_detected: number;
  ppe_compliance_percentage: number;
  active_alerts_count: number;
  open_incidents_count: number;
  current_risk_level: RiskLevel;
  current_risk_score: number;
  laboratory_status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  zones: ZoneStatus[];
  recent_incidents: IncidentItem[];
  compliance_trend: { day: string; compliance: number; violations: number }[];
  alert_statistics: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total_resolved: number;
  };
}

export interface RelevantSource {
  document_title: string;
  filename: string;
  section: string;
  excerpt: string;
  relevance_score: number;
}

export interface SensorContext {
  temperature: number;
  humidity: number;
  gas_concentration: number;
  smoke_level: number;
  air_quality: number;
  ventilation_status: VentilationStatus;
  fused_risk_score: number;
  risk_level: RiskLevel;
}

export interface AssistantAnswer {
  question: string;
  answer: string;
  sources: RelevantSource[];
  suggested_actions: string[];
  emergency_level: 'NORMAL' | 'ADVISORY' | 'URGENT' | 'CRITICAL';
  sensor_context?: SensorContext | null;
}

export interface SafetyDocument {
  filename: string;
  title: string;
  document_id: string;
  revision: string;
  classification: string;
  content: string;
}

export interface SystemSettings {
  confidence_threshold: number;
  model_path: string;
  require_lab_coat: boolean;
  require_gloves: boolean;
  require_safety_goggles: boolean;
  require_mask: boolean;
  auto_alert_violations: boolean;
  sound_alerts_enabled: boolean;
  risk_level_critical_threshold: number;
  risk_level_high_threshold: number;
  risk_level_medium_threshold: number;
  demo_mode_default: boolean;
}

// ── Virtual Sensor Types ─────────────────────────────────────────────────────

export interface SensorReading {
  id?: number;
  timestamp: string;
  temperature: number;
  humidity: number;
  gas_concentration: number;
  smoke_level: number;
  air_quality: number;
  ventilation_status: VentilationStatus;
  any_threshold_crossed?: boolean;
  data_source: 'VIRTUAL_SENSOR';
  is_running?: boolean;
  is_paused?: boolean;
  tick_count?: number;
}

export interface SensorThreshold {
  sensor_name: string;
  label: string;
  unit: string;
  warn_threshold: number;
  critical_threshold: number;
  direction: 'HIGH' | 'LOW';
}

export interface SensorAlert {
  id: number;
  timestamp: string;
  sensor_name: string;
  severity: 'WARNING' | 'CRITICAL';
  reading_value: number;
  threshold_value: number;
  unit: string;
  explanation: string;
  recommended_action: string;
  status: 'ACTIVE' | 'RESOLVED';
  resolved_at?: string | null;
}

export interface RiskFusionEvent {
  id?: number;
  timestamp: string;
  fused_score: number;
  risk_level: RiskLevel;
  sensor_score: number;
  ppe_score: number;
  incident_score: number;
  explanation: string[];
}

export interface SimulationStatus {
  is_running: boolean;
  is_paused: boolean;
  tick_count: number;
  data_source_label: string;
}

// ── Gemi Chatbot Types ────────────────────────────────────────────────────────

export interface GemiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: RelevantSource[];
  actions?: string[];
  emergency_level?: 'NORMAL' | 'ADVISORY' | 'URGENT' | 'CRITICAL';
  suggested_prompts?: string[];
  model_used?: string;
  sensor_context?: SensorContext | null;
}

export interface GemiChatRequest {
  question: string;
  history?: { role: 'user' | 'assistant'; content: string }[];
  apiKey?: string;
  labContext?: {
    risk_level?: RiskLevel;
    risk_score?: number;
    active_alerts_count?: number;
    compliance_percentage?: number;
    temperature?: number;
    gas_ppm?: number;
    smoke?: number;
    aqi?: number;
  };
}

