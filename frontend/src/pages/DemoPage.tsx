import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  Repeat,
  Wrench,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { api } from "@/services/api";
import { fmtDate } from "@/utils/format";
import { Badge } from "@/components/ui/Badge";

interface DemoAction {
  type: string;
  date: string;
  description: string;
  outcome?: string | null;
  outcome_status: string;
}
interface DemoComplaint {
  id: string;
  reference_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  is_recurring: boolean;
  address?: string;
  created_at: string;
  actions: DemoAction[];
}

const guided = [
  { icon: ClipboardCheck, title: "A pothole is reported", text: "A citizen reports a deep pothole at Maple Junction." },
  { icon: Wrench, title: "A temporary repair is recorded", text: "An officer fills it with cold-mix asphalt." },
  { icon: CheckCircle2, title: "Marked resolved", text: "The complaint is closed as resolved." },
  { icon: ClipboardCheck, title: "A new complaint arrives", text: "Different wording, same location: 'road broken again after rain'." },
  { icon: BrainCircuit, title: "Hindsight recalls the history", text: "The system surfaces the earlier complaint and the repair." },
  { icon: AlertTriangle, title: "AI explains the recurrence", text: "It flags a possible failed fix with cited evidence." },
  { icon: Wrench, title: "Record a permanent repair", text: "The officer records a durable intervention." },
  { icon: Repeat, title: "Outcome remembered", text: "The observed outcome is stored for future recall." },
];

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const { data } = useQuery({
    queryKey: ["demo-scenario"],
    queryFn: async () => (await api.get("/api/demo/scenario")).data,
  });

  const complaints: DemoComplaint[] = data?.complaints ?? [];
  const potholeThread = complaints.filter((c) =>
    c.title.toLowerCase().includes("pothole") || c.title.toLowerCase().includes("maple") || c.title.toLowerCase().includes("road")
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-navy-800">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            Guided demonstration
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-navy-900">Watch civic memory in action</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          This guided scenario shows how CityFix changes its behaviour as new memories and
          outcomes accumulate. The data below is seeded and clearly labelled as demo.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Steps */}
          <div className="space-y-2">
            {guided.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  step === i
                    ? "border-teal-300 bg-teal-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    step === i ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-teal-600">Step {i + 1}</p>
                  <p className="text-sm font-semibold text-navy-800">{s.title}</p>
                  <p className="text-xs text-slate-500">{s.text}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Scenario thread */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-navy-800">Issue A — Maple Junction pothole</h2>
              <p className="mt-1 text-sm text-slate-500">
                The complaint thread and recorded actions, in chronological order.
              </p>
              <ol className="mt-4 space-y-4 border-l-2 border-slate-100 pl-5">
                {potholeThread.map((c) => (
                  <li key={c.id} className="relative">
                    <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-teal-500" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">{c.reference_id}</span>
                      {c.is_recurring && (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                          Recurring
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400">{fmtDate(c.created_at)}</span>
                    </div>
                    <p className="mt-0.5 font-medium text-slate-800">{c.title}</p>
                    <p className="text-sm text-slate-500">{c.description}</p>
                    {c.actions.map((a, ai) => (
                      <div
                        key={ai}
                        className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm"
                      >
                        <p className="font-medium capitalize text-navy-800">
                          {a.type.replace(/_/g, " ")} · {fmtDate(a.date)}
                        </p>
                        <p className="text-slate-600">{a.description}</p>
                        {a.outcome && (
                          <p className="mt-1 text-xs text-teal-700">Outcome: {a.outcome}</p>
                        )}
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            </div>

            {step >= 4 && (
              <div className="animate-fade-in rounded-xl border border-teal-200 bg-teal-50/60 p-5">
                <div className="flex items-center gap-2 text-teal-800">
                  <BrainCircuit className="h-5 w-5" />
                  <h3 className="font-semibold">Memory recall</h3>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  When the second report arrives, CityFix recalls the earlier pothole complaint
                  and its temporary repair — even though the wording is different. The recurrence
                  detector links them by location, category, and description.
                </p>
              </div>
            )}

            {step >= 5 && (
              <div className="animate-fade-in rounded-xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-semibold">Possible recurring issue</h3>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  The earlier temporary repair may not have resolved the underlying cause. The
                  officer is prompted to confirm the link and record a durable intervention. This
                  conclusion is grounded in the cited complaint records above — never invented.
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <button
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              {step < guided.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-700"
                >
                  Next step <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Log in to try it
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
