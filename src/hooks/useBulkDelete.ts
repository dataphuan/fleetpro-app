import { useState } from 'react';
import {
    vehicleAdapter,
    driverAdapter,
    routeAdapter,
    customerAdapter,
    tripAdapter,
    expenseAdapter,
    maintenanceAdapter
} from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';

interface UseBulkDeleteOptions {
    table: string;
    onSuccess?: () => void | Promise<void>;
    onError?: (error: any) => void | Promise<void>;
}

export function useBulkDelete({ table, onSuccess, onError }: UseBulkDeleteOptions) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteIds = async (ids: string[]) => {
        setIsDeleting(true);

        let successCount = 0;
        let failedCount = 0;

        try {
            // Map table to adapter
            const adapterMap: Record<string, any> = {
                'vehicles': vehicleAdapter,
                'drivers': driverAdapter,
                'routes': routeAdapter,
                'customers': customerAdapter,
                'trips': tripAdapter,
                'expenses': expenseAdapter,
                'maintenance_orders': maintenanceAdapter
            };

            const adapter = adapterMap[table];
            if (!adapter) throw new Error(`No adapter found for table: ${table}`);

            for (const id of ids) {
                try {
                    await adapter.softDelete(id);
                    successCount++;
                } catch (e) {
                    console.error(`Failed to delete ID ${id} from ${table}:`, e);
                    failedCount++;
                }
            }

            if (successCount > 0 && failedCount === 0) {
                toast({
                    title: "Xóa thành công",
                    description: `Đã xóa ${successCount} bản ghi khỏi hệ thống.`,
                    variant: "default",
                });
                await onSuccess?.();
            } else if (successCount > 0 && failedCount > 0) {
                toast({
                    title: "Xóa một phần thành công",
                    description: `Đã xóa ${successCount} bản ghi. ${failedCount} bản ghi không thể xóa.`,
                    variant: "default",
                });
                await onSuccess?.();
            } else {
                toast({
                    title: "Không thể xóa bản ghi",
                    description: `Tất cả ${failedCount} bản ghi không thể xóa. Vui lòng kiểm tra lại.`,
                    variant: "destructive",
                });
                await onError?.(new Error("All deletions failed"));
            }
        } catch (error: any) {
            console.error("Bulk delete error:", error);
            toast({
                title: "Xóa thất bại",
                description: error.message || "Có lỗi xảy ra khi xóa dữ liệu.",
                variant: "destructive",
            });
            await onError?.(error);
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        deleteIds,
        isDeleting
    };
}
