import { useQuery } from '@tanstack/react-query';
import { tripAdapter, expenseAdapter, maintenanceAdapter, vehicleAdapter, driverAdapter, dataAdapter } from '@/lib/data-adapter';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface DashboardStats {
    official: {
        count: number;
        revenue: number;
        expense: number;
        profit: number;
        margin: number;
        total_km: number;
    };
    pending: {
        count: number;
        revenue: number;
        expense: number;
        profit: number;
        margin: number;
        total_km: number;
    };
    inProgress: {
        count: number;
        revenue: number;
    };
    draft: {
        count: number;
    };
}

interface TripFinancial {
    id: string;
    trip_code: string;
    departure_date: string;
    status: string;
    total_revenue: number | null;
    total_expense: number | null;
    profit: number | null;
    cargo_weight_tons: number | null;
    route_name: string | null;
    closed_at: string | null;
}

interface DashboardExpenseItem {
    name: string;
    value: number;
    percentage: number;
    count: number;
}

/**
 * Hook to fetch dashboard statistics for a period
 * Separates CLOSED (official) vs COMPLETED (pending) trips
 */
export const useDashboardStats = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: ['dashboard', 'stats', startDate, endDate],
        staleTime: 2 * 60 * 1000, // 2 min cache — avoid refetching on every tab switch
        queryFn: async () => {
            const trips = await tripAdapter.listByDateRange(startDate, endDate);
            const allExpenses = await expenseAdapter.list();



            // QA AUDIT FIX P1-PERF-01: Pre-group expenses by trip_id (O(n) instead of O(n*m))
            const expensesByTrip = new Map<string, number>();
            allExpenses.forEach((e: any) => {
                const tid = e.trip_id;
                if (tid) expensesByTrip.set(tid, (expensesByTrip.get(tid) || 0) + (e.amount || 0));
            });

            const stats = getEmptyStats();

            trips.forEach((trip: any) => {
                const status = trip.status;
                const rev = trip.total_revenue || 0;
                const km = trip.actual_distance_km || 0;
                const exp = expensesByTrip.get(trip.id) || 0;
                const profit = rev - exp;

                if (status === 'closed') {
                    stats.official.count++;
                    stats.official.revenue += rev;
                    stats.official.expense += exp;
                    stats.official.profit += profit;
                    stats.official.total_km += km;
                } else if (status === 'completed' || status === 'confirmed') {
                    stats.pending.count++;
                    stats.pending.revenue += rev;
                    stats.pending.expense += exp;
                    stats.pending.profit += profit;
                    stats.pending.total_km += km;
                } else if (status === 'in_progress') {
                    stats.inProgress.count++;
                    stats.inProgress.revenue += rev;
                } else if (status === 'draft') {
                    stats.draft.count++;
                }
            });

            // Calculate Margins
            stats.official.margin = calculateMargin(stats.official.profit, stats.official.revenue);
            stats.pending.margin = calculateMargin(stats.pending.profit, stats.pending.revenue);

            return stats;
        },
    });
};

/**
 * Hook to fetch period lock status
 */
export const usePeriodStatus = (periodCode: string) => {
    return useQuery({
        queryKey: ['accounting_periods', periodCode],
        queryFn: async () => {
            // Mock for offline
            return { is_locked: false };
        },
    });
};

/**
 * Hook to fetch monthly trend data
 */
