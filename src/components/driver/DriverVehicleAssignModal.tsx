import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { driverAdapter, vehicleAdapter } from "@/lib/data-adapter";
import { Loader2, Truck, CheckCircle2 } from "lucide-react";

interface DriverVehicleAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    driverId: string;
    tenantId: string | null;
    availableVehicles: any[];
    onSuccess?: () => void;
}

export function DriverVehicleAssignModal({
    isOpen,
    onClose,
    driverId,
    tenantId,
    availableVehicles,
    onSuccess
}: DriverVehicleAssignModalProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');

    const handleSubmit = async () => {
        if (!selectedVehicleId) {
            toast({ title: "Lỗi", description: "Vui lòng chọn xe để nhận.", variant: "destructive" });
            return;
        }

        if (!tenantId || !driverId) {
            toast({ title: "Lỗi", description: "Phiên đăng nhập không hợp lệ.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            // Atomic update (best effort via two separate calls since adapter doesn't support transactions yet)
            // In production, this should be a single Cloud Function or Batch write.
            await driverAdapter.update(driverId, { assigned_vehicle_id: selectedVehicleId });
            await vehicleAdapter.update(selectedVehicleId, { assigned_driver_id: driverId });

            toast({
                title: "Nhận xe thành công!",
                description: "Bạn đã được gán vào xe này. Bây giờ có thể tạo lệnh điều xe.",
            });
            
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            toast({ title: "Lỗi nhận xe", description: error.message || "Vui lòng thử lại sau.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show pool vehicles (assignment_type='pool') + any unassigned active vehicles
    const poolVehicles = availableVehicles.filter(v => 
        v.status === 'active' && !v.is_deleted && (
            v.assignment_type === 'pool' || !v.assigned_driver_id
        )
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-blue-900">
                        <Truck className="w-5 h-5" /> BƯỚC 0: NHẬN XE ĐIỀU HÀNH
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Bạn chưa được giao xe. Vui lòng chọn một xe đang trống từ Pool để bắt đầu làm việc.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5"/> Danh sách xe trống (Pool)
                        </Label>
                        <select 
                            className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedVehicleId}
                            onChange={(e) => setSelectedVehicleId(e.target.value)}
                        >
                            <option value="" disabled>-- Chọn xe nhận --</option>
                            {poolVehicles.map(v => (
                                <option key={v.id} value={v.id}>
                                    {v.license_plate} - {v.vehicle_type || 'Xe tải'}
                                </option>
                            ))}
                        </select>
                        {poolVehicles.length === 0 ? (
                            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg mt-2">
                                <p className="text-xs text-rose-800 font-bold mb-1 flex items-center gap-1">
                                    ⚠️ KHÔNG TÌM THẤY XE TRỐNG
                                </p>
                                <p className="text-[11px] text-rose-700 leading-relaxed">
                                    Để bắt đầu, Sếp (Admin) cần vào trang <strong>"Quản lý Xe"</strong> nạp biển số thật và đặt trạng thái là <strong>"Dùng chung (Pool)"</strong> thì bạn mới có thể nhận xe tại đây.
                                </p>
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-500 italic">
                                * Lưu ý: Sau khi xác nhận, xe này sẽ được gán cố định cho bạn cho đến khi được thay đổi.
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter className="sm:justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !selectedVehicleId}
                        className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Xác nhận nhận xe
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
