import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Layers } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { fmtDate, titleCase } from "@/utils/format";
import type { ClusterDetail } from "@/types";

export default function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [hypothesis, setHypothesis] = useState("");
  const [verified, setVerified] = useState("");
  const [status, setStatus] = useState("");

  const { data: cl, isLoading } = useQuery({
    queryKey: ["cluster", id],
    queryFn: async () => (await api.get<ClusterDetail>(`/api/officer/clusters/${id}`)).data,
  });

  const decide = useMutation({
    mutationFn: async ({ membership_id, accept }: { membership_id: string; accept: boolean }) =>
      api.post(`/api/officer/clusters/${id}/decide`, { membership_id, accept }),
    onSuccess: () => {
      toast.push("success", "Match decision saved");
      qc.invalidateQueries({ queryKey: ["cluster", id] });
    },
  });

  const rootCause = useMutation({
    mutationFn: async () =>
      api.post(`/api/officer/clusters/${id}/root-cause`, {
        root_cause_hypothesis: hypothesis || null,
        verified_cause: verified || null,
      }),
    onSuccess: () => {
      toast.push("success", "Root cause updated");
      qc.invalidateQueries({ queryKey: ["cluster", id] });
    },
  });

  const setStatusMut = useMutation({
    mutationFn: async (s: string) =>
      api.post(`/api/officer/clusters/${id}/status?status_value=${s}`),
    onSuccess: () => {
      toast.push("success", "Cluster status updated");
      qc.invalidateQueries({ queryKey: ["cluster", id] });
    },
  });

  if (isLoading || !cl)
    return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-teal-600" />
            <h1 className="text-2xl font-bold text-navy-800">{cl.title}</h1>
          </div>
          <p className="font-mono text-sm text-slate-400">{cl.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">Set status…</option>
            <option value="proposed">Proposed</option>
            <option value="confirmed">Confirmed</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </Select>
          <Button variant="outline" disabled={!status} onClick={() => status && setStatusMut.mutate(status)}>
            Apply
          </Button>
        </div>
      </div>

      {cl.ai_explanation && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardBody className="text-sm text-slate-700">{cl.ai_explanation}</CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Cluster members</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {cl.members.map((m) => (
                <div key={m.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/app/officer/complaints/${m.complaint_id}`}
                      className="min-w-0"
                    >
                      <p className="truncate font-medium text-slate-800 hover:text-teal-700">
                        {m.complaint_title ?? "Complaint"}
                      </p>
                      {m.complaint_reference && (
                        <p className="font-mono text-xs text-slate-400">{m.complaint_reference}</p>
                      )}
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.match_score != null && (
                        <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                          {Math.round(m.match_score * 100)}%
                        </Badge>
                      )}
                      <Badge
                        className={
                          m.status === "confirmed"
                            ? "border-teal-200 bg-teal-50 text-teal-700"
                            : m.status === "rejected"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                        }
                      >
                        {titleCase(m.status)}
                      </Badge>
                    </div>
                  </div>
                  {m.evidence_summary && (
                    <p className="mt-1.5 text-xs text-slate-500">{m.evidence_summary}</p>
                  )}
                  {m.status === "proposed" && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => decide.mutate({ membership_id: m.id, accept: true })}
                      >
                        <Check className="h-4 w-4" /> Confirm match
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide.mutate({ membership_id: m.id, accept: false })}
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm text-slate-600">
              <p>Reports: <span className="font-medium">{cl.recurrence_count}</span></p>
              <p>First reported: {fmtDate(cl.first_reported_at)}</p>
              <p>Latest report: {fmtDate(cl.last_reported_at)}</p>
              {cl.locality && <p>Locality: {cl.locality}</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Root cause</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <Label>Hypothesis</Label>
                <Textarea
                  placeholder={cl.root_cause_hypothesis ?? "Proposed cause (unverified)"}
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                />
              </div>
              <div>
                <Label>Verified cause (evidence-backed)</Label>
                <Textarea
                  placeholder={cl.verified_cause ?? "Only fill when confirmed on-site"}
                  value={verified}
                  onChange={(e) => setVerified(e.target.value)}
                />
              </div>
              <Button className="w-full" loading={rootCause.isPending} onClick={() => rootCause.mutate()}>
                Save
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
