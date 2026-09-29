import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons for bundlers
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat?: number | null;
  lng?: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = [lat ?? 28.6139, lng ?? 77.209];
  return (
    <div className="h-64 overflow-hidden rounded-lg border border-slate-200">
      <MapContainer center={center} zoom={14} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onPick} />
        {lat != null && lng != null && <Marker position={[lat, lng]} icon={icon} />}
      </MapContainer>
    </div>
  );
}
