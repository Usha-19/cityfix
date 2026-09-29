import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { TableSkeleton, EmptyState } from "@/components/ui/Skeleton";
import { fmtDateTime, titleCase } from "@/utils/format";
import type { } from "@/types";

interface Log {
  id: string;
  actor_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  detail?: string;
  created_at: string;
}

export default function AuditLogs() {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await api.get<Log[]>("/api/admin/audit-logs")).data,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-800">Audit logs</h1>
      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title="No audit entries yet" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity</th>
                  <th className="px-4 py-3 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data ?? []).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{fmtDateTime(l.created_at)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{titleCase(l.action)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {l.entity_type ? titleCase(l.entity_type) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{l.detail ?? "—"}</td>
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
