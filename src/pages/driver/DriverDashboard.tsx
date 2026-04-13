import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTrips, useUpdateTrip, usePickupTrip } from "@/hooks/useTrips";
import { useDrivers } from "@/hooks/useDrivers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, CheckCircle2, Package, Play, Camera, Loader2, LocateFixed, Wifi, WifiOff, PhoneCall, CheckSquare, FileText, Plus, FlagOff, Sparkles, Bell, MessageCircle, Truck, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { DriverLiveMap } from "@/components/driver/DriverLiveMap";
import { DriverQuickTripModal } from "@/components/trips/DriverQuickTripModal";
import { DriverVehicleAssignModal } from "@/components/driver/DriverVehicleAssignModal";
import { getBestCurrentPosition, geolocationErrorToMessage, startLocationWatch, stopLocationWatch, type DriverGeoPoint } from "@/lib/driver-location";
import { alertsAdapter, driverAdapter, expenseAdapter, transportOrderAdapter, tripAdapter, tripLocationAdapter } from "@/lib/data-adapter";
import { evaluateLocationIntegrity, getIntegrityProfileByVehicleType } from "@/lib/location-integrity";
import { useVehicles } from "@/hooks/useVehicles";
import { useRoutes } from "@/hooks/useRoutes";
import { normalizeUserRole } from "@/lib/rbac";
import { sendOpsEventNotification } from "@/lib/driver-notifications";

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

const DRIVER_DRAFTS_STORAGE_KEY = 'driver_dashboard_trip_drafts';
const DRIVER_PRETRIP_STORAGE_KEY = 'driver_pretrip_checklist';
const DRIVER_REPORTS_STORAGE_KEY = 'driver_location_reports';
const DRIVER_EXPENSES_STORAGE_KEY = 'driver_expense_docs';
const DRIVER_PRECHECK_STORAGE_KEY = 'driver_precheck_v2';

type DriverPrecheckState = {
    tires: boolean;
    lights: boolean;
    brakes: boolean;
    fuel: boolean;
    documents: boolean;
    photoUrl: string;
    isUploading: boolean;
};

