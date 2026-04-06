import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverAdapter } from '@/lib/data-adapter';
// Supabase types removed for offline mode
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeUserRole } from '@/lib/rbac';


export type Driver = any;
export type NewDriver = any;
export type UpdateDriver = any;

/**
 * Sensitive fields that should NOT be visible to other drivers.
 * Only the driver's own record retains these fields.
 */
const DRIVER_SENSITIVE_FIELDS = [
    'base_salary', 'tax_code', 'id_card', 'id_issue_date',
    'address', 'date_of_birth', 'contract_type', 'notes',
    'phone', 'license_number',
];

/**
 * Strip sensitive fields from a driver record.
 * Used when a driver views colleague info (e.g., in trip enrichment).
 */
const maskDriverRecord = (driver: any): any => {
    const masked = { ...driver };
    for (const field of DRIVER_SENSITIVE_FIELDS) {
        delete masked[field];
    }
    return masked;
};

/**
 * Hook to fetch all drivers (excluding soft-deleted)
 * DATA ISOLATION: When role=driver, returns only the current driver's own record
 * with full details, and optionally masked records for colleagues (names only).
 */
export const useDrivers = () => {
    const { user, role } = useAuth();
    const normalizedRole = normalizeUserRole(role);
    const isDriver = normalizedRole === 'driver';

    return useQuery({
        queryKey: ['drivers', isDriver ? `driver:${user?.id}` : 'all'],
        queryFn: async () => {
            const allDrivers = await driverAdapter.list();

            // DRIVER DATA ISOLATION: Only return own record with full detail
            // + masked colleague records (name-only) for trip display
            if (isDriver && user?.id) {
                return allDrivers.map((d: any) => {
                    const isMe = d.id === user.id
                        || d.user_id === user.id
                        || d.email === user.email
                        || d.driver_email === user.email;
                    return isMe ? d : maskDriverRecord(d);
                });
            }

            return allDrivers;
        },
    });
};

/**
 * Hook to fetch a single driver by ID
 */
export const useDriver = (id: string | undefined) => {
    return useQuery({
        queryKey: ['drivers', id],
        queryFn: async () => {
            if (!id) return null;
            return await driverAdapter.getById(id);
        },
        enabled: !!id,
    });
};

/**
 * Hook to create a new driver
 */
export const useCreateDriver = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (driver: NewDriver) => {
            return await driverAdapter.create(driver);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            toast({
                title: 'Thêm tài xế thành công',
                description: 'Tài xế mới đã được thêm vào hệ thống.',
            });
        },
        onError: (error: any) => {
            let description = error.message;
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                description = 'Mã tài xế đã tồn tại. Vui lòng kiểm tra lại.';
            }

            toast({
                title: 'Lỗi khi thêm tài xế',
                description: description,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to update an existing driver
 */
export const useUpdateDriver = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateDriver }) => {
            return await driverAdapter.update(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            toast({
                title: 'Cập nhật thành công',
                description: 'Thông tin tài xế đã được cập nhật.',
            });
        },
        onError: (error: any) => {
            let description = error.message;
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                description = 'Mã tài xế đã tồn tại. Vui lòng kiểm tra lại.';
            }

            toast({
                title: 'Lỗi khi cập nhật',
                description: description,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to soft delete a driver
 */
/**
 * Hook to soft delete a driver
 * Performs a "Safe Soft Delete":
 * 1. Sets is_deleted = true
 * 2. Appends _DEL_{timestamp} to unique fields (driver_code, id_card, tax_code)
 *    to release the unique constraint for new records.
 */
export const useDeleteDriver = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            await driverAdapter.softDelete(id);
            return { id } as unknown as Driver;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drivers'] });
            toast({
                title: 'Xóa tài xế thành công',
                description: 'Tài xế đã được xóa khỏi hệ thống. Mã tài xế đã được giải phóng.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi xóa tài xế',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to fetch drivers by status
 */
export const useDriversByStatus = (status: 'active' | 'on_leave' | 'inactive') => {
    return useQuery({
        queryKey: ['drivers', 'status', status],
        queryFn: async () => {
            return await driverAdapter.listByStatus(status);
        },
    });
};

/**
 * Hook to search drivers by name, code, or phone
 */
export const useSearchDrivers = (searchTerm: string) => {
    return useQuery({
        queryKey: ['drivers', 'search', searchTerm],
        queryFn: async () => {
            if (!searchTerm) {
                return await driverAdapter.list();
            }
            return await driverAdapter.search(searchTerm);
        },
    });
};

/**
 * Hook to fetch active drivers (for assignment dropdowns)
 */
export const useActiveDrivers = () => {
    return useQuery({
        queryKey: ['drivers', 'active'],
        queryFn: async () => {
            return await driverAdapter.listByStatus('active');
        },
    });
};
