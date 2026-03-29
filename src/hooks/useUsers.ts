import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { authAdapter } from '@/lib/data-adapter';
import { isElectron } from '@/lib/data-adapter';

export type UserWithRole = {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  role?: string;
  created_at?: string;
};

/**
 * Fetch all users with their roles
 * Works in both Online (Supabase) and Offline (Electron) modes via authAdapter
 */
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await authAdapter.listUsers();
      // Adapter returns standardized format, but ensure it matches UserWithRole
      return users.map((u: any) => ({
        id: u.user_id || u.id,
        email: u.email,
        user_metadata: {
          full_name: u.full_name || u.user_metadata?.full_name || '',
        },
        role: u.role,
        created_at: u.created_at,
      } as UserWithRole));
    },
  });
};

/**
 * Add new user role
 */
export const useAddUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string; full_name: string; role: string }) => {
      return await authAdapter.createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Thêm người dùng thành công',
        description: 'Tài khoản đã được tạo và phân quyền.'
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi khi thêm người dùng', description: error.message, variant: 'destructive' });
    },
  });
};

/**
 * Update user role
 */
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: { user_id: string; role: string }) => {
      return await authAdapter.updateUserRole(payload.user_id, payload.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Cập nhật quyền thành công', description: 'Quyền của người dùng đã được thay đổi.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi khi cập nhật', description: error.message, variant: 'destructive' });
    },
  });
};

/**
 * Delete user role
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (user_id: string) => {
      return await authAdapter.deleteUser(user_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Xóa quyền thành công',
        description: 'Người dùng đã được xóa khỏi hệ thống.'
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi khi xóa', description: error.message, variant: 'destructive' });
    },
  });
};

