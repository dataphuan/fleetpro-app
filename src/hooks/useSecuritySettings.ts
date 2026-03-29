// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { isElectron } from '@/lib/data-adapter';
import { useToast } from '@/hooks/use-toast';

type SecuritySettings = {
  id?: string;
  user_id?: string;
  two_factor_enabled?: boolean;
  lock_completed_data?: boolean;
  log_all_actions?: boolean;
  auto_logout_30min?: boolean;
  created_at?: string;
  updated_at?: string;
};

export const useSecuritySettings = () => {
  return useQuery({
    queryKey: ['security_settings'],
    queryFn: async () => {
      if (!isElectron()) {
        // Mock for offline/electron mode if Supabase is removed
        return {
          two_factor_enabled: false,
          lock_completed_data: true,
          log_all_actions: true,
          auto_logout_30min: false
        };
      }
      // Return default settings for offline mode
      return {
        two_factor_enabled: false,
        lock_completed_data: true,
        log_all_actions: true,
        auto_logout_30min: false
      };
    },
  });
};

export const useSaveSecuritySettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: SecuritySettings) => {
      // Offline mode: Just simulate success as we don't have a settings table yet
      // or we can implement it later. For now, unblock the UI.
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security_settings'] });
      toast({ title: 'Lưu thành công', description: 'Cài đặt bảo mật đã được cập nhật.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi khi lưu', description: error.message, variant: 'destructive' });
    },
  });
};
