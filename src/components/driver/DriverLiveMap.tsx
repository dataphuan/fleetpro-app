import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type DriverLiveMapProps = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

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

export function DriverLiveMap({ latitude, longitude, accuracy }: DriverLiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([latitude, longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.marker([latitude, longitude]).addTo(map);

    if (accuracy && accuracy > 0) {
      accuracyCircleRef.current = L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 1,
      }).addTo(map);
    }

    mapInstanceRef.current = map;

    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [latitude, longitude, accuracy]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const nextLatLng: [number, number] = [latitude, longitude];
    markerRef.current?.setLatLng(nextLatLng);

    if (accuracy && accuracy > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(nextLatLng, {
          radius: accuracy,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng(nextLatLng);
        accuracyCircleRef.current.setRadius(accuracy);
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }

    map.panTo(nextLatLng, { animate: true, duration: 0.4 });
  }, [latitude, longitude, accuracy]);

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-lg border border-slate-200" style={{ isolation: 'isolate', zIndex: 0 }}>
      <div ref={mapRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
