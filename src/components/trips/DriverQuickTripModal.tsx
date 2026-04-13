import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { tripAdapter } from "@/lib/data-adapter";
import { Loader2, Plus, Truck, MapPin, CheckCircle2 } from "lucide-react";

interface DriverQuickTripModalProps {
    isOpen: boolean;
    onClose: () => void;
    driverId: string;
    driverName: string;
    tenantId: string | null;
    availableVehicles: any[];
    assignedVehicleId?: string;
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
    onSuccess
}: DriverQuickTripModalProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [vehicleId, setVehicleId] = useState(assignedVehicleId || (availableVehicles.length > 0 ? availableVehicles[0].id : ''));
    const [destination, setDestination] = useState('');
    const [cargo, setCargo] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        if (!vehicleId) {
            toast({ title: "Lỗi", description: "Vui lòng chọn xe để chạy lệnh này.", variant: "destructive" });
            return;
        }
        if (!destination.trim()) {
            toast({ title: "Lỗi", description: "Vui lòng nhập điểm đến / tuyến đường.", variant: "destructive" });
            return;
        }

        if (!tenantId || !driverId) {
            toast({ title: "Lỗi", description: "Phiên đăng nhập không hợp lệ.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const tripCode = `LĐX-${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
            
            const payload = {
                trip_code: tripCode,
                status: 'draft',
                source: 'driver-self-draft',
                tenantId,
                tenant_id: tenantId,
                driver_id: driverId,
                driver_name: driverName,
                vehicle_id: vehicleId,
                route_id: destination,
                route_name: destination,
                cargo_description: cargo || 'Hàng hỗn hợp',
                notes: `[Tài xế tự tạo lệnh] ${notes}`,
                created_at: new Date().toISOString(),
                createdAt: new Date().toISOString(),
            };

            await tripAdapter.create(payload);
            
            toast({
                title: "Đã tạo lệnh nháp thành công!",
                description: `Mã lệnh: ${tripCode}. Quét báo Đã chuyển về Điều phối để duyệt.`,
            });
            
            if (onSuccess) onSuccess();
            onClose();
            setDestination('');
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
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-blue-900" id="quick-trip-title">
                        <Plus className="w-5 h-5" /> Tạo Lệnh Điểu Xe Nháp
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Hệ thống đã khóa cứng Tên của bạn vào lệnh này. Xin vui lòng điền các thông tin vận hành bên dưới.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-1.5 border-b border-dashed border-slate-200 pb-3">
                        <Label className="text-xs text-slate-500">Người lập lệnh:</Label>
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {driverName}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5"/> Chọn Xe Nhận Lệnh</Label>
                        <select 
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                        >
                            <option value="" disabled>-- Chọn xe thực hiện --</option>
                            
                            {availableVehicles.length === 0 && (
                                <option value="" disabled>Không có xe nào được gán hoặc xe trống.</option>
                            )}

                            {/* Xe của bạn */}
                            <optgroup label="Xe Của Bạn (Được Giao Cố Định)">
                                {availableVehicles
                                    .filter(v => v.id === assignedVehicleId || v.assigned_driver_id === driverId)
                                    .map(v => (
                                        <option key={v.id} value={v.id} className="font-semibold text-slate-900">
                                            {v.license_plate} {v.vehicle_type ? `(${v.vehicle_type})` : ''}
                                        </option>
                                    ))
                                }
                            </optgroup>

                            {/* Xe đi chung */}
                            <optgroup label="Xe Đi Theo Ca (Pool / Luân Chuyển)">
                                {availableVehicles
                                    .filter(v => v.assignment_type === 'pool' && v.id !== assignedVehicleId && v.assigned_driver_id !== driverId)
                                    .map(v => (
                                        <option key={v.id} value={v.id} className="text-blue-700">
                                            [POOL] {v.license_plate} {v.vehicle_type ? `(${v.vehicle_type})` : ''} - (Đang trống)
                                        </option>
                                    ))
                                }
                            </optgroup>
                        </select>
                        {availableVehicles.length === 0 && (
                            <p className="text-xs text-red-600 mt-1">
                                Cảnh báo: Quản lý chưa gán xe nào cho bạn và cũng không còn xe pool rảnh. Bạn không thể tạo lệnh nháp. Vui lòng liên hệ điều phối viên.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> Điểm đến / Lộ trình</Label>
                        <Input 
                            placeholder="VD: Cảng Cát Lái -> KCN Sóng Thần" 
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Loại hàng & Khối lượng (Không bắt buộc)</Label>
                        <Input 
                            placeholder="VD: 15 Tấn Thép cuộn" 
                            value={cargo}
                            onChange={(e) => setCargo(e.target.value)}
                            className="bg-slate-50 border-slate-200"
                        />
                    </div>
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Tạo Lệnh Ngay
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
