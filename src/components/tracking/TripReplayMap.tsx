import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TripLocationLog } from '@/hooks/useTripLocationLogs';

// @ts-ignore
if ((L.Icon.Default.prototype as any)._getIconUrl) {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type TripReplayMapProps = {
  logs: TripLocationLog[];
  highlightedIndex?: number;
};

export function TripReplayMap({ logs, highlightedIndex }: TripReplayMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const path = useMemo(() => {
    return logs.map((item) => [item.latitude, item.longitude] as [number, number]);
  }, [logs]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
    }).setView([16.0544, 108.2022], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (markersLayerRef.current) {
      markersLayerRef.current.remove();
      markersLayerRef.current = null;
    }

    if (path.length === 0) return;

    polylineRef.current = L.polyline(path, {
      color: '#2563eb',
      weight: 4,
      opacity: 0.85,
    }).addTo(map);

    const markersLayer = L.layerGroup();
    logs.forEach((entry, idx) => {
      const isHighlighted = highlightedIndex === idx;
      const hasRisk = (entry.integrity_flags || []).length > 0;
      const color = isHighlighted ? '#16a34a' : hasRisk ? '#dc2626' : '#2563eb';

      const marker = L.circleMarker([entry.latitude, entry.longitude], {
        radius: isHighlighted ? 7 : 5,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: isHighlighted ? 2 : 1,
      });

      marker.bindPopup(
        `<div style="font-size:12px;line-height:1.4;">
          <div><strong>${entry.event_type || 'track_point'}</strong></div>
          <div>${new Date(entry.recorded_at).toLocaleString()}</div>
          <div>Acc: ${Math.round(entry.accuracy_m || 0)}m</div>
          <div>Risk: ${entry.integrity_risk_score || 0}</div>
        </div>`,
      );

      marker.addTo(markersLayer);
    });

    markersLayer.addTo(map);
    markersLayerRef.current = markersLayer;

    const bounds = L.latLngBounds(path);
    map.fitBounds(bounds.pad(0.1));
  }, [path, logs, highlightedIndex]);

  useEffect(() => {
    if (highlightedIndex === undefined || highlightedIndex < 0) return;
    const map = mapInstanceRef.current;
    const target = logs[highlightedIndex];
    if (!map || !target) return;

    map.panTo([target.latitude, target.longitude], { animate: true, duration: 0.35 });
  }, [highlightedIndex, logs]);

  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-lg border border-slate-200" style={{ isolation: 'isolate', zIndex: 0 }}>
      <div ref={mapRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
