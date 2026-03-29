import { useQuery } from '@tanstack/react-query';
import { accountingPeriodsAdapter } from '@/lib/data-adapter';

export type AccountingPeriod = {
  id: string;
  period_code: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
};

export const useClosedPeriods = () => {
  return useQuery({
    queryKey: ['accounting_periods', 'closed'],
    queryFn: async () => {
      return await accountingPeriodsAdapter.listClosed();
    },
  });
};

export const isDateInClosedPeriod = (dateStr: string | undefined, periods: AccountingPeriod[] | undefined) => {
  if (!dateStr || !periods) return false;
  const d = new Date(dateStr).toISOString().split('T')[0];
  return periods.some(p => p.start_date <= d && d <= p.end_date);
};