export default function DriverDashboard() {
    const { user, tenantId, role } = useAuth();
    const queryClient = useQueryClient();
    const { data: trips = [], isLoading } = useTrips();
    const { data: drivers = [] } = useDrivers();
    const { data: vehicles = [] } = useVehicles();
    const { data: routes = [] } = useRoutes();
    const { mutateAsync: updateTrip } = useUpdateTrip();
    const { toast } = useToast();
    const normalizedRole = normalizeUserRole(role);
    const isDriverRole = normalizedRole === 'driver';
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCheckingInTripId, setIsCheckingInTripId] = useState<string | null>(null);
    const [isTrackingActive, setIsTrackingActive] = useState(false);
    const [preTripTrackingTripId, setPreTripTrackingTripId] = useState<string | null>(null);
    const [liveLocationByTrip, setLiveLocationByTrip] = useState<Record<string, DriverGeoPoint>>({});
    const [startStateByTrip, setStartStateByTrip] = useState<Record<string, FeatureState>>({});
    const [finishStateByTrip, setFinishStateByTrip] = useState<Record<string, FeatureState>>({});
    const [incidentStateByTrip, setIncidentStateByTrip] = useState<Record<string, FeatureState>>({});
    const [shareStateByTrip, setShareStateByTrip] = useState<Record<string, FeatureState>>({});
    const [gpsLockStateByTrip, setGpsLockStateByTrip] = useState<Record<string, FeatureState>>({});
    const [gpsLockAccuracyByTrip, setGpsLockAccuracyByTrip] = useState<Record<string, number | null>>({});
    const [gpsLockPointByTrip, setGpsLockPointByTrip] = useState<Record<string, DriverGeoPoint | null>>({});
    const [infoConfirmedByTrip, setInfoConfirmedByTrip] = useState<Record<string, boolean>>({});
    const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    
    // e-POD states
    const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [activeTripForSignature, setActiveTripForSignature] = useState<any>(null);

    // Store input per trip: { [tripId]: { odo: string, receiptUrl: string, isUploading: boolean } }
    const [tripInputs, setTripInputs] = useState<Record<string, { odo: string, receiptUrl: string, isUploading: boolean, uploadState: FeatureState, uploadError?: string }>>({});
    const [reportInputs, setReportInputs] = useState<Record<string, { note: string, photoUrl: string, isUploading: boolean, uploadState: FeatureState, uploadError?: string }>>({});
    const [expenseInputs, setExpenseInputs] = useState<Record<string, { amount: string, note: string, photoUrl: string, isUploading: boolean, uploadState: FeatureState, uploadError?: string }>>({});
    const [precheckByTrip, setPrecheckByTrip] = useState<Record<string, DriverPrecheckState>>({});
    const [draftSlotFrom, setDraftSlotFrom] = useState('08:00');
    const [draftSlotTo, setDraftSlotTo] = useState('11:00');
    const [draftArea, setDraftArea] = useState('');
    const [draftNote, setDraftNote] = useState('');
    const [isCreatingDraftOrder, setIsCreatingDraftOrder] = useState(false);
    const [isDraftSheetOpen, setIsDraftSheetOpen] = useState(false);
    const [availabilityStatus, setAvailabilityStatus] = useState<string>('available');
    const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
    const watchIdRef = useRef<number | null>(null);
    const lastTrackPushRef = useRef<number>(0);
    const lastTripSyncRef = useRef<number>(0);
    const lastTrackingErrorToastRef = useRef<number>(0);
    const lastPointByTripRef = useRef<Record<string, DriverGeoPoint>>({});
    const lastFraudToastRef = useRef<number>(0);
    const lastAlertByTripRef = useRef<Record<string, number>>({});

    // --- MODALS ---
    const [isQuickTripModalOpen, setIsQuickTripModalOpen] = useState(false);
    const [isAssignVehicleModalOpen, setIsAssignVehicleModalOpen] = useState(false);
    const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
    const [activeTripForPickup, setActiveTripForPickup] = useState<any>(null);
    const [pickupOdo, setPickupOdo] = useState<string>('');
    const { mutateAsync: pickupTripMutation } = usePickupTrip();

    // (Removed old DraftRequestForm)

    useEffect(() => {
        const onOnline = () => setIsOnline(true);
        const onOffline = () => setIsOnline(false);

        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);

        return () => {
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const buildReleaseSafeCreatePayload = useCallback((feature: string, payload: Record<string, any>) => {
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
    }, [tenantId, user?.id]);

    const linkedDriver = useMemo(() => {
        const byIdentity = (drivers || []).find((d: any) =>
            d.id === user?.id
            || d.user_id === user?.id
            || (user?.email && d.email === user.email)
            || (user?.email && d.driver_email === user.email)
        );
        if (byIdentity) return byIdentity;

        // Demo fallback: pick first active driver in tenant so driver role can always experience workflow.
        return (drivers || []).find((d: any) => d.status === 'active') || (drivers || [])[0] || null;
    }, [drivers, user?.email, user?.id]);

    // Sync availability status from Firestore when linkedDriver loads
    useEffect(() => {
        if (linkedDriver?.availability_status) {
            setAvailabilityStatus(linkedDriver.availability_status);
        }
    }, [linkedDriver?.availability_status]);

    // Filter trips assigned to this driver using uid/email/driver-id/driver-code matching.
    const myActiveTrips = trips.filter((t: any) => 
        (!tenantId || !t.tenant_id || t.tenant_id === tenantId) &&
        (
            t.driver_id === user?.email
            || t.driver_id === (user as any)?.uid
            || t.driver_id === user?.id
            || (linkedDriver && t.driver_id === linkedDriver.id)
            || (linkedDriver && t.driver_id === linkedDriver.driver_code)
            || (linkedDriver && t.driver?.id === linkedDriver.id)
            || (linkedDriver && t.driver?.driver_code === linkedDriver.driver_code)
            || t.driver?.email === user?.email
        ) &&
        ['draft', 'confirmed', 'dispatched', 'in_progress'].includes(t.status)
    );

    const primaryTripForAction = useMemo(() => {
        if (!myActiveTrips.length) return null;
        const inProgress = myActiveTrips.find((trip: any) => trip.status === 'in_progress');
        if (inProgress) return inProgress;
        return myActiveTrips[0];
    }, [myActiveTrips]);

    const activeTrackingTrip = useMemo(() => {
        return myActiveTrips.find((trip: any) => trip.status === 'in_progress') || null;
    }, [myActiveTrips]);

    const preTripTrackingTrip = useMemo(() => {
        if (!preTripTrackingTripId) return null;
        return myActiveTrips.find((trip: any) => trip.id === preTripTrackingTripId) || null;
    }, [myActiveTrips, preTripTrackingTripId]);

    const trackingTrip = activeTrackingTrip || preTripTrackingTrip;

    const storageScope = `${tenantId || 'no-tenant'}:${user?.id || user?.email || 'no-user'}`;

    useEffect(() => {
        try {
            const raw = localStorage.getItem(`${DRIVER_DRAFTS_STORAGE_KEY}:${storageScope}`);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setTripInputs(parsed);
            }
        } catch {
            // Keep clean runtime even when browser storage has invalid data.
        }
        // Load once for current session scope.
    }, [storageScope]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(`${DRIVER_PRETRIP_STORAGE_KEY}:${storageScope}`);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setInfoConfirmedByTrip(parsed);
            }
        } catch {
            // Best effort only.
        }
    }, [storageScope]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(`${DRIVER_REPORTS_STORAGE_KEY}:${storageScope}`);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setReportInputs(parsed);
            }
        } catch {
            // Best effort only.
        }
    }, [storageScope]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(`${DRIVER_EXPENSES_STORAGE_KEY}:${storageScope}`);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setExpenseInputs(parsed);
            }
        } catch {
            // Best effort only.
        }
    }, [storageScope]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(`${DRIVER_PRECHECK_STORAGE_KEY}:${storageScope}`);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                setPrecheckByTrip(parsed);
            }
        } catch {
            // Best effort only.
        }
    }, [storageScope]);

    useEffect(() => {
        try {
            localStorage.setItem(`${DRIVER_DRAFTS_STORAGE_KEY}:${storageScope}`, JSON.stringify(tripInputs));
        } catch {
            // Best effort only.
        }
    }, [tripInputs, storageScope]);

    useEffect(() => {
        try {
            localStorage.setItem(`${DRIVER_PRETRIP_STORAGE_KEY}:${storageScope}`, JSON.stringify(infoConfirmedByTrip));
        } catch {
            // Best effort only.
        }
    }, [infoConfirmedByTrip, storageScope]);

    useEffect(() => {
        try {
            localStorage.setItem(`${DRIVER_REPORTS_STORAGE_KEY}:${storageScope}`, JSON.stringify(reportInputs));
        } catch {
            // Best effort only.
        }
    }, [reportInputs, storageScope]);

    useEffect(() => {
        try {
            localStorage.setItem(`${DRIVER_EXPENSES_STORAGE_KEY}:${storageScope}`, JSON.stringify(expenseInputs));
        } catch {
            // Best effort only.
        }
    }, [expenseInputs, storageScope]);

    useEffect(() => {
        try {
            localStorage.setItem(`${DRIVER_PRECHECK_STORAGE_KEY}:${storageScope}`, JSON.stringify(precheckByTrip));
        } catch {
            // Best effort only.
        }
    }, [precheckByTrip, storageScope]);

    const getPrecheck = (tripId: string): DriverPrecheckState => {
        return precheckByTrip[tripId] || {
            tires: false,
            lights: false,
            brakes: false,
            fuel: false,
            documents: false,
            photoUrl: '',
            isUploading: false,
        };
    };

    const isPrecheckComplete = (tripId: string) => {
        const precheck = getPrecheck(tripId);
        return precheck.tires && precheck.lights && precheck.brakes && precheck.fuel && precheck.documents && !!precheck.photoUrl;
    };

    const vehicleById = useMemo(() => {
        const map = new Map<string, any>();
        (vehicles || []).forEach((vehicle: any) => map.set(vehicle.id, vehicle));
        return map;
    }, [vehicles]);

    // --- P0 FIX: useCallback to prevent stale closures in tracking useEffect ---
    const maybeCreateGpsAlert = useCallback(async (trip: any, flags: string[], riskScore: number) => {
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
    }, [user?.email, buildReleaseSafeCreatePayload]);

    const persistTripLocation = useCallback(async (trip: any, eventType: 'check_in' | 'track_point' | 'check_out', point: DriverGeoPoint) => {
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
    }, [user?.id, user?.email, vehicleById, toast, maybeCreateGpsAlert, buildReleaseSafeCreatePayload]);

    useEffect(() => {
        if (!trackingTrip || !user?.id) {
            stopLocationWatch(watchIdRef.current);
            watchIdRef.current = null;
            setIsTrackingActive(false);
            setGpsLockStateByTrip((prev) => ({
                ...prev,
                ...(preTripTrackingTripId ? { [preTripTrackingTripId]: 'idle' } : {}),
            }));
            return;
        }

        stopLocationWatch(watchIdRef.current);
        lastTrackPushRef.current = 0;
        lastTripSyncRef.current = 0;

        const watchId = startLocationWatch(
            async (point) => {
                setLiveLocationByTrip((prev) => ({
                    ...prev,
                    [trackingTrip.id]: point,
                }));

                if (trackingTrip.status !== 'in_progress') {
                    return;
                }

                if (point.accuracy > MAX_TRACKING_ACCURACY_M) {
                    return;
                }

                const now = Date.now();
                if (now - lastTrackPushRef.current < TRACKING_PUSH_INTERVAL_MS) {
                    return;
                }

                lastTrackPushRef.current = now;

                try {
                    await persistTripLocation(trackingTrip, 'track_point', point);

                    if (now - lastTripSyncRef.current >= TRIP_LAST_LOCATION_SYNC_MS) {
                        lastTripSyncRef.current = now;
                        await tripAdapter.update(trackingTrip.id, {
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
                setShareStateByTrip((prev) => ({
                    ...prev,
                    [trackingTrip.id]: 'error',
                }));
                toast({
                    title: 'GPS dang bi gian doan',
                    description: geolocationErrorToMessage(error),
                    variant: 'destructive',
                });
            },
        );

        watchIdRef.current = watchId;
        setIsTrackingActive(true);
        setShareStateByTrip((prev) => ({
            ...prev,
            [trackingTrip.id]: 'success',
        }));

        return () => {
            stopLocationWatch(watchId);
            watchIdRef.current = null;
            setIsTrackingActive(false);
        };
    }, [trackingTrip, user?.id, preTripTrackingTripId, persistTripLocation]);

    const handleInputChange = (tripId: string, field: 'odo' | 'receiptUrl' | 'isUploading' | 'uploadState' | 'uploadError', value: any) => {
        setTripInputs(prev => ({
            ...prev,
            [tripId]: {
                ...(prev[tripId] || { odo: '', receiptUrl: '', isUploading: false, uploadState: 'idle' as FeatureState, uploadError: '' }),
                [field]: value,
            }
        }));
    };

    const handleReportInputChange = (tripId: string, field: 'note' | 'photoUrl' | 'isUploading' | 'uploadState' | 'uploadError', value: any) => {
        setReportInputs(prev => ({
            ...prev,
            [tripId]: {
                ...(prev[tripId] || { note: '', photoUrl: '', isUploading: false, uploadState: 'idle' as FeatureState, uploadError: '' }),
                [field]: value,
            }
        }));
    };

    const handleExpenseInputChange = (tripId: string, field: 'amount' | 'note' | 'photoUrl' | 'isUploading' | 'uploadState' | 'uploadError', value: any) => {
        setExpenseInputs(prev => ({
            ...prev,
            [tripId]: {
                ...(prev[tripId] || { amount: '', note: '', photoUrl: '', isUploading: false, uploadState: 'idle' as FeatureState, uploadError: '' }),
                [field]: value,
            }
        }));
    };

    const uploadTripImage = async (file: File, pathPrefix: string, tripId: string) => {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileRef = ref(storage, `${pathPrefix}/${tenantId}/${tripId}/${Date.now()}_${safeName}`);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    const handleReportPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, tripId: string) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được gửi báo cáo.', variant: 'destructive' });
            return;
        }

        if (!isOnline) {
            handleReportInputChange(tripId, 'uploadState', 'error');
            handleReportInputChange(tripId, 'uploadError', 'Thiết bị đang offline. Vui lòng kết nối mạng để gửi báo cáo.');
            toast({ title: 'Mất kết nối mạng', description: 'Chưa thể tải ảnh khi offline.', variant: 'destructive' });
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            handleReportInputChange(tripId, 'uploadState', 'error');
            handleReportInputChange(tripId, 'uploadError', 'Chỉ chấp nhận tệp ảnh.');
            toast({ title: 'Tệp không hợp lệ', description: 'Vui lòng chọn tệp ảnh.', variant: 'destructive' });
            return;
        }

        handleReportInputChange(tripId, 'isUploading', true);
        handleReportInputChange(tripId, 'uploadState', 'loading');
        handleReportInputChange(tripId, 'uploadError', '');
        try {
            const downloadUrl = await uploadTripImage(file, 'driver-reports', tripId);
            handleReportInputChange(tripId, 'photoUrl', downloadUrl);
            handleReportInputChange(tripId, 'uploadState', 'success');
            toast({ title: 'Đã tải ảnh báo cáo', description: 'Ảnh đã được lưu.' });
        } catch {
            handleReportInputChange(tripId, 'uploadState', 'error');
            handleReportInputChange(tripId, 'uploadError', 'Không thể lưu ảnh, vui lòng thử lại.');
            toast({ title: 'Lỗi tải ảnh', description: 'Không thể lưu ảnh, vui lòng thử lại.', variant: 'destructive' });
        } finally {
            handleReportInputChange(tripId, 'isUploading', false);
        }
    };

    const handleExpensePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, tripId: string) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được gửi chứng từ.', variant: 'destructive' });
            return;
        }

        if (!isOnline) {
            handleExpenseInputChange(tripId, 'uploadState', 'error');
            handleExpenseInputChange(tripId, 'uploadError', 'Thiết bị đang offline. Vui lòng kết nối mạng để gửi chứng từ.');
            toast({ title: 'Mất kết nối mạng', description: 'Chưa thể tải ảnh khi offline.', variant: 'destructive' });
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            handleExpenseInputChange(tripId, 'uploadState', 'error');
            handleExpenseInputChange(tripId, 'uploadError', 'Chỉ chấp nhận tệp ảnh.');
            toast({ title: 'Tệp không hợp lệ', description: 'Vui lòng chọn tệp ảnh.', variant: 'destructive' });
            return;
        }

        handleExpenseInputChange(tripId, 'isUploading', true);
        handleExpenseInputChange(tripId, 'uploadState', 'loading');
        handleExpenseInputChange(tripId, 'uploadError', '');
        try {
            const downloadUrl = await uploadTripImage(file, 'driver-expenses', tripId);
            handleExpenseInputChange(tripId, 'photoUrl', downloadUrl);
            handleExpenseInputChange(tripId, 'uploadState', 'success');
            toast({ title: 'Đã tải chứng từ', description: 'Ảnh chứng từ đã được lưu.' });
        } catch {
            handleExpenseInputChange(tripId, 'uploadState', 'error');
            handleExpenseInputChange(tripId, 'uploadError', 'Không thể lưu ảnh, vui lòng thử lại.');
            toast({ title: 'Lỗi tải ảnh', description: 'Không thể lưu ảnh, vui lòng thử lại.', variant: 'destructive' });
        } finally {
            handleExpenseInputChange(tripId, 'isUploading', false);
        }
    };

    const handlePrecheckToggle = (tripId: string, field: 'tires' | 'lights' | 'brakes' | 'fuel' | 'documents', value: boolean) => {
        setPrecheckByTrip((prev) => ({
            ...prev,
            [tripId]: {
                ...getPrecheck(tripId),
                [field]: value,
            },
        }));
    };

    const handlePrecheckPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, tripId: string) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được tải ảnh kiểm tra xe.', variant: 'destructive' });
            return;
        }

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Vui lòng bật mạng để tải ảnh kiểm tra xe.', variant: 'destructive' });
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Tệp không hợp lệ', description: 'Checklist xe chỉ chấp nhận ảnh.', variant: 'destructive' });
            return;
        }

        setPrecheckByTrip((prev) => ({
            ...prev,
            [tripId]: {
                ...getPrecheck(tripId),
                isUploading: true,
            },
        }));

        try {
            const downloadUrl = await uploadTripImage(file, 'driver-prechecks', tripId);
            setPrecheckByTrip((prev) => ({
                ...prev,
                [tripId]: {
                    ...getPrecheck(tripId),
                    photoUrl: downloadUrl,
                    isUploading: false,
                },
            }));
            toast({ title: 'Đã lưu ảnh checklist', description: 'Ảnh xe trước chuyến đã sẵn sàng.' });
        } catch {
            setPrecheckByTrip((prev) => ({
                ...prev,
                [tripId]: {
                    ...getPrecheck(tripId),
                    isUploading: false,
                },
            }));
            toast({ title: 'Lỗi tải ảnh', description: 'Không thể lưu ảnh checklist, vui lòng thử lại.', variant: 'destructive' });
        }
    };


    const handleSubmitLocationReport = async (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được gửi báo cáo.', variant: 'destructive' });
            return;
        }

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Vui lòng bật mạng để gửi báo cáo.', variant: 'destructive' });
            return;
        }

        const report = reportInputs[trip.id];
        if (!report?.photoUrl && !(report?.note || '').trim()) {
            toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập ghi chú hoặc chụp ảnh báo cáo.', variant: 'destructive' });
            return;
        }

        setIsUpdating(true);
        try {
            let point = liveLocationByTrip[trip.id] || null;
            if (!point) {
                try {
                    point = await getBestCurrentPosition(2);
                } catch {
                    point = null;
                }
            }

            const payload = buildReleaseSafeCreatePayload('driver-location-report', {
                alert_type: 'info',
                title: `Bao cao vi tri - ${trip.trip_code}`,
                message: report?.note || 'Tai xe gui bao cao vi tri.',
                reference_id: trip.id,
                reference_type: 'trip',
                severity: 'low',
                is_read: false,
                date: new Date().toISOString(),
                metadata: {
                    trip_code: trip.trip_code,
                    photo_url: report?.photoUrl || null,
                    latitude: point?.latitude || null,
                    longitude: point?.longitude || null,
                    accuracy_m: point?.accuracy || null,
                },
            });

            await alertsAdapter.create(payload);
            setReportInputs((prev) => ({
                ...prev,
                [trip.id]: { note: '', photoUrl: '', isUploading: false, uploadState: 'idle' },
            }));
            toast({ title: 'Đã gửi báo cáo', description: 'Báo cáo vị trí đã được gửi.' });
            
            sendOpsEventNotification({
                event: {
                    event_type: 'DRIVER_LOCATION_REPORT',
                    actor_role: 'driver',
                    actor_name: linkedDriver?.full_name || user?.email || 'Tai xe',
                    action: 'submit_location_report',
                    trip_code: trip.trip_code || null,
                    location: point ? `${roundCoord(point.latitude)},${roundCoord(point.longitude)}` : null,
                    status_after_action: 'REPORTED',
                    media_url: report?.photoUrl || null,
                    tenant_id: tenantId || null,
                    extra: {
                        tenant_id: tenantId || null,
                        note: report?.note || '',
                        accuracy_m: point?.accuracy || null,
                    },
                },
                text: report?.note || 'Tai xe gui bao cao vi tri.',
                mediaType: report?.photoUrl ? 'photo' : null,
                mediaUrl: report?.photoUrl || null,
                chatId: linkedDriver?.telegram_chat_id || linkedDriver?.telegramChatId || null,
            }).catch(console.error);
        } catch {
            toast({ title: 'Gửi báo cáo thất bại', description: 'Vui lòng thử lại.', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSubmitExpenseDoc = async (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được gửi chứng từ.', variant: 'destructive' });
            return;
        }

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Vui lòng bật mạng để gửi chứng từ.', variant: 'destructive' });
            return;
        }

        const expense = expenseInputs[trip.id];
        const amountValue = Number(expense?.amount || 0);
        if (!amountValue || Number.isNaN(amountValue)) {
            toast({ title: 'Thiếu số tiền', description: 'Vui lòng nhập số tiền chi phí.', variant: 'destructive' });
            return;
        }

        setIsUpdating(true);
        try {
            const now = new Date();
            const expenseDate = now.toISOString().slice(0, 10);
            await expenseAdapter.create({
                amount: amountValue,
                category: 'Chung tu tai xe',
                trip_id: trip.id,
                vehicle_id: trip.vehicle_id || trip.vehicle?.id || null,
                driver_id: trip.driver_id || user?.id || user?.email || null,
                expense_date: expenseDate,
                description: expense?.note || `Chung tu tai xe - ${trip.trip_code}`,
                receipt_url: expense?.photoUrl || null,
                status: 'draft',
                payment_method: 'CASH',
                is_reconciled: false,
            });

            setExpenseInputs((prev) => ({
                ...prev,
                [trip.id]: { amount: '', note: '', photoUrl: '', isUploading: false, uploadState: 'idle' },
            }));
            toast({ title: 'Đã gửi chứng từ', description: 'Kế toán sẽ đối soát chi phí.' });
            
            sendOpsEventNotification({
                event: {
                    event_type: 'DRIVER_EXPENSE_DOCUMENT',
                    actor_role: 'driver',
                    actor_name: linkedDriver?.full_name || user?.email || 'Tai xe',
                    action: 'submit_expense_document',
                    trip_code: trip.trip_code || null,
                    status_after_action: 'PENDING_RECONCILIATION',
                    media_url: expense?.photoUrl || null,
                    tenant_id: tenantId || null,
                    extra: {
                        tenant_id: tenantId || null,
                        amount: amountValue,
                        note: expense?.note || '',
                    },
                },
                text: `Chi phi ${amountValue.toLocaleString('vi-VN')} VND. ${expense?.note || ''}`,
                mediaType: expense?.photoUrl ? 'photo' : null,
                mediaUrl: expense?.photoUrl || null,
                chatId: linkedDriver?.telegram_chat_id || linkedDriver?.telegramChatId || null,
            }).catch(console.error);
        } catch (error) {
            toast({ title: 'Gửi chứng từ thất bại', description: 'Vui lòng thử lại.', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
        }
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

        if (!isOnline) {
            handleInputChange(tripId, 'uploadState', 'error');
            handleInputChange(tripId, 'uploadError', 'Thiết bị đang offline. Vui lòng kết nối mạng để tải biên nhận.');
            toast({ title: 'Mất kết nối mạng', description: 'Chưa thể tải biên nhận khi offline.', variant: 'destructive' });
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

        if (!trip.accepted_at && !trip.accepted_by) {
            toast({ title: 'Chưa nhận chuyến', description: 'Vui lòng bấm Nhận chuyến trước khi check-in.', variant: 'destructive' });
            return;
        }

        if (shareStateByTrip[trip.id] !== 'success') {
            toast({ title: 'Chưa chia sẻ vị trí', description: 'Vui lòng bật chia sẻ vị trí trước khi check-in.', variant: 'destructive' });
            return;
        }

        if (gpsLockStateByTrip[trip.id] !== 'success') {
            toast({ title: 'Chưa chốt vị trí GPS', description: 'Vui lòng định vị chính xác trước khi check-in.', variant: 'destructive' });
            return;
        }

        if (!infoConfirmedByTrip[trip.id]) {
            toast({ title: 'Chưa xác nhận thông tin', description: 'Vui lòng kiểm tra lộ trình và thông tin khách hàng.', variant: 'destructive' });
            return;
        }

        if (!isPrecheckComplete(trip.id)) {
            toast({
                title: 'Thiếu checklist trước chuyến',
                description: 'Cần hoàn thành checklist xe và tải ít nhất 1 ảnh xe trước khi check-in.',
                variant: 'destructive',
            });
            return;
        }

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Vui lòng bật mạng trước khi check-in chuyến.', variant: 'destructive' });
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

    const handleGpsLock = async (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được định vị.', variant: 'destructive' });
            return;
        }

        if (!trip.accepted_at && !trip.accepted_by) {
            toast({ title: 'Chưa nhận chuyến', description: 'Hãy nhận chuyến trước khi định vị GPS.', variant: 'destructive' });
            return;
        }

        if (shareStateByTrip[trip.id] !== 'success') {
            toast({ title: 'Chưa chia sẻ vị trí', description: 'Vui lòng bật chia sẻ vị trí trước khi định vị GPS.', variant: 'destructive' });
            return;
        }

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Vui lòng bật mạng trước khi định vị.', variant: 'destructive' });
            return;
        }

        setGpsLockStateByTrip((prev) => ({ ...prev, [trip.id]: 'loading' }));
        try {
            const point = await getBestCurrentPosition(4);
            setGpsLockAccuracyByTrip((prev) => ({ ...prev, [trip.id]: point.accuracy }));

            if (point.accuracy > MIN_CHECKIN_ACCURACY_M) {
                setGpsLockStateByTrip((prev) => ({ ...prev, [trip.id]: 'error' }));
                toast({
                    title: 'GPS chưa đủ chính xác',
                    description: `Độ chính xác hiện tại: ${Math.round(point.accuracy)}m. Vui lòng ra ngoài trời và thử lại.`,
                    variant: 'destructive',
                });
                return;
            }

            setGpsLockPointByTrip((prev) => ({ ...prev, [trip.id]: point }));
            setGpsLockStateByTrip((prev) => ({ ...prev, [trip.id]: 'success' }));
            toast({ title: 'Đã chốt vị trí GPS', description: `Sai số: ${Math.round(point.accuracy)}m.` });
        } catch (error) {
            setGpsLockStateByTrip((prev) => ({ ...prev, [trip.id]: 'error' }));
            toast({
                title: 'Không thể định vị',
                description: geolocationErrorToMessage(error),
                variant: 'destructive',
            });
        }
    };

    const handleAcceptTrip = async (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được nhận chuyến.', variant: 'destructive' });
            return;
        }
        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Vui lòng bật mạng trước khi nhận chuyến.', variant: 'destructive' });
            return;
        }

        setIsUpdating(true);
        try {
            await updateTrip({
                id: trip.id,
                updates: {
                    accepted_at: new Date().toISOString(),
                    accepted_by: user?.id || user?.email || 'driver',
                },
            });
            toast({ title: 'Đã nhận chuyến', description: 'Vui lòng thực hiện bước NHẬN XE để chốt ODO trước khi bắt đầu.' });
        } catch (error) {
            toast({ title: 'Nhận chuyến thất bại', description: 'Vui lòng thử lại.', variant: 'destructive' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStartSharingLocation = async (trip: any) => {
        if (!isDriverRole) {
            toast({ title: 'Không có quyền', description: 'Chỉ tài xế mới được chia sẻ vị trí.', variant: 'destructive' });
            return;
        }

        if (!trip.accepted_at && !trip.accepted_by) {
            toast({ title: 'Chưa nhận chuyến', description: 'Hãy nhận chuyến trước khi chia sẻ vị trí.', variant: 'destructive' });
            return;
        }

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Vui lòng bật mạng trước khi chia sẻ vị trí.', variant: 'destructive' });
            return;
        }

        if (shareStateByTrip[trip.id] === 'loading' || shareStateByTrip[trip.id] === 'success') {
            return;
        }

        setShareStateByTrip((prev) => ({ ...prev, [trip.id]: 'loading' }));
        setPreTripTrackingTripId(trip.id);
        toast({ title: 'Bật chia sẻ vị trí', description: 'Vui lòng bấm Cho phép khi trình duyệt hỏi về vị trí.' });

        // Location watch starts in the tracking effect once preTripTrackingTripId is set.
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

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Không thể chốt chuyến khi offline. Vui lòng bật mạng.', variant: 'destructive' });
            return;
        }

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

        if (!isOnline) {
            toast({ title: 'Mất kết nối mạng', description: 'Không thể gửi báo sự cố khi offline.', variant: 'destructive' });
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

    // --- P1 FIX: Shared availability toggle — no longer duplicated across empty/active states ---
    const handleToggleAvailability = useCallback(async () => {
        if (!linkedDriver?.id) return;
        setIsTogglingAvailability(true);
        const newStatus = availabilityStatus === 'available' ? 'off_duty' : 'available';
        try {
            await driverAdapter.update(linkedDriver.id, { availability_status: newStatus });
            setAvailabilityStatus(newStatus);
            toast({
                title: newStatus === 'available' ? 'Đã bật sẵn sàng nhận việc' : 'Đã chuyển sang nghỉ',
                description: newStatus === 'available' ? 'Bạn sẽ nhận thông báo chuyến mới.' : 'Hệ thống sẽ không gán chuyến cho bạn.',
            });
        } catch {
            toast({ title: 'Lỗi', description: 'Không thể cập nhật trạng thái.', variant: 'destructive' });
        } finally {
            setIsTogglingAvailability(false);
        }
    }, [linkedDriver?.id, availabilityStatus, toast]);

    if (isLoading) {
        return <div className="p-4 text-center mt-10">Đang tải dữ liệu chuyến đi...</div>;
    }

    if (myActiveTrips.length === 0) {
        const telegramBotName = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'FleetProBot').trim();
        const telegramBotLink = `https://t.me/${telegramBotName}`;
        const driverTelegramChatId = linkedDriver?.telegram_chat_id || linkedDriver?.telegramChatId || '';
        const isTelegramConnected = !!driverTelegramChatId;

        // Find assigned vehicle
        const assignedVehicle = vehicles.find((v: any) =>
            v.id === linkedDriver?.assigned_vehicle_id || v.assigned_driver_id === linkedDriver?.id
        );
        
        // Find pool vehicles available
        const poolVehicles = vehicles.filter((v: any) =>
            v.assignment_type === 'pool' && v.status === 'active'
        );

        // Removed local DraftRequestForm definition from here

        const isPhoneVerified = !!(linkedDriver?.phone || linkedDriver?.driver_phone);
        const isNotiEnabled = typeof Notification !== 'undefined' && Notification.permission === 'granted';
        const profileScore = [isTelegramConnected, isPhoneVerified, isNotiEnabled].filter(Boolean).length;
        const totalProfileSteps = 3;
        const isProfileComplete = profileScore === totalProfileSteps;

        return (
            <div className="p-4 space-y-4 pb-36">
                {/* GLASSMORPHISM STATUS BAR */}
                <Card className="border-0 bg-white/60 backdrop-blur-xl shadow-sm rounded-[24px] overflow-hidden">
                    <CardContent className="p-4 bg-gradient-to-br from-white/90 to-blue-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full shadow-sm bg-blue-100 flex items-center justify-center border border-white">
                                <span className="font-bold text-blue-700 text-lg">{linkedDriver?.full_name?.charAt(0) || user?.email?.charAt(0) || 'T'}</span>
                            </div>
                            <div>
                                <p className="text-base font-bold text-slate-800 tracking-tight leading-tight">
                                    {linkedDriver?.full_name || user?.email || 'Tài xế'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className={`w-2 h-2 rounded-full ${availabilityStatus === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></div>
                                    <p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-[120px]">
                                        {assignedVehicle ? `${assignedVehicle.license_plate} (${assignedVehicle.vehicle_type || 'N/A'})` : 'Chưa gán xe'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={availabilityStatus === 'available'}
                                disabled={isTogglingAvailability}
                                onChange={handleToggleAvailability}
                            />
                            <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
                        </label>
                    </CardContent>
                </Card>

                {/* THIẾU XE CỐ ĐỊNH - ĐẨY LÊN CTA CHÍNH */}
                {!linkedDriver?.assigned_vehicle_id && (
                    <div className="px-1 mt-2 mb-2">
                        <Button 
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-14 rounded-2xl shadow-xl shadow-blue-600/30 text-white text-base font-bold transition-transform active:scale-[0.98] border border-blue-400/50"
                            onClick={() => setIsAssignVehicleModalOpen(true)}
                        >
                            🚀 NHẬN XE ĐỂ BẮT ĐẦU
                        </Button>
                    </div>
                )}

                {/* NẾU CÓ XE POOL & ĐANG SẴN SÀNG */}
                {poolVehicles.length > 0 && availabilityStatus === 'available' && !linkedDriver?.assigned_vehicle_id && (
                    <Card className="border border-purple-100 bg-purple-50/50 rounded-[20px] shadow-sm">
                        <CardContent className="pt-3 pb-3">
                            <p className="text-xs font-semibold text-purple-800 mb-2">🚛 Xe Pool đang trống ({poolVehicles.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {poolVehicles.slice(0, 4).map((v: any) => (
                                    <Badge key={v.id} variant="outline" className="bg-white text-xs border-purple-200 text-purple-700">
                                        {v.license_plate}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ANIMATION RADAR / EMPTY STATE HERO */}
                <div className="flex flex-col items-center justify-center text-center py-6 relative">
                    {availabilityStatus === 'available' ? (
                        <>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-48 h-48 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDuration: '3s' }}></div>
                                <div className="absolute w-32 h-32 rounded-full border-2 border-emerald-500/20 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
                            </div>
                            <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 p-5 rounded-[24px] mb-4 shadow-lg shadow-emerald-200/50 relative z-10 border-4 border-white">
                                <LocateFixed className="w-10 h-10 text-emerald-600 animate-pulse" />
                            </div>
                            <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Đang tìm chuyến...</h2>
                            <p className="text-sm text-slate-500 mt-2 max-w-[240px] leading-relaxed">Giữ ứng dụng mở để không bỏ lỡ thông báo lệnh điều xe mới.</p>
                        </>
                    ) : (
                        <>
                           <div className="bg-slate-100 p-5 rounded-[24px] mb-4 shadow-inner relative z-10 border-2 border-white">
                                <Package className="w-10 h-10 text-slate-400" />
                            </div>
                            <h2 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Đang nghỉ ngơi</h2>
                            <p className="text-sm text-slate-500 mt-2 max-w-[240px] leading-relaxed">Bạn đang ngoại tuyến. Bật "Sẵn Sàng" phía trên để đi làm trở lại.</p>
                        </>
                    )}
                </div>

                {/* NATIVE iOS STYLE QUICK ACTIONS GRID */}
                <div className="bg-white rounded-[24px] p-4 shadow-sm border border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">CÔNG CỤ NHANH</h4>
                    <div className="grid grid-cols-4 gap-3">
                        <Link to="/driver/menu" className="flex flex-col items-center justify-center gap-2">
                            <div className="w-[52px] h-[52px] bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm active:scale-95 transition-transform"><CheckSquare className="w-6 h-6" /></div>
                            <span className="text-[10px] font-bold text-slate-600">Lệnh Xong</span>
                        </Link>
                        <Link to="/driver/menu" className="flex flex-col items-center justify-center gap-2">
                            <div className="w-[52px] h-[52px] bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm active:scale-95 transition-transform"><FileText className="w-6 h-6" /></div>
                            <span className="text-[10px] font-bold text-slate-600">Giấy Tờ</span>
                        </Link>
                        <a href="tel:0989890022" className="flex flex-col items-center justify-center gap-2">
                            <div className="w-[52px] h-[52px] bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100 shadow-sm active:scale-95 transition-transform"><PhoneCall className="w-6 h-6" /></div>
                            <span className="text-[10px] font-bold text-slate-600">Trợ Giúp</span>
                        </a>
                        <div 
                            className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                            onClick={() => {
                                if (!linkedDriver?.assigned_vehicle_id) {
                                    toast({ title: "Chưa nhận xe", description: "Vui lòng 'NHẬN XE ĐỂ BẮT ĐẦU' trước.", variant: "destructive" });
                                    setIsAssignVehicleModalOpen(true);
                                    return;
                                }
                                setIsQuickTripModalOpen(true);
                            }}
                        >
                            <div className="w-[52px] h-[52px] bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm active:scale-95 transition-transform"><Plus className="w-6 h-6" /></div>
                            <span className="text-[10px] font-bold text-slate-600">Tạo Lệnh</span>
                        </div>
                    </div>
                </div>

                {/* COMPACT PROFILE READINESS CARD */}
                {!isProfileComplete && (
                    <Card className="border border-amber-100 shadow-sm rounded-[24px] overflow-hidden bg-white">
                        <CardHeader className="pb-3 pt-4 bg-amber-50/50 border-b border-amber-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-bold text-slate-800">Hoàn thiện hồ sơ</CardTitle>
                                <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-0 pointer-events-none text-[10px] uppercase font-bold tracking-widest">
                                    {profileScore}/{totalProfileSteps} BƯỚC
                                </Badge>
                            </div>
                            <div className="w-full bg-amber-100/50 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-amber-500 transition-all duration-500 ease-in-out" style={{ width: `${(profileScore/totalProfileSteps)*100}%`}}></div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0 divide-y divide-slate-50">
                            {!isTelegramConnected && (
                                <div className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                        <MessageCircle className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700">Tin nhắn Zalo/Tele</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Nhận cuốc siêu tốc</p>
                                    </div>
                                    <a href={telegramBotLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 px-4 py-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">Kết nối</a>
                                </div>
                            )}

                            {!isPhoneVerified && (
                                <div className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                        <PhoneCall className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700">SĐT Tài xế</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Định danh liên lạc</p>
                                    </div>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase">BÁO QUẢN LÝ</span>
                                </div>
                            )}

                            {!isNotiEnabled && (
                                <div className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                        <Bell className="w-4 h-4 text-rose-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700">Thông báo đẩy</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Không lỡ lệnh điều phối</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-xs font-bold text-rose-600 px-4 py-2 bg-rose-50 rounded-full hover:bg-rose-100 transition-colors h-auto" onClick={() => {
                                        if (typeof Notification !== 'undefined') Notification.requestPermission()
                                    }}>Bật ngay</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                    <a
                        href="tel:0989890022"
                        className="flex items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-3 py-3 text-sm font-semibold text-blue-700 w-full shadow-sm"
                    >
                        <PhoneCall className="w-4 h-4" />
                        Hotline Điều phối: 0989.890.022
                    </a>

                    {isDriverRole && (
                        <Button 
                            id="driver-fab-create-trip"
                            className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 p-0 flex items-center justify-center transition-transform active:scale-95 border-2 border-white"
                            onClick={() => {
                                if (!linkedDriver?.assigned_vehicle_id) {
                                    toast({
                                        title: "Chưa nhận xe",
                                        description: "Vui lòng hoàn thành 'BƯỚC 0' để nhận xe điều hành.",
                                        variant: "destructive"
                                    });
                                    setIsAssignVehicleModalOpen(true);
                                    return;
                                }
                                setIsQuickTripModalOpen(true);
                            }}
                        >
                            <Plus className="w-8 h-8 text-white" />
                        </Button>
                    )}

                    <DriverVehicleAssignModal
                        isOpen={isAssignVehicleModalOpen}
                        onClose={() => setIsAssignVehicleModalOpen(false)}
                        driverId={linkedDriver?.id || ''}
                        tenantId={tenantId}
                        availableVehicles={vehicles}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['drivers'] });
                            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                        }}
                    />

                    <DriverQuickTripModal
                        isOpen={isQuickTripModalOpen}
                        onClose={() => setIsQuickTripModalOpen(false)}
                        driverId={linkedDriver?.id || user?.id || ''}
                        driverName={linkedDriver?.full_name || user?.email || ''}
                        tenantId={tenantId}
                        availableVehicles={vehicles.filter((v: any) => v.status === 'active' && (v.assignment_type === 'pool' || !v.assigned_driver_id || v.id === linkedDriver?.assigned_vehicle_id || v.assigned_driver_id === linkedDriver?.id || (linkedDriver?.driver_code && v.assigned_driver_id === linkedDriver.driver_code)))}
                        assignedVehicleId={linkedDriver?.assigned_vehicle_id}
                        routes={routes}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['trips'] });
                            queryClient.invalidateQueries({ queryKey: ['drivers'] });
                            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                        }}
                    />
                </div>
        );
    }

    // -- Active Trips View --

    const assignedVehicleActive = vehicles.find((v: any) =>
        v.id === linkedDriver?.assigned_vehicle_id || v.assigned_driver_id === linkedDriver?.id
    );

    return (
        <div className="p-4 pb-24 space-y-4">
            {/* STATUS BAR */}
            <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50">
                <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                {linkedDriver?.full_name || user?.email || 'Tài xế'}
                            </p>
                            <p className="text-xs text-slate-500">
                                {assignedVehicleActive ? `🚛 ${assignedVehicleActive.license_plate}` : ''}
                                {' • '}
                                {myActiveTrips.length} chuyến đang thực hiện
                            </p>
                        </div>
                        <Button
                            size="sm"
                            variant={availabilityStatus === 'available' ? 'default' : 'outline'}
                            className={`text-xs h-8 ${availabilityStatus === 'available' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-600'}`}
                            onClick={handleToggleAvailability}
                            disabled={isTogglingAvailability}
                        >
                            {isTogglingAvailability ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                            {availabilityStatus === 'available' ? '🟢 Sẵn sàng' : '⚫ Đang nghỉ'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className={isOnline ? "border-emerald-200 bg-emerald-50/70" : "border-red-200 bg-red-50/80"}>
                <CardContent className="pt-3 pb-3">
                    <div className="flex items-center gap-2 text-sm">
                        {isOnline ? <Wifi className="w-4 h-4 text-emerald-700" /> : <WifiOff className="w-4 h-4 text-red-700" />}
                        <span className={isOnline ? "text-emerald-800" : "text-red-800"}>
                            {isOnline
                                ? 'Đang online: dữ liệu chuyến được đồng bộ thời gian thực.'
                                : 'Đang offline: chỉ xem dữ liệu cũ, các thao tác gửi dữ liệu tạm bị khóa.'}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Chuyến đi của bạn</h2>
                <p className="text-sm text-slate-500">Kéo xuống để xem tất cả ({myActiveTrips.length} chuyến)</p>
            </div>

            {/* Proactive Draft Modal (Persistent floating button) */}
            <div className="fixed bottom-20 right-4 z-50">
                <Button 
                    size="icon" 
                    className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl border-2 border-white animate-bounce-subtle"
                    onClick={() => setIsQuickTripModalOpen(true)}
                >
                    <Plus className="w-6 h-6 text-white" />
                </Button>
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

            {myActiveTrips.map((trip) => {
                const shareState = shareStateByTrip[trip.id] || 'idle';
                const gpsState = gpsLockStateByTrip[trip.id] || 'idle';
                const gpsAccuracy = gpsLockAccuracyByTrip[trip.id];
                const gpsPoint = gpsLockPointByTrip[trip.id];
                const infoConfirmed = !!infoConfirmedByTrip[trip.id];
                const shareLabel = shareState === 'success'
                    ? 'Đang chia sẻ vị trí'
                    : shareState === 'loading'
                        ? 'Đang bật chia sẻ...'
                        : shareState === 'error'
                            ? 'Chưa chia sẻ (lỗi GPS)'
                            : 'Chưa chia sẻ';
                const shareTone = shareState === 'success'
                    ? 'text-emerald-700'
                    : shareState === 'error'
                        ? 'text-red-700'
                        : 'text-slate-600';
                const gpsLabel = gpsState === 'success'
                    ? 'Đã chốt vị trí'
                    : gpsState === 'loading'
                        ? 'Đang định vị...'
                        : gpsState === 'error'
                            ? 'GPS chưa đủ chính xác'
                            : 'Chưa định vị';
                const gpsTone = gpsState === 'success'
                    ? 'text-emerald-700'
                    : gpsState === 'error'
                        ? 'text-red-700'
                        : 'text-slate-600';

                return (
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

                        {/* Quick Action Grid - Condensed & Professional */}
                        <div className="mt-4 border-t pt-4">
                            <div className="grid grid-cols-4 gap-3">
                                <Link to="/driver/menu" className="flex flex-col items-center justify-center p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-sm active:scale-95 transition-all">
                                    <CheckSquare className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-bold">Nhận Xe</span>
                                </Link>
                                <button 
                                    onClick={() => {
                                        if (trip.customer?.address) {
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.customer.address)}`, '_blank');
                                        } else {
                                            toast({ title: 'Thiếu địa chỉ', description: 'Khách hàng này chưa có địa chỉ cập nhật.' });
                                        }
                                    }}
                                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-sky-50 border border-sky-100 text-sky-700 shadow-sm active:scale-95 transition-all"
                                >
                                    <Navigation className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-bold">Dẫn Đường</span>
                                </button>
                                <Link to="/driver/menu" className="flex flex-col items-center justify-center p-2 rounded-xl bg-violet-50 border border-violet-100 text-violet-700 shadow-sm active:scale-95 transition-all">
                                    <FileText className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-bold">Giấy Tờ</span>
                                </Link>
                                <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 shadow-sm opacity-50">
                                    <Camera className="w-6 h-6 mb-1" />
                                    <span className="text-[10px] font-bold">Sự Cố</span>
                                </div>
                            </div>
                        </div>

                        {trip.status === 'dispatched' && !trip.accepted_at && !trip.accepted_by && isDriverRole && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                Bắt buộc: hãy bấm <strong>Nhận chuyến</strong> trước khi check-in GPS.
                            </div>
                        )}

                        {trip.status === 'dispatched' && isDriverRole && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3">
                                <Label className="text-[11px] font-semibold text-slate-700">BƯỚC 2: CHIA SẺ VỊ TRÍ</Label>
                                <div className={`mt-1 text-xs ${shareTone}`}>Trạng thái: {shareLabel}</div>
                                <Button
                                    className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
                                    disabled={isUpdating || shareState === 'loading' || shareState === 'success'}
                                    onClick={() => handleStartSharingLocation(trip)}
                                >
                                    {shareState === 'loading' ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang bật chia sẻ...</>
                                    ) : shareState === 'success' ? (
                                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Đang chia sẻ vị trí</>
                                    ) : (
                                        <><MapPin className="w-4 h-4 mr-2" /> Bắt đầu chia sẻ vị trí</>
                                    )}
                                </Button>
                            </div>
                        )}

                        {trip.status === 'dispatched' && isDriverRole && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3">
                                <Label className="text-[11px] font-semibold text-slate-700">BƯỚC 3: ĐỊNH VỊ CHÍNH XÁC</Label>
                                <div className={`mt-1 text-xs ${gpsTone}`}>
                                    Trạng thái: {gpsLabel}
                                    {typeof gpsAccuracy === 'number' ? ` • Sai số ${Math.round(gpsAccuracy)}m` : ''}
                                </div>
                                {gpsPoint && (
                                    <div className="mt-2 text-[11px] text-slate-700 bg-slate-50 rounded-md border px-2 py-1">
                                        GPS: {roundCoord(gpsPoint.latitude)}, {roundCoord(gpsPoint.longitude)}
                                    </div>
                                )}
                                <Button
                                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
                                    disabled={isUpdating || gpsState === 'loading' || shareState !== 'success'}
                                    onClick={() => handleGpsLock(trip)}
                                >
                                    {gpsState === 'loading' ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang định vị...</>
                                    ) : gpsState === 'success' ? (
                                        <><CheckCircle2 className="w-4 h-4 mr-2" /> Đã chốt vị trí</>
                                    ) : (
                                        <><LocateFixed className="w-4 h-4 mr-2" /> Định vị chính xác</>
                                    )}
                                </Button>
                            </div>
                        )}

                        {trip.status === 'dispatched' && isDriverRole && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3">
                                <Label className="text-[11px] font-semibold text-slate-700">BƯỚC 4: CHECKLIST XE + ẢNH TRƯỚC CHUYẾN</Label>
                                <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-700">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={getPrecheck(trip.id).tires} onChange={(e) => handlePrecheckToggle(trip.id, 'tires', e.target.checked)} />
                                        Lốp xe đủ áp suất, không rách/nứt.
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={getPrecheck(trip.id).lights} onChange={(e) => handlePrecheckToggle(trip.id, 'lights', e.target.checked)} />
                                        Đèn, còi, tín hiệu hoạt động bình thường.
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={getPrecheck(trip.id).brakes} onChange={(e) => handlePrecheckToggle(trip.id, 'brakes', e.target.checked)} />
                                        Phanh và vô-lăng ổn định.
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={getPrecheck(trip.id).fuel} onChange={(e) => handlePrecheckToggle(trip.id, 'fuel', e.target.checked)} />
                                        Nhiên liệu đủ cho chuyến dự kiến.
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={getPrecheck(trip.id).documents} onChange={(e) => handlePrecheckToggle(trip.id, 'documents', e.target.checked)} />
                                        Giấy tờ xe và GPLX hợp lệ.
                                    </label>
                                </div>

                                <Button
                                    variant="outline"
                                    className="mt-2 w-full bg-white border-slate-300 text-slate-700 cursor-pointer relative overflow-hidden"
                                    disabled={getPrecheck(trip.id).isUploading}
                                >
                                    {getPrecheck(trip.id).isUploading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải ảnh xe...</>
                                    ) : getPrecheck(trip.id).photoUrl ? (
                                        <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Đã có ảnh checklist xe</>
                                    ) : (
                                        <><Camera className="w-4 h-4 mr-2" /> Chụp ảnh xe trước chuyến</>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => handlePrecheckPhotoUpload(e, trip.id)}
                                        disabled={getPrecheck(trip.id).isUploading}
                                    />
                                </Button>

                                <div className={`mt-2 text-xs ${isPrecheckComplete(trip.id) ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {isPrecheckComplete(trip.id)
                                        ? 'Checklist trước chuyến đã hoàn tất.'
                                        : 'Cần tick đủ checklist và có ít nhất 1 ảnh xe để được check-in.'}
                                </div>
                            </div>
                        )}

                        {trip.status === 'dispatched' && isDriverRole && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3">
                                <Label className="text-[11px] font-semibold text-slate-700">BƯỚC 5: KIỂM TRA LỘ TRÌNH & KHÁCH HÀNG</Label>
                                <div className="mt-2 space-y-1 text-xs text-slate-700">
                                    <div><span className="text-slate-500">Mã đơn:</span> <span className="font-semibold">{trip.trip_code}</span></div>
                                    <div><span className="text-slate-500">Khách hàng:</span> <span className="font-semibold">{trip.customer?.customer_name || trip.customer?.name || trip.customer_id || 'Khách vãng lai'}</span></div>
                                    <div>
                                        <span className="text-slate-500">SĐT:</span>{' '}
                                        {trip.customer?.phone || trip.customer?.contact_phone ? (
                                            <a className="font-semibold text-blue-600" href={`tel:${trip.customer?.phone || trip.customer?.contact_phone}`}>
                                                {trip.customer?.phone || trip.customer?.contact_phone}
                                            </a>
                                        ) : (
                                            <span className="font-semibold">Chưa có</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Địa chỉ:</span>{' '}
                                        {trip.customer?.address ? (
                                            <a
                                                className="font-semibold text-blue-600"
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.customer.address)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {trip.customer.address}
                                            </a>
                                        ) : (
                                            <span className="font-semibold">Chưa có</span>
                                        )}
                                    </div>
                                    <div><span className="text-slate-500">Tuyến:</span> <span className="font-semibold">{trip.route?.route_name || trip.route_name || trip.route_id || 'Chưa rõ'}</span></div>
                                    {trip.notes && (
                                        <div><span className="text-slate-500">Ghi chú:</span> <span className="font-semibold">{trip.notes}</span></div>
                                    )}
                                </div>

                                <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={infoConfirmed}
                                        onChange={(e) => setInfoConfirmedByTrip((prev) => ({ ...prev, [trip.id]: e.target.checked }))}
                                    />
                                    Tôi đã kiểm tra lộ trình và thông tin khách hàng.
                                </label>
                            </div>
                        )}

                        {isDriverRole && (trip.status === 'dispatched' || trip.status === 'in_progress') && (
                            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-3 space-y-3">
                                <div>
                                    <Label className="text-[11px] font-semibold text-slate-700">BÁO CÁO VỊ TRÍ (ẢNH + GHI CHÚ)</Label>
                                    <Input
                                        className="mt-2 bg-white"
                                        placeholder="Nhập ghi chú nhanh..."
                                        value={reportInputs[trip.id]?.note || ''}
                                        onChange={(e) => handleReportInputChange(trip.id, 'note', e.target.value)}
                                    />
                                    <Button
                                        variant="outline"
                                        className="mt-2 w-full bg-white border-slate-300 text-slate-700 cursor-pointer relative overflow-hidden"
                                        disabled={reportInputs[trip.id]?.isUploading}
                                    >
                                        {reportInputs[trip.id]?.isUploading ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải ảnh...</>
                                        ) : reportInputs[trip.id]?.photoUrl ? (
                                            <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Đã tải ảnh</>
                                        ) : (
                                            <><Camera className="w-4 h-4 mr-2" /> Chụp ảnh vị trí</>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handleReportPhotoUpload(e, trip.id)}
                                            disabled={reportInputs[trip.id]?.isUploading}
                                        />
                                    </Button>
                                    {reportInputs[trip.id]?.uploadState === 'error' && (
                                        <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                                            {reportInputs[trip.id]?.uploadError || 'Tải ảnh thất bại.'}
                                        </div>
                                    )}
                                    <Button
                                        className="mt-2 w-full bg-slate-900 hover:bg-slate-800"
                                        disabled={isUpdating || reportInputs[trip.id]?.isUploading}
                                        onClick={() => handleSubmitLocationReport(trip)}
                                    >
                                        <MapPin className="w-4 h-4 mr-2" /> Gửi báo cáo vị trí
                                    </Button>
                                </div>

                                <div className="border-t border-slate-100 pt-3">
                                    <Label className="text-[11px] font-semibold text-slate-700">CHỨNG TỪ CHI PHÍ (GỬI KẾ TOÁN)</Label>
                                    <div className="mt-2 grid grid-cols-1 gap-2">
                                        {/* PIPELINE FIX P3: Category dropdown */}
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={expenseInputs[trip.id]?.category_id || ''}
                                            onChange={(e) => handleExpenseInputChange(trip.id, 'category_id', e.target.value)}
                                        >
                                            <option value="">-- Chọn loại chi phí --</option>
                                            <option value="fuel">⛽ Nhiên liệu</option>
                                            <option value="toll">🛣️ Cầu đường</option>
                                            <option value="allowance">🍚 Bồi dưỡng/Ăn uống</option>
                                            <option value="support">🤝 Hỗ trợ</option>
                                            <option value="police">🚔 Công an/Hải quan</option>
                                            <option value="tire">🔧 Bơm vá lốp</option>
                                            <option value="maintenance">🛠️ Bảo dưỡng/Sửa chữa</option>
                                            <option value="labor">👷 Bốc xếp/Nhân công</option>
                                            <option value="other">📋 Phí khác</option>
                                        </select>
                                        <Input
                                            type="number"
                                            className="bg-white"
                                            placeholder="Số tiền chi phí"
                                            value={expenseInputs[trip.id]?.amount || ''}
                                            onChange={(e) => handleExpenseInputChange(trip.id, 'amount', e.target.value)}
                                        />
                                        <Input
                                            className="bg-white"
                                            placeholder="Ghi chú (vd: phí bốc xếp Cảng Cái Mép)"
                                            value={expenseInputs[trip.id]?.note || ''}
                                            onChange={(e) => handleExpenseInputChange(trip.id, 'note', e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="mt-2 w-full bg-white border-slate-300 text-slate-700 cursor-pointer relative overflow-hidden"
                                        disabled={expenseInputs[trip.id]?.isUploading}
                                    >
                                        {expenseInputs[trip.id]?.isUploading ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải chứng từ...</>
                                        ) : expenseInputs[trip.id]?.photoUrl ? (
                                            <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Đã tải chứng từ</>
                                        ) : (
                                            <><Camera className="w-4 h-4 mr-2" /> Chụp chứng từ</>
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handleExpensePhotoUpload(e, trip.id)}
                                            disabled={expenseInputs[trip.id]?.isUploading}
                                        />
                                    </Button>
                                    {expenseInputs[trip.id]?.uploadState === 'error' && (
                                        <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1">
                                            {expenseInputs[trip.id]?.uploadError || 'Tải chứng từ thất bại.'}
                                        </div>
                                    )}
                                    <Button
                                        className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
                                        disabled={isUpdating || expenseInputs[trip.id]?.isUploading}
                                        onClick={() => handleSubmitExpenseDoc(trip)}
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Gửi chứng từ chi phí
                                    </Button>
                                </div>
                            </div>
                        )}
                        
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
                                Chế độ xem: các thao tác thực thi hành trình đã bị ẩn.
                            </div>
                        ) : trip.status === 'in_progress' ? (
                            <div className="flex gap-2 w-full">
                                <Button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-extrabold py-7 text-xl shadow-lg shadow-emerald-200 animate-pulse-slow" disabled={isUpdating || tripInputs[trip.id]?.isUploading} onClick={() => handleFinishTripWithSignature(trip)}>
                                    <CheckCircle2 className="w-6 h-6 mr-3" /> CHỐT CHUYẾN & KÝ NHẬN
                                </Button>
                            </div>
                        ) : (
                            trip.status === 'dispatched' ? (
                                !trip.accepted_at ? (
                                    <Button
                                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-xl font-extrabold py-7 shadow-lg shadow-orange-200 animate-pulse-slow"
                                        onClick={() => handleAcceptTrip(trip)}
                                        disabled={isUpdating}
                                    >
                                        <CheckCircle2 className="w-6 h-6 mr-3" /> NHẬN CHUYẾN
                                    </Button>
                                ) : !trip.start_odometer ? (
                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xl font-extrabold py-7 shadow-lg shadow-blue-200 flex flex-col items-center justify-center h-auto"
                                        onClick={() => handleOpenPickup(trip)}
                                        disabled={isUpdating}
                                    >
                                        <div className="flex items-center">
                                            <Truck className="w-6 h-6 mr-3" /> NHẬN XE & CHỐT ODO
                                        </div>
                                        <span className="text-[10px] opacity-80 font-normal uppercase mt-1">Bước bắt buộc trước khi chạy</span>
                                    </Button>
                                ) : (
                                    <Button 
                                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-xl font-extrabold py-7 shadow-lg shadow-blue-200" 
                                        onClick={() => handleStartTrip(trip)}
                                        disabled={isUpdating || isCheckingInTripId === trip.id || !infoConfirmedByTrip[trip.id] || !isPrecheckComplete(trip.id)}
                                    >
                                        {isCheckingInTripId === trip.id ? (
                                            <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> ĐANG CHECK-IN GPS...</>
                                        ) : (
                                            <><Play className="w-6 h-6 mr-3" /> BẮT ĐẦU CHẠY</>
                                        )}
                                    </Button>
                                )
                            ) : (
                                <div className="w-full p-4 border border-dashed rounded-lg text-center text-slate-400 text-sm">
                                    Chờ Điều phối phát lệnh...
                                </div>
                            )
                        )}
                    </CardFooter>
                    {startStateByTrip[trip.id] === 'error' && <div className="px-6 pb-3 text-xs text-red-700">Check-in thất bại. Vui lòng kiểm tra GPS và thử lại.</div>}
                    {startStateByTrip[trip.id] === 'success' && <div className="px-6 pb-3 text-xs text-green-700">Check-in thành công.</div>}
                    {finishStateByTrip[trip.id] === 'error' && <div className="px-6 pb-3 text-xs text-red-700">Chốt chuyến thất bại.</div>}
                    {finishStateByTrip[trip.id] === 'success' && <div className="px-6 pb-3 text-xs text-green-700">Chốt chuyến thành công.</div>}
                    {incidentStateByTrip[trip.id] === 'error' && <div className="px-6 pb-3 text-xs text-red-700">Gửi báo sự cố thất bại.</div>}
                    {incidentStateByTrip[trip.id] === 'success' && <div className="px-6 pb-3 text-xs text-green-700">Đã gửi báo sự cố.</div>}
                </Card>
            );
            })}

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

            {isDriverRole && primaryTripForAction && (
                <div className="fixed bottom-[82px] left-1/2 z-30 w-[min(92vw,430px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
                    {primaryTripForAction.status === 'in_progress' ? (
                        <Button
                            className="h-12 w-full bg-green-600 text-base font-bold hover:bg-green-700"
                            disabled={isUpdating || !isOnline || tripInputs[primaryTripForAction.id]?.isUploading}
                            onClick={() => handleFinishTripWithSignature(primaryTripForAction)}
                        >
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Chốt chuyến nhanh ({primaryTripForAction.trip_code})
                        </Button>
                    ) : (
                        primaryTripForAction.status === 'dispatched' ? (
                            !primaryTripForAction.accepted_at ? (
                                <Button
                                    className="h-12 w-full bg-amber-500 text-base font-bold hover:bg-amber-600"
                                    disabled={isUpdating || !isOnline}
                                    onClick={() => handleAcceptTrip(primaryTripForAction)}
                                >
                                    <CheckCircle2 className="mr-2 h-5 w-5" /> Nhận chuyến nhanh ({primaryTripForAction.trip_code})
                                </Button>
                            ) : !primaryTripForAction.start_odometer ? (
                                <Button
                                    className="h-12 w-full bg-blue-500 text-base font-bold hover:bg-blue-600"
                                    disabled={isUpdating || !isOnline}
                                    onClick={() => handleOpenPickup(primaryTripForAction)}
                                >
                                    <Truck className="mr-2 h-5 w-5" /> Thực hiện Nhận xe ODO
                                </Button>
                            ) : (
                                <Button
                                    className="h-12 w-full bg-blue-600 text-base font-bold hover:bg-blue-700"
                                    disabled={isUpdating || !isOnline || isCheckingInTripId === primaryTripForAction.id || !infoConfirmedByTrip[primaryTripForAction.id] || !isPrecheckComplete(primaryTripForAction.id)}
                                    onClick={() => handleStartTrip(primaryTripForAction)}
                                >
                                    {isCheckingInTripId === primaryTripForAction.id ? (
                                        <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Đang check-in...</>
                                    ) : (
                                        <><Play className="mr-2 h-5 w-5" /> Bắt đầu chuyến nhanh ({primaryTripForAction.trip_code})</>
                                    )}
                                </Button>
                            )
                        ) : null
                    )}
                </div>
            )}

            {isDriverRole && (
                <Button 
                    className="fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 p-0 flex items-center justify-center transition-transform active:scale-95 border-2 border-white"
                    onClick={() => setIsQuickTripModalOpen(true)}
                >
                    <Plus className="w-8 h-8 text-white" />
                </Button>
            )}

            <DriverQuickTripModal
                isOpen={isQuickTripModalOpen}
                onClose={() => setIsQuickTripModalOpen(false)}
                driverId={linkedDriver?.id || user?.id || ''}
                driverName={linkedDriver?.full_name || user?.email || ''}
                tenantId={tenantId}
                availableVehicles={vehicles.filter((v: any) => v.status === 'active' && (v.assignment_type === 'pool' || v.id === linkedDriver?.assigned_vehicle_id || v.assigned_driver_id === linkedDriver?.id))}
                assignedVehicleId={linkedDriver?.assigned_vehicle_id}
                routes={routes}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['trips'] });
                }}
            />

            {/* PIPELINE FIX: Pickup Modal */}
            <Dialog open={pickupDialogOpen} onOpenChange={setPickupDialogOpen}>
                <DialogContent className="max-w-[95%] sm:max-w-md bg-white p-0 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Truck className="w-6 h-6" />
                            Xác nhận Nhận Xe
                        </DialogTitle>
                        <DialogDescription className="text-blue-100 mt-1">
                            Vui lòng kiểm tra và chốt chỉ số Odometer của xe <strong>{vehicles.find(v => v.id === activeTripForPickup?.vehicle_id)?.license_plate}</strong>
                        </DialogDescription>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pickup-odo" className="text-sm font-semibold text-slate-700">Chỉ số Odometer hiện tại (Km)*</Label>
                            <Input 
                                id="pickup-odo"
                                type="number" 
                                placeholder="Nhập số Km hiện trên đồng hồ..." 
                                className="h-12 text-lg font-bold"
                                value={pickupOdo}
                                onChange={(e) => setPickupOdo(e.target.value)}
                            />
                            <p className="text-[10px] text-slate-500 italic">
                                * Lưu ý: Số Odometer này sẽ là căn cứ tính tiêu hao nhiên liệu cho chuyến CD{activeTripForPickup?.trip_code}.
                            </p>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                            <CheckSquare className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800">
                                <strong>Kiểm tra nhanh:</strong> Đảm bảo lốp, đèn và các giấy tờ xe đã đầy đủ trước khi nhận bàn giao từ bãi.
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" className="flex-1 h-12" onClick={() => setPickupDialogOpen(false)}>
                                Đóng
                            </Button>
                            <Button 
                                className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 font-bold"
                                onClick={handleConfirmPickup}
                                disabled={isUpdating || !pickupOdo}
                            >
                                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "XÁC NHẬN NHẬN XE"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
