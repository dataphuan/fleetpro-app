import { useState, useMemo } from "react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { useCustomerReport, CustomerReportRow } from "@/hooks/useReportData";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import * as XLSX from 'xlsx';
import { printReportPdf } from "@/lib/print-pdf";
import { ReportSummaryCards, SummaryCardProps } from "./ReportSummaryCards";
import { Users, Activity, Wallet, CreditCard } from "lucide-react";

export function ReportByCustomerTable() {
    const [filters, setFilters] = useState<FilterState>({
        searchPromise: "",
        dateRange: { from: startOfYear(new Date()), to: endOfYear(new Date()) },
        status: [],
        vehicleIds: [],
        driverIds: [],
        vehicleType: undefined,
        revenueRange: undefined,
        customerId: undefined,
    });

    const { data: reportData, isLoading, refetch } = useCustomerReport(filters);

    const summaryCards: SummaryCardProps[] = useMemo(() => {
        const data = reportData || [];
        const totalTrips = data.reduce((s, r) => s + r.trip_count, 0);
        const totalRevenue = data.reduce((s, r) => s + r.total_revenue, 0);
        const totalDebt = data.reduce((s, r) => s + r.current_debt, 0);
        return [
            { title: "Tổng khách hàng", value: data.length, icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
            { title: "Tổng chuyến", value: totalTrips, icon: Activity, color: "text-purple-600", bgColor: "bg-purple-50" },
            { title: "Tổng doanh thu", value: totalRevenue, icon: Wallet, isCurrency: true, color: "text-green-600", bgColor: "bg-green-50" },
            { title: "Tổng dư nợ", value: totalDebt, icon: CreditCard, isCurrency: true, color: totalDebt > 0 ? "text-orange-600" : "text-green-600", bgColor: totalDebt > 0 ? "bg-orange-50" : "bg-green-50" },
        ];
    }, [reportData]);

    // Column definitions
    const [columns, setColumns] = useState<ColumnDef<CustomerReportRow>[]>([
        {
            id: "customer_code",
            label: "Mã KH",
            width: "120px",
            render: (row) => <span className="font-medium text-primary">{row.customer_code}</span>,
            pinned: true,
            visible: true,
            sortable: true,
            sortKey: "customer_code"
        },
        {
            id: "customer_name",
            label: "Tên khách hàng",
            width: "250px",
            render: (row) => <span className="font-medium">{row.customer_name}</span>,
            pinned: true,
            visible: true,
            sortable: true,
            sortKey: "customer_name"
        },
        {
            id: "trip_count",
            label: "Số chuyến",
            align: "center",
            width: "100px",
            render: (row) => formatNumber(row.trip_count),
            footer: (data) => formatNumber(data.reduce((sum, r) => sum + r.trip_count, 0)),
            visible: true,
            sortable: true,
            sortKey: "trip_count"
        },
        {
            id: "total_revenue",
            label: "Doanh thu",
            align: "right",
            width: "150px",
            render: (row) => <span className="font-medium text-green-600">{formatCurrency(row.total_revenue)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_revenue, 0)),
            visible: true,
            sortable: true,
            sortKey: "total_revenue"
        },
        {
            id: "current_debt",
            label: "Dư nợ hiện tại",
            align: "right",
            width: "150px",
            render: (row) => <span className="text-orange-600">{formatCurrency(row.current_debt)}</span>,
            visible: true,
            sortable: true,
            sortKey: "current_debt"
        },
        {
            id: "profit",
            label: "Lợi nhuận (Ước tính)",
            align: "right",
            width: "150px",
            render: (row) => (
                <span className={row.profit >= 0 ? "text-green-700 font-bold" : "text-red-700 font-bold"}>
                    {formatCurrency(row.profit)}
                </span>
            ),
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.profit, 0)),
            visible: true,
            sortable: true,
            sortKey: "profit"
        },
    ]);

    const toggleColumn = (id: string, visible: boolean) => {
        setColumns(prev => prev.map(col => col.id === id ? { ...col, visible } : col));
    };

    const resetColumns = () => {
        setColumns(prev => prev.map(col => ({ ...col, visible: true })));
    };

    const handleExport = (type: 'csv' | 'xlsx' | 'pdf') => {
        if (!reportData || reportData.length === 0) {
            alert("Không có dữ liệu để xuất");
            return;
        }

        if (type === 'pdf') {
            const fmtVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + ' đ';
            printReportPdf({
                title: 'Báo Cáo Theo Khách Hàng',
                columns: [
                    { header: 'Mã KH', key: 'customer_code' },
                    { header: 'Tên khách hàng', key: 'customer_name' },
                    { header: 'Số chuyến', key: 'trip_count', align: 'center' },
                    { header: 'Doanh thu', key: 'total_revenue', align: 'right', format: fmtVND },
                    { header: 'Dư nợ', key: 'current_debt', align: 'right', format: fmtVND },
                    { header: 'Lợi nhuận', key: 'profit', align: 'right', format: fmtVND },
                ],
                data: reportData,
                footer: {
                    customer_code: 'TỔNG',
                    trip_count: String(reportData.reduce((s, r) => s + r.trip_count, 0)),
                    total_revenue: fmtVND(reportData.reduce((s, r) => s + r.total_revenue, 0)),
                    current_debt: fmtVND(reportData.reduce((s, r) => s + r.current_debt, 0)),
                    profit: fmtVND(reportData.reduce((s, r) => s + r.profit, 0)),
                },
            });
            return;
        }

        // Map data to export format (Vietnamese headers)
        const exportData = reportData.map(row => ({
            "Mã KH": row.customer_code,
            "Tên khách hàng": row.customer_name,
            "Số chuyến": row.trip_count,
            "Doanh thu": row.total_revenue,
            "Dư nợ": row.current_debt,
            "Lợi nhuận": row.profit,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BaoCaoKhachHang");

        if (type === 'csv') {
            XLSX.writeFile(wb, `BaoCao_KH_${format(new Date(), 'ddMMyyyy')}.csv`);
        } else {
            XLSX.writeFile(wb, `BaoCao_KH_${format(new Date(), 'ddMMyyyy')}.xlsx`);
        }
    };

    return (
        <div className="space-y-4">
            <ReportSummaryCards cards={summaryCards} />

            <div className="flex items-center gap-2 flex-wrap">
                <ExcelFilterBar
                    filters={filters}
                    onFilterChange={setFilters}
                    onRefresh={refetch}
                >
                    <div className="flex items-center gap-2 border-l pl-2 ml-2">
                        <ColumnPicker
                            columns={columns.map(c => ({ id: c.id, label: c.label, visible: c.visible !== false }))}
                            onToggleColumn={toggleColumn}
                            onReset={resetColumns}
                        />
                        <ExportButtons onExport={handleExport} />
                    </div>
                </ExcelFilterBar>
            </div>

            <div className="border rounded-md bg-card">
                {isLoading ? (
                    <div className="flex h-[600px] items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <ExcelDataTable
                        data={reportData || []}
                        columns={columns}
                        enablePagination={true}
                        enableSorting={true}
                        pageSize={20}
                        className="h-[600px]"
                    />
                )}
            </div>
        </div>
    );
}
