/**
 * 📦 Public Tracking Page — NO LOGIN REQUIRED
 * 
 * Customer nhận link: /track/CD2604-01 hoặc /track?code=CD2604-01
 * → Xem trạng thái chuyến hàng real-time từ Firestore
 * 
 * MUST NOT expose:
 * - Driver phone number
 * - Revenue/cost data
 * - Internal notes
 * Only shows: status, route, timestamps, vehicle plate
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
    Truck, Package, MapPin, Clock, CheckCircle2, Loader2, 
    Search, AlertTriangle, ArrowRight, Phone 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Status display config
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Package; color: string; bg: string; step: number }> = {
    draft: { label: 'Đang xử lý', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100', step: 1 },
    confirmed: { label: 'Đã xác nhận', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-100', step: 2 },
    dispatched: { label: 'Đã điều phối', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-100', step: 3 },
    in_progress: { label: 'Đang vận chuyển', icon: Truck, color: 'text-amber-600', bg: 'bg-amber-100', step: 4 },
    completed: { label: 'Đã giao hàng', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', step: 5 },
    closed: { label: 'Hoàn tất', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-100', step: 6 },
    cancelled: { label: 'Đã huỷ', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', step: 0 },
};

const STEPS = [
    { key: 'confirmed', label: 'Xác nhận' },
    { key: 'dispatched', label: 'Điều phối' },
    { key: 'in_progress', label: 'Đang chạy' },
    { key: 'completed', label: 'Giao hàng' },
    { key: 'closed', label: 'Hoàn tất' },
];

interface PublicTripData {
    trip_code: string;
    status: string;
    origin: string;
    destination: string;
    departure_date: string;
    arrival_date?: string;
    vehicle_plate?: string;
    customer_name?: string;
    route_name?: string;
    distance_km?: number;
    updated_at?: string;
}

export default function PublicTracking() {
    const { code } = useParams<{ code: string }>();
    const [searchParams] = useSearchParams();
    const codeFromQuery = searchParams.get('code');
    const initialCode = code || codeFromQuery || '';

    const [searchCode, setSearchCode] = useState(initialCode);
    const [loading, setLoading] = useState(false);
    const [trip, setTrip] = useState<PublicTripData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);

    const searchTrip = async (tripCode: string) => {
        if (!tripCode.trim()) return;
        setLoading(true);
        setError(null);
        setTrip(null);
        setSearched(true);

        try {
            // Search across ALL tenants by trip_code — public data only
            const q = query(
                collection(db, 'trips'),
                where('trip_code', '==', tripCode.trim().toUpperCase())
            );
            const snap = await getDocs(q);
            
            if (snap.empty) {
                setError('Không tìm thấy mã vận đơn. Vui lòng kiểm tra lại.');
                setLoading(false);
                return;
            }

            const doc = snap.docs[0];
            const data = doc.data();

            // ONLY expose safe public fields
            setTrip({
                trip_code: data.trip_code || tripCode,
                status: data.status || 'draft',
                origin: data.origin || data.route?.origin || 'Đang cập nhật',
                destination: data.destination || data.route?.destination || 'Đang cập nhật',
                departure_date: data.departure_date || data.created_at || '',
                arrival_date: data.arrival_date || data.completed_at || undefined,
                vehicle_plate: data.vehicle?.license_plate || data.vehicle_plate || undefined,
                customer_name: data.customer?.company_name || data.customer_name || undefined,
                route_name: data.route?.route_name || data.route_name || undefined,
                distance_km: data.distance_km || data.route?.distance_km || undefined,
                updated_at: data.updated_at || data.created_at || '',
            });
        } catch (err) {
            console.error('[PublicTracking] Error:', err);
            setError('Lỗi kết nối. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-search if code in URL
    useEffect(() => {
        if (initialCode) {
            setSearchCode(initialCode);
            searchTrip(initialCode);
        }
    }, []);

    const statusInfo = trip ? STATUS_CONFIG[trip.status] || STATUS_CONFIG.draft : null;
    const currentStep = statusInfo?.step || 0;

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleString('vi-VN', { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return dateStr; }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-black text-xs">FP</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-sm text-slate-800">FleetPro Tracking</h1>
                        <p className="text-[10px] text-slate-400">Tra cứu vận đơn</p>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                {/* Search Bar */}
                <Card className="shadow-lg border-blue-100">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-1">
                            📦 Tra cứu đơn hàng
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Nhập mã vận đơn để xem trạng thái giao hàng
                        </p>
                        <form 
                            className="flex gap-2"
                            onSubmit={(e) => { e.preventDefault(); searchTrip(searchCode); }}
                        >
                            <Input
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                                placeholder="VD: CD2604-01"
                                className="font-mono text-lg h-12 uppercase"
                                autoFocus
                            />
                            <Button 
                                type="submit" 
                                disabled={loading || !searchCode.trim()}
                                className="h-12 px-6 bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Search className="w-5 h-5" />
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Error */}
                {error && (
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                            <p className="text-sm text-red-700">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {/* No results */}
                {searched && !loading && !trip && !error && (
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Package className="w-5 h-5 text-amber-500 shrink-0" />
                            <p className="text-sm text-amber-700">Không tìm thấy vận đơn với mã này.</p>
                        </CardContent>
                    </Card>
                )}

                {/* Trip Result */}
                {trip && statusInfo && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Status Hero */}
                        <Card className={`${statusInfo.bg} border-0 shadow-md`}>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <statusInfo.icon className={`w-8 h-8 ${statusInfo.color}`} />
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium">Mã vận đơn</p>
                                        <p className="font-mono font-black text-xl text-slate-800">{trip.trip_code}</p>
                                    </div>
                                    <Badge className={`ml-auto ${statusInfo.bg} ${statusInfo.color} border-0 text-sm px-3 py-1`}>
                                        {statusInfo.label}
                                    </Badge>
                                </div>

                                {/* Route summary */}
                                <div className="flex items-center gap-2 mt-4 bg-white/60 rounded-lg p-3">
                                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="text-sm font-medium text-slate-700 truncate">{trip.origin}</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                                    <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                                    <span className="text-sm font-medium text-slate-700 truncate">{trip.destination}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Progress Steps */}
                        {trip.status !== 'cancelled' && (
                            <Card>
                                <CardContent className="p-6">
                                    <h3 className="text-sm font-bold text-slate-700 mb-4">Tiến trình vận chuyển</h3>
                                    <div className="flex items-center justify-between">
                                        {STEPS.map((step, idx) => {
                                            const stepNum = idx + 2; // confirmed=2, dispatched=3...
                                            const isCompleted = currentStep >= stepNum;
                                            const isCurrent = currentStep === stepNum;
                                            return (
                                                <div key={step.key} className="flex flex-col items-center flex-1">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                                                        isCompleted 
                                                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                            : isCurrent
                                                                ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                                                                : 'bg-white border-slate-200 text-slate-400'
                                                    }`}>
                                                        {isCompleted ? '✓' : idx + 1}
                                                    </div>
                                                    <span className={`text-[10px] mt-1 font-medium text-center ${
                                                        isCompleted ? 'text-emerald-600' : isCurrent ? 'text-blue-600' : 'text-slate-400'
                                                    }`}>
                                                        {step.label}
                                                    </span>
                                                    {idx < STEPS.length - 1 && (
                                                        <div className={`absolute h-0.5 w-full ${
                                                            isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                                                        }`} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Details */}
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <h3 className="text-sm font-bold text-slate-700">Chi tiết vận đơn</h3>
                                
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    {trip.route_name && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Tuyến</p>
                                            <p className="font-medium">{trip.route_name}</p>
                                        </div>
                                    )}
                                    {trip.distance_km && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Quãng đường</p>
                                            <p className="font-medium">{Math.round(trip.distance_km)} km</p>
                                        </div>
                                    )}
                                    {trip.vehicle_plate && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Biển số xe</p>
                                            <p className="font-mono font-medium">{trip.vehicle_plate}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Ngày xuất phát</p>
                                        <p className="font-medium">{formatDate(trip.departure_date)}</p>
                                    </div>
                                    {trip.arrival_date && (
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400">Ngày đến</p>
                                            <p className="font-medium text-emerald-600">{formatDate(trip.arrival_date)}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Cập nhật lần cuối</p>
                                        <p className="font-medium text-slate-500">{formatDate(trip.updated_at || '')}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact CTA */}
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-blue-800">Cần hỗ trợ?</p>
                                    <p className="text-xs text-blue-600">Liên hệ đội ngũ điều phối</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                                    onClick={() => window.open('https://zalo.me/g/tdhmtu261', '_blank')}
                                >
                                    <Phone className="w-4 h-4 mr-2" />
                                    Liên hệ
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Footer */}
                <footer className="text-center text-xs text-slate-400 pt-8 pb-4">
                    Powered by <span className="font-bold text-slate-500">FleetPro AI</span> — Phần mềm quản lý vận tải #1 Việt Nam
                </footer>
            </main>
        </div>
    );
}
