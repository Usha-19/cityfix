import { cn } from "@/utils/cn";
import type { ComplaintStatus, Severity } from "@/types";
import { STATUS_LABELS, SEVERITY_LABELS } from "@/utils/format";

const statusStyles: Record<ComplaintStatus, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  assigned: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
  reopened: "bg-red-50 text-red-700 border-red-200",
  closed: "bg-slate-100 text-slate-500 border-slate-200",
};

const severityStyles: Record<Severity, string> = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  medium: "bg-teal-50 text-teal-700 border-teal-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        severityStyles[severity]
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}
