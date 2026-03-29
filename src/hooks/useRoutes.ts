import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { routeAdapter } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';

type Route = any;
type NewRoute = any;
type UpdateRoute = any;

/**
 * Hook to fetch all routes (excluding soft-deleted)
 */
export const useRoutes = () => {
    return useQuery({
        queryKey: ['routes'],
        queryFn: async () => {
            return await routeAdapter.list();
        },
    });
};

/**
 * Hook to fetch a single route by ID
 */
export const useRoute = (id: string | undefined) => {
    return useQuery({
        queryKey: ['routes', id],
        queryFn: async () => {
            if (!id) return null;
            return await routeAdapter.getById(id);
        },
        enabled: !!id,
    });
};

/**
 * Hook to create a new route
 */
export const useCreateRoute = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (route: NewRoute) => {
            return await routeAdapter.create(route);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routes'] });
            toast({
                title: 'Thêm tuyến đường thành công',
                description: 'Tuyến đường mới đã được thêm vào hệ thống.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi thêm tuyến đường',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to update an existing route
 */
export const useUpdateRoute = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateRoute }) => {
            return await routeAdapter.update(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routes'] });
            toast({
                title: 'Cập nhật thành công',
                description: 'Thông tin tuyến đường đã được cập nhật.',
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
 * Hook to soft delete a route
 */
/**
 * Hook to soft delete a route
 * Safe Delete Strategy: Rename unique fields to allow re-creation
 */
export const useDeleteRoute = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            return await routeAdapter.softDelete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routes'] });
            toast({
                title: 'Xóa tuyến đường thành công',
                description: 'Tuyến đường đã được xóa và mã tuyến đã được giải phóng.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi xóa tuyến đường',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to search routes
 */
export const useSearchRoutes = (searchTerm: string) => {
    return useQuery({
        queryKey: ['routes', 'search', searchTerm],
        queryFn: async () => {
            if (!searchTerm) {
                return await routeAdapter.list();
            }
            return await routeAdapter.search(searchTerm);
        },
    });
};
