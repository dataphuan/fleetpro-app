import { useState, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatDate, formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { DashboardTripRow } from "../types";
import { useNavigate } from "react-router-dom";
import { useTrips } from "@/hooks/useTrips";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardTripsTab() {
    const navigate = useNavigate();
    const { data: trips, isLoading, isError } = useTrips();

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
    });
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Status options
    const statusOptions = [
        { value: 'completed', label: 'Hoàn thành' },
        { value: 'in_progress', label: 'Đang thực hiện' },
        { value: 'dispatched', label: 'Đã điều xe' },
        { value: 'confirmed', label: 'Đã xác nhận' },
        { value: 'draft', label: 'Nháp' },
        { value: 'cancelled', label: 'Đã hủy' },
    ];

    // Transform and Filter Data
    const filteredData = useMemo(() => {
        if (!trips) return [];

        return trips
            .filter(trip => {
                // 1. Date Range Filter
                if (dateRange.from && trip.departure_date) {
                    if (parseISO(trip.departure_date) < dateRange.from) return false;
                }
                if (dateRange.to && trip.departure_date) {
                    if (parseISO(trip.departure_date) > dateRange.to) return false;
                }

                // 2. Search Filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const matches =
                        trip.trip_code.toLowerCase().includes(query) ||
                        trip.vehicle?.license_plate.toLowerCase().includes(query) ||
                        trip.driver?.full_name.toLowerCase().includes(query) ||
                        trip.customer?.customer_name.toLowerCase().includes(query);
                    if (!matches) return false;
                }

                // 3. Status Filter
                if (statusFilter !== "all" && statusFilter) {
                    if (trip.status !== statusFilter) return false;
                }

                return true;
            })
            .map(trip => {
                // Determine financial status
                const revenue = (trip.freight_revenue || 0) + (trip.additional_charges || 0);
                const profit = revenue; // Placeholder: Real profit needs expense calculation

                return {
                    id: trip.id,
                    trip_code: trip.trip_code,
                    departure_date: trip.departure_date,
                    vehicle_plate: trip.vehicle?.license_plate || 'Chưa gán',
                    driver_name: trip.driver?.full_name || 'Chưa gán',
                    route_name: trip.route?.route_name || 'Chưa định tuyến',
                    customer_name: trip.customer?.customer_name || 'Khách lẻ',
                    status: trip.status || 'draft',
                    revenue: revenue,
                    profit: profit,
                } as DashboardTripRow;
            });
    }, [trips, searchQuery, dateRange, statusFilter]);

    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.revenue || 0), 0);

    const columns = useMemo<Column<DashboardTripRow>[]>(() => [
        { key: 'trip_code', header: 'Mã chuyến', render: (v) => <span className="font-mono text-blue-600 font-medium">{v as string}</span> },
        { key: 'departure_date', header: 'Ngày đi', render: (v) => formatDate(v as string) },
        { key: 'vehicle_plate', header: 'Xe', render: (v) => <span className="font-bold font-mono">{v as string}</span> },
        { key: 'driver_name', header: 'Tài xế' },
        { key: 'route_name', header: 'Tuyến' },
        { key: 'customer_name', header: 'Khách hàng' },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (v) => {
                const map: Record<string, any> = {
                    completed: 'default',
                    cancelled: 'destructive',
                    draft: 'outline',
                    in_progress: 'secondary',
                    confirmed: 'default',
                    closed: 'default'
                };
                const labelMap: Record<string, string> = {
                    completed: 'Hoàn thành',
                    cancelled: 'Đã hủy',
                    draft: 'Nháp',
                    in_progress: 'Đang chạy',
                    confirmed: 'Đã xác nhận',
                    closed: 'Đã đóng'
                };
                return <Badge variant={map[v as string] || 'outline'}>{labelMap[v as string] || v}</Badge>
            }
        },
        { key: 'revenue', header: 'Doanh thu', align: 'right', render: (v) => <span className="font-medium text-green-700">{formatCurrency(v as number)}</span> }
    ], []);

    // Error handling
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold">Không thể tải dữ liệu chuyến đi</h3>
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
                <h3 className="text-lg font-semibold text-purple-800">Theo Dõi Chuyến Đi</h3>
                <div className="text-sm font-medium bg-green-50 text-green-700 px-3 py-1 rounded-md border border-green-200 shadow-sm">
                    Tổng doanh thu (lọc): <span className="font-bold text-lg ml-1">{formatCurrency(totalRevenue)}</span>
                </div>
            </div>

            <DashboardFilterBar
                onSearchChange={setSearchQuery}
                onDateRangeChange={setDateRange}
                onFilterChange={(type, val) => setStatusFilter(val)}
                showStatusFilter={true}
                statusOptions={statusOptions}
                placeholder="Tìm chuyến, tài xế, xe..."
            />

            <DataTable
                data={filteredData}
                columns={columns}
                onRowClick={(row) => navigate(`/trips?search=${row.trip_code}`)}
                searchPlaceholder="Tìm chuyến..."
                hideToolbar={true}
            />
        </div>
    );
}
