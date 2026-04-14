import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { isElectron, companySettingsAdapter } from '@/lib/data-adapter';
import { useAuth } from '@/contexts/AuthContext';

type CompanySettings = {
  id?: string;
  company_name?: string | null;
  tax_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  metadata?: any;
  gdrive_config?: {
    clientId: string;
    clientSecret?: string;
    folderId: string;
    isConnected: boolean;
    lastSync?: string;
  };
};

export const useCompanySettings = () => {
  const { tenantId } = useAuth();
  
  return useQuery({
    queryKey: ['company_settings', tenantId],
    queryFn: async () => {
      if (isElectron()) {
        // @ts-ignore
        const response = await window.electronAPI.companySettings.getSettings();
        if (!response.success) throw new Error(response.error);
        return response.data;
      }

      // Online Firestore Mode
      const settingsList = await companySettingsAdapter.list();
      let settings = settingsList[0];
      
      // If no settings exist yet for this tenant, create a default one
      if (!settings) {
        settings = {
          company_name: 'Công ty của tôi',
          email: '',
          tax_code: '',
          address: '',
          phone: '',
          website: '',
          logo_url: '',
          primary_color: '#3b82f6', // Default Blue
          // Inject Default SaaS Subscription
          subscription: {
              plan: 'business',
              status: 'active',
              trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          }
        };
        // Save the default document asynchronously
        companySettingsAdapter.create(settings).catch(console.error);
      }
      // AUTO-UPGRADE FOR PHU AN: Force enterprise plan for consistency
      if (tenantId === 'internal-tenant-phuan' || (settings?.company_name || '').toLowerCase().includes('phú an')) {
          if (settings) {
              settings.subscription = {
                  ...settings.subscription,
                  plan: 'enterprise',
                  status: 'active'
              };
          }
      }

      return settings as CompanySettings;
    },
    enabled: !!tenantId,
  });
};

export const useSaveCompanySettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { tenantId } = useAuth();
  
  return useMutation({
    mutationFn: async (payload: CompanySettings) => {
      if (isElectron()) {
        // @ts-ignore
        const response = await window.electronAPI.companySettings.updateSettings(payload);
        if (!response.success) throw new Error(response.error);
        return response.data;
      }

      // Online Firestore Mode
      if (payload.id) {
          await companySettingsAdapter.update(payload.id, payload);
          return payload;
      } else {
          // If update fails because id is missing string, fall back to getting list
          const list = await companySettingsAdapter.list();
          if (list.length > 0) {
              await companySettingsAdapter.update(list[0].id, payload);
              return payload;
          } else {
              return await companySettingsAdapter.create(payload);
          }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_settings', tenantId] });
      toast({ title: 'Lưu thành công', description: 'Thông tin công ty đã được cập nhật.' });
    },
    onError: (error: Error) => {
      const msg = String(error.message || error);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('forbid') || msg.toLowerCase().includes('not authorized')) {
        toast({ title: 'Không có quyền', description: 'Bạn cần quyền Admin để cập nhật thông tin công ty.', variant: 'destructive' });
      } else {
        toast({ title: 'Lỗi khi lưu', description: msg, variant: 'destructive' });
      }
    },
  });
};
