import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ACTION_TYPE_LABELS } from "@/utils/format";

export function RecordActionDialog({
  complaintId,
  open,
  onClose,
}: {
  complaintId: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    action_type: "inspection",
    action_date: new Date().toISOString().slice(0, 16),
    description: "",
    assigned_team: "",
    materials_used: "",
    completion_status: "completed",
    observed_outcome: "",
    outcome_status: "unknown",
    outcome_confirmed: false,
    follow_up_date: "",
    officer_notes: "",
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () =>
      api.post(`/api/officer/complaints/${complaintId}/actions`, {
        ...form,
        action_date: new Date(form.action_date).toISOString(),
        follow_up_date: form.follow_up_date ? new Date(form.follow_up_date).toISOString() : null,
      }),
    onSuccess: () => {
      toast.push("success", "Action recorded and sent to civic memory");
      qc.invalidateQueries({ queryKey: ["investigation", complaintId] });
      qc.invalidateQueries({ queryKey: ["actions", complaintId] });
      onClose();
    },
    onError: (e: any) => toast.push("error", e?.response?.data?.detail ?? "Failed to record action"),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record an action"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            Save action
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Action type</Label>
            <Select value={form.action_type} onChange={(e) => set("action_type", e.target.value)}>
              {Object.entries(ACTION_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="datetime-local" value={form.action_date} onChange={(e) => set("action_date", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What was done?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Assigned team</Label>
            <Input value={form.assigned_team} onChange={(e) => set("assigned_team", e.target.value)} />
          </div>
          <div>
            <Label>Materials / resources</Label>
            <Input value={form.materials_used} onChange={(e) => set("materials_used", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Observed outcome</Label>
          <Textarea value={form.observed_outcome} onChange={(e) => set("observed_outcome", e.target.value)} placeholder="What was the result?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Outcome status</Label>
            <Select value={form.outcome_status} onChange={(e) => set("outcome_status", e.target.value)}>
              <option value="unknown">Unknown</option>
              <option value="improved">Improved</option>
              <option value="no_change">No change</option>
              <option value="recurred">Recurred</option>
              <option value="resolved_confirmed">Resolved (confirmed)</option>
            </Select>
          </div>
          <div>
            <Label>Follow-up date</Label>
            <Input type="datetime-local" value={form.follow_up_date} onChange={(e) => set("follow_up_date", e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.outcome_confirmed}
            onChange={(e) => set("outcome_confirmed", e.target.checked)}
          />
          Outcome verified on-site (not an assumption)
        </label>
        <div>
          <Label>Internal officer notes (not visible to citizen)</Label>
          <Textarea value={form.officer_notes} onChange={(e) => set("officer_notes", e.target.value)} />
        </div>
      </div>
    </Dialog>
  );
}
