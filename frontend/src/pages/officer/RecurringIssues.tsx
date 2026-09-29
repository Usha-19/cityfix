import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layers, MapPin, Repeat } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { fmtDate, titleCase } from "@/utils/format";
import type { Cluster } from "@/types";

const statusColors: Record<string, string> = {
  proposed: "border-slate-200 bg-slate-50 text-slate-600",
  confirmed: "border-teal-200 bg-teal-50 text-teal-700",
  monitoring: "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

export default function RecurringIssues() {
  const { data, isLoading } = useQuery({
    queryKey: ["clusters"],
    queryFn: async () => (await api.get<Cluster[]>("/api/officer/clusters")).data,
  });

  const clusters = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Recurring issues</h1>
        <p className="text-sm text-slate-500">
          Proposed clusters of related complaints. Confirm or reject matches to keep the memory
          accurate.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : clusters.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="No recurring issues detected yet"
          description="As related complaints accumulate, CityFix will propose clusters here."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {clusters.map((cl) => (
            <Link key={cl.id} to={`/app/officer/recurring/${cl.id}`}>
              <Card className="h-full transition-colors hover:border-teal-300">
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-400">{cl.code}</span>
                    <Badge className={statusColors[cl.status] ?? statusColors.proposed}>
                      {titleCase(cl.status)}
                    </Badge>
                  </div>
                  <p className="font-semibold text-navy-800">{cl.title}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Repeat className="h-3.5 w-3.5" /> {cl.recurrence_count} reports
                    </span>
                    {cl.locality && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {cl.locality}
                      </span>
                    )}
                    <span>First: {fmtDate(cl.first_reported_at)}</span>
                    <span>Latest: {fmtDate(cl.last_reported_at)}</span>
                  </div>
                  {cl.ai_explanation && (
                    <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                      {cl.ai_explanation}
                    </p>
                  )}
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
