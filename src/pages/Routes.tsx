import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ColumnChooser } from "@/components/vehicles/ColumnChooser";
import { RouteFilter } from "@/components/routes/RouteFilter";
import { ExcelImportDialog, ImportColumn } from "@/components/shared/ExcelImportDialog";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Route as RouteIcon, MapPin, Clock, Loader2, Trash2, RefreshCw, Search, Plus, Upload, Download } from "lucide-react";
import { useRoutes, useCreateRoute, useUpdateRoute, useDeleteRoute } from "@/hooks/useRoutes";
import { usePermissions } from "@/hooks/usePermissions";
// Type definitions
interface Route {
  id: string;
  route_code: string;
  route_name: string;
  origin: string;
  destination: string;
  distance_km?: number | null;
  estimated_duration_hours?: number | null;
  cargo_type?: string | null;
  cargo_weight_standard?: number | null;
  base_price?: number | null;
  transport_revenue_standard?: number | null;
  driver_allowance_standard?: number | null;
  support_fee_standard?: number | null;
  police_fee_standard?: number | null;
  fuel_liters_standard?: number | null;
  fuel_cost_standard?: number | null;
  tire_service_fee_standard?: number | null;
  toll_cost?: number | null;
  default_extra_fee?: number | null;
  total_cost_standard?: number | null;
  profit_standard?: number | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string;
}
import { useQueryClient } from "@tanstack/react-query";
import { useBulkDelete } from "@/hooks/useBulkDelete";
import { BulkDeleteDialog } from "@/components/shared/BulkDeleteDialog";
import { BulkDeleteToolbar } from "@/components/shared/BulkDeleteToolbar";
import { getNextCodeByPrefix } from "@/lib/code-generator";
import { routeAdapter } from "@/lib/data-adapter";

// Type definitions
type RouteData = Route;

// Form Schema Validation
const routeSchema = z.object({
  route_code: z.string().refine(val => /^TD\d{4}$/.test(val), "Mã tuyến sai định dạng (Bắt buộc TD + 4 số, VD: TD0001)"),
  route_name: z.string().min(1, "Tên tuyến là bắt buộc"),
  origin: z.string().min(1, "Điểm đi là bắt buộc"),
  destination: z.string().min(1, "Điểm đến là bắt buộc"),
  distance_km: z.coerce.number().min(0.1, "Khoảng cách phải > 0"),
  estimated_duration_hours: z.coerce.number().min(0),
  cargo_type: z.string().optional(),
  cargo_weight_standard: z.coerce.number().min(0),
  base_price: z.coerce.number().min(0),
  transport_revenue_standard: z.coerce.number().min(0),
  driver_allowance_standard: z.coerce.number().min(0),
  support_fee_standard: z.coerce.number().min(0),
  police_fee_standard: z.coerce.number().min(0),
  fuel_liters_standard: z.coerce.number().min(0),
  fuel_cost_standard: z.coerce.number().min(0),
  tire_service_fee_standard: z.coerce.number().min(0),
  toll_cost: z.coerce.number().min(0),
  default_extra_fee: z.coerce.number().min(0),
  total_cost_standard: z.coerce.number().min(0),
  profit_standard: z.coerce.number().min(0),
  notes: z.string().optional(),
  status: z.string().optional(),
});

type RouteFormValues = z.infer<typeof routeSchema>;

