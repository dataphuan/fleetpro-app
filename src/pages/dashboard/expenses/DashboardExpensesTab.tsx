import { useState, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { DashboardExpenseRow } from "../types";
import { useNavigate } from "react-router-dom";
import { useExpenses } from "@/hooks/useExpenses";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardExpensesTab() {
    const navigate = useNavigate();
    const { data: expenses, isLoading, isError } = useExpenses();

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
    });
    const [statusFilter, setStatusFilter] = useState<string>("all");

    // Status options
    const statusOptions = [
        { value: 'confirmed', label: 'Đã duyệt' },
        { value: 'draft', label: 'Nháp' },
        { value: 'pending', label: 'Chờ duyệt' },
    ];

    // Transform and Filter Data
    const filteredData = useMemo(() => {
        if (!expenses) return [];

        return expenses
            .filter(expense => {
                // 1. Date Range Filter
                if (dateRange.from && expense.expense_date) {
                    if (parseISO(expense.expense_date) < dateRange.from) return false;
                }
                if (dateRange.to && expense.expense_date) {
                    if (parseISO(expense.expense_date) > dateRange.to) return false;
                }

                // 2. Search Filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const matches =
                        expense.expense_code.toLowerCase().includes(query) ||
                        expense.category?.category_name?.toLowerCase().includes(query) ||
                        expense.vendor_name?.toLowerCase().includes(query) ||
                        expense.description?.toLowerCase().includes(query);
                    if (!matches) return false;
                }

                // 3. Status Filter
                if (statusFilter !== "all" && statusFilter) {
                    if (expense.status !== statusFilter) return false;
                }

                return true;
            })
            .map(expense => {
                return {
                    id: expense.id,
                    expense_code: expense.expense_code,
                    expense_date: expense.expense_date,
                    category_name: expense.category?.category_name || 'Khác',
                    vehicle_plate: expense.vehicle_id ? 'Xe đội' : '-', // We might need to fetch vehicle to display plate, but simple check for now
                    trip_code: expense.trip?.trip_code || null,
                    amount: expense.amount || 0,
                    vendor_name: expense.vendor_name || '-',
                    status: expense.status || 'draft',
                } as DashboardExpenseRow;
            });
    }, [expenses, searchQuery, dateRange, statusFilter]);

    const totalExpenses = filteredData.reduce((sum, item) => sum + item.amount, 0);

    const columns = useMemo<Column<DashboardExpenseRow>[]>(() => [
        {
            key: 'expense_code',
            header: 'Mã phiếu',
            render: (value) => <span className="font-mono font-medium">{value as string}</span>,
        },
        {
            key: 'expense_date',
            header: 'Ngày chi',
            render: (value) => <span className="text-sm">{formatDate(value as string)}</span>,
        },
        {
            key: 'category_name',
            header: 'Loại chi phí',
            render: (value) => <Badge variant="outline">{value as string}</Badge>,
        },
        {
            key: 'amount',
            header: 'Số tiền',
            align: 'right',
            render: (value) => <span className="font-medium text-red-600">{formatCurrency(value as number)}</span>,
        },
        {
            key: 'trip_code',
            header: 'Mã chuyến',
            render: (value) => value ? <span className="text-xs text-blue-600 font-mono">{value as string}</span> : "-",
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (value) => value === 'confirmed'
                ? <Badge className="bg-green-600">Đã duyệt</Badge>
                : <Badge variant="secondary">Nháp</Badge>
        }
    ], []);

    const handleRowClick = (row: DashboardExpenseRow) => {
        navigate(`/expenses?search=${row.expense_code}`);
    };

    // Error handling
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold">Không thể tải dữ liệu chi phí</h3>
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
                <h3 className="text-lg font-semibold text-red-800">Quản Lý Chi Phí</h3>
                <div className="text-sm font-medium bg-red-50 text-red-700 px-3 py-1 rounded-md border border-red-200 shadow-sm">
                    Tổng chi: <span className="font-bold text-lg ml-1">{formatCurrency(totalExpenses)}</span>
                </div>
            </div>

            <DashboardFilterBar
                onSearchChange={setSearchQuery}
                onDateRangeChange={setDateRange}
                onFilterChange={(type, val) => setStatusFilter(val)}
                showStatusFilter={true}
                statusOptions={statusOptions}
                placeholder="Tìm mã phiếu, loại chi phí..."
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
