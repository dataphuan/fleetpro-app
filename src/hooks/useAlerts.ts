import { useQuery } from '@tanstack/react-query';
import { alertsAdapter } from '@/lib/data-adapter';

export const useAlertsSummary = () => {
    return useQuery({
        queryKey: ['alerts', 'summary'],
        queryFn: async () => {
            return await alertsAdapter.getSummary();
        },
        staleTime: 60 * 1000, 
    });
};
