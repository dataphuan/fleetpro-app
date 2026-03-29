import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tripAdapter, expenseAdapter } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to dispatch a trip (DRAFT → DISPATCHED)
 */
export const useDispatchTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (tripId: string) => {
            return await tripAdapter.dispatched(tripId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Điều xe thành công',
                description: 'Chuyến đã được điều xe.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi điều xe',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to start a trip (DISPATCHED → IN_PROGRESS)
 */
export const useStartTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ tripId, actualDepartureTime }: { tripId: string; actualDepartureTime: string }) => {
            return await tripAdapter.start(tripId, actualDepartureTime);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Bắt đầu chuyến thành công',
                description: 'Chuyến đã bắt đầu.',
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
 * Hook to complete a trip (IN_PROGRESS → COMPLETED)
 * Requires: actual_departure_time, actual_arrival_time, actual_distance_km
 */
export const useCompleteTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({
            tripId,
            actualArrivalTime,
            actualDistanceKm
        }: {
            tripId: string;
            actualArrivalTime: string;
            actualDistanceKm: number;
        }) => {
            return await tripAdapter.complete(tripId, actualArrivalTime, actualDistanceKm);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Hoàn thành chuyến',
                description: 'Chuyến đã hoàn thành.',
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
 * Hook to close a trip (COMPLETED → CLOSED)
 * After closing, financial fields are LOCKED
 */
export const useCloseTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ tripId, forceOverride }: { tripId: string; forceOverride?: boolean }) => {
            return await tripAdapter.close(tripId, forceOverride);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Đóng chuyến thành công',
                description: 'Chuyến đã được đóng. Không thể sửa thông tin tài chính.',
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
 * Hook to cancel a trip (ANY → CANCELLED)
 * Preserves all data, just changes status
 */
export const useCancelTrip = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (tripId: string) => {
            return await tripAdapter.cancel(tripId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Hủy chuyến thành công',
                description: 'Chuyến đã được hủy. Dữ liệu được giữ lại.',
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
 * Hook to update trip status (generic)
 * Use specific hooks above for better type safety
 */
export const useUpdateTripStatus = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ tripId, status }: { tripId: string; status: any }) => {
            return await tripAdapter.update(tripId, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trips'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi cập nhật trạng thái',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to fetch draft expense count for a trip
 * Used to validate before closing
 */
export const useDraftExpenseCount = (tripId: string | undefined) => {
    return useQuery({
        queryKey: ['draft_expenses_count', tripId],
        queryFn: async () => {
            if (!tripId) return 0;
            const expenses = await expenseAdapter.listByTrip(tripId);
            return expenses.filter((e: any) => e.status === 'draft').length;
        },
        enabled: !!tripId,
    });
};
