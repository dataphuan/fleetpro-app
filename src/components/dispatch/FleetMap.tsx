import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface VehicleLocation {
    id: string;
    license_plate: string;
    lat: number;
    lng: number;
    status: 'moving' | 'idle' | 'stopped';
    driver_name: string;
    trip_code?: string;
}

interface FleetMapProps {
    locations: VehicleLocation[];
}

// Fix Leaflet marker icon issue in React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const FleetMap = ({ locations }: FleetMapProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<Record<string, L.Marker>>({});

    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;

        // Initialize map: Center of Vietnam (Da Nang area)
        mapInstance.current = L.map(mapRef.current).setView([16.0544, 108.2022], 6);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(mapInstance.current);

        return () => {
            mapInstance.current?.remove();
            mapInstance.current = null;
        };
    }, []);

    useEffect(() => {
        if (!mapInstance.current) return;

        // Update markers
        locations.forEach(loc => {
            const markerColor = loc.status === 'moving' ? '#22c55e' : (loc.status === 'idle' ? '#f59e0b' : '#ef4444');
            const popupContent = `
                <div style="font-family: sans-serif; padding: 5px;">
                    <div style="font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 5px;">${loc.license_plate}</div>
                    <div style="font-size: 11px;">TX: ${loc.driver_name}</div>
                    <div style="font-size: 11px;">Chuyến: ${loc.trip_code || 'Sẵn sàng'}</div>
                    <div style="margin-top: 5px; font-size: 10px; color: ${markerColor}; font-weight: bold;">
                        ${loc.status.toUpperCase()}
                    </div>
                </div>
            `;

            if (markersRef.current[loc.id]) {
                markersRef.current[loc.id].setLatLng([loc.lat, loc.lng]).setPopupContent(popupContent);
            } else {
                const marker = L.marker([loc.lat, loc.lng])
                    .addTo(mapInstance.current!)
                    .bindPopup(popupContent);
                markersRef.current[loc.id] = marker;
            }
        });

        // Optional: Fit bounds if many markers
        if (locations.length > 0) {
            const group = L.featureGroup(Object.values(markersRef.current));
            mapInstance.current.fitBounds(group.getBounds().pad(0.1));
        }
    }, [locations]);

    return (
        <div ref={mapRef} className="w-full h-full rounded-xl shadow-inner border bg-slate-50 overflow-hidden z-0" />
    );
};
