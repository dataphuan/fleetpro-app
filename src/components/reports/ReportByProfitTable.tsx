import { useState } from "react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { useProfitReport, ProfitReportRow } from "@/hooks/useReportData";
import { startOfYear, endOfYear, format } from "date-fns";
import * as XLSX from 'xlsx';
import { printReportPdf } from "@/lib/print-pdf";
import { ReportSummaryCards, SummaryCardProps } from "./ReportSummaryCards";
import { Wallet, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

export function ReportByProfitTable() {
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

    const { data: reportCombined, isLoading, refetch } = useProfitReport(filters);
    const reportData = reportCombined?.data || [];
    const summary = reportCombined?.summary;

    const summaryCards: SummaryCardProps[] = [
        {
            title: "Tổng Doanh thu",
            value: summary?.totalRevenue || 0,
            icon: Wallet,
            isCurrency: true,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            description: `${summary?.totalTrips || 0} chuyến`
        },
        {
            title: "Chi phí đã xác nhận",
            value: summary?.totalConfirmedExpense || 0,
            icon: TrendingDown,
            isCurrency: true,
            color: "text-red-600",
            bgColor: "bg-red-50",
            description: `${summary?.totalExpenses || 0} khoản`
        },
        {
            title: "Lợi nhuận",
            value: summary?.totalProfit || 0,
            icon: TrendingUp,
            isCurrency: true,
            color: (summary?.totalProfit || 0) >= 0 ? "text-green-600" : "text-red-600",
            bgColor: (summary?.totalProfit || 0) >= 0 ? "bg-green-50" : "bg-red-50",
            description: "Doanh thu − Chi phí"
        },
        {
            title: "Biên lợi nhuận",
            value: `${(summary?.profitMarginPct || 0).toFixed(1)}%`,
            icon: BarChart3,
            isCurrency: false,
            color: (summary?.profitMarginPct || 0) >= 0 ? "text-emerald-600" : "text-red-600",
            bgColor: (summary?.profitMarginPct || 0) >= 0 ? "bg-emerald-50" : "bg-red-50",
            description: "Profit margin"
        },
    ];

    const [columns, setColumns] = useState<ColumnDef<ProfitReportRow>[]>([
        {
            id: "period",
            label: "Thời gian",
            width: "130px",
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
            label: "Doanh thu",
            align: "right",
            width: "180px",
            render: (row) => <span className="font-bold text-blue-600">{formatCurrency(row.total_revenue)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_revenue, 0)),
            visible: true,
            sortable: true,
            sortKey: "total_revenue"
        },
        {
            id: "confirmed_expense",
            label: "Chi phí xác nhận",
            align: "right",
            width: "180px",
            render: (row) => <span className="font-medium text-red-600">{formatCurrency(row.confirmed_expense)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.confirmed_expense, 0)),
            visible: true,
            sortable: true,
            sortKey: "confirmed_expense"
        },
        {
            id: "profit",
            label: "Lợi nhuận",
            align: "right",
            width: "180px",
            render: (row) => (
                <span className={`font-bold ${row.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(row.profit)}
                </span>
            ),
            footer: (data) => {
                const total = data.reduce((sum, r) => sum + r.profit, 0);
                return <span className={total >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(total)}</span>;
            },
            visible: true,
            sortable: true,
            sortKey: "profit"
        },
        {
            id: "profit_margin_pct",
            label: "Biên LN (%)",
            align: "right",
            width: "120px",
            render: (row) => (
                <span className={`font-medium ${row.profit_margin_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {row.profit_margin_pct.toFixed(1)}%
                </span>
            ),
            visible: true,
            sortable: true,
            sortKey: "profit_margin_pct"
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
                title: 'Báo Cáo Lợi Nhuận',
                columns: [
                    { header: 'Thời gian', key: 'period' },
                    { header: 'Số chuyến', key: 'trip_count', align: 'center' },
                    { header: 'Doanh thu', key: 'total_revenue', align: 'right', format: fmtVND },
                    { header: 'Chi phí xác nhận', key: 'confirmed_expense', align: 'right', format: fmtVND },
                    { header: 'Lợi nhuận', key: 'profit', align: 'right', format: fmtVND },
                    { header: 'Biên LN (%)', key: 'profit_margin_pct', align: 'right', format: (v: number) => v.toFixed(1) + '%' },
                ],
                data: reportData,
                footer: {
                    period: 'TỔNG',
                    trip_count: String(reportData.reduce((s, r) => s + r.trip_count, 0)),
                    total_revenue: fmtVND(reportData.reduce((s, r) => s + r.total_revenue, 0)),
                    confirmed_expense: fmtVND(reportData.reduce((s, r) => s + r.confirmed_expense, 0)),
                    profit: fmtVND(reportData.reduce((s, r) => s + r.profit, 0)),
                },
            });
            return;
        }

        const exportData = reportData.map(row => ({
            "Thời gian": row.period,
            "Số chuyến": row.trip_count,
            "Doanh thu": row.total_revenue,
            "Chi phí xác nhận": row.confirmed_expense,
            "Lợi nhuận": row.profit,
            "Biên LN (%)": row.profit_margin_pct.toFixed(1),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BaoCaoLoiNhuan");

        if (type === 'csv') {
            XLSX.writeFile(wb, `BaoCao_LoiNhuan_${format(new Date(), 'ddMMyyyy')}.csv`);
        } else {
            XLSX.writeFile(wb, `BaoCao_LoiNhuan_${format(new Date(), 'ddMMyyyy')}.xlsx`);
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
