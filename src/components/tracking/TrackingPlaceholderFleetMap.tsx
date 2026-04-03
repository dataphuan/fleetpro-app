import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const center: [number, number] = [12.2388, 109.1967];

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type VehicleMarker = {
  id: string;
  plate: string;
  driverName: string;
  tripStatus: string;
  lat: number;
  lng: number;
};

interface TrackingPlaceholderFleetMapProps {
  markers: VehicleMarker[];
}

function parseLatLng(value?: string | null): [number, number] | null {
  if (!value) return null;
  const parts = value.split(",").map((x) => Number(x.trim()));
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return [parts[0], parts[1]];
}

export function buildMockMarkers(
  vehicles: any[],
  drivers: any[],
  trips: any[],
): VehicleMarker[] {
  const activeTrips = trips.filter((trip) => ["confirmed", "dispatched", "in_progress"].includes(trip.status));

  return vehicles.slice(0, 4).map((vehicle, idx) => {
    const location = parseLatLng(vehicle.current_location);
    const trip = activeTrips.find((row) => String(row.vehicle_id) === String(vehicle.id));
    const driver = drivers.find((d) => String(d.id) === String(trip?.driver_id || vehicle.assigned_driver_id));

    const lat = location?.[0] ?? center[0] + (idx - 1.5) * 0.012;
    const lng = location?.[1] ?? center[1] + (idx - 1.5) * 0.018;

    return {
      id: String(vehicle.id),
      plate: String(vehicle.license_plate || vehicle.vehicle_code || `XE${idx + 1}`),
      driverName: String(driver?.full_name || "Chua phan cong"),
      tripStatus: String(trip?.status || vehicle.status || "san_sang"),
      lat,
      lng,
    };
  });
}

export function TrackingPlaceholderFleetMap({ markers }: TrackingPlaceholderFleetMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  const markerRows = useMemo(() => markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)), [markers]);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(center, 10);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const pins = markerRows.map((item) => {
      const marker = L.marker([item.lat, item.lng]).addTo(map);
      marker.bindPopup(`
        <div style="font-family: Inter, Arial, sans-serif; min-width: 180px;">
          <div style="font-weight: 700;">${item.plate}</div>
          <div style="font-size: 12px; margin-top: 4px;">Tai xe: ${item.driverName}</div>
          <div style="font-size: 12px;">Trang thai: ${item.tripStatus}</div>
        </div>
      `);
      return marker;
    });

    if (pins.length > 1) {
      const group = L.featureGroup(pins);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      map.remove();
    };
  }, [markerRows]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Tracking Center - GPS Placeholder</CardTitle>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Dang phat trien
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2 text-xs text-blue-700">
          Dang phat trien - GPS realtime sap ra mat. Hien tai map su dung marker mock theo du lieu xe tai Nha Trang.
        </div>
        <div className="relative h-[340px] w-full overflow-hidden rounded-lg border">
          <div ref={mapRef} className="absolute inset-0 h-full w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
