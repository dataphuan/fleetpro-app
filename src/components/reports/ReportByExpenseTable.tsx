import { useState, useMemo } from "react";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { useExpenseCategoryReport, ExpenseReportRow } from "@/hooks/useReportData";
import { startOfYear, endOfYear, format } from "date-fns";
import * as XLSX from 'xlsx';
import { printReportPdf } from "@/lib/print-pdf";
import { ReportSummaryCards, SummaryCardProps } from "./ReportSummaryCards";
import { List, Wallet, TrendingDown, BarChart3 } from "lucide-react";

export function ReportByExpenseTable() {
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

    const { data: reportData, isLoading, refetch } = useExpenseCategoryReport(filters);

    const summaryCards: SummaryCardProps[] = useMemo(() => {
        const data = reportData || [];
        const totalAmount = data.reduce((s, r) => s + r.total_amount, 0);
        const topCategory = data.length > 0 ? data[0]?.category : '—';
        const avgPct = data.length > 0 ? (100 / data.length) : 0;
        return [
            { title: "Số mục chi", value: data.length, icon: List, color: "text-blue-600", bgColor: "bg-blue-50" },
            { title: "Tổng chi phí", value: totalAmount, icon: Wallet, isCurrency: true, color: "text-red-600", bgColor: "bg-red-50" },
            { title: "Mục lớn nhất", value: topCategory, icon: TrendingDown, color: "text-orange-600", bgColor: "bg-orange-50" },
            { title: "Tỷ trọng TB", value: `${avgPct.toFixed(1)}%`, icon: BarChart3, color: "text-purple-600", bgColor: "bg-purple-50" },
        ];
    }, [reportData]);

    // Column definitions
    const [columns, setColumns] = useState<ColumnDef<ExpenseReportRow>[]>([
        {
            id: "category",
            label: "Thẻ loại / Mục chi",
            width: "250px",
            render: (row) => <span className="font-medium text-primary">{row.category}</span>,
            pinned: true,
            visible: true,
            sortable: true,
            sortKey: "category"
        },
        {
            id: "total_amount",
            label: "Tổng Chi phí",
            align: "right",
            width: "200px",
            render: (row) => <span className="font-bold text-red-600">{formatCurrency(row.total_amount)}</span>,
            footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_amount, 0)),
            visible: true,
            sortable: true,
            sortKey: "total_amount"
        },
        {
            id: "percentage",
            label: "Tỷ trọng (%)",
            align: "right",
            width: "150px",
            render: (row) => formatPercent(row.percentage / 100),
            visible: true,
            sortable: true,
            sortKey: "percentage"
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
                title: 'Báo Cáo Chi Phí Theo Danh Mục',
                columns: [
                    { header: 'Thẻ loại / Mục chi', key: 'category' },
                    { header: 'Tổng Chi phí', key: 'total_amount', align: 'right', format: fmtVND },
                    { header: 'Tỷ trọng (%)', key: 'percentage', align: 'right', format: (v: number) => v.toFixed(2) + '%' },
                ],
                data: reportData,
                footer: {
                    category: 'TỔNG',
                    total_amount: fmtVND(reportData.reduce((s, r) => s + r.total_amount, 0)),
                    percentage: '100%',
                },
            });
            return;
        }

        // Map data to export format (Vietnamese headers)
        const exportData = reportData.map(row => ({
            "Thẻ loại": row.category,
            "Tổng Chi phí": row.total_amount,
            "Tỷ trọng (%)": (row.percentage).toFixed(2)
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "BaoCaoChiPhi");

        if (type === 'csv') {
            XLSX.writeFile(wb, `BaoCao_ChiPhi_${format(new Date(), 'ddMMyyyy')}.csv`);
        } else {
            XLSX.writeFile(wb, `BaoCao_ChiPhi_${format(new Date(), 'ddMMyyyy')}.xlsx`);
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
