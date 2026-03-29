import { useState, useMemo } from "react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { RowDetailDrawer } from "./RowDetailDrawer";
import { useFleetReport, FleetReportRow } from "@/hooks/useReportData";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTripsByDateRange } from "@/hooks/useTrips";
import { DrillDownTripTable } from "./DrillDownTripTable";
import { exportFleetReportToPDF } from "@/lib/pdf-export";

export function ReportByFleetTable() {
  const [filters, setFilters] = useState<FilterState>({
    searchPromise: "",
    dateRange: { from: startOfYear(new Date()), to: endOfYear(new Date()) },
    status: [],
    vehicleIds: [],
    driverIds: []
  });

  const [groupBy, setGroupBy] = useState<'vehicle_type' | 'status'>('vehicle_type');
  const { data: reportData, isLoading } = useFleetReport(filters, groupBy);
  const [selectedRow, setSelectedRow] = useState<FleetReportRow | null>(null);

  const { data: allTrips, isLoading: isLoadingTrips } = useTripsByDateRange(
    filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : '',
    filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : ''
  );

  const selectedTrips = useMemo(() => {
    if (!selectedRow || !allTrips) return [];

    return allTrips.filter(t => {
      // Safety check for vehicle relation
      const vehicle = t.vehicle as any;
      if (!vehicle) return false;

      if (groupBy === 'vehicle_type') {
        return vehicle.vehicle_type === selectedRow.group_name;
      } else {
        // Map status to display name if needed? 
        // ReportByFleet logic likely groups by raw status or localized?
        // Let's assume raw status matches group_name for now or check useFleetReport.
        // Actually commonly report uses localized names.
        // If selectedRow.group_name is "Hoạt động" (Active), we need to match 'active'.
        // This is tricky. Let's do a simple check.
        const statusMap: Record<string, string> = {
          'active': 'Hoạt động',
          'maintenance': 'Bảo trì',
          'inactive': 'Ngưng hoạt động'
        };
        const statusDisplay = statusMap[vehicle.status] || vehicle.status;
        return statusDisplay === selectedRow.group_name || vehicle.status === selectedRow.group_name;
      }
    });
  }, [selectedRow, allTrips, groupBy]);

  const [columns, setColumns] = useState<ColumnDef<FleetReportRow>[]>([
    {
      id: "group_name",
      label: "Nhóm",
      width: "200px",
      render: (row) => <span className="font-bold">{row.group_name}</span>,
      pinned: true,
      visible: true
    },
    {
      id: "items_count",
      label: "Số lượng xe",
      align: "center",
      width: "120px",
      render: (row) => formatNumber(row.items_count),
      footer: (data) => formatNumber(data.reduce((sum, r) => sum + r.items_count, 0)),
      visible: true
    },
    {
      id: "trip_count",
      label: "Tổng chuyến",
      align: "center",
      width: "120px",
      render: (row) => formatNumber(row.trip_count),
      footer: (data) => formatNumber(data.reduce((sum, r) => sum + r.trip_count, 0)),
      visible: true
    },
    {
      id: "total_revenue",
      label: "Tổng doanh thu",
      align: "right",
      width: "150px",
      render: (row) => <span className="font-medium text-green-600">{formatCurrency(row.total_revenue)}</span>,
      footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_revenue, 0)),
      visible: true
    },
    {
      id: "total_expense",
      label: "Tổng chi phí",
      align: "right",
      width: "150px",
      render: (row) => <span className="text-red-600">{formatCurrency(row.total_expense)}</span>,
      footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_expense, 0)),
      visible: true
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
      visible: true
    },
    {
      id: "profit_margin_pct",
      label: "Biên LN %",
      align: "right",
      width: "100px",
      render: (row) => formatPercent(row.profit_margin_pct / 100),
      footer: (data) => {
        const totalRev = data.reduce((sum, r) => sum + r.total_revenue, 0);
        const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);
        return totalRev ? formatPercent(totalProfit / totalRev) : "0%";
      },
      visible: true
    }
  ]);

  const toggleColumn = (id: string, visible: boolean) => {
    setColumns(prev => prev.map(col => col.id === id ? { ...col, visible } : col));
  };

  const handleExport = (type: 'csv' | 'xlsx' | 'pdf') => {
    if (!reportData || reportData.length === 0) {
      alert("Không có dữ liệu để xuất");
      return;
    }

    if (type === 'pdf') {
      exportFleetReportToPDF(reportData, groupBy);
      return;
    }

    const exportData = reportData.map(row => ({
      "Nhóm": row.group_name,
      "Số lượng xe": row.items_count,
      "Tổng chuyến": row.trip_count,
      "Doanh thu": row.total_revenue,
      "Chi phí": row.total_expense,
      "Lợi nhuận": row.profit,
      "Biên LN (%)": (row.profit_margin_pct / 100).toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoDoiXe");

    if (type === 'csv') {
      XLSX.writeFile(wb, `BaoCao_DoiXe_${groupBy}_${format(new Date(), 'ddMMyyyy')}.csv`);
    } else {
      XLSX.writeFile(wb, `BaoCao_DoiXe_${groupBy}_${format(new Date(), 'ddMMyyyy')}.xlsx`);
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Bar + Group By Selector in one line */}
      <div className="flex items-center gap-2 flex-wrap">
        <ExcelFilterBar
          filters={filters}
          onFilterChange={setFilters}
        >
          <div className="flex items-center gap-2 ml-2">
            <Label className="whitespace-nowrap text-sm text-muted-foreground">Nhóm theo:</Label>
            <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
              <SelectTrigger className="w-[150px] h-9 border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle_type">Loại xe</SelectItem>
                <SelectItem value="status">Trạng thái xe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 border-l pl-2 ml-2">
            <ColumnPicker
              columns={columns.map(c => ({ id: c.id, label: c.label, visible: c.visible !== false }))}
              onToggleColumn={toggleColumn}
            />
            <ExportButtons onExport={handleExport} />
          </div>
        </ExcelFilterBar>
      </div>

      {/* Main Table */}
      <div className="border rounded-md bg-card">
        {isLoading ? (
          <div className="flex h-[600px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ExcelDataTable
            data={reportData || []}
            columns={columns}
            onRowClick={setSelectedRow}
            enablePagination={true}
            enableSorting={true}
            pageSize={20}
            className="h-[600px]"
          />
        )}
      </div>

      <RowDetailDrawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title={`Chi tiết nhóm: ${selectedRow?.group_name}`}
        description={`Tổng hợp số liệu của ${selectedRow?.items_count} xe trong nhóm`}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="text-xs text-muted-foreground">Tổng doanh thu</div>
              <div className="text-lg font-bold text-green-700">{formatCurrency(selectedRow?.total_revenue || 0)}</div>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
              <div className="text-xs text-muted-foreground">Tổng chi phí</div>
              <div className="text-lg font-bold text-red-700">{formatCurrency(selectedRow?.total_expense || 0)}</div>
            </div>
          </div>
          <div className="bg-muted/30 p-2 rounded-lg">
            <div className="text-sm font-semibold mb-2 px-2">Danh sách chuyến trong nhóm:</div>
            <DrillDownTripTable trips={selectedTrips} isLoading={isLoadingTrips} />
          </div>
        </div>
      </RowDetailDrawer>
    </div>
  );
}
