/**
 * Transport Order React Query Hooks
 * Đơn hàng vận chuyển - CRUD + state transitions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transportOrderAdapter } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';

export type TransportOrderStatus = 'draft' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type TransportOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TransportOrder {
    id: string;
    order_code: string;
    customer_id: string;
    order_date: string;
    expected_delivery_date?: string;
    pickup_address?: string;
    delivery_address?: string;
    cargo_description?: string;
    cargo_weight_tons?: number;
    cargo_cbm?: number;
    total_value: number;
    status: TransportOrderStatus;
    priority: TransportOrderPriority;
    notes?: string;
    confirmed_at?: string;
    completed_at?: string;
    cancelled_at?: string;
    is_deleted?: number;
    created_at?: string;
    updated_at?: string;
    customer?: { id: string; customer_name: string };
}

const QUERY_KEY = 'transportOrders';

// List all orders
export function useTransportOrders() {
    return useQuery({
        queryKey: [QUERY_KEY],
        queryFn: () => transportOrderAdapter.list(),
        staleTime: 30_000,
    });
}

// Get by status
export function useTransportOrdersByStatus(status: string) {
    return useQuery({
        queryKey: [QUERY_KEY, 'status', status],
        queryFn: () => transportOrderAdapter.listByStatus(status),
        enabled: !!status,
    });
}

// Get single order
export function useTransportOrder(id: string | undefined) {
    return useQuery({
        queryKey: [QUERY_KEY, id],
        queryFn: () => transportOrderAdapter.getById(id!),
        enabled: !!id,
    });
}

// Search
export function useSearchTransportOrders(term: string) {
    return useQuery({
        queryKey: [QUERY_KEY, 'search', term],
        queryFn: () => transportOrderAdapter.search(term),
        enabled: term.length > 0,
    });
}

// Create
export function useCreateTransportOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (order: Partial<TransportOrder>) =>
            transportOrderAdapter.create(order),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: 'Thành công', description: 'Đã tạo đơn hàng mới.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        },
    });
}

// Update
export function useUpdateTransportOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<TransportOrder> }) =>
            transportOrderAdapter.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: 'Thành công', description: 'Đã cập nhật đơn hàng.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        },
    });
}

// Confirm
export function useConfirmTransportOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => transportOrderAdapter.confirm(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: 'Thành công', description: 'Đã xác nhận đơn hàng.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        },
    });
}

// Start Progress
export function useStartTransportOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => transportOrderAdapter.startProgress(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: 'Thành công', description: 'Đơn hàng đang vận chuyển.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        },
    });
}

// Complete
export function useCompleteTransportOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => transportOrderAdapter.complete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: 'Thành công', description: 'Đơn hàng đã hoàn thành.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        },
    });
}

// Cancel
export function useCancelTransportOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => transportOrderAdapter.cancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: 'Đã hủy', description: 'Đơn hàng đã bị hủy.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        },
    });
}

// Soft Delete
export function useDeleteTransportOrder() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: string) => transportOrderAdapter.softDelete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
            toast({ title: 'Đã xóa', description: 'Đơn hàng đã bị xóa.' });
        },
        onError: (error: Error) => {
            toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
        },
    });
}

// Stats
export function useTransportOrderStats() {
    return useQuery({
        queryKey: [QUERY_KEY, 'stats'],
        queryFn: () => transportOrderAdapter.getStats(),
        staleTime: 30_000,
    });
}

// Next code
export function useTransportOrderNextCode() {
    return useQuery({
        queryKey: [QUERY_KEY, 'nextCode'],
        queryFn: () => transportOrderAdapter.getNextCode(),
        staleTime: 5_000,
    });
}
