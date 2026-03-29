import { useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { useRevenueReport, RevenueReportRow } from "@/hooks/useReportData";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import * as XLSX from 'xlsx';
import { printReportPdf } from "@/lib/print-pdf";

// ... imports
import { ReportSummaryCards, SummaryCardProps } from "./ReportSummaryCards";
import { Package, Wallet, Clock, CheckCircle } from "lucide-react";

export function ReportByRevenueTable() {
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

    const { data: reportCombined, isLoading, refetch } = useRevenueReport(filters);
    const reportData = reportCombined?.data || [];
    const summary = reportCombined?.summary;

    const summaryCards: SummaryCardProps[] = [
        {
            title: "Tổng doanh thu",
            value: summary?.totalRevenue || 0,
            icon: Wallet,
            isCurrency: true,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            description: `${summary?.totalTrips || 0} chuyến`
        },
        {
            title: "Doanh thu thực tế",
            value: summary?.realizedRevenue || 0,
            icon: CheckCircle,
            isCurrency: true,
            color: "text-green-600",
            bgColor: "bg-green-50",
            description: "Đã hoàn thành/đóng"
        },
        {
            title: "Dự kiến thu",
            value: summary?.pendingRevenue || 0,
            icon: Clock,
            isCurrency: true,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            description: "Chờ xử lý/đang chạy"
        },
    ];

    // Column definitions
    const [columns, setColumns] = useState<ColumnDef<RevenueReportRow>[]>([
        {
            id: "period",
            label: "Thời gian",
            width: "150px",
            render: (row) => <span className="font-medium text-primary">{row.period}</span>,
            pinned: true,
            visible: true,
            sortable: true,
            sortKey: "period"
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
            label: "Tổng Doanh thu",
            align: "right",
            width: "200px",
            render: (row) => <span className="font-bold text-blue-600">{formatCurrency(row.total_revenue)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_revenue, 0)),
            visible: true,
            sortable: true,
            sortKey: "total_revenue"
        },
        {
            id: "realized_revenue",
            label: "Thực tế",
            align: "right",
            width: "150px",
            render: (row) => <span className="font-medium text-green-600">{formatCurrency(row.realized_revenue)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.realized_revenue, 0)),
            visible: true,
            sortable: true,
            sortKey: "realized_revenue"
        },
        {
            id: "pending_revenue",
            label: "Dự kiến",
            align: "right",
            width: "150px",
            render: (row) => <span className="font-medium text-amber-600">{formatCurrency(row.pending_revenue)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.pending_revenue, 0)),
            visible: true,
            sortable: true,
            sortKey: "pending_revenue"
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
                title: 'Báo Cáo Doanh Thu',
                columns: [
                    { header: 'Thời gian', key: 'period' },
                    { header: 'Số chuyến', key: 'trip_count', align: 'center' },
                    { header: 'Tổng Doanh thu', key: 'total_revenue', align: 'right', format: fmtVND },
                    { header: 'Thực tế', key: 'realized_revenue', align: 'right', format: fmtVND },
                    { header: 'Dự kiến', key: 'pending_revenue', align: 'right', format: fmtVND },
                ],
                data: reportData,
                footer: {
                    period: 'TỔNG',
                    trip_count: String(reportData.reduce((s, r) => s + r.trip_count, 0)),
                    total_revenue: fmtVND(reportData.reduce((s, r) => s + r.total_revenue, 0)),
                    realized_revenue: fmtVND(reportData.reduce((s, r) => s + r.realized_revenue, 0)),
                    pending_revenue: fmtVND(reportData.reduce((s, r) => s + r.pending_revenue, 0)),
                },
            });
            return;
        }

        // Map data to export format (Vietnamese headers)
        const exportData = reportData.map(row => ({
            "Thời gian": row.period,
            "Số chuyến": row.trip_count,
            "Tổng Doanh thu": row.total_revenue,
            "Thực tế": row.realized_revenue,
            "Dự kiến": row.pending_revenue
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BaoCaoDoanhThu");

        if (type === 'csv') {
            XLSX.writeFile(wb, `BaoCao_DoanhThu_${format(new Date(), 'ddMMyyyy')}.csv`);
        } else {
            XLSX.writeFile(wb, `BaoCao_DoanhThu_${format(new Date(), 'ddMMyyyy')}.xlsx`);
        }
    };

    return (
        <div className="space-y-4">
            {summary && <ReportSummaryCards cards={summaryCards} />}

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
                        data={reportData}
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

