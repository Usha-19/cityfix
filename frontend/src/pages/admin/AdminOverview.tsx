import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, BrainCircuit, ScrollText, Layers, Activity } from "lucide-react";
import { api } from "@/services/api";
import { StatCard } from "@/components/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import type { MemoryStatus } from "@/types";

export default function AdminOverview() {
  const { data: mem } = useQuery({
    queryKey: ["memory-status"],
    queryFn: async () => (await api.get<MemoryStatus>("/api/admin/memory/status")).data,
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/api/admin/users")).data,
  });
  const { data: dashboard } = useQuery({
    queryKey: ["officer-dashboard"],
    queryFn: async () => (await api.get("/api/officer/dashboard")).data,
  });

  const links = [
    { to: "/app/admin/users", label: "User management", icon: Users, desc: "Roles & access" },
    { to: "/app/admin/departments", label: "Departments", icon: Building2, desc: "Civic departments" },
    { to: "/app/admin/memory", label: "Memory monitor", icon: BrainCircuit, desc: "Hindsight operations" },
    { to: "/app/admin/audit", label: "Audit logs", icon: ScrollText, desc: "System activity" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy-800">Admin overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={users?.length ?? "—"} icon={<Users className="h-5 w-5" />} to="/app/admin/users" />
        <StatCard label="Complaints" value={dashboard?.total ?? "—"} icon={<Activity className="h-5 w-5" />} accent="teal" to="/app/officer/complaints" />
        <StatCard label="Clusters" value={dashboard?.clusters ?? "—"} icon={<Layers className="h-5 w-5" />} accent="amber" to="/app/officer/recurring" />
        <StatCard
          label="Memory status"
          value={mem?.hindsight_enabled ? (mem.healthy ? "Healthy" : "Degraded") : "Off"}
          icon={<BrainCircuit className="h-5 w-5" />}
          accent={mem?.healthy ? "green" : "red"}
          to="/app/admin/memory"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((l) => (
          <Link key={l.to} to={l.to}>
            <Card className="h-full transition-colors hover:border-teal-300">
              <CardBody>
                <l.icon className="h-6 w-6 text-teal-600" />
                <p className="mt-3 font-semibold text-navy-800">{l.label}</p>
                <p className="text-sm text-slate-500">{l.desc}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Memory operations snapshot</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "Pending", value: mem?.pending, color: "text-amber-600" },
            { label: "Processing", value: mem?.processing, color: "text-teal-600" },
            { label: "Completed", value: mem?.completed, color: "text-green-600" },
            { label: "Failed", value: mem?.failed, color: "text-red-600" },
            { label: "Skipped", value: mem?.skipped, color: "text-slate-500" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? 0}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
