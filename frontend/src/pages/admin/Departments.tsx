import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Plus, Users, ListChecks, ChevronRight } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { EmptyState, TableSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CATEGORY_LABELS, fmtDate } from "@/utils/format";
import type { ComplaintStatus } from "@/types";

interface Dept {
  id: string;
  name: string;
  description?: string;
  categories?: string;
}

interface DeptDetail {
  department: Dept;
  officer_count: number;
  complaint_count: number;
  status_counts: Record<string, number>;
  complaints: {
    id: string;
    reference_id: string;
    title: string;
    category: string;
    status: ComplaintStatus;
    severity: string;
    is_recurring: boolean;
    created_at: string | null;
  }[];
}

export default function Departments() {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", categories: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await api.get<Dept[]>("/api/admin/departments")).data,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["department", selectedId],
    queryFn: async () =>
      (await api.get<DeptDetail>(`/api/admin/departments/${selectedId}`)).data,
    enabled: !!selectedId,
  });

  const create = useMutation({
    mutationFn: async () => api.post("/api/admin/departments", form),
    onSuccess: () => {
      toast.push("success", "Department created");
      qc.invalidateQueries({ queryKey: ["departments"] });
      setOpen(false);
      setForm({ name: "", description: "", categories: "" });
    },
    onError: (e: any) =>
      toast.push("error", e?.response?.data?.detail ?? "Could not create department"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Departments</h1>
          <p className="text-sm text-slate-500">Select a department to see its complaints.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New department
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="No departments yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedId(d.id)}
              className="text-left"
            >
              <Card className="h-full transition-all hover:border-teal-300 hover:shadow-soft">
                <CardBody>
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-navy-800">{d.name}</p>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                  {d.description && (
                    <p className="mt-1 text-sm text-slate-500">{d.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(d.categories ?? "")
                      .split(",")
                      .filter(Boolean)
                      .map((c) => (
                        <Badge key={c} className="border-slate-200 bg-slate-50 text-slate-600">
                          {CATEGORY_LABELS[c.trim() as keyof typeof CATEGORY_LABELS] ?? c}
                        </Badge>
                      ))}
                  </div>
                </CardBody>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Department detail dialog */}
      <Dialog
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={detail?.department.name ?? "Department"}
      >
        {detailLoading || !detail ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {detail.department.description && (
              <p className="text-sm text-slate-500">{detail.department.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" /> Officers
                </p>
                <p className="mt-1 text-xl font-bold text-navy-800">{detail.officer_count}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <ListChecks className="h-3.5 w-3.5" /> Complaints
                </p>
                <p className="mt-1 text-xl font-bold text-navy-800">{detail.complaint_count}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-navy-800">Complaints</p>
              {detail.complaints.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                  No complaints routed to this department yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {detail.complaints.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/app/officer/complaints/${c.id}`}
                        onClick={() => setSelectedId(null)}
                        className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {c.title}
                          </p>
                          <p className="font-mono text-xs text-slate-400">
                            {c.reference_id} · {fmtDate(c.created_at)}
                          </p>
                        </div>
                        <StatusBadge status={c.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* New department dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="New department"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Categories (comma-separated keys)</Label>
            <Input
              placeholder="roads_potholes,public_safety"
              value={form.categories}
              onChange={(e) => setForm({ ...form, categories: e.target.value })}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
