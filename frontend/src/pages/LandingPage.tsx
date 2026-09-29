import { Link } from "react-router-dom";
import {
  BrainCircuit,
  MapPin,
  Repeat,
  History,
  ClipboardCheck,
  ArrowRight,
  ShieldCheck,
  Network,
  Github,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { Logo, LogoMark } from "@/components/Logo";

const steps = [
  { icon: ClipboardCheck, title: "Report", text: "Citizens report civic problems with location and photos." },
  { icon: BrainCircuit, title: "Remember", text: "Each complaint becomes a persistent memory in Hindsight." },
  { icon: Network, title: "Connect", text: "New reports recall related past incidents automatically." },
  { icon: ClipboardCheck, title: "Resolve", text: "Officers act with full historical context." },
  { icon: Repeat, title: "Learn", text: "Recorded outcomes improve future recommendations." },
];

const capabilities = [
  { icon: Repeat, title: "Recurring issue detection", text: "Multi-signal grouping across location, category, time, and wording." },
  { icon: History, title: "Failed-fix intelligence", text: "Flags repairs that may not have addressed the root cause." },
  { icon: MapPin, title: "Civic memory map", text: "Every issue and cluster on an interactive OpenStreetMap." },
  { icon: BrainCircuit, title: "Historical evidence", text: "AI briefs cite the exact complaint IDs and dates behind each claim." },
  { icon: ShieldCheck, title: "Resolution tracking", text: "Never marks an issue solved without supporting evidence." },
];

export default function LandingPage() {
  const { data: demo } = useQuery({
    queryKey: ["demo-scenario"],
    queryFn: async () => (await api.get("/api/demo/scenario")).data,
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Logo className="scale-110" />
          <div className="flex items-center gap-5">
            <Link to="/demo" className="hidden text-base font-medium text-slate-600 hover:text-navy-800 sm:block">
              Demo
            </Link>
            <Link to="/login" className="text-base font-medium text-slate-600 hover:text-navy-800">
              Log in
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-navy-800 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-navy-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* soft background accents */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-teal-100/50 blur-3xl" />
          <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-navy-100/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-6 py-28 text-center lg:py-36">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
            <BrainCircuit className="h-4 w-4" /> Powered by Hindsight agent memory
          </span>
          <h1 className="mt-8 text-5xl font-extrabold leading-[1.1] tracking-tight text-navy-900 sm:text-6xl lg:text-7xl">
            Cities that remember.
            <span className="text-teal-600"> Problems that stay solved.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-xl leading-relaxed text-slate-600 lg:text-2xl">
            CityFix connects new complaints with past repairs and their real outcomes.
            It remembers the history of every civic issue, so recurring problems get
            investigated with context instead of starting from zero.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-8 py-4 text-lg font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 hover:bg-navy-700"
            >
              Report a Civic Issue <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-8 py-4 text-lg font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
            >
              Explore the Demo
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-base text-slate-500">
            <span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-teal-600" /> Evidence-based</span>
            <span className="flex items-center gap-2"><MapPin className="h-5 w-5 text-teal-600" /> Location-aware</span>
            <span className="flex items-center gap-2"><Repeat className="h-5 w-5 text-teal-600" /> Recurrence detection</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-4xl font-bold text-navy-800">How it works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-500">
            Five steps that turn one-off complaints into lasting civic memory.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map((s, i) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card transition-transform hover:-translate-y-1">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-navy-800 text-teal-400">
                  <s.icon className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">Step {i + 1}</p>
                <p className="mt-1 text-xl font-bold text-navy-800">{s.title}</p>
                <p className="mt-2 text-base leading-relaxed text-slate-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-4xl font-bold text-navy-800">Key capabilities</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-lg text-slate-500">
            Built around memory, evidence, and location — not just ticket tracking.
          </p>
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c) => (
              <div key={c.title} className="rounded-2xl border border-slate-200 p-8 transition-all hover:border-teal-300 hover:shadow-soft">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50">
                  <c.icon className="h-7 w-7 text-teal-600" />
                </div>
                <p className="mt-5 text-xl font-bold text-navy-800">{c.title}</p>
                <p className="mt-2 text-base leading-relaxed text-slate-500">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact (demo) */}
      <section className="border-t border-slate-100 bg-navy-800 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-4xl font-bold">Impact dashboard</h2>
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm">Demo statistics</span>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: "Demo complaints", value: demo?.stats?.complaints ?? "—" },
              { label: "Resolved", value: demo?.stats?.resolved ?? "—" },
              { label: "Recurring flagged", value: demo?.stats?.recurring ?? "—" },
              { label: "Issue clusters", value: demo?.stats?.clusters ?? "—" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/5 p-8">
                <p className="text-5xl font-extrabold text-teal-400">{s.value}</p>
                <p className="mt-2 text-base text-slate-300">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-400">
            Figures reflect the seeded demonstration dataset, not real-world municipal results.
          </p>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-teal-600 py-16 text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to help your city remember?</h2>
          <p className="max-w-2xl text-lg text-teal-50">
            Report an issue in minutes, or explore the guided demo to see civic memory in action.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="rounded-xl bg-white px-8 py-4 text-lg font-semibold text-navy-800 transition-transform hover:-translate-y-0.5"
            >
              Get started free
            </Link>
            <Link
              to="/demo"
              className="rounded-xl border-2 border-white/70 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10"
            >
              Explore the Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-base text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <LogoMark className="h-7 w-7 text-navy-800" />
            <span>CityFix — AI civic memory platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/demo" className="hover:text-navy-800">Demo</Link>
            <Link to="/login" className="hover:text-navy-800">Log in</Link>
            <a
              href="https://github.com/vectorize-io/hindsight"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-navy-800"
            >
              <Github className="h-5 w-5" /> Hindsight
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
