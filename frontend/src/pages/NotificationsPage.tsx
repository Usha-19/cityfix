import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState, TableSkeleton } from "@/components/ui/Skeleton";
import { fmtRelative, titleCase } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get<Notification[]>("/api/notifications")).data,
  });

  const markAll = useMutation({
    mutationFn: async () => api.post("/api/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markOne = useMutation({
    mutationFn: async (nid: string) => api.post(`/api/notifications/${nid}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy-800">Notifications</h1>
        {items.some((n) => !n.is_read) && (
          <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<Bell className="h-8 w-8" />} title="No notifications yet" />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const inner = (
                <div
                  className={cn(
                    "flex items-start gap-3 px-5 py-4",
                    !n.is_read && "bg-teal-50/40"
                  )}
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    {n.body && <p className="text-sm text-slate-500">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">
                      {titleCase(n.type)} · {fmtRelative(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-teal-500" />}
                </div>
              );
              return (
                <li key={n.id} onClick={() => !n.is_read && markOne.mutate(n.id)}>
                  {n.complaint_id ? (
                    <Link to={`/app/complaints/${n.complaint_id}`}>{inner}</Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
