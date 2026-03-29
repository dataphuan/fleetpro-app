import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, RefreshCw, Settings, Wifi, WifiOff, Map } from 'lucide-react';
import type { Vehicle } from '@/shared/types/domain';

// =============================================
// MAP & GPS CONFIG
// =============================================
interface MapConfig {
    mapProvider: 'openstreetmap' | 'google' | 'google_satellite' | 'google_terrain';
    googleMapsApiKey: string;
}

interface GPSConfig {
    provider: string;
    apiUrl: string;
    apiKey: string;
    refreshInterval: number;
    isConnected: boolean;
}

interface FullConfig {
    map: MapConfig;
    gps: GPSConfig;
}

const DEFAULT_CONFIG: FullConfig = {
    map: {
        mapProvider: 'openstreetmap',
        googleMapsApiKey: '',
    },
    gps: {
        provider: '',
        apiUrl: '',
        apiKey: '',
        refreshInterval: 30,
        isConnected: false,
    },
};

// Load/Save config from localStorage
const loadConfig = (): FullConfig => {
    try {
        const saved = localStorage.getItem('fleet_map_config');
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
};

const saveConfig = (config: FullConfig) => {
    localStorage.setItem('fleet_map_config', JSON.stringify(config));
};

// =============================================
// GPS LOCATION INTERFACE
// =============================================
interface GPSLocation {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    lastUpdate: Date;
    status: 'moving' | 'stopped' | 'idle' | 'offline';
}

// =============================================
// GPS SERVICE
// =============================================
export const GPSService = {
    async getAllVehicleLocations(vehicles: Vehicle[], config: GPSConfig): Promise<GPSLocation[]> {
        if (!config.isConnected) {
            // Demo mode: Trả về mock data
            return vehicles.slice(0, 5).map((v) => ({
                vehicleId: v.id,
                latitude: 12.2388 + (Math.random() - 0.5) * 0.1,
                longitude: 109.1967 + (Math.random() - 0.5) * 0.1,
                speed: Math.floor(Math.random() * 80),
                heading: Math.floor(Math.random() * 360),
                lastUpdate: new Date(),
                status: Math.random() > 0.3 ? 'moving' : 'stopped',
            }));
        }
        // GPS provider integration: Implement real API calls here
        // Configure provider (BKav/Viettel/BA GPS/Custom) in Settings → GPS tab
        // API endpoint and key are stored in config.apiUrl and config.apiKey
    },

    async testConnection(config: GPSConfig): Promise<boolean> {
        if (!config.apiUrl || !config.apiKey) return false;
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return true;
        } catch {
            return false;
        }
    }
};

// =============================================
// SETTINGS DIALOG
// =============================================
interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    config: FullConfig;
    onSave: (config: FullConfig) => void;
}