export const useMonthlyTrend = (months: number = 6) => {
    return useQuery({
        queryKey: ['dashboard', 'trend', months],
        staleTime: 5 * 60 * 1000, // 5 min cache
        queryFn: async () => {
            const items = [];
            // Fetch all trips? Or list by date range covering 6 months?
            // Let's generate range
            const end = new Date();
            const start = subMonths(end, months);

            // We can't easily fetch 6 months of data via 'listByDateRange' if we iterate?
            // Or just fetch wide range.
            const trips = await tripAdapter.listByDateRange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
            const expenses = await expenseAdapter.list(); // All expenses or need filter?

            // Group by month
            const grouped = new Map<string, { revenue: number, profit: number }>();

            // Init keys
            const current = new Date(start);
            while (current <= end) {
                const key = format(current, 'yyyy-MM');
                grouped.set(key, { revenue: 0, profit: 0 });
                current.setMonth(current.getMonth() + 1);
            }

            // QA AUDIT FIX P1-PERF-01: Pre-group expenses by trip_id
            const expensesByTrip = new Map<string, number>();
            expenses.forEach((e: any) => {
                const tid = e.trip_id;
                if (tid) expensesByTrip.set(tid, (expensesByTrip.get(tid) || 0) + (e.amount || 0));
            });

            trips.forEach((trip: any) => {
                if (trip.status === 'closed' || trip.status === 'completed') {
                    const month = trip.departure_date.substring(0, 7);
                    if (grouped.has(month)) {
                        const data = grouped.get(month)!;
                        const rev = trip.total_revenue || 0;
                        const tripExp = expensesByTrip.get(trip.id) || 0;

                        data.revenue += rev;
                        data.profit += (rev - tripExp);
                    }
                }
            });

            return Array.from(grouped.entries()).map(([month, data]) => ({
                month: formatMonthLabel(month),
                revenue: data.revenue,
                profit: data.profit
            }));
        },
    });
};

/**
 * Hook to fetch expense breakdown by category (Using Real 'expenses' table)
 */
export const useExpenseBreakdown = (startDate: string, endDate: string) => {
    return useQuery({
        queryKey: ['dashboard', 'expenses', startDate, endDate],
        staleTime: 2 * 60 * 1000,
        queryFn: async () => {
            const categories = await dataAdapter.expenseCategories.list().catch(() => []);
            const catMap = new Map<string, string>(categories.map((c: any) => [String(c.id), String(c.category_name)]));

            const allExpenses = (await expenseAdapter.list()) as any[];

            // Filter by date
            const relevant = allExpenses.filter((e: any) => {
                return e.expense_date >= startDate && e.expense_date <= endDate;
            });

            // Group
            const groups = new Map<string, { val: number, count: number }>();

            relevant.forEach((e: any) => {
                const catName = catMap.get(String(e.category_id)) || 'Khác';
                const curr = groups.get(catName) || { val: 0, count: 0 };
                curr.val += (Number(e.amount) || 0);
                curr.count++;
                groups.set(catName, curr);
            });

            const total = Array.from(groups.values()).reduce((sum, item) => sum + item.val, 0);

            return Array.from(groups.entries()).map(([name, data]) => ({
                name,
                value: data.val,
                count: data.count,
                percentage: total ? (data.val / total) * 100 : 0
            })).sort((a, b) => b.value - a.value);
        },
    });
};

/**
 * Hook to fetch vehicle performance
 */
export const useVehiclePerformance = (limit: number = 5) => {
    return useQuery({
        queryKey: ['dashboard', 'vehicles', limit],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const trips = await tripAdapter.list();
            const expenses = await expenseAdapter.list();
            const vehicles = await vehicleAdapter.list();

            // QA AUDIT FIX P1-PERF-01: Pre-group expenses by trip_id
            const expensesByTrip = new Map<string, number>();
            expenses.forEach((e: any) => {
                const tid = e.trip_id;
                if (tid) expensesByTrip.set(tid, (expensesByTrip.get(tid) || 0) + (e.amount || 0));
            });

            const vMap = new Map();

            vehicles.forEach((v: any) => vMap.set(v.id, { ...v, rev: 0, profit: 0, trips: 0 }));

            trips.forEach((t: any) => {
                if ((t.status === 'completed' || t.status === 'closed') && t.vehicle_id) {
                    const v = vMap.get(t.vehicle_id);
                    if (v) {
                        const rev = t.total_revenue || 0;
                        const exp = expensesByTrip.get(t.id) || 0;
                        v.rev += rev;
                        v.profit += (rev - exp);
                        v.trips++;
                    }
                }
            });

            return Array.from(vMap.values())
                .sort((a, b) => b.rev - a.rev)
                .slice(0, limit)
                .map(v => ({
                    vehicle_id: v.id,
                    license_plate: v.license_plate,
                    total_revenue: v.rev,
                    total_profit: v.profit,
                    trip_count: v.trips,
                    profit_margin: v.rev ? (v.profit / v.rev) : 0
                }));
        },
    });
};

