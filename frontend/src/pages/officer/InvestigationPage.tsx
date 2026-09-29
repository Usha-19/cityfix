import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BrainCircuit,
  AlertTriangle,
  MapPin,
  Wrench,
  ClipboardList,
  Sparkles,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge, SeverityBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniMap } from "@/components/MiniMap";
import { useToast } from "@/components/ui/Toast";
import { RecordActionDialog } from "./RecordActionDialog";
import { CATEGORY_LABELS, fmtDate, fmtDateTime, titleCase } from "@/utils/format";
import type { ComplaintDetail, IssueBrief } from "@/types";

export default function InvestigationPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const toast = useToast();
  const [actionOpen, setActionOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["investigation", id],
    queryFn: async () => (await api.get(`/api/officer/complaints/${id}/investigation`)).data,
  });

  const brief = useMutation({
    mutationFn: async () =>
      (await api.get<IssueBrief>(`/api/officer/complaints/${id}/brief`)).data,
  });

  const statusMut = useMutation({
    mutationFn: async (to_status: string) =>
      api.post(`/api/officer/complaints/${id}/status`, { to_status, visible_to_citizen: true }),
    onSuccess: () => {
      toast.push("success", "Status updated");
      qc.invalidateQueries({ queryKey: ["investigation", id] });
    },
  });

  if (isLoading || !data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  const c: ComplaintDetail = data.complaint;
  const related = data.related as Array<{ complaint: ComplaintDetail; score: number; evidence: any }>;
  const timeline = data.timeline as Array<any>;
  const failedFix = data.failed_fix;
  const b = brief.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-800">{c.title}</h1>
            {c.is_recurring && (
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">Recurring</Badge>
            )}
          </div>
          <p className="font-mono text-sm text-slate-400">{c.reference_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-40">
            <option value="">Change status…</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="reopened">Reopened</option>
            <option value="closed">Closed</option>
          </Select>
          <Button
            variant="outline"
            disabled={!newStatus}
            onClick={() => newStatus && statusMut.mutate(newStatus)}
          >
            Apply
          </Button>
          <Button onClick={() => setActionOpen(true)}>
            <Wrench className="h-4 w-4" /> Record action
          </Button>
        </div>
      </div>

      {failedFix && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardBody className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">Possible recurring issue / failed fix</p>
              <p className="mt-1 text-slate-700">{failedFix.note}</p>
              <p className="mt-2 text-slate-600">
                Earlier complaint{" "}
                <Link
                  to={`/app/officer/complaints/${failedFix.previous_complaint_id}`}
                  className="font-mono text-teal-700 hover:underline"
                >
                  {failedFix.previous_reference_id}
                </Link>{" "}
                had a {titleCase(failedFix.repair_type)} on {fmtDate(failedFix.repair_date)}
                {failedFix.days_to_recurrence != null &&
                  ` — recurrence appeared ${failedFix.days_to_recurrence} days later`}
                . Match score {failedFix.match_score}.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Current complaint */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Current complaint</CardTitle>
              <div className="flex gap-2">
                <SeverityBadge severity={c.severity} />
                <StatusBadge status={c.status} />
              </div>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <p className="text-slate-600">{c.description}</p>
              <div className="flex flex-wrap gap-4 pt-1 text-slate-500">
                <span>{CATEGORY_LABELS[c.category]}</span>
                {c.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {c.address}
                  </span>
                )}
                <span>Submitted {fmtDate(c.created_at)}</span>
              </div>
            </CardBody>
          </Card>

          {/* Related historical complaints */}
          <Card>
            <CardHeader>
              <CardTitle>
                <span className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Related historical complaints
                </span>
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {related.length === 0 ? (
                <p className="text-sm text-slate-500">No related complaints detected.</p>
              ) : (
                related.map((r) => (
                  <Link
                    key={r.complaint.id}
                    to={`/app/officer/complaints/${r.complaint.id}`}
                    className="block rounded-lg border border-slate-200 p-3 hover:border-teal-300 hover:bg-teal-50/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{r.complaint.title}</span>
                      <Badge className="border-teal-200 bg-teal-50 text-teal-700">
                        match {Math.round(r.score * 100)}%
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.complaint.reference_id} · {r.complaint.status} ·{" "}
                      {r.evidence.distance_m != null
                        ? `${r.evidence.distance_m}m away · `
                        : ""}
                      similarity {r.evidence.semantic_similarity}
                    </p>
                  </Link>
                ))
              )}
            </CardBody>
          </Card>

          {/* AI brief */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-teal-600" /> AI investigation brief
                </span>
              </CardTitle>
              <Button size="sm" variant="secondary" loading={brief.isPending} onClick={() => brief.mutate()}>
                <Sparkles className="h-4 w-4" /> Generate
              </Button>
            </CardHeader>
            <CardBody>
              {!b ? (
                <p className="text-sm text-slate-500">
                  Generate a grounded brief that synthesises the recalled history. Every claim is
                  backed by cited complaint records.
                </p>
              ) : (
                <div className="space-y-4 text-sm">
                  {b.degraded && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                      Hindsight memory is unavailable — this brief is grounded in database records
                      only (degraded mode).
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-navy-800">Current summary</p>
                    <p className="text-slate-600">{b.current_summary}</p>
                  </div>
                  {b.possible_recurring_pattern && (
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="font-semibold text-amber-800">Possible recurring pattern</p>
                      <p className="text-slate-700">{b.possible_recurring_pattern}</p>
                    </div>
                  )}
                  {b.previous_actions.length > 0 && (
                    <BriefList title="Previous actions" items={b.previous_actions} />
                  )}
                  {b.recorded_outcomes.length > 0 && (
                    <BriefList title="Recorded outcomes" items={b.recorded_outcomes} />
                  )}
                  {b.historical_incidents.length > 0 && (
                    <BriefList title="Recalled context" items={b.historical_incidents} />
                  )}
                  {b.recommended_investigation.length > 0 && (
                    <BriefList title="Recommended next steps" items={b.recommended_investigation} />
                  )}
                  {b.supporting_evidence.length > 0 && (
                    <div>
                      <p className="flex items-center gap-1.5 font-semibold text-navy-800">
                        <FileText className="h-4 w-4" /> Supporting evidence
                      </p>
                      <ul className="mt-1 space-y-1">
                        {b.supporting_evidence.map((e, i) => (
                          <li key={i} className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-xs">
                            <span className="font-mono text-teal-700">{e.reference_id}</span>{" "}
                            <span className="text-slate-400">({e.kind})</span> — {e.summary}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {b.uncertainties.length > 0 && (
                    <BriefList title="Uncertainties" items={b.uncertainties} muted />
                  )}
                  <p className="flex items-center gap-1.5 text-xs text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Confidence: {b.confidence} ·{" "}
                    {b.grounded ? "grounded in records" : "ungrounded"}
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar: map + civic memory timeline */}
        <div className="space-y-4">
          {c.latitude != null && c.longitude != null && (
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardBody className="p-3">
                <MiniMap lat={c.latitude} lng={c.longitude} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Civic memory timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
                {timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span
                      className={`absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                        t.type === "action" ? "bg-teal-500" : "bg-navy-400"
                      }`}
                    />
                    <p className="text-xs font-medium text-slate-800">
                      {titleCase(t.detail)}{" "}
                      <span className="font-normal text-slate-400">{fmtDateTime(t.at)}</span>
                    </p>
                    {t.note && <p className="text-xs text-slate-500">{t.note}</p>}
                    {t.outcome && <p className="text-xs text-teal-600">Outcome: {t.outcome}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <RecordActionDialog complaintId={id!} open={actionOpen} onClose={() => setActionOpen(false)} />
    </div>
  );
}

function BriefList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <p className="font-semibold text-navy-800">{title}</p>
      <ul className={`mt-1 list-disc space-y-0.5 pl-5 ${muted ? "text-slate-400" : "text-slate-600"}`}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
