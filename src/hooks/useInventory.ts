import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAdapter } from '@/lib/data-adapter';
import { useToast } from './use-toast';
import { InventoryItem, Tire, InventoryTransaction } from '@/shared/types/domain';

// --- ITEMS ---
export const useInventoryItems = (params?: { category?: string; search?: string }) => {
    return useQuery({
        queryKey: ['inventory_items', params],
        queryFn: async () => await inventoryAdapter.listItems(params),
    });
};

export const useCreateInventoryItem = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: Partial<InventoryItem>) => await inventoryAdapter.createItem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            toast({ title: "Thành công", description: "Đã thêm vật tư mới." });
        },
        onError: (err: any) => toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    });
};

export const useUpdateInventoryItem = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<InventoryItem> }) => await inventoryAdapter.updateItem(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            toast({ title: "Thành công", description: "Đã cập nhật thông tin vật tư." });
        },
        onError: (err: any) => toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    });
};

// --- TRANSACTIONS ---
export const useInventoryTransactions = (itemId?: string) => {
    return useQuery({
        queryKey: ['inventory_transactions', itemId],
        queryFn: async () => await inventoryAdapter.listTransactions(itemId),
    });
};

export const useCreateTransaction = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: Partial<InventoryTransaction>) => await inventoryAdapter.createTransaction(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_transactions'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_items'] });
            queryClient.invalidateQueries({ queryKey: ['tires'] });
            toast({ title: "Thành công", description: "Giao dịch kho thành công." });
        },
        onError: (err: any) => toast({ title: "Lỗi giao dịch", description: err.message, variant: "destructive" })
    });
};

// --- TIRES ---
export const useTires = (params?: { status?: string; vehicle_id?: string }) => {
    return useQuery({
        queryKey: ['tires', params],
        queryFn: async () => await inventoryAdapter.listTires(params),
    });
};

export const useCreateTire = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: Partial<Tire>) => await inventoryAdapter.createTire(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tires'] });
            toast({ title: "Thành công", description: "Đã thêm lốp." });
        },
        onError: (err: any) => toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    });
};

export const useUpdateTire = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Tire> }) => await inventoryAdapter.updateTire(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tires'] });
            toast({ title: "Thành công", description: "Đã cập nhật trạng thái lốp." });
        },
        onError: (err: any) => toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    });
};

// --- PURCHASE ORDERS ---
export const usePurchaseOrders = () => {
    return useQuery({
        queryKey: ['purchase_orders'],
        queryFn: async () => await inventoryAdapter.listPOs(),
    });
};

export const useCreatePO = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async (data: any) => await inventoryAdapter.createPO(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({ title: "Thành công", description: "Đã tạo đơn yêu cầu mua sắm." });
        },
        onError: (err: any) => toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    });
};

export const useUpdatePO = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => await inventoryAdapter.updatePO(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            toast({ title: "Thành công", description: "Đã cập nhật đơn mua sắm." });
        },
        onError: (err: any) => toast({ title: "Lỗi", description: err.message, variant: "destructive" })
    });
};