/**
 * Hook to fetch driver performance
 */
export const useDriverPerformance = (limit: number = 5) => {
    return useQuery({
        queryKey: ['dashboard', 'drivers', limit],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            const trips = await tripAdapter.list();
            const expenses = await expenseAdapter.list();
            const drivers = await driverAdapter.list();

            // QA AUDIT FIX P1-PERF-01: Pre-group expenses by trip_id
            const expensesByTrip = new Map<string, number>();
            expenses.forEach((e: any) => {
                const tid = e.trip_id;
                if (tid) expensesByTrip.set(tid, (expensesByTrip.get(tid) || 0) + (e.amount || 0));
            });

            const dMap = new Map();

            drivers.forEach((d: any) => dMap.set(d.id, { ...d, rev: 0, profit: 0, trips: 0 }));

            trips.forEach((t: any) => {
                if ((t.status === 'completed' || t.status === 'closed') && t.driver_id) {
                    const d = dMap.get(t.driver_id);
                    if (d) {
                        const rev = t.total_revenue || 0;
                        const exp = expensesByTrip.get(t.id) || 0;
                        d.rev += rev;
                        d.profit += (rev - exp);
                        d.trips++;
                    }
                }
            });

            return Array.from(dMap.values())
                .sort((a, b) => b.rev - a.rev)
                .slice(0, limit)
                .map(d => ({
                    driver_id: d.id,
                    full_name: d.full_name,
                    total_revenue: d.rev,
                    total_profit: d.profit,
                    trip_count: d.trips,
                    profit_margin: d.rev ? (d.profit / d.rev) : 0
                }));
        },
    });
};

/**
 * Hook to fetch recent trips
 */
export const useRecentTrips = (limit: number = 5) => {
    return useQuery({
        queryKey: ['dashboard', 'recent_trips', limit],
        staleTime: 60 * 1000,
        queryFn: async () => {
            const trips = await tripAdapter.list();
            // Sort DESC
            return trips.sort((a: any, b: any) => new Date(b.departure_date).getTime() - new Date(a.departure_date).getTime())
                .slice(0, limit);
        },
    });
};

/**
 * Hook to fetch maintenance alerts
 */
export const useMaintenanceAlerts = () => {
    return useQuery({
        queryKey: ['dashboard', 'maintenance'],
        staleTime: 5 * 60 * 1000,
        queryFn: async () => {
            // Adapter needs a way to list active/scheduled?
            // checking listByStatus
            // But we want multiple statuses: scheduled, in_progress
            // Fetch all and filter in JS
            const all = await maintenanceAdapter.list();
            const now = new Date();

            return all.filter((m: any) => {
                if (m.status === 'completed' || m.status === 'cancelled') return false;
                // Check if due soon? Or just all open?
                // Dashboard usually shows upcoming.
                return true;
            }).sort((a: any, b: any) => new Date(a.next_service_date || a.scheduled_date).getTime() - new Date(b.next_service_date || b.scheduled_date).getTime())
                .slice(0, 5);
        },
    });
};

// Helper functions

function sum(items: any[], field: string): number {
    return items.reduce((total, item) => total + (item[field] || 0), 0);
}

function calculateMargin(profit: number, revenue: number): number {
    return revenue > 0 ? (profit / revenue) * 100 : 0;
}

function getEmptyStats(): DashboardStats {
    return {
        official: { count: 0, revenue: 0, expense: 0, profit: 0, margin: 0, total_km: 0 },
        pending: { count: 0, revenue: 0, expense: 0, profit: 0, margin: 0, total_km: 0 },
        inProgress: { count: 0, revenue: 0 },
        draft: { count: 0 },
    };
}

function formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-');
    return `T${parseInt(month)}/${year.substring(2)}`;
}
