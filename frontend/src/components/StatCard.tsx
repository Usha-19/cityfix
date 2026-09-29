import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

export function StatCard({
  label,
  value,
  icon,
  accent = "navy",
  to,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "navy" | "teal" | "amber" | "green" | "red";
  to?: string;
  hint?: string;
}) {
  const iconBg = {
    navy: "bg-navy-50 text-navy-700",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
  };
  const bar = {
    navy: "bg-navy-800",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
    red: "bg-red-500",
  };

  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-card",
        to && "transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-soft"
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", bar[accent])} />
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
              iconBg[accent]
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold text-navy-800">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
