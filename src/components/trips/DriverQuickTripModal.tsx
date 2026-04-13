import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { tripAdapter } from "@/lib/data-adapter";
import { Loader2, Plus, Truck, MapPin, CheckCircle2, Route, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface DriverQuickTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    driverId: string;
    driverName: string;
    tenantId: string | null;
    availableVehicles: any[];
    assignedVehicleId?: string;
    routes?: any[]; // PIPELINE FIX P1: Routes for dropdown
    onSuccess?: () => void;
}

export function DriverQuickTripModal({
    isOpen,
    onClose,
    driverId,
    driverName,
    tenantId,
    availableVehicles,
    assignedVehicleId,
    routes = [],
    onSuccess
}: DriverQuickTripModalProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [vehicleId, setVehicleId] = useState(assignedVehicleId || (availableVehicles.length > 0 ? availableVehicles[0].id : ''));
    const [routeId, setRouteId] = useState('');
    const [customDestination, setCustomDestination] = useState('');
    const [cargo, setCargo] = useState('');
    const [notes, setNotes] = useState('');

    // PIPELINE FIX P1: Only show active routes with costs
    const activeRoutes = useMemo(() => {
        return (routes || []).filter((r: any) => r.status !== 'inactive');
    }, [routes]);

    const selectedRoute = useMemo(() => {
        if (!routeId || routeId === 'custom') return null;
        return activeRoutes.find((r: any) => r.id === routeId) || null;
    }, [routeId, activeRoutes]);

    const handleSubmit = async () => {
        if (!vehicleId) {
            toast({ title: "Lỗi", description: "Vui lòng chọn xe để chạy lệnh này.", variant: "destructive" });
            return;
        }
        
        const finalRouteName = selectedRoute 
            ? selectedRoute.route_name 
            : customDestination.trim();
            
        if (!finalRouteName) {
            toast({ title: "Lỗi", description: "Vui lòng chọn tuyến đường hoặc nhập điểm đến.", variant: "destructive" });
            return;
        }

        if (!tenantId || !driverId) {
            toast({ title: "Lỗi", description: "Phiên đăng nhập không hợp lệ.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const tripCode = `LĐX-${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
            
            const payload: any = {
                trip_code: tripCode,
                status: 'draft',
                source: 'driver-self-draft',
                tenantId,
                tenant_id: tenantId,
                driver_id: driverId,
                driver_name: driverName,
                vehicle_id: vehicleId,
                route_name: finalRouteName,
                cargo_description: cargo || 'Hàng hỗn hợp',
                notes: `[Tài xế tự tạo lệnh] ${notes}`,
                created_at: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };

            // PIPELINE FIX P1: Link to actual route for cost inheritance
            if (selectedRoute) {
                payload.route_id = selectedRoute.id;
                payload.actual_distance_km = selectedRoute.distance_km;
            }

            await tripAdapter.create(payload);
            
            toast({
                title: "Đã tạo lệnh nháp thành công!",
                description: `Mã: ${tripCode} — ${selectedRoute ? `Tuyến ${selectedRoute.route_name}` : finalRouteName}. Chờ Điều phối duyệt.`,
            });
            
            if (onSuccess) onSuccess();
            onClose();
            setRouteId('');
            setCustomDestination('');
            setCargo('');
            setNotes('');
        } catch (error: any) {
            toast({ title: "Lỗi tạo lệnh", description: error.message || "Vui lòng thử lại sau.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold" id="quick-trip-title">
                        <Plus className="w-5 h-5" /> Tạo Lệnh Nháp
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 text-xs mt-1">
                        Lệnh sẽ gửi về Điều phối để duyệt và bổ sung thông tin tài chính.
                    </DialogDescription>
                </div>

                <div className="p-5 space-y-4">
                    {/* Driver info - locked */}
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-[10px] text-emerald-600 uppercase font-semibold">Người lập lệnh</p>
                            <p className="font-semibold text-slate-800 text-sm">{driverName}</p>
                        </div>
                    </div>

                    {/* Vehicle Selection */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5"/> Chọn Xe *
                        </Label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                        >
                            <option value="" disabled>-- Chọn xe --</option>
                            {availableVehicles
                                .filter(v => v.id === assignedVehicleId || v.assigned_driver_id === driverId)
                                .map(v => (
                                    <option key={v.id} value={v.id}>
                                        ★ {v.license_plate} {v.vehicle_type ? `(${v.vehicle_type})` : ''}
                                    </option>
                                ))
                            }
                            {availableVehicles
                                .filter(v => v.assignment_type === 'pool' && v.id !== assignedVehicleId && v.assigned_driver_id !== driverId)
                                .map(v => (
                                    <option key={v.id} value={v.id}>
                                        [POOL] {v.license_plate} {v.vehicle_type ? `(${v.vehicle_type})` : ''}
                                    </option>
                                ))
                            }
                        </select>
                    </div>

                    {/* PIPELINE FIX P1: Route Selection */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Route className="w-3.5 h-3.5"/> Tuyến Đường *
                        </Label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={routeId}
                            onChange={(e) => setRouteId(e.target.value)}
                        >
                            <option value="">-- Chọn tuyến đã khai báo --</option>
                            {activeRoutes.map((r: any) => (
                                <option key={r.id} value={r.id}>
                                    {r.route_name} ({r.distance_km || 0} km)
                                </option>
                            ))}
                            <option value="custom">✏️ Tuyến khác (nhập tay)</option>
                        </select>
                        
                        {/* Route cost preview */}
                        {selectedRoute && (selectedRoute.total_cost_standard || 0) > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-800 space-y-1">
                                <p className="font-semibold">📊 Định mức tuyến:</p>
                                <div className="grid grid-cols-2 gap-1">
                                    <span>Dầu: {formatCurrency(selectedRoute.fuel_cost_standard || 0)}</span>
                                    <span>Cầu đường: {formatCurrency(selectedRoute.toll_cost || 0)}</span>
                                    <span>Bồi dưỡng: {formatCurrency(selectedRoute.driver_allowance_standard || 0)}</span>
                                    <span>Tổng CP: {formatCurrency(selectedRoute.total_cost_standard || 0)}</span>
                                </div>
                            </div>
                        )}

                        {/* Warning for routes with no costs */}
                        {selectedRoute && (selectedRoute.total_cost_standard || 0) === 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-start gap-2 text-xs text-amber-800">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Tuyến này <strong>chưa có định mức chi phí</strong>. Báo Quản lý cập nhật trước khi chạy.</span>
                            </div>
                        )}

                        {/* Custom destination input */}
                        {routeId === 'custom' && (
                            <Input 
                                placeholder="VD: Cảng Cát Lái → KCN Sóng Thần" 
                                value={customDestination}
                                onChange={(e) => setCustomDestination(e.target.value)}
                                className="bg-slate-50 border-slate-200 mt-1"
                            />
                        )}
                    </div>

                    {/* Cargo */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Loại hàng & Khối lượng</Label>
                        <Input 
                            placeholder="VD: 15 Tấn Thép cuộn" 
                            value={cargo}
                            onChange={(e) => setCargo(e.target.value)}
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>

                <div className="px-5 pb-5 flex gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="flex-1">
                        Hủy
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !vehicleId || (!routeId && !customDestination.trim())}
                        className="flex-[2] bg-blue-600 hover:bg-blue-700 h-12 font-bold"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Tạo Lệnh Nháp
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
