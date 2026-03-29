import { useState, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { DashboardRevenueRow } from "../types";
import { useNavigate } from "react-router-dom";
import { useTrips } from "@/hooks/useTrips";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardRevenueTab() {
    const navigate = useNavigate();
    const { data: trips, isLoading, isError } = useTrips();

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
    });
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Status options for filter
    const statusOptions = [
        { value: 'completed', label: 'Hoàn thành' },
        { value: 'in_progress', label: 'Đang thực hiện' },
        { value: 'cancelled', label: 'Đã hủy' },
        { value: 'draft', label: 'Nháp' },
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
                        (trip.trip_code || '').toLowerCase().includes(query) ||
                        (trip.customer?.customer_name || '').toLowerCase().includes(query) ||
                        (trip.vehicle?.license_plate || '').toLowerCase().includes(query);
                    if (!matches) return false;
                }

                // 3. Status Filter
                if (statusFilter !== "all" && statusFilter) {
                    if (trip.status !== statusFilter) return false;
                }

                return true;
            })
            .map(trip => {
                // Calculate financials
                const revenue = trip.total_revenue || ((trip.freight_revenue || 0) + (trip.additional_charges || 0));
                const cost = (trip as any).total_expense || 0;
                const profit = revenue - cost;
                const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

                return {
                    id: trip.id,
                    trip_code: trip.trip_code,
                    trip_date: trip.departure_date,
                    customer_name: trip.customer?.customer_name || 'Khách lẻ',
                    route_name: trip.route?.route_name || 'Chưa định tuyến',
                    vehicle_plate: trip.vehicle?.license_plate || 'Chưa gán',
                    revenue: revenue,
                    total_cost: cost,
                    profit: profit,
                    profit_margin: margin,
                    status: trip.status || 'draft'
                } as DashboardRevenueRow;
            });
    }, [trips, searchQuery, dateRange, statusFilter]);

    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);

    const columns = useMemo<Column<DashboardRevenueRow>[]>(() => [
        {
            key: 'trip_code',
            header: 'Mã chuyến',
            width: '120px',
            render: (value) => <span className="font-mono font-medium text-blue-600 hover:underline cursor-pointer">{value as string}</span>,
        },
        {
            key: 'trip_date',
            header: 'Ngày',
            width: '100px',
            render: (value) => <span className="text-sm">{formatDate(value as string)}</span>,
        },
        {
            key: 'customer_name',
            header: 'Khách hàng',
            width: '200px',
        },
        {
            key: 'route_name',
            header: 'Tuyến',
            width: '180px',
        },
        {
            key: 'revenue',
            header: 'Doanh thu',
            align: 'right',
            render: (value) => <span className="font-medium text-green-600">{formatCurrency(value as number)}</span>,
        },
        {
            key: 'status',
            header: 'Trạng thái',
            width: '120px',
            render: (value) => {
                const status = value as string;
                let variant: "default" | "secondary" | "destructive" | "outline" = "default";
                let label = status;

                switch (status) {
                    case 'cancelled': variant = 'destructive'; label = 'Đã hủy'; break;
                    case 'in_progress': variant = 'secondary'; label = 'Đang chạy'; break;
                    case 'draft': variant = 'outline'; label = 'Nháp'; break;
                    case 'completed': variant = 'default'; label = 'Hoàn thành'; break;
                    case 'closed': variant = 'default'; label = 'Đã đóng'; break;
                }

                return <Badge variant={variant}>{label}</Badge>;
            }
        }
    ], []);

    const handleRowClick = (row: DashboardRevenueRow) => {
        navigate(`/trips?search=${row.trip_code}`);
    };

    // Error handling
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold">Không thể tải dữ liệu doanh thu</h3>
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
                <h3 className="text-lg font-semibold text-blue-800">Báo Cáo Doanh Thu</h3>
                <div className="text-sm font-medium bg-green-50 text-green-700 px-3 py-1 rounded-md border border-green-200 shadow-sm">
                    Tổng doanh thu: <span className="font-bold text-lg ml-1">{formatCurrency(totalRevenue)}</span>
                </div>
            </div>

            <DashboardFilterBar
                onSearchChange={setSearchQuery}
                onDateRangeChange={setDateRange}
                onFilterChange={(type, val) => setStatusFilter(val)}
                showStatusFilter={true}
                statusOptions={statusOptions}
                placeholder="Tìm chuyến xe, khách hàng..."
                onExport={undefined}
            />

            <DataTable
                data={filteredData}
                columns={columns}
                searchPlaceholder="Tìm kiếm..."
                onRowClick={handleRowClick}
                hideToolbar={true}
            />
        </div>
    );
}

