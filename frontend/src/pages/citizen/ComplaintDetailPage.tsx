import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin, Clock, Repeat, MessageSquare } from "lucide-react";
import { api, fileUrl } from "@/services/api";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge, SeverityBadge, Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea, Label, Select } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { MiniMap } from "@/components/MiniMap";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { CATEGORY_LABELS, STATUS_LABELS, fmtDateTime, titleCase } from "@/utils/format";
import type { ComplaintDetail } from "@/types";

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const [rating, setRating] = useState("5");
  const [unresolved, setUnresolved] = useState(false);
  const [comment, setComment] = useState("");

  const { data: c, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => (await api.get<ComplaintDetail>(`/api/complaints/${id}`)).data,
  });

  const feedback = useMutation({
    mutationFn: async () =>
      api.post(`/api/complaints/${id}/feedback`, {
        rating: Number(rating),
        still_unresolved: unresolved,
        comment,
      }),
    onSuccess: () => {
      toast.push("success", "Thank you for your feedback");
      qc.invalidateQueries({ queryKey: ["complaint", id] });
    },
  });

  if (isLoading || !c)
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-navy-800">{c.title}</h1>
            {c.is_recurring && (
              <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                <Repeat className="mr-1 h-3 w-3" /> Recurring
              </Badge>
            )}
          </div>
          <p className="font-mono text-sm text-slate-400">{c.reference_id}</p>
        </div>
        <div className="flex items-center gap-2">
          <SeverityBadge severity={c.severity} />
          <StatusBadge status={c.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <p className="text-slate-600">{c.description}</p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-slate-500">
                <div>
                  <p className="text-xs uppercase text-slate-400">Category</p>
                  <p className="font-medium text-slate-700">{CATEGORY_LABELS[c.category]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Submitted</p>
                  <p className="font-medium text-slate-700">{fmtDateTime(c.created_at)}</p>
                </div>
                {c.address && (
                  <div className="col-span-2">
                    <p className="text-xs uppercase text-slate-400">Location</p>
                    <p className="flex items-center gap-1 font-medium text-slate-700">
                      <MapPin className="h-3.5 w-3.5" /> {c.address}
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {c.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photographs</CardTitle>
              </CardHeader>
              <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {c.attachments.map((a) => (
                  <a key={a.id} href={fileUrl(a.file_url)} target="_blank" rel="noreferrer">
                    <img
                      src={fileUrl(a.file_url)}
                      alt={a.file_name}
                      className="h-28 w-full rounded-lg border border-slate-200 object-cover"
                    />
                  </a>
                ))}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Status timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <ol className="space-y-4 border-l-2 border-slate-100 pl-5">
                {c.status_history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-teal-500" />
                    <p className="text-sm font-medium text-slate-800">
                      {STATUS_LABELS[h.to_status as keyof typeof STATUS_LABELS] ?? titleCase(h.to_status)}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3 w-3" /> {fmtDateTime(h.created_at)}
                    </p>
                    {h.note && <p className="mt-0.5 text-sm text-slate-500">{h.note}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

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

          {user?.role === "citizen" && c.status === "resolved" && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" /> Your feedback
                  </span>
                </CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <Label>How satisfied are you?</Label>
                  <Select value={rating} onChange={(e) => setRating(e.target.value)}>
                    <option value="5">Very satisfied</option>
                    <option value="4">Satisfied</option>
                    <option value="3">Neutral</option>
                    <option value="2">Dissatisfied</option>
                    <option value="1">Very dissatisfied</option>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={unresolved}
                    onChange={(e) => setUnresolved(e.target.checked)}
                  />
                  The issue is still unresolved
                </label>
                <Textarea
                  placeholder="Optional comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button
                  className="w-full"
                  loading={feedback.isPending}
                  onClick={() => feedback.mutate()}
                >
                  Submit feedback
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
