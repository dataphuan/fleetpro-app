import { useAuth } from "@/contexts/AuthContext";
import { useTrips, useUpdateTrip } from "@/hooks/useTrips";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, AlertTriangle, CheckCircle2, Package, Play, Camera, Loader2, LocateFixed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { DriverLiveMap } from "@/components/driver/DriverLiveMap";
import { getBestCurrentPosition, geolocationErrorToMessage, startLocationWatch, stopLocationWatch, type DriverGeoPoint } from "@/lib/driver-location";
import { alertsAdapter, tripAdapter, tripLocationAdapter } from "@/lib/data-adapter";
import { evaluateLocationIntegrity, getIntegrityProfileByVehicleType } from "@/lib/location-integrity";
import { useVehicles } from "@/hooks/useVehicles";
import { normalizeUserRole } from "@/lib/rbac";

const MIN_CHECKIN_ACCURACY_M = 50;
const MAX_TRACKING_ACCURACY_M = 120;
const TRACKING_PUSH_INTERVAL_MS = 12000;
const TRIP_LAST_LOCATION_SYNC_MS = 60000;

const roundCoord = (value: number) => Math.round(value * 100000) / 100000;

const FEATURE_GATES = {
    trackingWrite: import.meta.env.VITE_FF_DRIVER_TRACKING_WRITE !== 'false',
    receiptUpload: import.meta.env.VITE_FF_DRIVER_RECEIPT_UPLOAD !== 'false',
    ePodSignature: import.meta.env.VITE_FF_DRIVER_EPOD_SIGNATURE !== 'false',
    incidentReport: import.meta.env.VITE_FF_DRIVER_INCIDENT_REPORT === 'true',
};

type FeatureState = 'idle' | 'loading' | 'success' | 'error';

