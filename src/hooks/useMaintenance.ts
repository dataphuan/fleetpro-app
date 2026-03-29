import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceAdapter } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';


export type MaintenanceOrder = any;
export type NewMaintenanceOrder = any;
export type UpdateMaintenanceOrder = any;

/**
 * Hook to fetch all maintenance orders
 */
export const useMaintenanceOrders = () => {
    return useQuery({
        queryKey: ['maintenance_orders'],
        queryFn: async () => {
            return await maintenanceAdapter.list();
        },
    });
};

/**
 * Hook to fetch a single maintenance order
 */
export const useMaintenanceOrder = (id: string | undefined) => {
    return useQuery({
        queryKey: ['maintenance_orders', id],
        queryFn: async () => {
            if (!id) return null;
            return await maintenanceAdapter.getById(id);
        },
        enabled: !!id,
    });
};

/**
 * Hook to create a new maintenance order
 */
export const useCreateMaintenanceOrder = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (order: NewMaintenanceOrder) => {
            return await maintenanceAdapter.create(order);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance_orders'] });
            toast({
                title: 'Tạo phiếu bảo trì thành công',
                description: 'Phiếu bảo trì mới đã được tạo.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi tạo phiếu bảo trì',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to update an existing maintenance order
 */
export const useUpdateMaintenanceOrder = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates, reason }: { id: string; updates: UpdateMaintenanceOrder; reason?: string }) => {
            return await maintenanceAdapter.update(id, updates, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance_orders'] });
            toast({
                title: 'Cập nhật thành công',
                description: 'Thông tin phiếu bảo trì đã được cập nhật.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi cập nhật',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to soft delete a maintenance order
 */
export const useDeleteMaintenanceOrder = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
            return await maintenanceAdapter.softDelete(id, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance_orders'] });
            toast({
                title: 'Xóa phiếu bảo trì thành công',
                description: 'Phiếu bảo trì đã được xóa.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi xóa',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};
