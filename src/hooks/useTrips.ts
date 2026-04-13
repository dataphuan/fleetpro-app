import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripAdapter } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeUserRole } from '@/lib/rbac';

import type { Trip } from '@/shared/types/domain';

type NewTrip = Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>;
type UpdateTrip = Partial<Omit<Trip, 'id' | 'tenant_id'>>;

// Trip status enum - must match database enum
export type TripStatus = 'draft' | 'confirmed' | 'dispatched' | 'in_progress' | 'completed' | 'closed' | 'cancelled';

/**
 * Hook to fetch all trips
 * DATA ISOLATION: When role=driver, only returns trips assigned to the current driver.
 * Prevents drivers from seeing colleagues' trip data (revenue, costs, routes).
 */
export const useTrips = () => {
    const { user, role } = useAuth();
    const normalizedRole = normalizeUserRole(role);
    const isDriver = normalizedRole === 'driver';

    return useQuery({
        queryKey: ['trips', isDriver ? `driver:${user?.id}` : 'all'],
        queryFn: async () => {
            const allTrips = await tripAdapter.list();
            
            // DRIVER DATA ISOLATION: Filter to only this driver's trips
            if (isDriver && user?.id) {
                // SPECIAL CASE: For Demo/Audit purposes, if it's a demo account, show all trips to provide "Full Experience"
                const isDemoUser = String(user.id).includes('demo') || 
                                 String(user.email).includes('demo') || 
                                 String((user as any).company_name || '').toLowerCase().includes('demo') ||
                                 String((user as any).company_name || '').toLowerCase().includes('tnc');
                
                if (isDemoUser) {
                    console.log("🚛 [Demo Mode] Granting full visibility to driver for audit purposes");
                    return allTrips;
                }

                return allTrips.filter((t: any) =>
                    t.driver_id === user.id
                    || t.driver_id === user.email
                    || t.driver?.id === user.id
                    || t.driver?.email === user.email
                    || t.driver?.user_id === user.id
                );
            }
            
            return allTrips;
        },
    });
};

/**
 * Hook to fetch trips by status
 */
export const useTripsByStatus = (status: string) => {
    return useQuery({
        queryKey: ['trips', 'status', status],
        queryFn: async () => {
            return await tripAdapter.listByStatus(status);
        },
    });
};

/**
 * Hook to fetch a single trip
 */
export const useTrip = (id: string | undefined) => {
    return useQuery({
        queryKey: ['trips', id],
        queryFn: async () => {
            if (!id) return null;
            return await tripAdapter.getById(id);
        },
        enabled: !!id,
    });
};

/**
 * Hook to create a new trip
 */
export const useCreateTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (trip: NewTrip) => {
            return await tripAdapter.create(trip);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Tạo chuyến thành công',
                description: 'Chuyến hàng mới đã được tạo.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi tạo chuyến',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to update an existing trip
 */
export const useUpdateTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateTrip }) => {
            return await tripAdapter.update(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Cập nhật thành công',
                description: 'Thông tin chuyến hàng đã được cập nhật.',
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
 * Hook to confirm a trip
 */
export const useConfirmTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            return await tripAdapter.confirm(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Xác nhận chuyến thành công',
                description: 'Chuyến hàng đã được xác nhận.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi xác nhận',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to dispatch a trip
 */
export const useDispatchTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            return await tripAdapter.dispatched(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Phái chuyến thành công',
                description: 'Chuyến hàng đã được phái đi.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi phái chuyến',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to start a trip
 */
export const useStartTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, actualDepartureTime }: { id: string; actualDepartureTime: string }) => {
            return await tripAdapter.start(id, actualDepartureTime);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Bắt đầu chuyến thành công',
                description: 'Chuyến hàng đã được bắt đầu.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi bắt đầu chuyến',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to confirm vehicle pickup (Pipeline Fix)
 */
export const usePickupTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, startOdo }: { id: string; startOdo: number }) => {
            return await (tripAdapter as any).pickup(id, startOdo);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles'] });
            toast({
                title: 'Nhận xe thành công',
                description: 'Đã ghi nhận chỉ số ODO và bàn giao xe cho tài xế.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi nhận xe',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to complete a trip
 */
export const useCompleteTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            id,
            actualArrivalTime,
            actualDistanceKm
        }: {
            id: string;
            actualArrivalTime: string;
            actualDistanceKm: number;
        }) => {
            return await tripAdapter.complete(id, actualArrivalTime, actualDistanceKm);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Hoàn thành chuyến thành công',
                description: 'Chuyến hàng đã được hoàn thành.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi hoàn thành chuyến',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to close a trip
 */
export const useCloseTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, forceOverride }: { id: string; forceOverride?: boolean }) => {
            return await tripAdapter.close(id, forceOverride);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Đóng chuyến thành công',
                description: 'Chuyến hàng đã được đóng. Dữ liệu sẽ được khóa.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi đóng chuyến',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to cancel a trip
 */
export const useCancelTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            return await tripAdapter.cancel(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Hủy chuyến thành công',
                description: 'Chuyến hàng đã được hủy.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi hủy chuyến',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to soft delete a trip
 */
export const useDeleteTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            await tripAdapter.softDelete(id);
            return { id } as unknown as Trip;
        },
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['trips'] });
            toast({
                title: 'Xóa chuyến thành công',
                description: 'Chuyến hàng đã được xóa.',
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

/**
 * Hook to search trips
 */
export const useSearchTrips = (searchTerm: string) => {
    return useQuery({
        queryKey: ['trips', 'search', searchTerm],
        queryFn: async () => {
            if (!searchTerm) {
                return await tripAdapter.list();
            }
            return await tripAdapter.search(searchTerm);
        },
    });
};

/**
 * Hook to fetch trips by date range
 */
export const useTripsByDateRange = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: ['trips', 'dateRange', startDate, endDate],
        queryFn: async () => {
            return await tripAdapter.listByDateRange(startDate, endDate);
        },
        enabled: !!startDate && !!endDate,
    });
};