export default function DriverDashboard() {
    const { user, tenantId, role } = useAuth();
    const { data: trips = [], isLoading } = useTrips();
    const { data: vehicles = [] } = useVehicles();
    const { mutateAsync: updateTrip } = useUpdateTrip();
    const { toast } = useToast();
    const normalizedRole = normalizeUserRole(role);
    const isDriverRole = normalizedRole === 'driver';
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCheckingInTripId, setIsCheckingInTripId] = useState<string | null>(null);
    const [isTrackingActive, setIsTrackingActive] = useState(false);
    const [liveLocationByTrip, setLiveLocationByTrip] = useState<Record<string, DriverGeoPoint>>({});
    const [startStateByTrip, setStartStateByTrip] = useState<Record<string, FeatureState>>({});
    const [finishStateByTrip, setFinishStateByTrip] = useState<Record<string, FeatureState>>({});
    const [incidentStateByTrip, setIncidentStateByTrip] = useState<Record<string, FeatureState>>({});
    
    // e-POD states
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [activeTripForSignature, setActiveTripForSignature] = useState<any>(null);

    // Store input per trip: { [tripId]: { odo: string, receiptUrl: string, isUploading: boolean } }
    const [tripInputs, setTripInputs] = useState<Record<string, { odo: string, receiptUrl: string, isUploading: boolean, uploadState: FeatureState, uploadError?: string }>>({});
    const watchIdRef = useRef<number | null>(null);
    const lastTrackPushRef = useRef<number>(0);
    const lastTripSyncRef = useRef<number>(0);
    const lastTrackingErrorToastRef = useRef<number>(0);
    const lastPointByTripRef = useRef<Record<string, DriverGeoPoint>>({});
    const lastFraudToastRef = useRef<number>(0);
    const lastAlertByTripRef = useRef<Record<string, number>>({});

    const buildReleaseSafeCreatePayload = (feature: string, payload: Record<string, any>) => {
        if (!tenantId) {
            throw new Error('Không tìm thấy công ty hiện tại. Vui lòng đăng nhập lại.');
        }
        if (!user?.id) {
            throw new Error('Không tìm thấy tài xế hiện tại. Vui lòng đăng nhập lại.');
        }

        const nowIso = new Date().toISOString();
        return {
            ...payload,
            tenantId,
            tenant_id: tenantId,
            driverId: user.id,
            driver_id: user.id,
            createdAt: nowIso,
            created_at: nowIso,
            source: `driver-overview:${feature}`,
        };
    };

    // Here we filter trips that are NOT closed/cancelled and assigned to this driver's email or ID.
    const myActiveTrips = trips.filter((t: any) => 
        (!tenantId || !t.tenant_id || t.tenant_id === tenantId) &&
        (t.driver_id === user?.email || t.driver_id === (user as any)?.uid || t.driver?.email === user?.email) &&
        ['draft', 'confirmed', 'dispatched', 'in_progress'].includes(t.status)
    );

    const activeTrackingTrip = useMemo(() => {
        return myActiveTrips.find((trip: any) => trip.status === 'in_progress') || null;
    }, [myActiveTrips]);

    const vehicleById = useMemo(() => {
        const map = new Map<string, any>();
        (vehicles || []).forEach((vehicle: any) => map.set(vehicle.id, vehicle));
        return map;
    }, [vehicles]);

    const maybeCreateGpsAlert = async (trip: any, flags: string[], riskScore: number) => {
        const severe = flags.includes('gps_jump') || flags.includes('speed_anomaly');
        if (!severe) return;

        const now = Date.now();
        const lastAlertAt = lastAlertByTripRef.current[trip.id] || 0;
        if (now - lastAlertAt < 2 * 60 * 1000) return;
        lastAlertByTripRef.current[trip.id] = now;

        const alertPayload = buildReleaseSafeCreatePayload('gps-anomaly-alert', {
            alert_type: 'gps_anomaly',
            title: `GPS bat thuong - ${trip.trip_code}`,
            message: `Phat hien bat thuong GPS: ${flags.join(', ')} (risk ${riskScore}).`,
            reference_id: trip.id,
            reference_type: 'trip',
            severity: riskScore >= 60 ? 'critical' : 'warning',
            is_read: false,
            date: new Date().toISOString(),
            metadata: {
                trip_code: trip.trip_code,
                driver_email: user?.email || null,
                vehicle_id: trip.vehicle_id || null,
            },
        });
        await alertsAdapter.create(alertPayload);
    };

    const persistTripLocation = async (trip: any, eventType: 'check_in' | 'track_point' | 'check_out', point: DriverGeoPoint) => {
        if (!user?.id) return;

        const previous = lastPointByTripRef.current[trip.id] || null;
        const vehicle = vehicleById.get(trip.vehicle_id);
        const profile = getIntegrityProfileByVehicleType(vehicle?.vehicle_type || trip.vehicle?.vehicle_type);
        const integrity = evaluateLocationIntegrity(point, previous, eventType, profile);

        if (!integrity.shouldPersist) {
            const now = Date.now();
            if (now - lastFraudToastRef.current > 12000) {
                lastFraudToastRef.current = now;
                toast({
                    title: 'Bo qua diem GPS bat thuong',
                    description: 'He thong da loc mot diem vi tri co dau hieu nhay GPS.',
                    variant: 'destructive',
                });
            }
            return;
        }

        if (!FEATURE_GATES.trackingWrite) {
            return;
        }

        const trackingPayload = buildReleaseSafeCreatePayload('trip-location-log', {
            trip_id: trip.id,
            trip_code: trip.trip_code,
            vehicle_id: trip.vehicle_id || null,
            vehicle_type: vehicle?.vehicle_type || trip.vehicle?.vehicle_type || null,
            driver_uid: user.id,
            driver_email: user.email || null,
            latitude: point.latitude,
            longitude: point.longitude,
            accuracy_m: point.accuracy,
            speed_mps: point.speed,
            heading_deg: point.heading,
            event_type: eventType,
            recorded_at: new Date(point.timestamp).toISOString(),
            integrity_flags: integrity.flags,
            integrity_risk_score: integrity.riskScore,
            inferred_speed_kmh: integrity.inferredSpeedKmh,
            distance_from_previous_m: integrity.distanceFromPreviousM,
        });
        await tripLocationAdapter.create(trackingPayload);

        lastPointByTripRef.current[trip.id] = point;
        await maybeCreateGpsAlert(trip, integrity.flags, integrity.riskScore);
    };

    useEffect(() => {
        if (!activeTrackingTrip || !user?.id) {
            stopLocationWatch(watchIdRef.current);
            watchIdRef.current = null;
            setIsTrackingActive(false);
            return;
        }

        stopLocationWatch(watchIdRef.current);
        lastTrackPushRef.current = 0;
        lastTripSyncRef.current = 0;

        const watchId = startLocationWatch(
            async (point) => {
                setLiveLocationByTrip((prev) => ({
                    ...prev,
                    [activeTrackingTrip.id]: point,
                }));

                if (point.accuracy > MAX_TRACKING_ACCURACY_M) {
                    return;
                }

                const now = Date.now();
                if (now - lastTrackPushRef.current < TRACKING_PUSH_INTERVAL_MS) {
                    return;
                }

                lastTrackPushRef.current = now;

                try {
                    await persistTripLocation(activeTrackingTrip, 'track_point', point);

                    if (now - lastTripSyncRef.current >= TRIP_LAST_LOCATION_SYNC_MS) {
                        lastTripSyncRef.current = now;
                        await tripAdapter.update(activeTrackingTrip.id, {
                            last_location_lat: point.latitude,
                            last_location_lng: point.longitude,
                            last_location_accuracy_m: point.accuracy,
                            last_location_at: new Date(point.timestamp).toISOString(),
                        });
                    }
                } catch {
                    // Ignore intermittent tracking write failures, next tick will retry.
                }
            },
            (error) => {
                const now = Date.now();
                if (now - lastTrackingErrorToastRef.current < 15000) {
                    return;
                }

                lastTrackingErrorToastRef.current = now;
                toast({
                    title: 'GPS dang bi gian doan',
                    description: geolocationErrorToMessage(error),
                    variant: 'destructive',
                });
            },
        );

        watchIdRef.current = watchId;
        setIsTrackingActive(true);

        return () => {
            stopLocationWatch(watchId);
            watchIdRef.current = null;
            setIsTrackingActive(false);
        };
    }, [activeTrackingTrip, user?.id]);

    const handleInputChange = (tripId: string, field: 'odo' | 'receiptUrl' | 'isUploading' | 'uploadState' | 'uploadError', value: any) => {
        setTripInputs(prev => ({
            ...prev,
            [tripId]: {
                ...(prev[tripId] || { odo: '', receiptUrl: '', isUploading: false, uploadState: 'idle' as FeatureState, uploadError: '' }),
                [field]: value,
            }
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tripId: string) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được tải biên nhận.', variant: 'destructive' });
            return;
        }

        if (!FEATURE_GATES.receiptUpload) {
            toast({ title: 'Tính năng tạm khóa', description: 'Tải biên nhận sẽ mở khi backend sẵn sàng.', variant: 'destructive' });
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            handleInputChange(tripId, 'uploadState', 'error');
            handleInputChange(tripId, 'uploadError', 'Tệp PDF chưa được hỗ trợ ở bản phát hành này.');
            toast({ title: 'Không hỗ trợ PDF', description: 'Hiện chỉ hỗ trợ ảnh hóa đơn để tránh sai quy trình.', variant: 'destructive' });
            return;
        }

        if (!file.type.startsWith('image/')) {
            handleInputChange(tripId, 'uploadState', 'error');
            handleInputChange(tripId, 'uploadError', 'Chỉ chấp nhận tệp ảnh.');
            toast({ title: 'Tệp không hợp lệ', description: 'Vui lòng chọn tệp ảnh.', variant: 'destructive' });
            return;
        }

        handleInputChange(tripId, 'isUploading', true);
        handleInputChange(tripId, 'uploadState', 'loading');
        handleInputChange(tripId, 'uploadError', '');
        try {
            const fileRef = ref(storage, `receipts/${tenantId}/${tripId}/${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            handleInputChange(tripId, 'receiptUrl', downloadUrl);
            handleInputChange(tripId, 'uploadState', 'success');
            toast({ title: "Đã tải biên nhận lên!", description: "Ảnh hóa đơn đã được lưu thành công." });
        } catch (error) {
            handleInputChange(tripId, 'uploadState', 'error');
            handleInputChange(tripId, 'uploadError', 'Không thể lưu ảnh, vui lòng thử lại.');
            toast({ title: "Lỗi tải ảnh", description: "Không thể lưu ảnh, vui lòng thử lại.", variant: "destructive" });
        } finally {
            handleInputChange(tripId, 'isUploading', false);
        }
    };

    const handleStartTrip = async (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được bắt đầu chuyến.', variant: 'destructive' });
            return;
        }

        setIsUpdating(true);
        setIsCheckingInTripId(trip.id);
        setStartStateByTrip((prev) => ({ ...prev, [trip.id]: 'loading' }));
        try {
            const point = await getBestCurrentPosition(5);
            if (point.accuracy > MIN_CHECKIN_ACCURACY_M) {
                throw new Error(`Do chinh xac GPS hien tai la ${Math.round(point.accuracy)}m. Vui long di ra khu vuc thong thoang roi thu lai.`);
            }

            await persistTripLocation(trip, 'check_in', point);

            await updateTrip({
                id: trip.id,
                updates: {
                    status: 'in_progress',
                    actual_departure_time: new Date().toISOString(),
                    check_in_lat: point.latitude,
                    check_in_lng: point.longitude,
                    check_in_accuracy_m: point.accuracy,
                    check_in_at: new Date(point.timestamp).toISOString(),
                    last_location_lat: point.latitude,
                    last_location_lng: point.longitude,
                    last_location_accuracy_m: point.accuracy,
                    last_location_at: new Date(point.timestamp).toISOString(),
                }
            });

            setLiveLocationByTrip((prev) => ({
                ...prev,
                [trip.id]: point,
            }));
            lastPointByTripRef.current[trip.id] = point;

            toast({
                title: "Check-in thanh cong",
                description: `Da bat dau chuyen. Sai so GPS: ${Math.round(point.accuracy)}m`,
            });
            setStartStateByTrip((prev) => ({ ...prev, [trip.id]: 'success' }));
        } catch (error) {
            setStartStateByTrip((prev) => ({ ...prev, [trip.id]: 'error' }));
            toast({
                title: "Khong the check-in",
                description: geolocationErrorToMessage(error),
                variant: "destructive",
            });
        } finally {
            setIsCheckingInTripId(null);
            setIsUpdating(false);
        }
    };

    const handleFinishTripWithSignature = (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được chốt chuyến.', variant: 'destructive' });
            return;
        }

        if (!FEATURE_GATES.ePodSignature) {
            toast({ title: 'Tính năng tạm khóa', description: 'Ký nhận điện tử sẽ mở khi backend sẵn sàng.', variant: 'destructive' });
            return;
        }

        const inputs = tripInputs[trip.id];
        if (!inputs?.odo) {
            toast({ title: "Thiếu thông tin", description: "Vui lòng nhập số KM kết thúc chuyến.", variant: "destructive" });
            return;
        }
        
        setActiveTripForSignature(trip);
        setSignatureDialogOpen(true);
    };

    const processFinalizeTrip = async (signatureDataUrl: string) => {
        if (!activeTripForSignature) return;
        const trip = activeTripForSignature;
        const inputs = tripInputs[trip.id];

        setIsUpdating(true);
        setSignatureDialogOpen(false);
        setFinishStateByTrip((prev) => ({ ...prev, [trip.id]: 'loading' }));

        try {
            let checkoutPoint: DriverGeoPoint | null = null;
            try {
                const point = await getBestCurrentPosition(3);
                if (point.accuracy <= 80) {
                    checkoutPoint = point;
                    await persistTripLocation(trip, 'check_out', point);
                }
            } catch {
                // Checkout GPS is best effort, do not block trip closure.
            }

            // 1. Upload Signature to Firebase Storage
            toast({ title: "Đang lưu e-POD...", description: "Đang tải chữ ký khách hàng lên hệ thống." });
            const signatureRef = ref(storage, `signatures/${tenantId}/${trip.id}/${Date.now()}_signature.png`);
            await uploadString(signatureRef, signatureDataUrl, 'data_url');
            const signatureUrl = await getDownloadURL(signatureRef);

            // 2. Finalize Trip
            await updateTrip({
                id: trip.id,
                updates: {
                    status: 'completed',
                    end_odometer: Number(inputs.odo),
                    actual_arrival_time: new Date().toISOString(),
                    check_out_lat: checkoutPoint?.latitude || null,
                    check_out_lng: checkoutPoint?.longitude || null,
                    check_out_accuracy_m: checkoutPoint?.accuracy || null,
                    check_out_at: checkoutPoint ? new Date(checkoutPoint.timestamp).toISOString() : null,
                    // e-POD data is operational evidence only; it must not be auto-counted into finance KPIs.
                    notes: `${trip.notes || ''}\n[e-POD] Signature: ${signatureUrl}\n[e-POD] Receipt: ${inputs.receiptUrl || 'N/A'}`
                }
            });

            toast({ title: "HOÀN TẤT CHUYẾN ĐI", description: "Đã ký nhận và hoàn thành chuyến hàng thành công!" });
            setActiveTripForSignature(null);
            setFinishStateByTrip((prev) => ({ ...prev, [trip.id]: 'success' }));
        } catch (error) {
            setFinishStateByTrip((prev) => ({ ...prev, [trip.id]: 'error' }));
            toast({ title: "Lỗi chốt chuyến", description: "Không thể lưu e-POD. Vui lòng thử lại.", variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReportIncident = async (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được báo sự cố.', variant: 'destructive' });
            return;
        }

        if (!FEATURE_GATES.incidentReport) {
            toast({ title: 'Tính năng tạm khóa', description: 'Báo sự cố sẽ bật khi backend hoàn thiện.', variant: 'destructive' });
            return;
        }

        setIncidentStateByTrip((prev) => ({ ...prev, [trip.id]: 'loading' }));
        try {
            const incidentPayload = buildReleaseSafeCreatePayload('driver-incident', {
                alert_type: 'driver_incident',
                title: `Tai xe bao su co - ${trip.trip_code}`,
                message: `Tai xe ${user?.email || 'khong ro'} bao su co trong chuyen ${trip.trip_code}.`,
                reference_id: trip.id,
                reference_type: 'trip',
                severity: 'warning',
                is_read: false,
                date: new Date().toISOString(),
                metadata: {
                    trip_code: trip.trip_code,
                    vehicle_id: trip.vehicle_id || null,
                    finance_impact_auto: false,
                },
            });
            await alertsAdapter.create(incidentPayload);
            setIncidentStateByTrip((prev) => ({ ...prev, [trip.id]: 'success' }));
            toast({ title: 'Đã gửi báo sự cố', description: 'Bộ phận điều phối sẽ xử lý ngay.' });
        } catch {
            setIncidentStateByTrip((prev) => ({ ...prev, [trip.id]: 'error' }));
            toast({ title: 'Gửi báo sự cố thất bại', description: 'Vui lòng thử lại.', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return <div className="p-4 text-center mt-10">Đang tải dữ liệu chuyến đi...</div>;
    }

    if (myActiveTrips.length === 0) {
        return (
            <div className="p-6 flex flex-col items-center justify-center text-center mt-20">
                <div className="bg-slate-200 p-4 rounded-full mb-4">
                    <Package className="w-10 h-10 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-700">Chưa có chuyến</h2>
                <p className="text-slate-500 mt-2">Tuyệt vời! Hiện tại bạn không có chuyến đi nào được phân công. Hãy nghỉ ngơi.</p>
            </div>
        );
    }

    return (
        <div className="p-4 pb-24 space-y-4">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Chuyến đi của bạn</h2>
                <p className="text-sm text-slate-500">Kéo xuống để xem tất cả ({myActiveTrips.length} chuyến)</p>
            </div>

            <Card className="border-sky-200 bg-sky-50/70">
                <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                        <LocateFixed className="w-5 h-5 mt-0.5 text-sky-700" />
                        <div className="space-y-1 text-sm">
                            <p className="font-semibold text-sky-900">Check-in GPS chinh xac va dinh vi mien phi</p>
                            <p className="text-sky-800">
                                He thong chi cho phep check-in khi sai so GPS du nho. Sau khi vao chuyen, vi tri se cap nhat tu dong khi app dang mo.
                            </p>
                            <p className="text-xs text-sky-700">
                                Trang thai tracking: {isTrackingActive ? 'Dang hoat dong' : 'Chua bat dau'}
                            </p>
                            {!FEATURE_GATES.trackingWrite && (
                                <p className="text-xs text-amber-700">Ghi nhật ký vị trí đang tạm khóa theo cờ phát hành.</p>
                            )}
                            {!isDriverRole && (
                                <p className="text-xs text-amber-700">Bạn đang ở chế độ xem. Các thao tác dành riêng cho tài xế đã bị ẩn.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {myActiveTrips.map(trip => (
                <Card key={trip.id} className="border-blue-100 shadow-md">
                    <CardHeader className="pb-2 bg-blue-50 focus:bg-blue-100 rounded-t-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg text-blue-900">{trip.trip_code}</CardTitle>
                                <CardDescription className="text-blue-700 font-medium mt-1">
                                    {trip.vehicle?.license_plate || trip.vehicle_id || "Chưa xếp xe"}
                                </CardDescription>
                            </div>
                            <Badge variant={trip.status === 'in_progress' ? 'default' : 'secondary'} className="text-xs">
                                {trip.status === 'in_progress' ? 'ĐANG CHẠY' : (trip.status === 'dispatched' ? 'CHỜ ĐI' : 'LÊN LỊCH')}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Khách hàng:</span>
                            <span className="font-semibold">{trip.customer?.name || trip.customer_id || "Khách Vãng Lai"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Tuyến đường:</span>
                            <span className="font-semibold max-w-[200px] text-right truncate">{trip.route_id || "Chưa rõ"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Hàng hóa:</span>
                            <span className="font-medium">{trip.cargo_description || "N/A"} - {trip.cargo_weight_tons || 0} Tấn</span>
                        </div>
                        
                        {trip.status === 'in_progress' && isDriverRole && (
                            <div className="mt-4 p-3 bg-amber-50 rounded-md border border-amber-100 space-y-2">
                                <Label className="text-xs text-amber-800 font-semibold">CẬP NHẬT TRẠNG THÁI (TRẢ HÀNG)</Label>

                                {liveLocationByTrip[trip.id] ? (
                                    <div className="space-y-2">
                                        <DriverLiveMap
                                            latitude={liveLocationByTrip[trip.id].latitude}
                                            longitude={liveLocationByTrip[trip.id].longitude}
                                            accuracy={liveLocationByTrip[trip.id].accuracy}
                                        />
                                        <div className="text-[11px] text-slate-700 bg-white rounded-md border p-2">
                                            Vi tri hien tai: {roundCoord(liveLocationByTrip[trip.id].latitude)}, {roundCoord(liveLocationByTrip[trip.id].longitude)}
                                            {' | '}Sai so: {Math.round(liveLocationByTrip[trip.id].accuracy)}m
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-amber-800 bg-white rounded-md border border-amber-200 p-2">
                                        Dang cho cap nhat vi tri live. Neu lau, vui long kiem tra quyen GPS tren dien thoai.
                                    </div>
                                )}

                                <Input 
                                    type="number" 
                                    placeholder="Nhập số KM thực tế..." 
                                    className="bg-white" 
                                    value={tripInputs[trip.id]?.odo || ''}
                                    onChange={(e) => handleInputChange(trip.id, 'odo', e.target.value)}
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <Button variant="outline" className="w-full bg-white border-slate-300 text-slate-700 cursor-pointer relative overflow-hidden" disabled={tripInputs[trip.id]?.isUploading}>
                                        {tripInputs[trip.id]?.isUploading ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải lên...</>
                                        ) : tripInputs[trip.id]?.receiptUrl ? (
                                            <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Đã lưu Hóa đơn</>
                                        ) : (
                                            <><Camera className="w-4 h-4 mr-2" /> Chụp hóa đơn / Bill</>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*,.pdf" 
                                            capture="environment" 
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handleFileUpload(e, trip.id)}
                                            disabled={tripInputs[trip.id]?.isUploading}
                                        />
                                    </Button>
                                </div>
                                {tripInputs[trip.id]?.uploadState === 'error' && (
                                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                                        {tripInputs[trip.id]?.uploadError || 'Tải tệp thất bại.'}
                                    </div>
                                )}
                                {tripInputs[trip.id]?.uploadState === 'success' && (
                                    <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1">
                                        Đã tải biên nhận thành công.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                    
                    <CardFooter className="pt-2">
                        {!isDriverRole ? (
                            <div className="w-full text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                                Chế độ xem cho vai trò không phải tài xế: không hiển thị thao tác bắt đầu/chốt chuyến/tải biên nhận/báo sự cố.
                            </div>
                        ) : trip.status === 'in_progress' ? (
                            <div className="flex gap-2 w-full">
                                <Button className="w-full bg-green-600 hover:bg-green-700 font-bold py-6 text-lg" disabled={isUpdating || tripInputs[trip.id]?.isUploading} onClick={() => handleFinishTripWithSignature(trip)}>
                                    <CheckCircle2 className="w-5 h-5 mr-3" /> CHỐT CHUYẾN & KÝ NHẬN
                                </Button>
                                <Button variant="destructive" size="icon" disabled={isUpdating || !FEATURE_GATES.incidentReport || incidentStateByTrip[trip.id] === 'loading'} onClick={() => handleReportIncident(trip)}>
                                    <AlertTriangle className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6" 
                                onClick={() => handleStartTrip(trip)}
                                disabled={isUpdating || isCheckingInTripId === trip.id}
                            >
                                {isCheckingInTripId === trip.id ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> DANG CHECK-IN GPS...</>
                                ) : (
                                    <><Play className="w-5 h-5 mr-2" /> CHECK-IN & BAT DAU CHAY</>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                    {startStateByTrip[trip.id] === 'error' && <div className="px-6 pb-3 text-xs text-red-700">Check-in thất bại. Vui lòng kiểm tra GPS và thử lại.</div>}
                    {startStateByTrip[trip.id] === 'success' && <div className="px-6 pb-3 text-xs text-green-700">Check-in thành công.</div>}
                    {finishStateByTrip[trip.id] === 'error' && <div className="px-6 pb-3 text-xs text-red-700">Chốt chuyến thất bại.</div>}
                    {finishStateByTrip[trip.id] === 'success' && <div className="px-6 pb-3 text-xs text-green-700">Chốt chuyến thành công.</div>}
                    {incidentStateByTrip[trip.id] === 'error' && <div className="px-6 pb-3 text-xs text-red-700">Gửi báo sự cố thất bại.</div>}
                    {incidentStateByTrip[trip.id] === 'success' && <div className="px-6 pb-3 text-xs text-green-700">Đã gửi báo sự cố.</div>}
                </Card>
            ))}

            {/* Signature Dialog */}
            <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
                <DialogContent className="max-w-[95%] sm:max-w-md bg-slate-50">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-green-600" />
                            Xác nhận Giao hàng (e-POD)
                        </DialogTitle>
                        <DialogDescription>
                            Vui lòng yêu cầu khách hàng ký xác nhận đã nhận đủ hàng hóa cho chuyến: <strong>{activeTripForSignature?.trip_code}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    
                    <SignaturePad 
                        onSave={processFinalizeTrip} 
                        onCancel={() => {
                            setSignatureDialogOpen(false);
                            setActiveTripForSignature(null);
                        }} 
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