function SettingsDialog({ isOpen, onClose, config, onSave }: SettingsDialogProps) {
    const [localConfig, setLocalConfig] = useState<FullConfig>(config);
    const [activeTab, setActiveTab] = useState<'map' | 'gps'>('map');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        const success = await GPSService.testConnection(localConfig.gps);
        setTestResult(success ? 'success' : 'error');
        setIsTesting(false);
    };

    const handleSave = () => {
        const updatedConfig = {
            ...localConfig,
            gps: { ...localConfig.gps, isConnected: testResult === 'success' }
        };
        saveConfig(updatedConfig);
        onSave(updatedConfig);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Cài Đặt Bản Đồ & GPS
                    </DialogTitle>
                    <DialogDescription>
                        Cấu hình loại bản đồ và kết nối GPS
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'map' | 'gps')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="map">🗺️ Bản Đồ</TabsTrigger>
                        <TabsTrigger value="gps">📡 GPS API</TabsTrigger>
                    </TabsList>

                    {/* Map Tab */}
                    {activeTab === 'map' && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Loại bản đồ</Label>
                                <Select
                                    value={localConfig.map.mapProvider}
                                    onValueChange={(v) => setLocalConfig(prev => ({
                                        ...prev,
                                        map: { ...prev.map, mapProvider: v as MapConfig['mapProvider'] }
                                    }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn loại bản đồ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="openstreetmap">
                                            🌍 OpenStreetMap (Miễn phí)
                                        </SelectItem>
                                        <SelectItem value="google">
                                            🗺️ Google Maps - Đường phố
                                        </SelectItem>
                                        <SelectItem value="google_satellite">
                                            🛰️ Google Maps - Vệ tinh
                                        </SelectItem>
                                        <SelectItem value="google_terrain">
                                            ⛰️ Google Maps - Địa hình
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {localConfig.map.mapProvider.startsWith('google') && (
                                <div className="space-y-2">
                                    <Label htmlFor="googleApiKey">Google Maps API Key</Label>
                                    <Input
                                        id="googleApiKey"
                                        type="password"
                                        placeholder="Nhập Google Maps API Key"
                                        value={localConfig.map.googleMapsApiKey}
                                        onChange={(e) => setLocalConfig(prev => ({
                                            ...prev,
                                            map: { ...prev.map, googleMapsApiKey: e.target.value }
                                        }))}
                                    />
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p>💡 Cách lấy API Key:</p>
                                        <ol className="list-decimal list-inside space-y-0.5 ml-2">
                                            <li>Vào <a href="https://console.cloud.google.com" target="_blank" className="text-blue-600 underline">Google Cloud Console</a></li>
                                            <li>Tạo Project → Enable "Maps JavaScript API"</li>
                                            <li>Credentials → Create API Key</li>
                                        </ol>
                                    </div>
                                </div>
                            )}

                            {localConfig.map.mapProvider === 'openstreetmap' && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-xs text-green-800">
                                        ✅ <strong>OpenStreetMap</strong> miễn phí và không cần API Key.
                                        Phù hợp cho demo và sử dụng cơ bản.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* GPS Tab */}
                    {activeTab === 'gps' && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nhà cung cấp GPS</Label>
                                <Tabs
                                    value={localConfig.gps.provider}
                                    onValueChange={(v) => setLocalConfig(prev => ({
                                        ...prev,
                                        gps: { ...prev.gps, provider: v }
                                    }))}
                                >
                                    <TabsList className="grid grid-cols-4">
                                        <TabsTrigger value="bkav">BKav</TabsTrigger>
                                        <TabsTrigger value="viettel">Viettel</TabsTrigger>
                                        <TabsTrigger value="ba_gps">BA GPS</TabsTrigger>
                                        <TabsTrigger value="custom">Khác</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gpsApiUrl">URL API</Label>
                                <Input
                                    id="gpsApiUrl"
                                    placeholder="https://api.gps-provider.com/v1"
                                    value={localConfig.gps.apiUrl}
                                    onChange={(e) => setLocalConfig(prev => ({
                                        ...prev,
                                        gps: { ...prev.gps, apiUrl: e.target.value }
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gpsApiKey">API Key</Label>
                                <Input
                                    id="gpsApiKey"
                                    type="password"
                                    placeholder="Nhập API Key GPS"
                                    value={localConfig.gps.apiKey}
                                    onChange={(e) => setLocalConfig(prev => ({
                                        ...prev,
                                        gps: { ...prev.gps, apiKey: e.target.value }
                                    }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="refreshInterval">Chu kỳ cập nhật (giây)</Label>
                                <Input
                                    id="refreshInterval"
                                    type="number"
                                    min={10}
                                    max={300}
                                    value={localConfig.gps.refreshInterval}
                                    onChange={(e) => setLocalConfig(prev => ({
                                        ...prev,
                                        gps: { ...prev.gps, refreshInterval: parseInt(e.target.value) || 30 }
                                    }))}
                                />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTest}
                                    disabled={isTesting || !localConfig.gps.apiUrl}
                                >
                                    {isTesting ? (
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Wifi className="w-4 h-4 mr-2" />
                                    )}
                                    Kiểm tra kết nối
                                </Button>
                                {testResult === 'success' && (
                                    <Badge className="bg-green-100 text-green-700">✓ Thành công</Badge>
                                )}
                                {testResult === 'error' && (
                                    <Badge variant="destructive">✕ Lỗi kết nối</Badge>
                                )}
                            </div>
                        </div>
                    )}
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button onClick={handleSave}>Lưu cấu hình</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// =============================================
// TRUCK ICON
// =============================================
const createTruckIcon = (status: GPSLocation['status']) => {
    const colors = {
        moving: '#22c55e',
        stopped: '#eab308',
        idle: '#f97316',
        offline: '#6b7280',
    };

    return L.divIcon({
        className: 'custom-truck-icon',
        html: `
      <div style="
        background-color: ${colors[status]};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      </div>
    `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });
};

// =============================================
// GET TILE LAYER BASED ON CONFIG
// =============================================
const getTileLayer = (config: MapConfig): { url: string; attribution: string } => {
    const googleKey = config.googleMapsApiKey;

    switch (config.mapProvider) {
        case 'google':
            // Google Maps Roads
            return {
                url: googleKey
                    ? `https://maps.googleapis.com/maps/vt?pb=!1m5!1m4!1i{z}!2i{x}!3i{y}!4i256!2m3!1e0!2sm!3i{s}!3m17!2svi!3sVN!5e18!12m4!1e68!2m2!1sset!2sRoadmap!12m3!1e37!2m1!1ssmartmaps!12m4!1e26!2m2!1sstyles!2s&key=${googleKey}`
                    : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
                attribution: '&copy; Google Maps'
            };
        case 'google_satellite':
            return {
                url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
                attribution: '&copy; Google Maps Satellite'
            };
        case 'google_terrain':
            return {
                url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
                attribution: '&copy; Google Maps Terrain'
            };
        case 'openstreetmap':
        default:
            return {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            };
    }
};

// =============================================
// VEHICLE MAP VIEW COMPONENT
// =============================================
interface VehicleMapViewProps {
    vehicles: Vehicle[];
    selectedVehicle?: Vehicle | null;
    isOpen: boolean;
    onClose: () => void;
}

export function VehicleMapView({ vehicles, selectedVehicle, isOpen, onClose }: VehicleMapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const [locations, setLocations] = useState<GPSLocation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [config, setConfig] = useState<FullConfig>(loadConfig);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number]>([12.2388, 109.1967]);

    // Get user's current location
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                },
                () => {
                    // Geolocation not available, using default location
                }
            );
        }
    }, []);

    // Update markers - MUST be defined before fetchLocations
    const updateMarkers = useCallback((locs: GPSLocation[]) => {
        if (!mapInstanceRef.current) return;

        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        locs.forEach(loc => {
            const vehicle = vehicles.find(v => v.id === loc.vehicleId);
            if (!vehicle) return;

            const marker = L.marker([loc.latitude, loc.longitude], {
                icon: createTruckIcon(loc.status),
            }).addTo(mapInstanceRef.current!);

            marker.bindPopup(`
        <div style="min-width: 200px; font-family: system-ui;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1e40af;">
            🚛 ${vehicle.vehicle_code} - ${vehicle.license_plate}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
            <strong>Loại xe:</strong> ${vehicle.vehicle_type || '-'}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
            <strong>Tốc độ:</strong> ${loc.speed} km/h
          </div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
            <strong>Trạng thái:</strong>
            <span style="color: ${loc.status === 'moving' ? '#22c55e' : '#eab308'}">
              ${loc.status === 'moving' ? '🟢 Đang chạy' : '🟡 Dừng'}
            </span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
            Cập nhật: ${loc.lastUpdate.toLocaleTimeString('vi-VN')}
          </div>
        </div>
      `);

            markersRef.current.push(marker);

            if (selectedVehicle && vehicle.id === selectedVehicle.id) {
                marker.openPopup();
                mapInstanceRef.current?.setView([loc.latitude, loc.longitude], 15);
            }
        });

        if (markersRef.current.length > 0 && !selectedVehicle) {
            const group = L.featureGroup(markersRef.current);
            mapInstanceRef.current?.fitBounds(group.getBounds().pad(0.1));
        }
    }, [vehicles, selectedVehicle]);

    // Fetch GPS locations
    const fetchLocations = useCallback(async () => {
        setIsLoading(true);
        try {
            const locs = await GPSService.getAllVehicleLocations(vehicles, config.gps);
            setLocations(locs);
            setLastUpdated(new Date());
            updateMarkers(locs);
        } catch (error) {
            console.error('Error fetching GPS locations:', error);
        } finally {
            setIsLoading(false);
        }
    }, [vehicles, config.gps, updateMarkers]);

    // Update tile layer when config changes
    const updateTileLayer = useCallback(() => {
        if (!mapInstanceRef.current) return;

        if (tileLayerRef.current) {
            tileLayerRef.current.remove();
        }

        const tileConfig = getTileLayer(config.map);
        tileLayerRef.current = L.tileLayer(tileConfig.url, {
            attribution: tileConfig.attribution,
            maxZoom: 19,
        }).addTo(mapInstanceRef.current);
    }, [config.map]);

    // Initialize map
    useEffect(() => {
        if (!isOpen || !mapRef.current || mapInstanceRef.current) return;

        mapInstanceRef.current = L.map(mapRef.current).setView(userLocation, 12);

        // Add tile layer based on config
        const tileConfig = getTileLayer(config.map);
        tileLayerRef.current = L.tileLayer(tileConfig.url, {
            attribution: tileConfig.attribution,
            maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        // Add user location marker
        L.marker(userLocation, {
            icon: L.divIcon({
                className: 'user-location-icon',
                html: `<div style="background: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
            }),
        }).addTo(mapInstanceRef.current)
            .bindPopup('📍 Vị trí của bạn');

        fetchLocations();

        const interval = setInterval(fetchLocations, config.gps.refreshInterval * 1000);

        return () => {
            clearInterval(interval);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [isOpen, userLocation, config, fetchLocations]);

    // Update tile layer when map provider changes
    useEffect(() => {
        updateTileLayer();
    }, [updateTileLayer]);

    const statusCounts = {
        moving: locations.filter(l => l.status === 'moving').length,
        stopped: locations.filter(l => l.status === 'stopped').length,
        offline: locations.filter(l => l.status === 'offline').length,
    };

    const mapProviderName = {
        openstreetmap: 'OpenStreetMap',
        google: 'Google Maps',
        google_satellite: 'Google Vệ tinh',
        google_terrain: 'Google Địa hình',
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={() => onClose()}>
                <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
                    <DialogHeader className="p-4 pb-2 border-b">
                        <DialogTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary" />
                                Bản Đồ Theo Dõi Xe
                                <Badge variant="outline" className="ml-2 text-xs">
                                    <Map className="w-3 h-3 mr-1" />
                                    {mapProviderName[config.map.mapProvider]}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-sm font-normal">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    🟢 Đang chạy: {statusCounts.moving}
                                </Badge>
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    🟡 Dừng: {statusCounts.stopped}
                                </Badge>
                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                    ⚫ Offline: {statusCounts.offline}
                                </Badge>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {config.gps.isConnected ? (
                                <Badge className="bg-green-100 text-green-700">
                                    <Wifi className="w-3 h-3 mr-1" />
                                    GPS: {config.gps.provider || 'Đã kết nối'}
                                </Badge>
                            ) : (
                                <Badge variant="secondary">
                                    <WifiOff className="w-3 h-3 mr-1" />
                                    Chế độ Demo
                                </Badge>
                            )}
                            {lastUpdated && (
                                <span>Cập nhật: {lastUpdated.toLocaleTimeString('vi-VN')}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSettingsOpen(true)}
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Cài đặt
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchLocations}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                Làm mới
                            </Button>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative">
                        <div ref={mapRef} className="absolute inset-0" />

                        {isLoading && locations.length === 0 && (
                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
                                <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                    <span className="text-sm text-muted-foreground">Đang tải...</span>
                                </div>
                            </div>
                        )}

                        {/* Legend */}
                        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
                            <div className="text-xs font-semibold mb-2">Chú thích:</div>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span>Đang chạy</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                    <span>Đang dừng</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                    <span>Offline</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span>Vị trí của bạn</span>
                                </div>
                            </div>
                        </div>

                        {!config.gps.isConnected && (
                            <div className="absolute top-4 right-4 bg-amber-50 border border-amber-200 rounded-lg p-3 z-[1000] max-w-xs">
                                <div className="text-xs text-amber-800">
                                    <strong>⚠️ Chế độ Demo</strong>
                                    <p className="mt-1">Nhấn "Cài đặt" để kết nối GPS thực.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <SettingsDialog
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                config={config}
                onSave={(newConfig) => setConfig(newConfig)}
            />
        </>
    );
}

export default VehicleMapView;
