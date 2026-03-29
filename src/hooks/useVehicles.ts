import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Supabase types removed for offline mode
import { useToast } from '@/hooks/use-toast';
import { vehicleAdapter } from '@/lib/data-adapter';


export type Vehicle = any;
export type NewVehicle = any;
export type UpdateVehicle = any;

/**
 * Hook to fetch all vehicles (excluding soft-deleted)
 */
export const useVehicles = () => {
    return useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            return await vehicleAdapter.list();
        },
    });
};

/**
 * Hook to fetch vehicles with server-side pagination
 */
export const useVehiclesPaginated = (page: number, limit: number) => {
    return useQuery({
        queryKey: ['vehicles', 'paginated', page, limit],
        queryFn: async () => {
            const offset = (page - 1) * limit;
            const data = await vehicleAdapter.list(limit, offset);
            const total = await vehicleAdapter.count();
            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            };
        },
    });
};

/**
 * Hook to fetch a single vehicle by ID
 */
export const useVehicle = (id: string | undefined) => {
    return useQuery({
        queryKey: ['vehicles', id],
        queryFn: async () => {
            if (!id) return null;
            return await vehicleAdapter.getById(id);
        },
        enabled: !!id,
    });
};

/**
 * Hook to create a new vehicle
 */
export const useCreateVehicle = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (vehicle: NewVehicle) => {
            return await vehicleAdapter.create(vehicle);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            toast({
                title: 'Thêm xe thành công',
                description: 'Xe mới đã được thêm vào hệ thống.',
            });
        },
        onError: (error: Error) => {
            let message = error.message;
            if ((error as any).code === '23505' || message.includes('duplicate key')) {
                if (message.includes('vehicles_vehicle_code_key')) {
                    message = 'Mã xe đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.';
                } else if (message.includes('vehicles_license_plate_key')) {
                    message = 'Biển số xe này đã tồn tại. Vui lòng kiểm tra lại.';
                } else {
                    message = 'Thông tin bị trùng lặp (Mã xe hoặc Biển số).';
                }
            }

            toast({
                title: 'Lỗi khi thêm xe',
                description: message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to update an existing vehicle
 */
export const useUpdateVehicle = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, vehicle }: { id: string; vehicle: UpdateVehicle }) => {
            return await vehicleAdapter.update(id, vehicle);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            toast({
                title: 'Cập nhật thành công',
                description: 'Thông tin xe đã được cập nhật.',
            });
        },
        onError: (error: Error) => {
            let message = error.message;
            if ((error as any).code === '23505' || message.includes('duplicate key')) {
                if (message.includes('vehicles_vehicle_code_key')) {
                    message = 'Mã xe đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.';
                } else if (message.includes('vehicles_license_plate_key')) {
                    message = 'Biển số xe này đã tồn tại. Vui lòng kiểm tra lại.';
                } else {
                    message = 'Thông tin bị trùng lặp (Mã xe hoặc Biển số).';
                }
            }

            toast({
                title: 'Lỗi khi cập nhật',
                description: message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to soft-delete a vehicle
 */
export const useSoftDeleteVehicle = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            await vehicleAdapter.softDelete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            toast({
                title: 'Xóa xe thành công',
                description: 'Xe đã được xóa và mã xe đã được giải phóng.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi xóa xe',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to fetch vehicles by status
 */
export const useVehiclesByStatus = (status: 'active' | 'maintenance' | 'inactive') => {
    return useQuery({
        queryKey: ['vehicles', 'status', status],
        queryFn: async () => {
            return await vehicleAdapter.listByStatus(status);
        },
    });
};

/**
 * Hook to search vehicles by license plate or vehicle code
 */
export const useSearchVehicles = (searchTerm: string) => {
    return useQuery({
        queryKey: ['vehicles', 'search', searchTerm],
        queryFn: async () => {
            if (!searchTerm) {
                return await vehicleAdapter.list();
            }
            return await vehicleAdapter.search(searchTerm);
        },
    });
};
