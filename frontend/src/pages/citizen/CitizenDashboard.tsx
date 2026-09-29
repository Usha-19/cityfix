import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, ListChecks, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/services/api";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/Skeleton";
import { fmtRelative, CATEGORY_LABELS } from "@/utils/format";
import type { Paginated, Complaint } from "@/types";

export default function CitizenDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-complaints", "all"],
    queryFn: async () =>
      (await api.get<Paginated<Complaint>>("/api/complaints/mine?page_size=100")).data,
  });

  const items = data?.items ?? [];
  const count = (s: string) => items.filter((c) => c.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Your civic dashboard</h1>
          <p className="text-sm text-slate-500">Track the issues you have reported.</p>
        </div>
        <Link to="/app/report">
          <Button>
            <FilePlus2 className="h-4 w-4" /> Report an Issue
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submitted" value={data?.total ?? 0} icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Awaiting action" value={count("new") + count("assigned")} icon={<Clock className="h-5 w-5" />} accent="amber" />
        <StatCard label="In progress" value={count("in_progress")} icon={<Loader2 className="h-5 w-5" />} accent="teal" />
        <StatCard label="Resolved" value={count("resolved")} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently updated</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<FilePlus2 className="h-8 w-8" />}
                title="No complaints yet"
                description="Report your first civic issue to get started."
                action={
                  <Link to="/app/report">
                    <Button size="sm">Report an Issue</Button>
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items
                .slice()
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
                .slice(0, 6)
                .map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/app/complaints/${c.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium text-slate-800">{c.title}</p>
                        <p className="text-xs text-slate-500">
                          {CATEGORY_LABELS[c.category]} · {c.reference_id} · updated{" "}
                          {fmtRelative(c.updated_at)}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
