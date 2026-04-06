import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const markerRows = useMemo(() => markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng)), [markers]);

  useEffect(() => {
    if (!isExpanded || !mapRef.current) return;

    // Tiny delay to ensure DOM is painted before Leaflet initializes
    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

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
            <div style="font-size: 12px; margin-top: 4px;">Tài xế: ${item.driverName}</div>
            <div style="font-size: 12px;">Trạng thái: ${item.tripStatus}</div>
          </div>
        `);
        return marker;
      });

      if (pins.length > 1) {
        const group = L.featureGroup(pins);
        map.fitBounds(group.getBounds().pad(0.2));
      }

      mapInstanceRef.current = map;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isExpanded, markerRows]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <CardTitle className="text-base">Bản đồ theo dõi đội xe</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
              Đang phát triển
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2 text-xs gap-1"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isExpanded ? 'Thu gọn' : 'Mở bản đồ'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isExpanded && (
        <CardContent className="pt-0 pb-3 px-4">
          <p className="text-xs text-muted-foreground">
            GPS realtime đang phát triển. Nhấn "Mở bản đồ" để xem vị trí mock.
          </p>
        </CardContent>
      )}

      {isExpanded && (
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-2 text-xs text-blue-700">
            Đang phát triển — GPS realtime sắp ra mắt. Hiện tại bản đồ sử dụng marker mock.
          </div>
          {/* 
            CRITICAL: isolation + relative + z-0 creates a new stacking context.
            This prevents Leaflet's internal z-index (400+) from escaping and
            covering chatbot, sidebar, modals, or any other fixed/absolute UI.
          */}
          <div className="relative h-[340px] w-full overflow-hidden rounded-lg border" style={{ isolation: 'isolate', zIndex: 0 }}>
            <div ref={mapRef} className="absolute inset-0 h-full w-full" />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
