import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BrainCircuit, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/StatCard";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { fmtDateTime, titleCase } from "@/utils/format";
import type { MemoryStatus, MemoryOperation } from "@/types";

const statusColors: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  processing: "border-teal-200 bg-teal-50 text-teal-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  skipped: "border-slate-200 bg-slate-50 text-slate-500",
};

export default function MemoryMonitoring() {
  const qc = useQueryClient();
  const toast = useToast();

  const { data: status } = useQuery({
    queryKey: ["memory-status"],
    queryFn: async () => (await api.get<MemoryStatus>("/api/admin/memory/status")).data,
    refetchInterval: 10000,
  });

  const { data: ops, isLoading } = useQuery({
    queryKey: ["memory-ops"],
    queryFn: async () => (await api.get<MemoryOperation[]>("/api/admin/memory/operations")).data,
    refetchInterval: 10000,
  });

  const retry = useMutation({
    mutationFn: async () => api.post("/api/admin/memory/retry"),
    onSuccess: (r: any) => {
      toast.push("success", `Re-queued ${r.data.count} failed operations`);
      qc.invalidateQueries({ queryKey: ["memory-ops"] });
      qc.invalidateQueries({ queryKey: ["memory-status"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-navy-800">
            <BrainCircuit className="h-6 w-6 text-teal-600" /> Memory monitoring
          </h1>
          <p className="text-sm text-slate-500">Hindsight operation queue and health.</p>
        </div>
        <Button variant="outline" loading={retry.isPending} onClick={() => retry.mutate()}>
          <RefreshCw className="h-4 w-4" /> Retry failed
        </Button>
      </div>

      <Card
        className={
          status?.hindsight_enabled
            ? status?.healthy
              ? "border-green-200 bg-green-50/40"
              : "border-red-200 bg-red-50/40"
            : "border-amber-200 bg-amber-50/40"
        }
      >
        <CardBody className="flex items-center gap-3">
          {status?.healthy ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600" />
          )}
          <div className="text-sm">
            <p className="font-semibold text-navy-800">
              {status?.hindsight_enabled
                ? status?.healthy
                  ? "Hindsight connected"
                  : "Hindsight degraded"
                : "Hindsight not configured"}
            </p>
            <p className="text-slate-600">
              Bank: <span className="font-mono">{status?.bank}</span>
              {status?.detail ? ` · ${status.detail}` : ""}
              {status?.last_success_at
                ? ` · last success ${fmtDateTime(status.last_success_at)}`
                : ""}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pending" value={status?.pending ?? 0} accent="amber" />
        <StatCard label="Processing" value={status?.processing ?? 0} accent="teal" />
        <StatCard label="Completed" value={status?.completed ?? 0} accent="green" />
        <StatCard label="Failed" value={status?.failed ?? 0} accent="red" />
        <StatCard label="Skipped" value={status?.skipped ?? 0} accent="navy" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent operations</CardTitle>
        </CardHeader>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Retries</th>
                  <th className="px-4 py-3 font-medium">Processed</th>
                  <th className="px-4 py-3 font-medium">Last error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(ops ?? []).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{titleCase(o.op_type)}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusColors[o.status] ?? statusColors.pending}>
                        {titleCase(o.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{o.retry_count}</td>
                    <td className="px-4 py-3 text-slate-500">{fmtDateTime(o.processed_at)}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-xs text-red-500">
                      {o.last_error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
