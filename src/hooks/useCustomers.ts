import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerAdapter } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';

type Customer = any;
type NewCustomer = any;
type UpdateCustomer = any;

/**
 * Hook to fetch all customers (excluding soft-deleted)
 */
export const useCustomers = () => {
    return useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            return await customerAdapter.list();
        },
    });
};

/**
 * Hook to fetch a single customer by ID
 */
export const useCustomer = (id: string | undefined) => {
    return useQuery({
        queryKey: ['customers', id],
        queryFn: async () => {
            if (!id) return null;
            return await customerAdapter.getById(id);
        },
        enabled: !!id,
    });
};

/**
 * Hook to create a new customer
 */
export const useCreateCustomer = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (customer: NewCustomer) => {
            return await customerAdapter.create(customer);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast({
                title: 'Thêm khách hàng thành công',
                description: 'Khách hàng mới đã được thêm vào hệ thống.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi thêm khách hàng',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to update an existing customer
 */
export const useUpdateCustomer = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateCustomer }) => {
            return await customerAdapter.update(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast({
                title: 'Cập nhật thành công',
                description: 'Thông tin khách hàng đã được cập nhật.',
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
 * Hook to soft delete a customer
 */
/**
 * Hook to soft delete a customer
 * Safe Delete Strategy: Rename unique fields to allow re-creation
 */
export const useDeleteCustomer = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            return await customerAdapter.softDelete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast({
                title: 'Xóa khách hàng thành công',
                description: 'Khách hàng đã được xóa và mã khách hàng đã được giải phóng.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi xóa khách hàng',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to search customers
 */
export const useSearchCustomers = (searchTerm: string) => {
    return useQuery({
        queryKey: ['customers', 'search', searchTerm],
        queryFn: async () => {
            if (!searchTerm) {
                return await customerAdapter.list();
            }
            return await customerAdapter.search(searchTerm);
        },
    });
};
