import { useState, useMemo } from "react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { RowDetailDrawer } from "./RowDetailDrawer";
import { useVehicleReport, VehicleReportRow } from "@/hooks/useReportData";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import * as XLSX from 'xlsx';
import { useTripsByDateRange } from "@/hooks/useTrips";
import { DrillDownTripTable } from "./DrillDownTripTable";
import { exportVehicleReportToPDF } from "@/lib/pdf-export";
import { useCustomers } from "@/hooks/useCustomers";
import { ReportSummaryCards, SummaryCardProps } from "./ReportSummaryCards";
import { Truck, Activity, Wallet, TrendingUp } from "lucide-react";

// Revenue range filter helper
const parseRevenueRange = (range: string | undefined): { min: number; max: number } | null => {
  if (!range) return null;
  switch (range) {
    case "0-10m": return { min: 0, max: 10_000_000 };
    case "10-30m": return { min: 10_000_000, max: 30_000_000 };
    case "30-50m": return { min: 30_000_000, max: 50_000_000 };
    case "50m+": return { min: 50_000_000, max: Infinity };
    default: return null;
  }
};

export function ReportByVehicleTable() {
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

  const { data: reportCombined, isLoading, refetch } = useVehicleReport(filters);
  const reportData = reportCombined?.data || [];
  const summary = reportCombined?.summary;

  const summaryCards: SummaryCardProps[] = [
    {
      title: "Tổng số xe",
      value: reportData.length,
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Tổng chuyến chạy",
      value: summary?.totalTrips || 0,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Tổng doanh thu",
      value: summary?.totalRevenue || 0,
      icon: Wallet,
      isCurrency: true,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Đang hoạt động",
      value: reportData.filter(v => v.status === 'active').length,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  const [selectedRow, setSelectedRow] = useState<VehicleReportRow | null>(null);

  // Fetch all trips for drill down
  const { data: allTrips, isLoading: isLoadingTrips } = useTripsByDateRange(
    filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : '',
    filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : ''
  );

  const selectedTrips = useMemo(() => {
    if (!selectedRow || !allTrips) return [];
    return allTrips.filter(t => t.vehicle_id === selectedRow.vehicle_id);
  }, [selectedRow, allTrips]);

  // Fetch customers for filter dropdown
  const { data: customersData } = useCustomers();
  const customers = useMemo(() => {
    if (!customersData) return [];
    return customersData.map(c => ({ id: c.id, name: c.short_name || c.company_name }));
  }, [customersData]);

  // Extract unique vehicle types for filter dropdown
  const vehicleTypes = useMemo(() => {
    if (!reportData) return [];
    const types = new Set(reportData.map(r => r.vehicle_type).filter(Boolean));
    return Array.from(types) as string[];
  }, [reportData]);

  // Column definitions
  const [columns, setColumns] = useState<ColumnDef<VehicleReportRow>[]>([
    {
      id: "vehicle_code",
      label: "Mã xe",
      width: "100px",
      render: (row) => <span className="font-medium text-primary">{row.vehicle_code}</span>,
      pinned: true,
      visible: true,
      sortable: true,
      sortKey: "vehicle_code" as keyof VehicleReportRow,
    },
    {
      id: "license_plate",
      label: "Biển số",
      width: "120px",
      render: (row) => <span className="font-bold">{row.license_plate}</span>,
      pinned: true,
      visible: true,
      sortable: true,
      sortKey: "license_plate" as keyof VehicleReportRow,
    },
    {
      id: "status",
      label: "Trạng thái",
      width: "120px",
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
          {row.status === 'active' ? 'Hoạt động' : row.status}
        </Badge>
      ),
      visible: true,
      sortable: true,
      sortKey: "status" as keyof VehicleReportRow,
    },
    {
      id: "vehicle_type",
      label: "Loại xe",
      width: "150px",
      render: (row) => row.vehicle_type,
      visible: true,
      sortable: true,
      sortKey: "vehicle_type" as keyof VehicleReportRow,
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
      sortKey: "trip_count" as keyof VehicleReportRow,
    },
    {
      id: "total_distance_km",
      label: "Tổng Km",
      align: "right",
      width: "120px",
      render: (row) => formatNumber(row.total_distance_km) + " km",
      footer: (data) => formatNumber(data.reduce((sum, r) => sum + r.total_distance_km, 0)),
      visible: true,
      sortable: true,
      sortKey: "total_distance_km" as keyof VehicleReportRow,
    },
    {
      id: "total_revenue",
      label: "Doanh thu",
      align: "right",
      width: "150px",
      render: (row) => <span className="font-medium text-green-600">{formatCurrency(row.total_revenue)}</span>,
      sortable: true,
      sortKey: "total_revenue" as keyof VehicleReportRow,
      visible: true,
      footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_revenue, 0))
    },
    {
      id: "total_expense",
      label: "Chi phí",
      align: "right",
      width: "150px",
      render: (row) => <span className="font-medium text-red-600">{formatCurrency(row.total_expense)}</span>,
      sortable: true,
      sortKey: "total_expense" as keyof VehicleReportRow,
      visible: true,
      footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.total_expense, 0))
    },
    {
      id: "profit",
      label: "Lợi nhuận",
      align: "right",
      width: "150px",
      render: (row) => <span className={`font-bold ${row.profit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>{formatCurrency(row.profit)}</span>,
      sortable: true,
      sortKey: "profit" as keyof VehicleReportRow,
      visible: true,
      footer: (data) => formatCurrency(data.reduce((sum, r) => sum + r.profit, 0))
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
      exportVehicleReportToPDF(reportData);
      return;
    }

    const exportData = reportData.map(row => ({
      "Mã xe": row.vehicle_code,
      "Biển số": row.license_plate,
      "Loại xe": row.vehicle_type,
      "Trạng thái": row.status === 'active' ? 'Hoạt động' : row.status,
      "Số chuyến": row.trip_count,
      "Doanh thu": row.total_revenue,
      "Chi phí": row.total_expense,
      "Lợi nhuận": row.profit
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoXe");

    if (type === 'csv') {
      XLSX.writeFile(wb, `BaoCao_Xe_${format(new Date(), 'ddMMyyyy')}.csv`);
    } else {
      XLSX.writeFile(wb, `BaoCao_Xe_${format(new Date(), 'ddMMyyyy')}.xlsx`);
    }
  };

  return (
    <div className="space-y-4">
      {summary && <ReportSummaryCards cards={summaryCards} />}

      {/* Filter Bar + Actions Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filters */}
        <ExcelFilterBar
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={refetch}
          vehicleTypes={vehicleTypes}
          customers={customers}
          showVehicleTypeFilter={true}
          showRevenueFilter={true}
          showCustomerFilter={true}
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

      {/* Main Table with Pagination & Sorting */}
      <div className="border rounded-md bg-card">
        {isLoading ? (
          <div className="flex h-[600px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ExcelDataTable
            data={reportData}
            columns={columns}
            onRowClick={setSelectedRow}
            enablePagination={true}
            enableSorting={true}
            pageSize={20}
            className="h-[600px]"
          />
        )}
      </div>

      {/* Drill Down Drawer */}
      <RowDetailDrawer
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title={`Chi tiết xe ${selectedRow?.vehicle_code} - ${selectedRow?.license_plate}`}
        description="Danh sách chuyến và chi phí liên quan trong kỳ báo cáo"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="text-xs text-muted-foreground">Doanh thu</div>
              <div className="text-lg font-bold text-green-700">{formatCurrency(selectedRow?.total_revenue || 0)}</div>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
              <div className="text-xs text-muted-foreground">Chi phí</div>
              <div className="text-lg font-bold text-red-700">{formatCurrency(selectedRow?.total_expense || 0)}</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-xs text-muted-foreground">Lợi nhuận</div>
              <div className="text-lg font-bold text-blue-700">{formatCurrency(selectedRow?.profit || 0)}</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="text-xs text-muted-foreground">Số chuyến</div>
              <div className="text-lg font-bold">{selectedRow?.trip_count}</div>
            </div>
          </div>

          <div className="bg-muted/30 p-2 rounded-lg">
            <div className="text-sm font-semibold mb-2 px-2">Danh sách chuyến trong kỳ:</div>
            <DrillDownTripTable
              trips={selectedTrips}
              isLoading={isLoadingTrips}
              onCloseDrawer={() => setSelectedRow(null)}
            />
          </div>
        </div>
      </RowDetailDrawer>
    </div>
  );
}
