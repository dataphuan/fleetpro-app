import { useState, useMemo } from "react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { useRouteReport, RouteReportRow } from "@/hooks/useReportData";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import * as XLSX from 'xlsx';
import { printReportPdf } from "@/lib/print-pdf";
import { ReportSummaryCards, SummaryCardProps } from "./ReportSummaryCards";
import { MapPin, Activity, Wallet, TrendingUp } from "lucide-react";

export function ReportByRouteTable() {
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

    const { data: reportData, isLoading, refetch } = useRouteReport(filters);

    const summaryCards: SummaryCardProps[] = useMemo(() => {
        const data = reportData || [];
        const totalTrips = data.reduce((s, r) => s + r.trip_count, 0);
        const totalRevenue = data.reduce((s, r) => s + r.total_revenue, 0);
        const totalProfit = data.reduce((s, r) => s + r.profit, 0);
        return [
            { title: "Tổng tuyến", value: data.length, icon: MapPin, color: "text-blue-600", bgColor: "bg-blue-50" },
            { title: "Tổng chuyến", value: totalTrips, icon: Activity, color: "text-purple-600", bgColor: "bg-purple-50" },
            { title: "Tổng doanh thu", value: totalRevenue, icon: Wallet, isCurrency: true, color: "text-green-600", bgColor: "bg-green-50" },
            { title: "Lợi nhuận", value: totalProfit, icon: TrendingUp, isCurrency: true, color: totalProfit >= 0 ? "text-emerald-600" : "text-red-600", bgColor: totalProfit >= 0 ? "bg-emerald-50" : "bg-red-50" },
        ];
    }, [reportData]);

    // Column definitions
    const [columns, setColumns] = useState<ColumnDef<RouteReportRow>[]>([
        {
            id: "route_code",
            label: "Mã tuyến",
            width: "120px",
            render: (row) => <span className="font-medium text-primary">{row.route_code}</span>,
            pinned: true,
            visible: true,
            sortable: true,
            sortKey: "route_code"
        },
        {
            id: "route_name",
            label: "Tên tuyến",
            width: "250px",
            render: (row) => <span className="font-medium">{row.route_name}</span>,
            pinned: true,
            visible: true,
            sortable: true,
            sortKey: "route_name"
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
            id: "total_expense",
            label: "Chi phí",
            align: "right",
            width: "150px",
            render: (row) => <span className="text-red-600">{formatCurrency(row.total_expense)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_expense, 0)),
            visible: true,
            sortable: true,
            sortKey: "total_expense"
        },
        {
            id: "profit",
            label: "Lợi nhuận",
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
        {
            id: "profit_margin_pct",
            label: "Biên LN %",
            align: "right",
            width: "100px",
            render: (row) => (
                <span className={row.profit_margin_pct >= 20 ? "text-green-700 font-bold" : row.profit_margin_pct < 10 ? "text-red-600" : ""}>
                    {formatPercent(row.profit_margin_pct / 100)}
                </span>
            ),
            visible: true,
            sortable: true,
            sortKey: "profit_margin_pct"
        }
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
                title: 'Báo Cáo Theo Tuyến Đường',
                columns: [
                    { header: 'Mã tuyến', key: 'route_code' },
                    { header: 'Tên tuyến', key: 'route_name' },
                    { header: 'Số chuyến', key: 'trip_count', align: 'center' },
                    { header: 'Doanh thu', key: 'total_revenue', align: 'right', format: fmtVND },
                    { header: 'Chi phí', key: 'total_expense', align: 'right', format: fmtVND },
                    { header: 'Lợi nhuận', key: 'profit', align: 'right', format: fmtVND },
                    { header: 'Biên LN %', key: 'profit_margin_pct', align: 'right', format: (v: number) => (v / 100 * 100).toFixed(1) + '%' },
                ],
                data: reportData,
                footer: {
                    route_code: 'TỔNG',
                    trip_count: String(reportData.reduce((s, r) => s + r.trip_count, 0)),
                    total_revenue: fmtVND(reportData.reduce((s, r) => s + r.total_revenue, 0)),
                    total_expense: fmtVND(reportData.reduce((s, r) => s + r.total_expense, 0)),
                    profit: fmtVND(reportData.reduce((s, r) => s + r.profit, 0)),
                },
            });
            return;
        }

        // Map data to export format (Vietnamese headers)
        const exportData = reportData.map(row => ({
            "Mã tuyến": row.route_code,
            "Tên tuyến": row.route_name,
            "Số chuyến": row.trip_count,
            "Doanh thu": row.total_revenue,
            "Chi phí": row.total_expense,
            "Lợi nhuận": row.profit,
            "Biên LN (%)": (row.profit_margin_pct / 100).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTuyen");

        if (type === 'csv') {
            XLSX.writeFile(wb, `BaoCao_Tuyen_${format(new Date(), 'ddMMyyyy')}.csv`);
        } else {
            XLSX.writeFile(wb, `BaoCao_Tuyen_${format(new Date(), 'ddMMyyyy')}.xlsx`);
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
