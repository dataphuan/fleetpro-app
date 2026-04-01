import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseAdapter } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';
import type { Expense, ExpenseAllocation } from '@/shared/types/domain';

export type NewExpense = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>;
export type UpdateExpense = Partial<Omit<Expense, 'id'>>;
export type NewExpenseAllocation = Omit<ExpenseAllocation, 'id' | 'created_at'>;

/**
 * Hook to fetch all expenses (excluding soft-deleted)
 */
export const useExpenses = () => {
    return useQuery({
        queryKey: ['expenses'],
        queryFn: async () => {
            return await expenseAdapter.list();
        },
    });
};

/**
 * Hook to fetch expenses by trip ID
 */
export const useExpensesByTrip = (tripId: string | undefined) => {
    return useQuery({
        queryKey: ['expenses', 'trip', tripId],
        queryFn: async () => {
            if (!tripId) return [];
            return await expenseAdapter.listByTrip(tripId);
        },
        enabled: !!tripId,
    });
};

/**
 * Hook to fetch a single expense by ID
 */
export const useExpense = (id: string | undefined) => {
    return useQuery({
        queryKey: ['expenses', id],
        queryFn: async () => {
            if (!id) return null;
            return await expenseAdapter.getById(id);
        },
        enabled: !!id,
    });
};

/**
 * Hook to create a new expense
 */
export const useCreateExpense = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (expense: NewExpense) => {
            return await expenseAdapter.create(expense);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] }); // Refresh trip financials
            toast({
                title: 'Thêm phiếu chi thành công',
                description: 'Phiếu chi mới đã được thêm vào hệ thống.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi thêm phiếu chi',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to update an existing expense
 */
export const useUpdateExpense = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: UpdateExpense }) => {
            return await expenseAdapter.update(id, updates);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Cập nhật thành công',
                description: 'Phiếu chi đã được cập nhật.',
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
 * Hook to confirm an expense
 */
export const useConfirmExpense = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            return await expenseAdapter.confirm(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Xác nhận phiếu chi thành công',
                description: 'Phiếu chi đã được xác nhận và ảnh hưởng đến lợi nhuận.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Không thể xác nhận phiếu chi',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to soft delete an expense
 */
export const useDeleteExpense = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            await expenseAdapter.softDelete(id);
            return { id } as unknown as Expense;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Xóa phiếu chi thành công',
                description: 'Phiếu chi đã được xóa.',
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
 * Hook to bulk delete multiple expenses
 */
export const useBulkDeleteExpenses = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            for (const id of ids) {
                await expenseAdapter.softDelete(id);
            }
            return ids;
        },
        onSuccess: (ids) => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Xóa phiếu chi thành công',
                description: `Đã xóa ${ids.length} phiếu chi.`,
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
 * Hook to fetch expense allocations for an expense
 */
export const useExpenseAllocations = (expenseId: string | undefined) => {
    return useQuery({
        queryKey: ['expense_allocations', expenseId],
        queryFn: async () => {
            if (!expenseId) return [];
            return await expenseAdapter.listAllocations(expenseId);
        },
        enabled: !!expenseId,
    });
};

/**
 * Hook to create expense allocations
 */
export const useCreateExpenseAllocation = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (allocation: NewExpenseAllocation) => {
            return await expenseAdapter.createAllocation(allocation);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense_allocations'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Phân bổ thành công',
                description: 'Chi phí đã được phân bổ cho chuyến hàng.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi phân bổ',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to delete an expense allocation
 */
export const useDeleteExpenseAllocation = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            await expenseAdapter.deleteAllocation(id);
            return { id } as unknown as ExpenseAllocation;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expense_allocations'] });
            queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({
                title: 'Xóa phân bổ thành công',
                description: 'Phân bổ chi phí đã được xóa.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Lỗi khi xóa phân bổ',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
};

/**
 * Hook to search expenses
 */
export const useSearchExpenses = (searchTerm: string) => {
    return useQuery({
        queryKey: ['expenses', 'search', searchTerm],
        queryFn: async () => {
            if (!searchTerm) {
                return await expenseAdapter.list();
            }
            return await expenseAdapter.search(searchTerm);
        },
    });
};
