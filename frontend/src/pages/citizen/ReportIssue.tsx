import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Upload, CheckCircle2 } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select, Textarea, FieldError } from "@/components/ui/Input";
import { LocationPicker } from "@/components/LocationPicker";
import { CATEGORY_OPTIONS } from "@/utils/format";
import type { ComplaintDetail } from "@/types";

const schema = z.object({
  title: z.string().min(4, "Give a short, clear title"),
  description: z.string().min(10, "Describe the issue in a little more detail"),
  category: z.string().min(1, "Select a category"),
  address: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  observed_at: z.string().optional(),
  extra_notes: z.string().optional(),
});
type Form = z.infer<typeof schema>;

export default function ReportIssue() {
  const nav = useNavigate();
  const toast = useToast();
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<ComplaintDetail | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { severity: "medium" } });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        latitude: coords.lat ?? null,
        longitude: coords.lng ?? null,
        observed_at: data.observed_at ? new Date(data.observed_at).toISOString() : null,
      };
      const { data: complaint } = await api.post<ComplaintDetail>("/api/complaints", payload);

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/api/complaints/${complaint.id}/attachments`, fd);
      }
      setCreated(complaint);
      toast.push("success", "Complaint submitted. AI memory workflow started.");
    } catch (e: any) {
      toast.push("error", e?.response?.data?.detail ?? "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <Card>
          <CardBody className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-navy-800">Complaint submitted</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your reference ID is{" "}
              <span className="font-mono font-semibold text-navy-800">{created.reference_id}</span>
            </p>
            <p className="mt-3 text-sm text-slate-500">
              CityFix is now recalling related history in the background. You will be notified
              of updates.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => nav(`/app/complaints/${created.id}`)}>
                View complaint
              </Button>
              <Button onClick={() => nav("/app/citizen")}>Back to dashboard</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Report a civic issue</h1>
        <p className="text-sm text-slate-500">
          Give us the details. Accurate location helps us connect related reports.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Issue details</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input placeholder="e.g. Large pothole at Maple Junction" {...register("title")} />
              <FieldError>{errors.title?.message}</FieldError>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Describe what you observed..." {...register("description")} />
              <FieldError>{errors.description?.message}</FieldError>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Category</Label>
                <Select {...register("category")}>
                  <option value="">Select category</option>
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <FieldError>{errors.category?.message}</FieldError>
              </div>
              <div>
                <Label>Severity</Label>
                <Select {...register("severity")}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Date & time observed (optional)</Label>
              <Input type="datetime-local" {...register("observed_at")} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Address / locality</Label>
              <Input placeholder="e.g. Maple Junction, Fictional Nagar" {...register("address")} />
            </div>
            <LocationPicker
              lat={coords.lat}
              lng={coords.lng}
              onPick={(lat, lng) => setCoords({ lat, lng })}
            />
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {coords.lat
                ? `Selected: ${coords.lat.toFixed(5)}, ${coords.lng?.toFixed(5)}`
                : "Tap the map to select the exact location (optional)."}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Photo & notes</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Label>Photograph (optional, max 5MB)</Label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 hover:bg-slate-50">
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-500">
                  {file ? file.name : "Click to upload an image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <div>
              <Label>Additional notes (optional)</Label>
              <Textarea {...register("extra_notes")} />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => nav("/app/citizen")}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Submit complaint
          </Button>
        </div>
      </form>
    </div>
  );
}