export default function Routes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canDelete, canExport } = usePermissions('routes');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Import Columns Config
  const importColumns: ImportColumn[] = [
    { key: 'route_code', header: 'Mã tuyến', required: true },
    { key: 'route_name', header: 'Tên tuyến', required: true },
    { key: 'origin', header: 'Điểm đi', required: true },
    { key: 'destination', header: 'Điểm đến', required: true },
    { key: 'distance_km', header: 'Khoảng cách', type: 'number' },
    { key: 'estimated_duration_hours', header: 'Thời gian (h)', type: 'number' },
    { key: 'cargo_type', header: 'Loại hàng' },
    { key: 'cargo_weight_standard', header: 'Số tấn chuẩn', type: 'number' },
    { key: 'base_price', header: 'Đơn giá', type: 'number' },
    { key: 'transport_revenue_standard', header: 'Doanh thu VC', type: 'number' }, // Nếu có
    { key: 'driver_allowance_standard', header: 'Lương tài xế', type: 'number' },
    { key: 'support_fee_standard', header: 'Bồi dưỡng', type: 'number' },
    { key: 'police_fee_standard', header: 'Công an', type: 'number' },
    { key: 'fuel_liters_standard', header: 'Định mức dầu', type: 'number' },
    { key: 'fuel_cost_standard', header: 'Tiền dầu', type: 'number' },
    { key: 'tire_service_fee_standard', header: 'Bơm vá', type: 'number' },
    { key: 'toll_cost', header: 'Cầu đường', type: 'number' },
    { key: 'default_extra_fee', header: 'Phí khác', type: 'number' },
    { key: 'status', header: 'Trạng thái' },
    { key: 'notes', header: 'Ghi chú' },
  ];

  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Hooks
  const { data: routes, isLoading } = useRoutes();
  const createMutation = useCreateRoute();
  const updateMutation = useUpdateRoute();
  const deleteMutation = useDeleteRoute();

  // Bulk Delete Hook
  const { deleteIds: deleteRoutes, isDeleting: isBulkDeleting } = useBulkDelete({
    table: 'routes',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      setSelectedRowIds(new Set());
      setBulkDeleteDialogOpen(false);
    }
  });



  // ... (Column visibility State)
  const allColumnKeys = [
    'route_code', 'route_name', 'origin', 'destination', 'distance_km',
    'estimated_duration_hours', 'cargo_type', 'cargo_weight_standard', 'base_price', 'transport_revenue_standard',
    'driver_allowance_standard', 'support_fee_standard', 'police_fee_standard', 'fuel_liters_standard',
    'fuel_cost_standard', 'tire_service_fee_standard', 'toll_cost', 'default_extra_fee',
    'total_cost_standard', 'profit_standard', 'status', 'notes', 'id'
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys);

  // Excel-style filters state
  const [activeFilters, setActiveFilters] = useState<Record<string, string[] | { min: number; max: number }>>({});

  // ... (Form setup)
  const form = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      route_code: "",
      route_name: "",
      origin: "",
      destination: "",
      distance_km: 0,
      estimated_duration_hours: 0,
      cargo_type: "",
      cargo_weight_standard: 0,
      base_price: 0,
      transport_revenue_standard: 0,
      driver_allowance_standard: 0,
      support_fee_standard: 0,
      police_fee_standard: 0,
      fuel_liters_standard: 0,
      fuel_cost_standard: 0,
      tire_service_fee_standard: 0,
      toll_cost: 0,
      default_extra_fee: 0,
      total_cost_standard: 0,
      profit_standard: 0,
      notes: "",
      status: "active",
    },
  });

  // ... (Calculations)
  const calculateFinancials = () => {
    // ...
    const values = form.getValues();
    const revenue = Number(values.cargo_weight_standard || 0) * Number(values.base_price || 0);
    const totalCost =
      Number(values.driver_allowance_standard || 0) +
      Number(values.support_fee_standard || 0) +
      Number(values.police_fee_standard || 0) +
      Number(values.fuel_cost_standard || 0) +
      Number(values.tire_service_fee_standard || 0) +
      Number(values.toll_cost || 0) +
      Number(values.default_extra_fee || 0);
    const profit = revenue - totalCost;

    form.setValue('transport_revenue_standard', revenue);
    form.setValue('total_cost_standard', totalCost);
    form.setValue('profit_standard', profit);
  };

  // Handlers
  const handleBulkDelete = () => {
    if (selectedRowIds.size > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    deleteRoutes(Array.from(selectedRowIds));
  };

  const handleSelectAll = () => {
    const allIds = filteredRoutes.map(r => r.id);
    setSelectedRowIds(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const handleAdd = async () => {
    setSelectedRoute(null);
    let nextCode = 'TD0001';
    try {
      const res = await routeAdapter.getNextCode();
      if (res) nextCode = res;
    } catch (err) {
      console.error("Failed to fetch next route code", err);
      nextCode = getNextCodeByPrefix(
        (routes || []).map(r => r.route_code),
        'TD',
        4
      );
    }

    form.reset({
      route_code: nextCode,
      route_name: "",
      origin: "",
      destination: "",
      distance_km: 0,
      estimated_duration_hours: 0,
      cargo_type: "",
      cargo_weight_standard: 0,
      base_price: 0,
      transport_revenue_standard: 0,
      driver_allowance_standard: 0,
      support_fee_standard: 0,
      police_fee_standard: 0,
      fuel_liters_standard: 0,
      fuel_cost_standard: 0,
      tire_service_fee_standard: 0,
      toll_cost: 0,
      default_extra_fee: 0,
      total_cost_standard: 0,
      profit_standard: 0,
      notes: "",
      status: "active",
    });
    setDialogOpen(true);
  };



  // ... (handleRowClick etc)


  const handleRowClick = (route: RouteData) => {
    setSelectedRoute(route);
    form.reset({
      route_code: route.route_code,
      route_name: route.route_name,
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km || 0,
      estimated_duration_hours: route.estimated_duration_hours || 0,
      cargo_type: route.cargo_type || "",
      cargo_weight_standard: route.cargo_weight_standard || 0,
      base_price: route.base_price || 0,
      transport_revenue_standard: route.transport_revenue_standard || 0,
      driver_allowance_standard: route.driver_allowance_standard || 0,
      support_fee_standard: route.support_fee_standard || 0,
      police_fee_standard: route.police_fee_standard || 0,
      fuel_liters_standard: route.fuel_liters_standard || 0,
      fuel_cost_standard: route.fuel_cost_standard || 0,
      tire_service_fee_standard: route.tire_service_fee_standard || 0,
      toll_cost: route.toll_cost || 0,
      default_extra_fee: route.default_extra_fee || 0,
      total_cost_standard: route.total_cost_standard || 0,
      profit_standard: route.profit_standard || 0,
      notes: route.notes || "",
      status: route.status || "active",
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, route: RouteData) => {
    e.stopPropagation();
    setSelectedRoute(route);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedRoute) return;

    try {
      await deleteMutation.mutateAsync(selectedRoute.id);
      setDeleteDialogOpen(false);
      setSelectedRoute(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const onSubmit = async (data: RouteFormValues) => {
    try {
      if (selectedRoute) {
        await updateMutation.mutateAsync({
          id: selectedRoute.id,
          updates: data,
        });
      } else {
        await createMutation.mutateAsync(data);
      }
      setDialogOpen(false);
      toast({ title: "Thành công", description: selectedRoute ? "Đã cập nhật thông tin tuyến" : "Đã thêm tuyến mới" });
    } catch (error: any) {
      console.error("Route submit error:", error);
      toast({
        title: "Lỗi lưu dữ liệu",
        description: error.message || "Có lỗi xảy ra khi lưu thông tin tuyến",
        variant: "destructive"
      });
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['routes'] });
      toast({ title: "Đồng bộ thành công", description: "Dữ liệu tuyến đã cập nhật" });
    } catch (error) {
      toast({ title: "Lỗi đồng bộ", description: "Không thể cập nhật dữ liệu", variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    import('@/lib/export').then(({ exportToCSV }) => {
      exportToCSV(routes || [], 'Danh_sach_tuyen_van_chuyen', [
        { key: 'route_code', header: 'Mã tuyến' },
        { key: 'route_name', header: 'Tên tuyến' },
        { key: 'origin', header: 'Điểm đi' },
        { key: 'destination', header: 'Điểm đến' },
        { key: 'distance_km', header: 'Khoảng cách (km)' },
        { key: 'estimated_duration_hours', header: 'Thời gian (giờ)' },
        { key: 'cargo_type', header: 'Loại hàng' },
        { key: 'cargo_weight_standard', header: 'Số tấn' },
        { key: 'base_price', header: 'Đơn giá' },
        { key: 'transport_revenue_standard', header: 'Doanh thu VC' },
        { key: 'driver_allowance_standard', header: 'Tiền Tài Xế' },
        { key: 'support_fee_standard', header: 'Bồi Dưỡng' },
        { key: 'police_fee_standard', header: 'Công An' },
        { key: 'fuel_liters_standard', header: 'Số lít dầu' },
        { key: 'fuel_cost_standard', header: 'Tiền Dầu' },
        { key: 'tire_service_fee_standard', header: 'Bơm/Vá' },
        { key: 'toll_cost', header: 'Cầu đường' },
        { key: 'default_extra_fee', header: 'Phí khác' },
        { key: 'total_cost_standard', header: 'Tổng Chi' },
        { key: 'profit_standard', header: 'Lợi Nhuận' },
        { key: 'status', header: 'Trạng thái' },
        { key: 'notes', header: 'Ghi chú' },
      ]);
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleImport = () => {
    setImportDialogOpen(true);
  };

  const handleImportData = async (rows: any[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        await createMutation.mutateAsync({
          ...row,
          route_code: String(row.route_code || `TD0000`),
          route_name: String(row.route_name || 'Tuyến mới'),
          origin: String(row.origin || ''),
          destination: String(row.destination || ''),
          distance_km: row.distance_km ? Number(row.distance_km) : 0,
          estimated_duration_hours: row.estimated_duration_hours ? Number(row.estimated_duration_hours) : 0,
          cargo_weight_standard: row.cargo_weight_standard ? Number(row.cargo_weight_standard) : 0,
          base_price: row.base_price ? Number(row.base_price) : 0,
          transport_revenue_standard: row.transport_revenue_standard ? Number(row.transport_revenue_standard) : 0,
          driver_allowance_standard: row.driver_allowance_standard ? Number(row.driver_allowance_standard) : 0,
          support_fee_standard: row.support_fee_standard ? Number(row.support_fee_standard) : 0,
          police_fee_standard: row.police_fee_standard ? Number(row.police_fee_standard) : 0,
          fuel_liters_standard: row.fuel_liters_standard ? Number(row.fuel_liters_standard) : 0,
          fuel_cost_standard: row.fuel_cost_standard ? Number(row.fuel_cost_standard) : 0,
          tire_service_fee_standard: row.tire_service_fee_standard ? Number(row.tire_service_fee_standard) : 0,
          toll_cost: row.toll_cost ? Number(row.toll_cost) : 0,
          default_extra_fee: row.default_extra_fee ? Number(row.default_extra_fee) : 0,
          total_cost_standard: row.total_cost_standard ? Number(row.total_cost_standard) : 0,
          profit_standard: row.profit_standard ? Number(row.profit_standard) : 0,
          status: ((val) => {
            const v = String(val).toLowerCase();
            if (v === 'hoạt động' || v === 'active' || v === 'đang hoạt động') return 'active';
            if (v === 'ngưng' || v === 'inactive' || v === 'ngừng hoạt động') return 'inactive';
            return 'active';
          })(row.status),
        } as any);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Import error", error);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['routes'] });

    toast({
      title: "Nhập tuyến thành công",
      description: `Đã nhập ${successCount} tuyến${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
    });
  };

  // Filter data based on search query and activeFilters
  const filteredRoutes = useMemo(() => {
    return (routes || []).filter(route => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          route.route_code?.toLowerCase().includes(query) ||
          route.route_name?.toLowerCase().includes(query) ||
          route.origin?.toLowerCase().includes(query) ||
          route.destination?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Multi-select filters
      for (const key of ['cargo_type', 'status', 'origin', 'destination']) {
        const filterValues = activeFilters[key];
        if (Array.isArray(filterValues) && filterValues.length > 0) {
          const routeValue = String((route as Record<string, unknown>)[key] || '');
          if (!filterValues.includes(routeValue)) return false;
        }
      }

      // Price range filter
      const priceRange = activeFilters.base_price as { min: number; max: number } | undefined;
      if (priceRange) {
        const price = route.base_price || route.standard_freight_rate || 0;
        if (price < priceRange.min || price > priceRange.max) return false;
      }

      return true;
    });
  }, [routes, searchQuery, activeFilters]);

  // 12 columns for Routes table
  const columns: Column<RouteData>[] = [
    // 1. Mã tuyến
    {
      key: 'route_code',
      header: 'Mã tuyến',
      width: '100px',
      render: (value) => <span className="font-mono font-medium">{value as string}</span>,
    },
    // 2. Tên tuyến
    {
      key: 'route_name',
      header: 'Tên tuyến',
      width: '180px',
      render: (value) => <span className="font-medium">{value as string}</span>,
    },
    // 3. Điểm đi
    {
      key: 'origin',
      header: 'Điểm đi',
      width: '140px',
      render: (value) => (
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-green-600" />
          {value as string}
        </span>
      ),
    },
    // 4. Điểm đến
    {
      key: 'destination',
      header: 'Điểm đến',
      width: '140px',
      render: (value) => (
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-red-600" />
          {value as string}
        </span>
      ),
    },

    // 7. Khoảng cách
    {
      key: 'distance_km',
      header: 'Khoảng cách',
      width: '110px',
      align: 'right',
      render: (value) => {
        const km = value as number;
        return (
          <span className={`font-mono ${km === 0 ? 'text-amber-600' : ''}`}>
            {formatNumber(km)} km
          </span>
        );
      },
    },
    // 8. Thời gian chạy
    {
      key: 'estimated_duration_hours',
      header: 'Thời gian',
      width: '100px',
      align: 'right',
      render: (value) => (
        <span className="flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
          {value as number}h
        </span>
      ),
    },
    // 7. Loại hàng
    {
      key: 'cargo_type',
      header: 'Loại hàng',
      width: '120px',
      render: (value) => value ? <span className="text-sm">{value as string}</span> : '-',
    },
    // 8. Số tấn
    {
      key: 'cargo_weight_standard',
      header: 'Số tấn',
      width: '80px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{formatNumber(value as number)}</span>,
    },
    // 9. Đơn giá
    {
      key: 'base_price',
      header: 'Đơn giá',
      width: '120px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 10. Doanh thu vận chuyển
    {
      key: 'transport_revenue_standard',
      header: 'Doanh thu VC',
      width: '130px',
      align: 'right',
      render: (value) => <span className="tabular-nums font-medium text-blue-600">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 11. Tiền Tài Xế
    {
      key: 'driver_allowance_standard',
      header: 'Tiền Tài Xế',
      width: '120px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 12. Bồi Dưỡng
    {
      key: 'support_fee_standard',
      header: 'Bồi Dưỡng',
      width: '110px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 13. Công An
    {
      key: 'police_fee_standard',
      header: 'Công An',
      width: '110px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 14. Số lít dầu
    {
      key: 'fuel_liters_standard',
      header: 'Số lít dầu',
      width: '90px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{formatNumber(value as number)}l</span>,
    },
    // 15. Tiền Xăng/dầu
    {
      key: 'fuel_cost_standard',
      header: 'Tiền Dầu',
      width: '120px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 16. Bơm hơi, Vá vỏ
    {
      key: 'tire_service_fee_standard',
      header: 'Bơm/Vá',
      width: '100px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 17. Phí cầu đường
    {
      key: 'toll_cost',
      header: 'Cầu đường',
      width: '110px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 18. Phí phát sinh khác
    {
      key: 'default_extra_fee',
      header: 'Phí khác',
      width: '110px',
      align: 'right',
      render: (value) => <span className="tabular-nums">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 19. Tổng Chi Phí
    {
      key: 'total_cost_standard',
      header: 'Tổng Chi',
      width: '130px',
      align: 'right',
      render: (value) => <span className="tabular-nums font-medium text-amber-600">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 20. Lợi Nhuận
    {
      key: 'profit_standard',
      header: 'Lợi Nhuận',
      width: '130px',
      align: 'right',
      render: (value) => <span className="tabular-nums font-bold text-green-600">{value ? formatCurrency(value as number) : '-'}</span>,
    },
    // 11. Trạng thái
    {
      key: 'status',
      header: 'Trạng thái',
      width: '120px',
      render: (value) => {
        const status = (value as string) || 'active';
        const colors: Record<string, string> = {
          active: 'bg-green-100 text-green-700 border-green-200',
          inactive: 'bg-gray-100 text-gray-700 border-gray-200',
        };
        const labels: Record<string, string> = {
          active: 'Hoạt động',
          inactive: 'Ngưng',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.active}`}>
            {labels[status] || status}
          </span>
        );
      },
    },
    // 12. Ghi chú
    {
      key: 'notes',
      header: 'Ghi chú',
      width: '150px',
      render: (value) => (
        <span className="text-sm text-muted-foreground truncate max-w-[130px] block" title={value as string}>
          {value as string || '-'}
        </span>
      ),
    },
    // Action column
    ...(canDelete ? [{
      key: 'id' as const,
      header: '',
      width: '50px',
      render: (_: any, row: any) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e: React.MouseEvent) => handleDeleteClick(e, row)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    }] : []) as Column<RouteData>[],
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      {/* 1. Compact Header Row */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Danh Mục Tuyến Đường</h1>
          <p className="text-muted-foreground text-sm">Danh sách tuyến vận chuyển và thông số chuẩn</p>
        </div>
      </div>

      {/* 2. Unified Toolbar Row */}
      <div className="flex flex-col xl:flex-row gap-2 items-start xl:items-center justify-between bg-muted/10 p-2 rounded-lg border">
        {/* Left Side: Search + Filters */}
        <div className="flex flex-col sm:flex-row flex-1 w-full xl:w-auto gap-2">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mã tuyến, tên, điểm đi/đến..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>

          {/* Filters Wrapper */}
          <div className="flex-1 overflow-x-auto pb-1 sm:pb-0">
            <RouteFilter
              data={routes || []}
              filterConfigs={[
                { key: 'origin', label: 'Điểm đi', type: 'multi-select' },
                { key: 'destination', label: 'Điểm đến', type: 'multi-select' },
                { key: 'cargo_type', label: 'Loại hàng', type: 'multi-select' },
                { key: 'status', label: 'Trạng thái', type: 'multi-select' },
                { key: 'base_price', label: 'Khoảng giá', type: 'price-range' },
              ]}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
            />
          </div>
        </div>

        {/* Right Side: Actions (Compact) */}
        <div className="flex items-center gap-1 shrink-0 overflow-x-auto max-w-full pt-1 xl:pt-0 w-full xl:w-auto justify-end">
          {canDelete && selectedRowIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="h-8 gap-1 mr-2 px-3 shadow-sm animate-in fade-in zoom-in-95"
            >
              <Trash2 className="w-4 h-4" />
              Xóa {selectedRowIds.size} tuyến
            </Button>
          )}

          <ColumnChooser
            columns={columns.map(c => ({ key: String(c.key), header: c.header }))}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
            storageKey="routes_visible_columns_v1"
            defaultRequiredKeys={['route_code', 'route_name']}
          />

          <div className="w-px h-6 bg-border mx-1" />

          <Button variant="ghost" size="icon" onClick={handleSyncAll} disabled={isSyncing} title="Đồng bộ">
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          </Button>

          {canCreate && (
            <Button variant="outline" size="sm" onClick={handleImport} className="h-8 px-2 lg:px-3">
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden lg:inline">Nhập</span>
            </Button>
          )}

          {canExport && (
            <Button variant="outline" size="sm" onClick={handleExport} className="h-8 px-2 lg:px-3">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden lg:inline">Xuất</span>
            </Button>
          )}

          {canCreate && (
            <Button size="sm" onClick={handleAdd} className="h-8 gap-1 ml-1">
              <Plus className="w-4 h-4" />
              Thêm tuyến
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredRoutes}
        columns={columns.filter(c => visibleColumns.includes(String(c.key)))}
        selectable
        onRowClick={handleRowClick}
        pageSize={50}
        selectedRowIds={selectedRowIds}
        onSelectionChange={setSelectedRowIds}
        onDeleteSelected={handleBulkDelete}
        hideToolbar={true}
      />

      <BulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedRowIds.size}
        entityName="tuyến"
        onConfirm={confirmBulkDelete}
        isDeleting={isBulkDeleting}
      />

      {/* Hidden file input for import */}
      <ExcelImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportData}
        entityName="tuyến"
        columns={importColumns}
        sampleData={[
          {
            route_code: 'TD0001',
            route_name: 'Hà Nội - Hải Phòng',
            origin: 'Hà Nội',
            destination: 'Hải Phòng',
            distance_km: 120,
            estimated_duration_hours: 2.5,
            base_price: 2000000,
            fuel_liters_standard: 30
          }
        ]}
        existingCodes={routes?.map(r => r.route_code) || []}
        codeField="route_code"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RouteIcon className="w-5 h-5" />
              {selectedRoute ? 'Chỉnh sửa tuyến đường' : 'Thêm tuyến đường mới'}
            </DialogTitle>
            <DialogDescription>
              {selectedRoute
                ? `Mã tuyến: ${selectedRoute.route_code}`
                : 'Nhập đầy đủ thông tin định mức cho tuyến đường'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} onChange={calculateFinancials} className="space-y-6">

              {/* Group 1: Thông Tin Vận Hành */}
              <div className="space-y-3 border p-4 rounded-lg bg-slate-50">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-700">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                  Thông Tin Vận Hành
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="route_code" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Mã tuyến *</FormLabel>
                      <FormControl><Input placeholder="VD: TD0001" className="h-8" {...field} disabled /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="route_name" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs">Tên tuyến *</FormLabel>
                      <FormControl><Input placeholder="Hà Nội - Hải Phòng" className="h-8" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="origin" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Điểm đi *</FormLabel>
                      <FormControl><Input placeholder="Hà Nội" className="h-8" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="destination" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Điểm đến *</FormLabel>
                      <FormControl><Input placeholder="Hải Phòng" className="h-8" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="distance_km" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Khoảng cách (km)</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="estimated_duration_hours" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Thời gian (giờ)</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Group 2: Doanh Thu */}
              <div className="space-y-3 border p-4 rounded-lg bg-green-50/50">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-green-700">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">2</span>
                  Doanh Thu Định Mức
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="cargo_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Loại hàng</FormLabel>
                      <FormControl><Input placeholder="Container" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="cargo_weight_standard" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Số tấn</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="base_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Đơn giá (VND/tấn)</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="transport_revenue_standard" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-blue-600">Doanh thu VC</FormLabel>
                      <FormControl><Input type="number" className="h-8 font-bold bg-blue-50" readOnly {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Group 3: Chi Phí */}
              <div className="space-y-3 border p-4 rounded-lg bg-amber-50/50">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-amber-700">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs">3</span>
                  Chi Phí Định Mức
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField control={form.control} name="driver_allowance_standard" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tiền TX</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="support_fee_standard" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Bồi dưỡng</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="police_fee_standard" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Công an</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tire_service_fee_standard" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Bơm/Vá</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fuel_liters_standard" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Số lít dầu</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fuel_cost_standard" render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel className="text-xs">Tiền Dầu (Ước tính)</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="toll_cost" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Cầu đường</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="default_extra_fee" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Phí khác</FormLabel>
                      <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="total_cost_standard" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-bold text-amber-600">Tổng Chi Phí</FormLabel>
                      <FormControl><Input type="number" className="h-8 font-bold bg-amber-50" readOnly {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Group 4: Lợi Nhuận & Khác */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="profit_standard" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold text-green-600">Lợi Nhuận Dự Kiến</FormLabel>
                    <FormControl><Input type="number" className="h-10 font-bold bg-green-50 text-green-700 text-lg" readOnly {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Ghi chú</FormLabel>
                    <FormControl><Input className="h-10" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {selectedRoute ? 'Cập nhật' : 'Thêm mới'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa tuyến đường <strong>{selectedRoute?.route_name}</strong> khỏi danh sách.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
