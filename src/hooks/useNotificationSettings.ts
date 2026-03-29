// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Supabase removed for offline mode
import { useToast } from '@/hooks/use-toast';

type NotificationSettings = {
  id?: string;
  user_id?: string;
  maintenance_alert?: boolean;
  license_expiry_alert?: boolean;
  expense_alert?: boolean;
  debt_alert?: boolean;
  daily_report?: boolean;
  created_at?: string;
  updated_at?: string;
};

export const useNotificationSettings = () => {
  return useQuery({
    queryKey: ['notification_settings'],
    queryFn: async () => {
      throw new Error('Offline mode only: Supabase/API code removed.');
    },
  });
};

export const useSaveNotificationSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: NotificationSettings) => {
      throw new Error('Offline mode only: Supabase/API code removed.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_settings'] });
      toast({ title: 'Lưu thành công', description: 'Cài đặt thông báo đã được cập nhật.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi khi lưu', description: error.message, variant: 'destructive' });
    },
  });
};
