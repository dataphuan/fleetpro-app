import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tiresAdapter } from '@/lib/data-adapter';
import { Tire, TireInstallation } from '../../electron/tires';
import { useToast } from './use-toast';

export const useTires = () => {
    return useQuery({
        queryKey: ['tires'],
        queryFn: async () => {
            return await tiresAdapter.getAll();
        }
    });
};

export const useTiresByStatus = (status: string) => {
    return useQuery({
        queryKey: ['tires', status],
        queryFn: async () => {
            const all = await tiresAdapter.getAll();
            return all.filter((t: any) => t.status === status);
        }
    });
};

export const useCreateTire = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: Partial<Tire>) => {
            return await tiresAdapter.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tires'] });
            toast({ title: "Thành công", description: "Đã thêm lốp mới vào kho." });
        },
        onError: (err: any) => {
            toast({ title: "Lỗi", description: err.message || "Không thể thêm lốp", variant: "destructive" });
        }
    });
};

export const useUpdateTire = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<Tire> }) => {
            return await tiresAdapter.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tires'] });
            toast({ title: "Thành công", description: "Đã cập nhật thông tin lốp." });
        },
        onError: (err: any) => {
            toast({ title: "Lỗi", description: err.message || "Cập nhật thất bại", variant: "destructive" });
        }
    });
};

export const useInstallTire = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ tireId, vehicleId, axlePos, date, odo }: { tireId: string, vehicleId: string, axlePos: string, date: string, odo: number }) => {
            return await tiresAdapter.install(tireId, vehicleId, axlePos, date, odo);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tires'] });
            queryClient.invalidateQueries({ queryKey: ['tire_installations'] });
            toast({ title: "Thành công", description: "Đã lắp lốp vào xe." });
        },
        onError: (err: any) => {
            toast({ title: "Lỗi thao tác", description: err.message || "Lắp lốp thất bại", variant: "destructive" });
        }
    });
};

export const useRemoveTire = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ installId, date, odo, reason }: { installId: string, date: string, odo: number, reason: string }) => {
            return await tiresAdapter.remove(installId, date, odo, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tires'] });
            queryClient.invalidateQueries({ queryKey: ['tire_installations'] });
            toast({ title: "Thành công", description: "Đã tháo lốp khỏi xe và cập nhật số Km." });
        },
        onError: (err: any) => {
            toast({ title: "Lỗi thao tác", description: err.message || "Tháo lốp thất bại", variant: "destructive" });
        }
    });
};

export const useVehicleTires = (vehicleId: string) => {
    return useQuery({
        queryKey: ['tire_installations', vehicleId],
        queryFn: async () => {
            return await tiresAdapter.getInstalledOnVehicle(vehicleId);
        },
        enabled: !!vehicleId
    });
};

export const useTireHistory = (tireId: string) => {
    return useQuery({
        queryKey: ['tire_history', tireId],
        queryFn: async () => {
            return await tiresAdapter.getHistory(tireId);
        },
        enabled: !!tireId
    });
};
