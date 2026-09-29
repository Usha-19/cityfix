import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ListChecks, Clock, Loader2, CheckCircle2, Layers, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { StatCard } from "@/components/StatCard";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/utils/format";

const COLORS = ["#0d9488", "#102a43", "#f59e0b", "#22c55e", "#ef4444", "#334e68", "#14b8a6"];

export default function OfficerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["officer-dashboard"],
    queryFn: async () => (await api.get("/api/officer/dashboard")).data,
  });

  if (isLoading || !data)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );

  const categoryData = Object.entries(data.by_category || {}).map(([k, v]) => ({
    name: CATEGORY_LABELS[k as keyof typeof CATEGORY_LABELS] ?? k,
    value: v as number,
  }));
  const statusData = Object.entries(data.by_status || {}).map(([k, v]) => ({
    name: STATUS_LABELS[k as keyof typeof STATUS_LABELS] ?? k,
    value: v as number,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-800">Municipal operations</h1>
        <p className="text-sm text-slate-500">
          Live metrics computed from the database. Demo data is labelled where present.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total complaints" value={data.total} icon={<ListChecks className="h-5 w-5" />} to="/app/officer/complaints" />
        <StatCard label="New" value={data.new} icon={<Clock className="h-5 w-5" />} accent="amber" to="/app/officer/complaints?status=new" />
        <StatCard label="In progress" value={data.in_progress} icon={<Loader2 className="h-5 w-5" />} accent="teal" to="/app/officer/complaints?status=in_progress" />
        <StatCard label="Resolved" value={data.resolved} icon={<CheckCircle2 className="h-5 w-5" />} accent="green" to="/app/officer/complaints?status=resolved" />
        <StatCard label="Reopened" value={data.reopened} icon={<AlertTriangle className="h-5 w-5" />} accent="red" to="/app/officer/complaints?status=reopened" />
        <StatCard label="Recurring flagged" value={data.recurring} icon={<Layers className="h-5 w-5" />} accent="amber" to="/app/officer/recurring" />
        <StatCard label="Issue clusters" value={data.clusters} icon={<Layers className="h-5 w-5" />} accent="navy" to="/app/officer/recurring" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Complaints by category</CardTitle>
          </CardHeader>
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complaints by status</CardTitle>
          </CardHeader>
          <CardBody className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
