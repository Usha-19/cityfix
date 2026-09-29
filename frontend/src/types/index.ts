export type Role = "citizen" | "officer" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type Category =
  | "roads_potholes"
  | "garbage_sanitation"
  | "water_supply"
  | "drainage_flooding"
  | "streetlights"
  | "electricity_infra"
  | "public_safety"
  | "other";

export type Severity = "low" | "medium" | "high" | "critical";

export type ComplaintStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "reopened"
  | "closed";

export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  content_type?: string;
}

export interface StatusHistory {
  id: string;
  from_status?: string | null;
  to_status: string;
  note?: string | null;
  created_at: string;
}

export interface Complaint {
  id: string;
  reference_id: string;
  title: string;
  category: Category;
  severity: Severity;
  status: ComplaintStatus;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_recurring: boolean;
  department_id?: string | null;
  assigned_officer_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplaintDetail extends Complaint {
  description: string;
  observed_at?: string | null;
  extra_notes?: string | null;
  citizen_id: string;
  attachments: Attachment[];
  status_history: StatusHistory[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface OfficerAction {
  id: string;
  complaint_id: string;
  action_type: string;
  action_date: string;
  description: string;
  assigned_team?: string | null;
  materials_used?: string | null;
  completion_status: string;
  observed_outcome?: string | null;
  outcome_status: string;
  outcome_confirmed: boolean;
  follow_up_date?: string | null;
  created_at: string;
}

export interface Cluster {
  id: string;
  code: string;
  title: string;
  category?: Category | null;
  status: string;
  center_lat?: number | null;
  center_lng?: number | null;
  locality?: string | null;
  first_reported_at?: string | null;
  last_reported_at?: string | null;
  recurrence_count: number;
  ai_explanation?: string | null;
  root_cause_hypothesis?: string | null;
  verified_cause?: string | null;
  created_at: string;
}

export interface ClusterMember {
  id: string;
  complaint_id: string;
  status: string;
  match_score?: number | null;
  evidence?: string | null;
  complaint_title?: string | null;
  complaint_reference?: string | null;
  evidence_summary?: string | null;
}

export interface ClusterDetail extends Cluster {
  members: ClusterMember[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  complaint_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface BriefEvidence {
  complaint_id: string;
  reference_id?: string | null;
  date?: string | null;
  summary: string;
  kind: string;
}

export interface IssueBrief {
  complaint_id: string;
  current_summary: string;
  historical_incidents: string[];
  previous_actions: string[];
  recorded_outcomes: string[];
  possible_recurring_pattern?: string | null;
  supporting_evidence: BriefEvidence[];
  recommended_investigation: string[];
  uncertainties: string[];
  confidence: string;
  grounded: boolean;
  degraded: boolean;
  generated_at: string;
}

export interface MemoryStatus {
  hindsight_enabled: boolean;
  healthy: boolean;
  bank: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  skipped: number;
  last_success_at?: string | null;
  detail?: string | null;
}

export interface MemoryOperation {
  id: string;
  op_type: string;
  status: string;
  complaint_id?: string | null;
  retry_count: number;
  last_error?: string | null;
  processed_at?: string | null;
  created_at: string;
}
