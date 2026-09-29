import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Repeat } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge, SeverityBadge, Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { TableSkeleton, EmptyState } from "@/components/ui/Skeleton";
import { CATEGORY_LABELS, CATEGORY_OPTIONS, fmtDate } from "@/utils/format";
import type { Complaint, Paginated } from "@/types";

export default function ComplaintManagement() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [category, setCategory] = useState("");
  const [recurring, setRecurring] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { data, isLoading } = useQuery({
    queryKey: ["officer-complaints", { search, status, category, recurring, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (recurring) params.set("recurring", recurring);
      return (await api.get<Paginated<Complaint>>(`/api/officer/complaints?${params}`)).data;
    },
  });

  const items = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / pageSize) || 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy-800">Complaint management</h1>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search reference, title, location..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="reopened">Reopened</option>
          </Select>
          <Select className="w-48" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select className="w-36" value={recurring} onChange={(e) => { setRecurring(e.target.value); setPage(1); }}>
            <option value="">All issues</option>
            <option value="true">Recurring only</option>
            <option value="false">Non-recurring</option>
          </Select>
        </CardBody>
      </Card>

      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState title="No complaints found" description="Adjust your filters to see more." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/app/officer/complaints/${c.id}`}
                        className="font-mono text-xs font-medium text-teal-700 hover:underline"
                      >
                        {c.reference_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{c.title}</span>
                      {c.is_recurring && (
                        <Badge className="ml-2 border-amber-200 bg-amber-50 text-amber-700">
                          <Repeat className="mr-1 h-3 w-3" /> Recurring
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{CATEGORY_LABELS[c.category]}</td>
                    <td className="px-4 py-3 text-slate-500">{c.address ?? "—"}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                    <td className="px-4 py-3 text-slate-500">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{data?.total ?? 0} complaints</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="flex items-center px-2 text-sm text-slate-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
