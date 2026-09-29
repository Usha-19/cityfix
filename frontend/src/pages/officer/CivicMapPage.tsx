import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Map as MapIcon, List } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "@/utils/format";

const severityColor: Record<string, string> = {
  low: "#64748b",
  medium: "#14b8a6",
  high: "#f59e0b",
  critical: "#ef4444",
};

const clusterIcon = L.divIcon({
  className: "",
  html: `<div style="background:#102a43;color:#5eead4;border:2px solid #14b8a6;border-radius:9999px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.3)">CL</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

export default function CivicMapPage() {
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"map" | "list">("map");

  const { data } = useQuery({
    queryKey: ["map-markers", { category, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (status) params.set("status", status);
      return (await api.get(`/api/map/markers?${params}`)).data;
    },
  });

  const markers = data?.markers ?? [];
  const clusters = data?.clusters ?? [];
  const center: [number, number] = markers[0]
    ? [markers[0].lat, markers[0].lng]
    : [28.6139, 77.209];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy-800">Civic memory map</h1>
        <div className="flex items-center gap-2">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-48">
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-40">
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="reopened">Reopened</option>
          </Select>
          <div className="flex rounded-lg border border-slate-300 p-0.5">
            <button
              onClick={() => setView("map")}
              className={`rounded-md px-2 py-1.5 ${view === "map" ? "bg-navy-800 text-white" : "text-slate-500"}`}
            >
              <MapIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-md px-2 py-1.5 ${view === "list" ? "bg-navy-800 text-white" : "text-slate-500"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {view === "map" ? (
        <Card>
          <CardBody className="p-3">
            <div className="h-[70vh] overflow-hidden rounded-lg border border-slate-200">
              <MapContainer center={center} zoom={14} scrollWheelZoom>
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {markers.map((m: any) => (
                  <CircleMarker
                    key={m.id}
                    center={[m.lat, m.lng]}
                    radius={m.is_recurring ? 11 : 8}
                    pathOptions={{
                      color: severityColor[m.severity] ?? "#14b8a6",
                      fillColor: severityColor[m.severity] ?? "#14b8a6",
                      fillOpacity: 0.6,
                      weight: m.is_recurring ? 3 : 1.5,
                    }}
                  >
                    <Popup>
                      <div className="space-y-1">
                        <p className="font-semibold">{m.title}</p>
                        <p className="text-xs text-slate-500">
                          {CATEGORY_LABELS[m.category as keyof typeof CATEGORY_LABELS]} · {m.reference_id}
                        </p>
                        {m.is_recurring && (
                          <span className="text-xs text-amber-600">Recurring issue</span>
                        )}
                        <br />
                        <Link
                          to={`/app/officer/complaints/${m.id}`}
                          className="text-xs font-medium text-teal-700"
                        >
                          Open investigation →
                        </Link>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                {clusters.map((cl: any) => (
                  <Marker key={cl.id} position={[cl.lat, cl.lng]} icon={clusterIcon}>
                    <Popup>
                      <div className="space-y-1">
                        <p className="font-semibold">{cl.title}</p>
                        <p className="text-xs text-slate-500">
                          {cl.code} · {cl.count} reports · {cl.status}
                        </p>
                        <Link
                          to={`/app/officer/recurring/${cl.id}`}
                          className="text-xs font-medium text-teal-700"
                        >
                          Open cluster →
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
              {Object.entries(severityColor).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full" style={{ background: c }} /> {k}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-teal-500 bg-navy-800 text-[7px] text-teal-300">
                  CL
                </span>
                cluster
              </span>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="divide-y divide-slate-100 p-0">
            {markers.map((m: any) => (
              <Link
                key={m.id}
                to={`/app/officer/complaints/${m.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-800">{m.title}</p>
                  <p className="text-xs text-slate-500">
                    {m.reference_id} · {m.address ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.is_recurring && (
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700">Recurring</Badge>
                  )}
                  <StatusBadge status={m.status} />
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
