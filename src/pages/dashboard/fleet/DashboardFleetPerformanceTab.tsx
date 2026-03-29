import { useState, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrency } from "@/lib/formatters";
import { DashboardFleetPerformanceRow } from "../types";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useTripsByDateRange } from "@/hooks/useTrips";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardFleetPerformanceTab() {
    const navigate = useNavigate();

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
    });

    // Format dates for API
    const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

    // Fetch trips for the selected range
    const { data: trips, isLoading, isError } = useTripsByDateRange(startDate, endDate);

    // Aggregate Data by Vehicle
    const fleetData = useMemo(() => {
        if (!trips) return [];

        const vehicleMap = new Map<string, DashboardFleetPerformanceRow>();

        trips.forEach((trip: any) => {
            if (!trip.vehicle_id || !trip.vehicle) return;

            const vehicleId = trip.vehicle_id;
            const plate = trip.vehicle.license_plate;
            const type = trip.vehicle.vehicle_type || 'Unknown';

            const current = vehicleMap.get(vehicleId) || {
                vehicle_id: vehicleId,
                vehicle_plate: plate,
                vehicle_type: type,
                total_trips: 0,
                total_km: 0,
                total_revenue: 0,
                total_cost: 0,
                total_profit: 0,
                fuel_efficiency: 0,
                avg_profit_per_trip: 0,
                utilization_rate: 0
            };

            // Update aggregates
            current.total_trips += 1;
            current.total_km += (trip.actual_distance_km || 0);
            const revenue = (trip.freight_revenue || 0) + (trip.additional_charges || 0);
            current.total_revenue += revenue;
            // Cost from trip_financials view (SUM of linked expenses)
            const cost = trip.total_expense || 0;
            current.total_cost += cost;
            current.total_profit += (revenue - cost);

            vehicleMap.set(vehicleId, current);
        });

        // Calculate averages and derived metrics
        const rows = Array.from(vehicleMap.values()).map(row => {
            row.avg_profit_per_trip = row.total_trips > 0 ? row.total_profit / row.total_trips : 0;

            // Mock utilization for now or calculate based on days in period?
            // Simple logic: if > 20 trips/month = 100%? 
            // Let's keep it simple: relative to max trips in list?
            // For now, let's leave it as 0 or mock slightly based on trips
            row.utilization_rate = Math.min(100, Math.round((row.total_trips / 30) * 100)); // Rough est: trips/days * 100

            return { ...row, id: row.vehicle_id };
        });

        return rows;
    }, [trips]);

    // Filter by Search Query
    const filteredData = useMemo(() => {
        if (!searchQuery) return fleetData;
        const query = searchQuery.toLowerCase();
        return fleetData.filter(row =>
            row.vehicle_plate.toLowerCase().includes(query) ||
            row.vehicle_type.toLowerCase().includes(query)
        );
    }, [fleetData, searchQuery]);

    const columns = useMemo<Column<DashboardFleetPerformanceRow>[]>(() => [
        { key: 'vehicle_plate', header: 'Biển số', render: (v) => <span className="font-bold cursor-pointer hover:underline text-blue-600">{v as string}</span> },
        { key: 'vehicle_type', header: 'Loại xe', width: '150px' },
        { key: 'total_trips', header: 'Số chuyến', align: 'center' },
        { key: 'total_km', header: 'Tổng KM', align: 'right', render: (v) => (v as number).toLocaleString() },
        {
            key: 'utilization_rate',
            header: 'Công suất (ước tính)',
            width: '150px',
            render: (v) => (
                <div className="flex items-center gap-2">
                    <Progress value={v as number} className="h-2 w-16" />
                    <span className="text-xs">{v}%</span>
                </div>
            )
        },
        { key: 'total_revenue', header: 'Tổng doanh thu', align: 'right', render: (v) => formatCurrency(v as number) },
        { key: 'total_profit', header: 'Lợi nhuận', align: 'right', render: (v) => <span className="font-bold text-green-600">{formatCurrency(v as number)}</span> },
    ], []);

    // Error handling
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold">Không thể tải dữ liệu hiệu suất</h3>
                <p className="text-sm text-muted-foreground">Vui lòng kiểm tra kết nối hoặc quyền truy cập.</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Tải lại trang</Button>
            </div>
        );
    }

    if (isLoading) {
        return <div className="flex justify-center p-8 min-h-[400px] items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-800">Hiệu Suất Đội Xe</h3>
                <div className="flex items-center gap-2">
                    <div className="text-sm font-medium bg-secondary/20 px-3 py-1 rounded-md border border-secondary/20 shadow-sm hidden sm:block">
                        <span className="text-muted-foreground mr-1">Xe:</span>
                        <span className="font-bold text-foreground">{filteredData.length}</span>
                    </div>
                    <div className="text-sm font-medium bg-green-50 text-green-700 px-3 py-1 rounded-md border border-green-200 shadow-sm">
                        Tổng doanh thu: <span className="font-bold text-lg ml-1">{formatCurrency(filteredData.reduce((s, i) => s + i.total_revenue, 0))}</span>
                    </div>
                </div>
            </div>

            <DashboardFilterBar
                onSearchChange={setSearchQuery}
                onDateRangeChange={setDateRange}
                placeholder="Tìm biển số, loại xe..."
            />

            <DataTable
                data={filteredData}
                columns={columns}
                onRowClick={(r) => navigate(`/vehicles?search=${r.vehicle_plate}`)}
                hideToolbar={true}
                emptyMessage="Không có dữ liệu hiệu suất trong khoảng thời gian này."
            />
        </div>
    );
}
