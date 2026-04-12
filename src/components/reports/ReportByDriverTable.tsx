import { useState, useMemo, useEffect } from "react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { ExcelDataTable, ColumnDef } from "./ExcelDataTable";
import { ExcelFilterBar, FilterState } from "./ExcelFilterBar";
import { ColumnPicker } from "./ColumnPicker";
import { ExportButtons } from "./ExportButtons";
import { RowDetailDrawer } from "./RowDetailDrawer";
import { useDriverReport, DriverReportRow } from "@/hooks/useReportData";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { useTripsByDateRange } from "@/hooks/useTrips";
import { DrillDownTripTable } from "./DrillDownTripTable";
import { exportDriverReportToPDF } from "@/lib/pdf-export";
import { ReportSummaryCards, SummaryCardProps } from "./ReportSummaryCards";
import { Users, Truck, Wallet, Activity, Loader2 } from "lucide-react";
import { googleDriveService } from "@/services/googleDrive";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function ReportByDriverTable() {
  const { toast } = useToast();
  const { data: settings } = useCompanySettings();
  const [filters, setFilters] = useState<FilterState>({
    searchPromise: "",
    dateRange: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    status: [],
    vehicleIds: [],
    driverIds: []
  });

  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: reportCombined, isLoading, refetch } = useDriverReport(filters);
  const reportData = reportCombined?.data || [];
  const summary = reportCombined?.summary;

  useEffect(() => {
    // Sync UI state with gdrive_config
    if (settings?.gdrive_config?.isConnected) {
      setGoogleDriveConnected(true);
    } else {
      setGoogleDriveConnected(false);
    }
  }, [settings]);

  const summaryCards: SummaryCardProps[] = [
    {
      title: "Tổng số tài xế",
      value: reportData.length,
      icon: Users,
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
      value: reportData.filter(d => d.status === 'active').length,
      icon: Truck,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  const [selectedRow, setSelectedRow] = useState<DriverReportRow | null>(null);

  const { data: allTrips, isLoading: isLoadingTrips } = useTripsByDateRange(
    filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : '',
    filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : ''
  );

  const selectedTrips = useMemo(() => {
    if (!selectedRow || !allTrips) return [];
    return allTrips.filter(t => t.driver_id === selectedRow.driver_id);
  }, [selectedRow, allTrips]);

  const [columns, setColumns] = useState<ColumnDef<DriverReportRow>[]>([
    {
      id: "driver_code",
      label: "Mã NV",
      width: "100px",
      render: (row) => <span className="font-medium text-primary">{row.driver_code}</span>,
      pinned: true,
      visible: true
    },
    {
      id: "full_name",
      label: "Họ tên",
      width: "180px",
      render: (row) => <span className="font-bold">{row.full_name}</span>,
      pinned: true,
      visible: true
    },
    {
      id: "license_class",
      label: "Bằng lái",
      width: "80px",
      align: "center",
      render: (row) => <Badge variant="outline">{row.license_class}</Badge>,
      visible: true
    },
    {
      id: "status",
      label: "Trạng thái",
      width: "120px",
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'default' : 'secondary'}>
          {row.status === 'active' ? 'Đang làm' : row.status}
        </Badge>
      ),
      visible: true
    },
    {
      id: "trip_count",
      label: "Số chuyến",
      align: "center",
      width: "100px",
      render: (row) => formatNumber(row.trip_count),
      footer: (data) => formatNumber(data.reduce((sum, r) => sum + r.trip_count, 0)),
      visible: true
    },
    {
      id: "total_distance_km",
      label: "Tổng Km",
      align: "right",
      width: "120px",
      render: (row) => formatNumber(row.total_distance_km) + " km",
      footer: (data) => formatNumber(data.reduce((sum, r) => sum + r.total_distance_km, 0)),
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
      id: "revenue_per_trip",
      label: "DT/Chuyến (TB)",
      align: "right",
      width: "150px",
      render: (row) => formatCurrency(row.revenue_per_trip),
      footer: (data) => {
        const totalRev = data.reduce((sum, r) => sum + r.total_revenue, 0);
        const totalTrips = data.reduce((sum, r) => sum + r.trip_count, 0);
        return totalTrips ? formatCurrency(totalRev / totalTrips) : "0";
      },
      visible: true
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
      exportDriverReportToPDF(reportData);
      return;
    }

    const exportData = reportData.map(row => ({
      "Mã NV": row.driver_code,
      "Họ tên": row.full_name,
      "Bằng lái": row.license_class,
      "Trạng thái": row.status === 'active' ? 'Đang làm' : row.status,
      "Số chuyến": row.trip_count,
      "Tổng Km": row.total_distance_km,
      "Tổng Doanh thu": row.total_revenue,
      "DT/Chuyến": row.revenue_per_trip
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTaiXe");

    if (type === 'csv') {
      XLSX.writeFile(wb, `BaoCao_TaiXe_${format(new Date(), 'ddMMyyyy')}.csv`);
    } else {
      XLSX.writeFile(wb, `BaoCao_TaiXe_${format(new Date(), 'ddMMyyyy')}.xlsx`);
    }
  };

  const handleGoogleDriveSync = async () => {
    const config = settings?.gdrive_config;
    if (!config?.clientId || !config?.isConnected) {
      toast({
        title: "Chưa cấu hình Google Drive",
        description: "Vui lòng hoàn tất cài đặt Google Drive trong phần Cài đặt hệ thống.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Real Authentication Flow
      const authenticated = await googleDriveService.authenticate(config.clientId);
      if (!authenticated) {
        throw new Error("Người dùng từ chối cấp quyền hoặc lỗi xác thực.");
      }

      // 2. Prepare Data
      const reportDataToSync = {
        reportType: 'driver-report',
        generatedAt: new Date().toISOString(),
        tenantId: settings.id,
        filters: filters,
        data: reportData,
        summary: summary
      };

      // 3. Real Upload
      const result = await googleDriveService.syncFleetData(
        reportDataToSync, 
        settings.id || 'internal-tenant',
        config.folderId
      );

      if (result.success) {
        toast({
          title: "Đồng bộ thành công ✨",
          description: "Báo cáo đã được tải lên Google Drive của bạn.",
        });
      } else {
        throw new Error(result.error || 'Đồng bộ thất bại');
      }
    } catch (error: any) {
      console.error('Google Drive sync failed:', error);
      toast({
        title: "Lỗi đồng bộ",
        description: error.message || "Không thể đồng bộ với Google Drive.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLocalSave = () => {
    // Trigger the Excel export as local save
    handleExport('xlsx');
  };

  return (
    <div className="space-y-3">
      {summary && <ReportSummaryCards cards={summaryCards} />}

      {/* Filter Bar */}
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
            <ExportButtons
              onExport={handleExport}
              onGoogleDriveSync={handleGoogleDriveSync}
              onLocalSave={handleLocalSave}
              googleDriveConnected={googleDriveConnected}
              isSyncing={isSyncing}
            />
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
        title={`Tài xế: ${selectedRow?.full_name} (${selectedRow?.driver_code})`}
        description="Hiệu suất hoạt động trong kỳ"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="text-xs text-muted-foreground">Tổng doanh thu mang lại</div>
              <div className="text-lg font-bold text-green-700">{formatCurrency(selectedRow?.total_revenue || 0)}</div>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="text-xs text-muted-foreground">Tổng số chuyến</div>
              <div className="text-lg font-bold text-blue-700">{selectedRow?.trip_count}</div>
            </div>
          </div>
          <div className="bg-muted/30 p-2 rounded-lg">
            <div className="text-sm font-semibold mb-2 px-2">Danh sách chuyến trong kỳ:</div>
            <DrillDownTripTable trips={selectedTrips} isLoading={isLoadingTrips} />
          </div>
        </div>
      </RowDetailDrawer>
    </div>
  );
}
