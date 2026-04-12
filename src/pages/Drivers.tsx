import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ColumnChooser } from "@/components/vehicles/ColumnChooser";
import { DriverFilter } from "@/components/drivers/DriverFilter";

import { ExcelImportDialog, ImportColumn } from "@/components/shared/ExcelImportDialog";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Phone, Loader2, Trash2, RefreshCw, Search, Plus, Upload, Download } from "lucide-react";
import { useDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver } from "@/hooks/useDrivers";
import { useVehiclesByStatus } from "@/hooks/useVehicles";
import { useQueryClient } from "@tanstack/react-query";
import { useBulkDelete } from "@/hooks/useBulkDelete";
import { BulkDeleteDialog } from "@/components/shared/BulkDeleteDialog";
import { BulkDeleteToolbar } from "@/components/shared/BulkDeleteToolbar";
import { usePermissions } from "@/hooks/usePermissions";
import { driverAdapter } from "@/lib/data-adapter";
import { getNextCodeByPrefix } from "@/lib/code-generator";

// Type definitions
interface Driver {
  id: string;
  driver_code: string;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  license_class: string | null;
  license_expiry: string | null;
  hire_date: string | null;
  base_salary: number | null;
  status: 'active' | 'on_leave' | 'inactive' | 'on_trip';
  assigned_vehicle_id: string | null;
  date_of_birth: string | null;
  tax_code: string | null;
  id_card: string | null;
  id_issue_date: string | null;
  address: string | null;
  contract_type: string | null;
  health_check_expiry: string | null;
  notes: string | null;
}

// Form Schema Validation
const driverSchema = z.object({
  driver_code: z.string().refine(val => !val || /^TX-\d+$/.test(val), "Mã tài xế sai chuẩn định dạng. Bắt buộc phải có dấu gạch ngang TX- (vd: TX-01, TX-16)").optional(), // Auto-generated if empty
  full_name: z.string().min(1, "Họ tên là bắt buộc"),
  phone: z.string().min(1, "Số điện thoại là bắt buộc").refine(
    (val) => /^(0[3-9])\d{8,9}$/.test(val.replace(/[\s.-]/g, '')),
    { message: "Số điện thoại không hợp lệ (VD: 0912345678)" }
  ),
  license_number: z.string().min(1, "Số GPLX là bắt buộc"),
  license_class: z.string().min(1, "Hạng GPLX là bắt buộc"),
  license_expiry: z.string().min(1, "Ngày hết hạn GPLX là bắt buộc"),
  health_check_expiry: z.string().min(1, "Hết hạn khám sức khỏe là bắt buộc"),
  hire_date: z.string().optional().or(z.literal('')),
  base_salary: z.coerce.number().min(0, "Lương cơ bản phải lớn hơn hoặc bằng 0"),
  status: z.enum(['active', 'on_leave', 'inactive', 'on_trip'] as const),
  assigned_vehicle_id: z.string().optional().nullable(),
  date_of_birth: z.string().min(1, "Ngày sinh là bắt buộc"),
  tax_code: z.string().optional(),
  id_card: z.string().min(1, "Số CCCD là bắt buộc"),
  id_issue_date: z.string().min(1, "Ngày cấp CCCD là bắt buộc"),
  address: z.string().min(1, "Hộ khẩu thường trú là bắt buộc"),
  contract_type: z.string().optional(),
  notes: z.string().optional(),
});

type DriverFormValues = z.infer<typeof driverSchema>;

