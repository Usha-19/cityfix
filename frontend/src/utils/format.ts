import { format, formatDistanceToNow, parseISO } from "date-fns";
import type { Category, ComplaintStatus, Severity } from "@/types";

export const CATEGORY_LABELS: Record<Category, string> = {
  roads_potholes: "Roads & Potholes",
  garbage_sanitation: "Garbage & Sanitation",
  water_supply: "Water Supply",
  drainage_flooding: "Drainage & Flooding",
  streetlights: "Streetlights",
  electricity_infra: "Electricity & Infrastructure",
  public_safety: "Public Safety",
  other: "Other",
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as Category, label })
);

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  reopened: "Reopened",
  closed: "Closed",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  inspection: "Inspection",
  temporary_repair: "Temporary Repair",
  permanent_repair: "Permanent Repair",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  escalation: "Escalation",
  referral: "Referral",
  other: "Other",
};

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy");
  } catch {
    return "—";
  }
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM yyyy, HH:mm");
  } catch {
    return "—";
  }
}

export function fmtRelative(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