export default function Drivers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete, canExport } = usePermissions('drivers');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Import Columns Config
  const importColumns: ImportColumn[] = [
    { key: 'driver_code', header: 'Mã TX', required: true },
    { key: 'full_name', header: 'Họ tên', required: true },
    { key: 'phone', header: 'Điện thoại' },
    { key: 'date_of_birth', header: 'Ngày sinh', type: 'date' },
    { key: 'tax_code', header: 'Mã số thuế' },
    { key: 'id_card', header: 'Số CCCD' },
    { key: 'id_issue_date', header: 'Cấp ngày', type: 'date' },
    { key: 'address', header: 'Hộ khẩu TT' },
    { key: 'license_number', header: 'Số GPLX' },
    { key: 'license_class', header: 'Hạng GPLX' },
    { key: 'license_expiry', header: 'Hết hạn GPLX', type: 'date' },
    { key: 'hire_date', header: 'Ngày vào làm', type: 'date' },
    { key: 'contract_type', header: 'Loại HĐ' },
    { key: 'base_salary', header: 'Lương cơ bản', type: 'number' },
    { key: 'status', header: 'Trạng thái' },
    { key: 'notes', header: 'Ghi chú' },
  ];

  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search');

  // Column visibility state (16 columns + action)
  const allColumnKeys = [
    'driver_code', 'full_name', 'phone', 'date_of_birth', 'tax_code', 'id_card',
    'id_issue_date', 'address', 'license_class', 'license_expiry', 'hire_date',
    'contract_type', 'base_salary', 'assigned_vehicle_id', 'status', 'notes', 'id'
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys);

  // Excel-style filters state
  const [activeFilters, setActiveFilters] = useState<Record<string, string[] | number | { min: number; max: number } | boolean>>({});

  // Hooks
  const { data: drivers, isLoading } = useDrivers();
  const { data: activeVehicles } = useVehiclesByStatus('active');

  // Check for navigation from Alerts


  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const deleteMutation = useDeleteDriver();

  // Bulk Delete Hook
  const { deleteIds: deleteDrivers, isDeleting: isBulkDeleting } = useBulkDelete({
    table: 'drivers',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setSelectedRowIds(new Set());
      setBulkDeleteDialogOpen(false);
    }
  });

  // Form setup
  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      driver_code: "",
      full_name: "",
      phone: "",
      license_number: "",
      license_class: "",
      license_expiry: "",
      hire_date: "",
      base_salary: 0,
      status: "active",
      assigned_vehicle_id: null, // "none" or null
    },
  });

  // Handlers
  const handleAdd = async () => {
    setSelectedDriver(null);
    let nextCode = `TX-01`;
    try {
      const res = await driverAdapter.getNextCode();
      if (res && typeof res === 'string') {
        nextCode = res;
      }
    } catch (err) {
      console.error("[AUDIT] Failed to fetch next driver code - using fallback TX0001", err);
      // Fallback: generate based on existing drivers
      if (drivers && drivers.length > 0) {
        const maxCode = drivers.reduce((max, d) => {
          const num = parseInt(d.driver_code?.replace(/[^0-9]/g, '') || '0');
          return Math.max(max, num);
        }, 0);
        nextCode = `TX-${String(maxCode + 1).padStart(2, '0')}`;
      }
    }

    form.reset({
      driver_code: nextCode,
      full_name: "",
      phone: "",
      license_number: "",
      license_class: "",
      license_expiry: "",
      health_check_expiry: "",
      hire_date: "",
      base_salary: 0,
      status: "active",
      assigned_vehicle_id: null,
      date_of_birth: "",
      tax_code: "",
      id_card: "",
      id_issue_date: "",
      address: "",
      contract_type: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  // ... (rest of handlers)

  const handleBulkDelete = () => {
    if (selectedRowIds.size > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    deleteDrivers(Array.from(selectedRowIds));
  };

  const handleSelectAll = () => {
    const allIds = filteredDrivers.map(d => d.id);
    setSelectedRowIds(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  // ... (handleRowClick, etc)


  const handleRowClick = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
    form.reset({
      driver_code: driver.driver_code,
      full_name: driver.full_name,
      phone: driver.phone || "",
      license_number: driver.license_number || "",
      license_class: driver.license_class || "",
      license_expiry: driver.license_expiry || "",
      health_check_expiry: driver.health_check_expiry || "",
      hire_date: driver.hire_date || "",
      base_salary: driver.base_salary || 0,
      status: driver.status || "active",
      assigned_vehicle_id: driver.assigned_vehicle_id,
      date_of_birth: driver.date_of_birth || "",
      tax_code: driver.tax_code || "",
      id_card: driver.id_card || "",
      id_issue_date: driver.id_issue_date || "",
      address: driver.address || "",
      contract_type: driver.contract_type || "",
      notes: driver.notes || "",
    });
    setDialogOpen(true);
  }, [form]);

  // Initialize search from URL param
  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setSearchParams({}, { replace: true });
    }
  }, [urlSearch, setSearchParams]);

  // Check for navigation from Alerts (sessionStorage)
  useEffect(() => {
    const selectedDriverId = sessionStorage.getItem('selectedDriverId');
    if (selectedDriverId && drivers) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      if (driver) {
        handleRowClick(driver);
        sessionStorage.removeItem('selectedDriverId');
      }
    }
  }, [drivers, handleRowClick]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, driver: Driver) => {
    e.stopPropagation();
    setSelectedDriver(driver);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!selectedDriver) return;

    try {
      await deleteMutation.mutateAsync(selectedDriver.id);
      setDeleteDialogOpen(false);
      setSelectedDriver(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const onSubmit = async (data: DriverFormValues) => {
    // Convert empty strings to null for optional dates
    const formattedData = {
      ...data,
      license_expiry: data.license_expiry === "" ? null : data.license_expiry,
      health_check_expiry: data.health_check_expiry === "" ? null : data.health_check_expiry,
      hire_date: data.hire_date === "" ? null : data.hire_date,
      date_of_birth: data.date_of_birth === "" ? null : data.date_of_birth,
      id_issue_date: data.id_issue_date === "" ? null : data.id_issue_date,
      assigned_vehicle_id: data.assigned_vehicle_id === "none" ? null : data.assigned_vehicle_id,
      tax_code: data.tax_code || null,
      id_card: data.id_card || null,
      address: data.address || null,
      contract_type: data.contract_type || null,
      notes: data.notes || null,
    };

    try {
      if (selectedDriver) {
        await updateMutation.mutateAsync({
          id: selectedDriver.id,
          updates: formattedData,
        });
      } else {
        await createMutation.mutateAsync({
          driver_code: formattedData.driver_code || `DRV-${Date.now()}`,
          full_name: formattedData.full_name || 'Unknown',
          ...formattedData,
        } as any);
      }
      setDialogOpen(false);
      toast({ title: "Thành công", description: selectedDriver ? "Đã cập nhật thông tin tài xế" : "Đã thêm tài xế mới thành công" });
    } catch (error: any) {
      console.error("Driver submit error:", error);
      toast({
        title: "Lỗi lưu dữ liệu",
        description: error.message || "Có lỗi xảy ra khi lưu thông tin tài xế",
        variant: "destructive"
      });
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({ title: "Đồng bộ thành công", description: "Dữ liệu tài xế đã cập nhật" });
    } catch (error) {
      toast({ title: "Lỗi đồng bộ", description: "Không thể cập nhật dữ liệu", variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    import('@/lib/export').then(({ exportToCSV }) => {
      exportToCSV(drivers || [], 'Danh_sach_tai_xe', [
        { key: 'driver_code', header: 'Mã TX' },
        { key: 'full_name', header: 'Họ tên' },
        { key: 'phone', header: 'Điện thoại' },
        { key: 'national_id', header: 'CCCD' },
        { key: 'birth_date', header: 'Ngày sinh' },
        { key: 'hometown', header: 'Quê quán' },
        { key: 'hire_date', header: 'Ngày vào làm' },
        { key: 'license_number', header: 'Số GPLX' },
        { key: 'license_class', header: 'Hạng' },
        { key: 'license_expiry', header: 'Hạn GPLX' },
        { key: 'license_issue_date', header: 'Ngày cấp GPLX' },
        { key: 'license_issue_place', header: 'Nơi cấp' },
        { key: 'experience_years', header: 'Thâm niên (năm)' },
        { key: 'base_salary', header: 'Lương cơ bản' },
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




  // Filter data based on search query and activeFilters
  const filteredDrivers = useMemo(() => {
    return (drivers || []).filter(driver => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          driver.driver_code?.toLowerCase().includes(query) ||
          driver.full_name?.toLowerCase().includes(query) ||
          driver.phone?.toLowerCase().includes(query) ||
          driver.id_card?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Multi-select filters
      for (const key of ['license_class', 'contract_type', 'status']) {
        const filterValues = activeFilters[key];
        if (Array.isArray(filterValues) && filterValues.length > 0) {
          const driverValue = String((driver as Record<string, unknown>)[key] || '');
          if (!filterValues.includes(driverValue)) return false;
        }
      }

      // Expiry days filter (GPLX)
      if (typeof activeFilters.license_expiry === 'number') {
        const days = activeFilters.license_expiry;
        if (!driver.license_expiry) return false;
        const expiryDate = new Date(driver.license_expiry);
        const daysUntil = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0 || daysUntil > days) return false;
      }

      // Salary range filter
      const salaryRange = activeFilters.base_salary as { min: number; max: number } | undefined;
      if (salaryRange) {
        const salary = driver.base_salary || 0;
        if (salary < salaryRange.min || salary > salaryRange.max) return false;
      }

      return true;
    });
  }, [drivers, searchQuery, activeFilters]);

  // Handle Excel import
  const handleExcelImport = async (rows: Record<string, unknown>[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        await createMutation.mutateAsync({
          driver_code: String(row.driver_code || `TX-00`),
          full_name: String(row.full_name || 'Unknown'),
          phone: row.phone ? String(row.phone) : null,
          date_of_birth: row.date_of_birth ? String(row.date_of_birth) : null,
          tax_code: row.tax_code ? String(row.tax_code) : null,
          id_card: row.id_card ? String(row.id_card) : null,
          id_issue_date: row.id_issue_date ? String(row.id_issue_date) : null,

          address: row.address ? String(row.address) : null,
          license_number: row.license_number ? String(row.license_number) : null,
          license_class: row.license_class ? String(row.license_class) : null,
          license_expiry: row.license_expiry ? String(row.license_expiry) : null,
          hire_date: row.hire_date ? String(row.hire_date) : null,
          contract_type: row.contract_type ? String(row.contract_type) : null,
          base_salary: row.base_salary ? Number(row.base_salary) : 0,
          status: ((val) => {
            const v = String(val).toLowerCase();
            if (v === 'đang làm việc' || v === 'active') return 'active';
            if (v === 'đang chạy' || v === 'on_trip') return 'on_trip';
            if (v === 'nghỉ phép' || v === 'on_leave') return 'on_leave';
            if (v === 'ngừng làm việc' || v === 'inactive' || v === 'thôi việc') return 'inactive';
            return 'active';
          })(row.status),
          notes: row.notes ? String(row.notes) : null,
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Import error:', error);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['drivers'] });
    toast({
      title: "Nhập tài xế thành công",
      description: `Đã nhập ${successCount} tài xế${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
    });
  };
  // 16 columns for Drivers table
  const columns = useMemo<Column<Driver>[]>(() => [
    // 1. Mã TX
    {
      key: 'driver_code',
      header: 'Mã TX',
      width: '90px',
      render: (value) => <span className="font-mono font-medium">{value as string}</span>,
    },
    // 2. Họ tên
    {
      key: 'full_name',
      header: 'Họ tên',
      width: '150px',
      render: (value) => <span className="font-medium">{value as string}</span>,
    },
    // 3. Điện thoại
    {
      key: 'phone',
      header: 'Điện thoại',
      width: '120px',
      render: (value) => value as string || '-',
    },
    // 4. Ngày sinh
    {
      key: 'date_of_birth',
      header: 'Ngày sinh',
      width: '110px',
      render: (value) => formatDate(value as string),
    },
    // 5. Mã số thuế
    {
      key: 'tax_code',
      header: 'Mã số thuế',
      width: '120px',
      render: (value) => value ? <span className="font-mono text-sm">{value as string}</span> : '-',
    },
    // 6. Số CCCD
    {
      key: 'id_card',
      header: 'Số CCCD',
      width: '130px',
      render: (value) => value ? <span className="font-mono text-sm">{value as string}</span> : '-',
    },
    // 7. Cấp ngày
    {
      key: 'id_issue_date',
      header: 'Cấp ngày',
      width: '110px',
      render: (value) => formatDate(value as string),
    },
    // 8. Hộ khẩu TT
    {
      key: 'address',
      header: 'Hộ khẩu TT',
      width: '200px',
      render: (value) => (
        <span className="text-sm truncate max-w-[180px] block" title={value as string}>
          {value as string || '-'}
        </span>
      ),
    },
    // 9. Hạng GPLX
    {
      key: 'license_class',
      header: 'Hạng GPLX',
      width: '100px',
      render: (value) => value ? <span className="font-medium">Hạng {value as string}</span> : '-',
    },
    // 10. Ngày hết hạn GPLX
    {
      key: 'license_expiry',
      header: 'Hết hạn GPLX',
      width: '130px',
      render: (value) => {
        if (!value) return '-';
        const expiryDate = new Date(value as string);
        const isExpired = expiryDate < new Date();
        const daysUntil = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isNearExpiry = daysUntil > 0 && daysUntil <= 30;

        return (
          <span className={isExpired ? 'text-red-600 font-medium' : isNearExpiry ? 'text-amber-600' : ''}>
            {formatDate(value as string)}
            {isExpired && <span className="text-xs ml-1">(Hết hạn)</span>}
          </span>
        );
      },
    },
    // 10.5. Hết hạn khám SK
    {
      key: 'health_check_expiry',
      header: 'Hết hạn khám SK',
      width: '130px',
      render: (value) => {
        if (!value) return '-';
        const expiryDate = new Date(value as string);
        const isExpired = expiryDate < new Date();
        const daysUntil = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isNearExpiry = daysUntil > 0 && daysUntil <= 30;

        return (
          <span className={isExpired ? 'text-red-600 font-medium' : isNearExpiry ? 'text-amber-600' : ''}>
            {formatDate(value as string)}
            {isExpired && <span className="text-xs ml-1">(Hết hạn)</span>}
          </span>
        );
      },
    },
    // 11. Ngày vào làm
    {
      key: 'hire_date',
      header: 'Ngày vào làm',
      width: '120px',
      render: (value) => formatDate(value as string),
    },
    // 12. Loại hợp đồng
    {
      key: 'contract_type',
      header: 'Loại HĐ',
      width: '120px',
      render: (value) => value ? <span className="text-sm">{value as string}</span> : '-',
    },
    // 13. Lương cơ bản
    {
      key: 'base_salary',
      header: 'Lương cơ bản',
      width: '140px',
      align: 'right',
      render: (value) => formatCurrency(value as number),
    },
    // 14. Xe phân công
    {
      key: 'assigned_vehicle_id',
      header: 'Xe phân công',
      width: '160px',
      render: (value, row) => {
        const joined = (row as any).assigned_vehicle;
        if (joined && joined.vehicle_code && joined.license_plate) {
          return <span className="font-mono text-sm">{joined.vehicle_code} – {joined.license_plate}</span>;
        }
        if (joined && joined.license_plate) {
          return <span className="font-mono text-sm">{joined.license_plate}</span>;
        }
        const vehicle = activeVehicles?.find(v => v.id === value);
        return vehicle ? (
          <span className="font-mono text-sm">{vehicle.vehicle_code || ''} – {vehicle.license_plate}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    // 15. Trạng thái
    {
      key: 'status',
      header: 'Trạng thái',
      width: '130px',
      render: (value) => {
        const statusLabels: Record<string, string> = {
          active: 'Đang làm việc',
          on_trip: 'Đang chạy',
          on_leave: 'Nghỉ phép',
          inactive: 'Ngừng làm việc',
        };
        const status = (value as string) || 'active';
        const colors: Record<string, string> = {
          active: 'bg-green-100 text-green-700 border-green-200',
          on_trip: 'bg-blue-100 text-blue-700 border-blue-200',
          on_leave: 'bg-amber-100 text-amber-700 border-amber-200',
          inactive: 'bg-gray-100 text-gray-700 border-gray-200',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[status] || colors.active}`}>
            {statusLabels[status] || status}
          </span>
        );
      },
    },
    // 16. Ghi chú
    {
      key: 'notes',
      header: 'Ghi chú',
      width: '180px',
      render: (value) => (
        <span className="text-sm text-muted-foreground truncate max-w-[160px] block" title={value as string}>
          {value as string || '-'}
        </span>
      ),
    },
    ...(canDelete ? [{
      key: 'id' as keyof Driver,
      header: '',
      width: '50px',
      render: (_: unknown, row: Driver) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e: React.MouseEvent) => handleDeleteClick(e, row)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ),
    }] : [])
  ], [handleDeleteClick, activeVehicles, canDelete]);

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
          <h1 className="text-xl font-bold tracking-tight">Danh Mục Tài Xế</h1>
          <p className="text-muted-foreground text-sm">Danh sách và thông tin chi tiết tài xế</p>
        </div>
      </div>

      {/* 2. Unified Toolbar Row */}
      <div className="flex flex-col xl:flex-row gap-2 items-start xl:items-center justify-between bg-muted/10 p-2 rounded-lg border">
        {/* Left Side: Search + Filters */}
        <div className="flex flex-col sm:flex-row flex-1 w-full xl:w-auto gap-2">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mã TX, họ tên, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>

          {/* Filters Wrapper */}
          <div className="flex-1 overflow-x-auto pb-1 sm:pb-0">
            <DriverFilter
              data={drivers || []}
              filterConfigs={[
                { key: 'license_class', label: 'Hạng GPLX', type: 'multi-select' },
                { key: 'contract_type', label: 'Loại HĐ', type: 'multi-select' },
                { key: 'status', label: 'Trạng thái', type: 'multi-select' },
                { key: 'license_expiry', label: 'GPLX hết hạn', type: 'expiry-days', expiryField: 'license_expiry' },
                { key: 'base_salary', label: 'Khoảng lương', type: 'salary-range' },
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
              Xóa {selectedRowIds.size} tài xế
            </Button>
          )}

          <ColumnChooser
            columns={columns.map(c => ({ key: String(c.key), header: c.header }))}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
            storageKey="drivers_visible_columns_v2"
            defaultRequiredKeys={['driver_code', 'full_name']}
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
              Thêm tài xế
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredDrivers}
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
        entityName="tài xế"
        onConfirm={confirmBulkDelete}
        isDeleting={isBulkDeleting}
      />

      {/* Driver Import Dialog */}
      <ExcelImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleExcelImport}
        entityName="tài xế"
        columns={importColumns}
        sampleData={[
          {
            driver_code: 'TX0001',
            full_name: 'Nguyễn Văn A',
            phone: '09xxxx',
            date_of_birth: '1990-01-01',
            base_salary: 8000000
          }
        ]}
        existingCodes={drivers?.map(d => d.driver_code) || []}
        codeField="driver_code"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedDriver ? 'Chỉnh sửa tài xế' : 'Thêm tài xế mới'}
            </DialogTitle>
            <DialogDescription>
              {selectedDriver
                ? `Mã tài xế: ${selectedDriver.driver_code}`
                : 'Nhập thông tin tài xế mới'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="driver_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã tài xế *</FormLabel>
                      <FormControl>
                        <Input placeholder="VD: TX0001" {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Họ tên *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nguyễn Văn X" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày sinh *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? parseISO(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số điện thoại *</FormLabel>
                      <FormControl>
                        <Input placeholder="0912345678" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_card"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số CCCD *</FormLabel>
                      <FormControl>
                        <Input placeholder="CCCD/CMND" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="id_issue_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày cấp CCCD *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? parseISO(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã số thuế</FormLabel>
                      <FormControl>
                        <Input placeholder="MST cá nhân" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hộ khẩu thường trú *</FormLabel>
                      <FormControl>
                        <Input placeholder="Địa chỉ..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số GPLX *</FormLabel>
                      <FormControl>
                        <Input placeholder="B2-123456" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="license_class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hạng GPLX</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn hạng" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="B2">B2</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                          <SelectItem value="E">E</SelectItem>
                          <SelectItem value="FC">FC</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="license_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày hết hạn GPLX *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="health_check_expiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hết hạn khám SK *</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contract_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại hợp đồng</FormLabel>
                      <FormControl>
                        <Input placeholder="HĐLĐ / Cộng tác viên" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày vào làm</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? parseISO(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="base_salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lương cơ bản</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigned_vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xe phân công</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn xe" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Không phân công --</SelectItem>
                          {activeVehicles?.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.license_plate} ({vehicle.brand})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trạng thái</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Đang làm việc</SelectItem>
                          <SelectItem value="on_leave">Nghỉ phép</SelectItem>
                          <SelectItem value="inactive">Ngừng làm việc</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ghi chú</FormLabel>
                        <FormControl>
                          <Input placeholder="Ghi chú thêm..." {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Lưu
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
              Hành động này sẽ xóa tài xế <strong>{selectedDriver?.full_name}</strong> khỏi danh sách.
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
