import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExcelImportDialog, ImportColumn } from "@/components/shared/ExcelImportDialog";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { DateFilter } from "@/components/shared/DateFilter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Receipt, Fuel, Wrench, Users, Loader2, Trash2, RefreshCw,
  X, Shield, FileText, Search, Plus, Upload, Download
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useBulkDeleteExpenses } from "@/hooks/useExpenses";
import { useVehiclesByStatus } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { useTrips } from "@/hooks/useTrips";
import { useClosedPeriods, isDateInClosedPeriod } from '@/hooks/useAccountingPeriods';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { getNextCodeByPrefix } from "@/lib/code-generator";

// Types
interface Expense {
  id: string;
  expense_code: string;
  expense_date: string;
  category_id: string;
  amount: number;
  description: string;
  trip_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  document_number: string | null;
  vendor_name: string | null;
  status: 'draft' | 'confirmed' | 'cancelled';
  category?: { id: string; category_name: string; category_type: string } | null;
  vehicle?: { id: string; license_plate: string; vehicle_code: string } | null;
  driver?: { id: string; full_name: string; driver_code: string } | null;
  trip?: { id: string; trip_code: string } | null;
}

// Form Schema
const expenseSchema = z.object({
  expense_code: z.string().min(1, "Mã phiếu là bắt buộc"),
  expense_date: z.string().min(1, "Ngày chi là bắt buộc"),
  category_id: z.string().min(1, "Loại chi phí là bắt buộc"),
  amount: z.coerce.number().min(0, "Số tiền phải lớn hơn hoặc bằng 0"),
  description: z.string().min(1, "Diễn giải là bắt buộc"),
  trip_id: z.string().optional().nullable(),
  vehicle_id: z.string().optional().nullable(),
  driver_id: z.string().optional().nullable(),
  document_number: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  status: z.enum(['draft', 'confirmed', 'cancelled'] as const),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

// Category icons and colors mapping
const categoryConfig: Record<string, { icon: typeof Fuel; color: string; bgColor: string }> = {
  fuel: { icon: Fuel, color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
  toll: { icon: Receipt, color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  labor: { icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  maintenance: { icon: Wrench, color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100 border-red-200' },
  other: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200' },
};

const categoryIcons: Record<string, typeof Fuel> = {
  fuel: Fuel,
  toll: Receipt,
  labor: Users,
  maintenance: Wrench,
  other: Wallet,
};

const onlineExpenseCategories = [
  { id: 'fuel', category_name: 'Nhiên liệu', category_type: 'variable' },
  { id: 'toll', category_name: 'Cầu đường', category_type: 'variable' },
  { id: 'labor', category_name: 'Nhân công', category_type: 'fixed' },
  { id: 'maintenance', category_name: 'Bảo dưỡng', category_type: 'variable' },
  { id: 'other', category_name: 'Khác', category_type: 'variable' },
];

export default function Expenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canDelete, canExport } = usePermissions('expenses');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });

  // Category Filter State (Quick Filter Chips)
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Import Columns Config
  const importColumns: ImportColumn[] = [
    { key: 'expense_code', header: 'Mã phiếu', required: true },
    { key: 'expense_date', header: 'Ngày chi', required: true, type: 'date' },
    { key: 'category_name', header: 'Loại chi phí', required: true },
    { key: 'amount', header: 'Số tiền', required: true, type: 'number' },
    { key: 'description', header: 'Diễn giải', required: true },
    { key: 'license_plate', header: 'Biển số xe' },
    { key: 'trip_code', header: 'Mã chuyến' },
    { key: 'driver_code', header: 'Mã tài xế' },
    { key: 'document_number', header: 'Số chứng từ' },
    { key: 'vendor_name', header: 'Nhà cung cấp' },
  ];

  // Data Hooks
  const { data: expenses, isLoading } = useExpenses();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isSuperUser = user?.role === 'admin';

  // Check for navigation from Alerts

  // URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search');

  const { data: vehicles } = useVehiclesByStatus('active');
  const { data: drivers } = useDrivers();
  const { data: trips } = useTrips();
  const { data: closedPeriods } = useClosedPeriods();

  // Expense Categories Hook
  const { data: categories } = useQuery({
    queryKey: ['expense_categories'],
    queryFn: async () => onlineExpenseCategories,
  });

  // Mutation Hooks
  const createMutation = useCreateExpense();
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();
  const bulkDeleteMutation = useBulkDeleteExpenses();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form setup
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_code: "",
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      category_id: "",
      amount: 0,
      description: "",
      status: 'draft',
      trip_id: null,
      vehicle_id: null,
      driver_id: null,
    },
  });

  // Toggle category filter
  const toggleCategoryFilter = (categoryId: string) => {
    setCategoryFilter(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setCategoryFilter([]);
    setSearchQuery("");
  };

  // Check if any filter is active
  const hasActiveFilters = categoryFilter.length > 0;

  // Handlers
  const handleAdd = async () => {
    setSelectedExpense(null);
    const monthlyPrefix = `CP${format(new Date(), 'yyMM')}`;
    const nextCode = getNextCodeByPrefix(
      (expenses || []).map(e => e.expense_code),
      monthlyPrefix,
      4
    );

    form.reset({
      expense_code: nextCode,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      category_id: "",
      amount: 0,
      description: "",
      status: 'draft',
      trip_id: null,
      vehicle_id: null,
      driver_id: null,
    });
    setDialogOpen(true);
  };

  const handleRowClick = useCallback((expense: Expense) => {
    // Prevent editing if expense date is in a closed accounting period
    if (isDateInClosedPeriod(expense.expense_date, closedPeriods)) {
      if (!isSuperUser) {
        toast({ title: 'Phiếu chi bị khóa', description: 'Phiếu chi này nằm trong kỳ dữ liệu đã khóa. Liên hệ Admin để chỉnh sửa.', variant: 'destructive' });
        return;
      } else {
        toast({ title: 'Cảnh báo Admin', description: 'Bạn đang chỉnh sửa dữ liệu thuộc kỳ đã khóa.', className: 'bg-amber-100 border-amber-500 text-amber-900' });
      }
    }

    setSelectedExpense(expense);
    form.reset({
      expense_code: expense.expense_code,
      expense_date: format(parseISO(expense.expense_date), 'yyyy-MM-dd'),
      category_id: expense.category_id,
      amount: expense.amount || 0,
      description: expense.description || "",
      trip_id: expense.trip_id,
      vehicle_id: expense.vehicle_id,
      driver_id: expense.driver_id,
      document_number: expense.document_number,
      vendor_name: expense.vendor_name,
      status: expense.status || 'draft',
    });
    setDialogOpen(true);
  }, [closedPeriods, isSuperUser, toast, form]);

  // Initialize search from URL param
  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setSearchParams({}, { replace: true });
    }
  }, [urlSearch, setSearchParams]);

  // Check for navigation from Alerts (sessionStorage)
  useEffect(() => {
    const selectedExpenseId = sessionStorage.getItem('selectedExpenseId');
    if (selectedExpenseId && expenses) {
      const expense = expenses.find(e => e.id === selectedExpenseId);
      if (expense) {
        handleRowClick(expense);
        sessionStorage.removeItem('selectedExpenseId');
      }
    }
  }, [expenses, handleRowClick]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation();
    if (isDateInClosedPeriod(expense.expense_date, closedPeriods)) {
      if (!isSuperUser) {
        toast({ title: 'Chặn xóa', description: 'Phiếu chi thuộc kỳ dữ liệu đã khóa.', variant: 'destructive' });
        return;
      }
      // If admin, proceed but warning shows in dialog (we can imply warning by allowing it)
    }
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  }, [closedPeriods, isSuperUser, toast]);

  const handleConfirmDelete = async () => {
    if (!selectedExpense) return;
    try {
      await deleteMutation.mutateAsync(selectedExpense.id);
      setDeleteDialogOpen(false);
      setSelectedExpense(null);
    } catch (error) {
      // handled by hook
    }
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    const processedData = {
      ...data,
      trip_id: data.trip_id === "none" ? null : data.trip_id,
      vehicle_id: data.vehicle_id === "none" ? null : data.vehicle_id,
      driver_id: data.driver_id === "none" ? null : data.driver_id,
      document_number: data.document_number || null,
      vendor_name: data.vendor_name || null,
    };

    const selectedCategory = categories?.find((c: any) => c.id === processedData.category_id);
    const categoryType = selectedCategory?.category_type || 'other';

    if (processedData.status === 'confirmed') {
      if (['fuel', 'toll', 'maintenance'].includes(categoryType) && !processedData.vehicle_id) {
        toast({
          title: "Thiếu thông tin Xe",
          description: `Chi phí ${selectedCategory?.category_name || 'này'} bắt buộc phải gắn với Biển Số Xe trước khi Được Xác Nhận.`,
          variant: "destructive",
        });
        return;
      }

      if (categoryType === 'labor' && !processedData.driver_id) {
        toast({
          title: "Thiếu thông tin Tài Xế",
          description: `Chi phí ${selectedCategory?.category_name || 'này'} bắt buộc phải gắn với Tài Xế trước khi Được Xác Nhận.`,
          variant: "destructive",
        });
        return;
      }
    }

    // --- Prevent Duplicate Expense Logic ---
    if (!selectedExpense && expenses) {
      const isDuplicate = expenses.some((e) => {
        const isSameDate = e.expense_date.startsWith(processedData.expense_date);
        return (
          isSameDate &&
          e.amount === processedData.amount &&
          e.category_id === processedData.category_id &&
          (e.vehicle_id || null) === processedData.vehicle_id &&
          (e.driver_id || null) === processedData.driver_id
        );
      });

      if (isDuplicate) {
        toast({
          title: "Phát hiện chi phí trùng lặp",
          description: "Khoản chi với cùng ngày, loại phí, số tiền và phương tiện đã tồn tại. Vui lòng kiểm tra lại.",
          variant: "destructive",
        });
        return; // Dừng việc submit
      }
    }

    try {
      if (selectedExpense) {
        await updateMutation.mutateAsync({
          id: selectedExpense.id,
          updates: processedData,
        });
      } else {
        await createMutation.mutateAsync(processedData);
      }
      setDialogOpen(false);
      toast({ title: "Thành công", description: selectedExpense ? "Đã cập nhật phiếu chi" : "Đã thêm phiếu chi mới thành công" });
    } catch (error: any) {
      console.error("Expense submit error:", error);
      toast({
        title: "Lỗi lưu dữ liệu",
        description: error.message || "Có lỗi xảy ra khi lưu phiếu chi",
        variant: "destructive"
      });
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({ title: "Đồng bộ thành công", description: "Dữ liệu chi phí đã cập nhật" });
    } catch (error) {
      toast({ title: "Lỗi đồng bộ", description: "Không thể cập nhật dữ liệu", variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    import('@/lib/export').then(({ exportToCSV }) => {
      exportToCSV(expenses || [], 'Danh_sach_chi_phi', [
        { key: 'expense_code', header: 'Mã phiếu' },
        { key: 'expense_date', header: 'Ngày chi' },
        { key: 'category.category_name', header: 'Loại chi phí' },
        { key: 'description', header: 'Diễn giải' },
        { key: 'vehicle.license_plate', header: 'Biển số xe' },
        { key: 'amount', header: 'Số tiền' },
        { key: 'status', header: 'Trạng thái' },
      ]);
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleDeleteSelected = async (ids: string[]) => {
    if (ids.length === 0) return;

    // Check locked period
    const lockedItems = expenses?.filter(e => ids.includes(e.id) && isDateInClosedPeriod(e.expense_date, closedPeriods));
    if (lockedItems && lockedItems.length > 0) {
      if (!isSuperUser) {
        toast({ title: 'Chặn xóa', description: `Có ${lockedItems.length} phiếu thuộc kỳ đã khóa. Không thể xóa.`, variant: 'destructive' });
        return;
      }
      if (!window.confirm(`CẢNH BÁO ADMIN: Có ${lockedItems.length} phiếu thuộc kỳ đã khóa. Bạn có chắc chắn muốn xóa?`)) {
        return;
      }
    }

    try {
      await bulkDeleteMutation.mutateAsync(ids);
      setSelectedIds(new Set());
    } catch (error) {
      // handled by hook
    }
  };

  const handleImport = () => {
    setImportDialogOpen(true);
  };

  const handleImportData = async (rows: any[]) => {
    let successCount = 0;
    let errorCount = 0;

    for (const row of rows) {
      try {
        // 1. Lookup Category
        const categoryName = String(row.category_name || '').toLowerCase();
        const category = categories?.find(c => c.category_name.toLowerCase().includes(categoryName));
        if (!category) throw new Error(`Không tìm thấy loại chi phí: ${row.category_name}`);

        // 2. Lookup Vehicle
        let vehicleId = null;
        if (row.license_plate) {
          const vehicle = vehicles?.find(v => v.license_plate.toLowerCase() === String(row.license_plate).toLowerCase());
          vehicleId = vehicle?.id;
        }

        // 3. Lookup Trip
        let tripId = null;
        if (row.trip_code) {
          const trip = trips?.find(t => t.trip_code.toLowerCase() === String(row.trip_code).toLowerCase());
          tripId = trip?.id;
        }

        // 4. Lookup Driver
        let driverId = null;
        if (row.driver_code) {
          const driver = drivers?.find(d => d.driver_code.toLowerCase() === String(row.driver_code).toLowerCase());
          driverId = driver?.id;
        }

        await createMutation.mutateAsync({
          expense_code: String(row.expense_code || `CP-${Date.now()}`),
          expense_date: String(row.expense_date),
          category_id: category.id,
          amount: Number(row.amount) || 0,
          description: String(row.description),
          vehicle_id: vehicleId,
          trip_id: tripId,
          driver_id: driverId,
          document_number: row.document_number ? String(row.document_number) : null,
          vendor_name: row.vendor_name ? String(row.vendor_name) : null,
          status: 'draft',
        });
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Import error", error);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['expenses'] });

    toast({
      title: "Nhập chi phí thành công",
      description: `Đã nhập ${successCount} phiếu chi${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
    });
  };

  // Filter data based on all filters
  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(expense => {
      // Date Range Filter
      if (dateRange.from && expense.expense_date) {
        if (parseISO(expense.expense_date) < dateRange.from) return false;
      }
      if (dateRange.to && expense.expense_date) {
        if (parseISO(expense.expense_date) > dateRange.to) return false;
      }

      // Category filter (multi-select)
      if (categoryFilter.length > 0 && !categoryFilter.includes(expense.category_id)) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          expense.expense_code?.toLowerCase().includes(query) ||
          expense.description?.toLowerCase().includes(query) ||
          expense.category?.category_name?.toLowerCase().includes(query) ||
          expense.vehicle?.license_plate?.toLowerCase().includes(query) ||
          expense.vendor_name?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [expenses, dateRange, categoryFilter, searchQuery]);

  const columns = useMemo<Column<Expense>[]>(() => [
    {
      key: 'expense_code',
      header: 'Mã phiếu',
      width: '120px',
      render: (value) => <span className="font-mono font-medium text-primary">{value as string}</span>,
    },
    {
      key: 'expense_date',
      header: 'Ngày',
      width: '100px',
      render: (value) => formatDate(value as string),
    },
    {
      key: 'category',
      header: 'Loại chi phí',
      width: '150px',
      render: (_, row) => {
        const catType = row.category?.category_type || 'other';
        const Icon = categoryIcons[catType] || Wallet;
        return (
          <span className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            {row.category?.category_name || 'Khác'}
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Diễn giải',
      render: (value) => (
        <span className="truncate max-w-[200px] block" title={value as string}>
          {value as string}
        </span>
      ),
    },
    {
      key: 'vehicle_id',
      header: 'Xe',
      width: '120px',
      render: (_, row) => row.vehicle ? (
        <span className="font-mono text-sm">{row.vehicle.license_plate}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'trip_id',
      header: 'Chuyến',
      width: '100px',
      render: (value, row) => row.trip ? (
        <span className="font-mono text-sm">{row.trip.trip_code}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: 'amount',
      header: 'Số tiền',
      width: '130px',
      align: 'right',
      render: (value) => <span className="tabular-nums font-medium text-red-600">{formatCurrency(value as number)}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '130px',
      render: (value) => <StatusBadge status={value as any} />,
    },
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
    }] : []) as any[]
  ], [handleDeleteClick, canDelete]);

  // KPI Summary
  const kpiSummary = useMemo(() => {
    const totalExpenses = filteredExpenses.length;
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const confirmedAmount = filteredExpenses
      .filter(e => e.status === 'confirmed')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendingCount = filteredExpenses.filter(e => e.status === 'draft').length;

    return { totalExpenses, totalAmount, confirmedAmount, pendingCount };
  }, [filteredExpenses]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Nhập Liệu Chi Phí"
        description="Quản lý và theo dõi chi phí vận hành chi tiết"
      />

      {/* KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Tổng số phiếu</p>
                <p className="text-2xl font-bold text-blue-700">{kpiSummary.totalExpenses}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Tổng chi phí</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(kpiSummary.totalAmount)}</p>
              </div>
              <Wallet className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Đã thanh toán</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(kpiSummary.confirmedAmount)}</p>
              </div>
              <Users className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Chờ duyệt</p>
                <p className="text-2xl font-bold text-amber-700">{kpiSummary.pendingCount} phiếu</p>
              </div>
              <Loader2 className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Toolbar - Matches Vehicles.tsx Pattern */}
      <div className="flex flex-col xl:flex-row gap-2 items-start xl:items-center justify-between bg-muted/10 p-2 rounded-lg border">
        {/* Left Side: Date Filter + Search + Category Chips */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <DateFilter
            range={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
            onChange={(range) => setDateRange({ from: range?.from || null, to: range?.to || null })}
            className="bg-background border rounded-md shadow-sm"
          />

          <div className="relative w-64 shrink-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mã phiếu, diễn giải..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>

          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

          {/* Quick Filter Chips */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
              <X className="w-3 h-3" /> Xóa lọc
            </Button>
          )}
          {/* Select All Button */}
          {categories && categories.length > 0 && (
            <Badge
              variant={categoryFilter.length === categories.length ? "default" : "outline"}
              className="cursor-pointer transition-all text-xs bg-slate-50 hover:bg-slate-100 border-slate-200"
              onClick={() => {
                if (categoryFilter.length === categories.length) {
                  setCategoryFilter([]);
                } else {
                  setCategoryFilter(categories.map((c: any) => c.id));
                }
              }}
            >
              {categoryFilter.length === categories.length ? '✓ Tất cả' : 'Tất cả'}
            </Badge>
          )}
          {categories?.map((cat: any) => {
            const config = categoryConfig[cat.category_type] || categoryConfig.other;
            const Icon = config.icon;
            const isSelected = categoryFilter.includes(cat.id);
            return (
              <Badge
                key={cat.id}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer transition-all text-xs ${isSelected ? '' : config.bgColor}`}
                onClick={() => toggleCategoryFilter(cat.id)}
              >
                <Icon className={`w-3 h-3 mr-1 ${isSelected ? '' : config.color}`} />
                {cat.category_name}
              </Badge>
            );
          })}
        </div>

        {/* Right Side: Actions - Đúng thứ tự chuẩn */}
        <div className="flex items-center gap-1 shrink-0 w-full xl:w-auto justify-end pt-2 xl:pt-0">
          {canDelete && selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteSelected(Array.from(selectedIds))}
              className="h-8 gap-1 mr-2 px-3 shadow-sm animate-in fade-in zoom-in-95"
            >
              <Trash2 className="w-4 h-4" />
              Xóa {selectedIds.size}
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={handleSyncAll} disabled={isSyncing} title="Đồng bộ" className="h-8 w-8">
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>

          {canCreate && (
            <Button variant="outline" size="sm" onClick={handleImport} className="h-8 px-2 lg:px-3">
              <Upload className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Nhập</span>
            </Button>
          )}

          {canExport && (
            <Button variant="outline" size="sm" onClick={handleExport} className="h-8 px-2 lg:px-3">
              <Download className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Xuất</span>
            </Button>
          )}

          {canCreate && (
            <Button size="sm" onClick={handleAdd} className="h-8 gap-1 ml-1">
              <Plus className="w-4 h-4" />
              Thêm phiếu chi
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredExpenses}
        columns={columns}
        selectable
        onRowClick={handleRowClick}
        selectedRowIds={selectedIds}
        onSelectionChange={setSelectedIds}
        hideToolbar={true}
      />

      {/* Import Dialog */}
      <ExcelImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportData}
        entityName="chi phí"
        columns={importColumns}
        sampleData={[
          {
            expense_code: 'CP2603001',
            expense_date: '2024-02-01',
            category_name: 'Nhiên liệu',
            amount: 2000000,
            description: 'Đổ dầu xe 29C-12345',
            license_plate: '29C-12345',
            vendor_name: 'Cây xăng A'
          }
        ]}
        existingCodes={expenses?.map(e => e.expense_code) || []}
        codeField="expense_code"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {selectedExpense ? 'Chi tiết phiếu chi' : 'Thêm phiếu chi mới'}
            </DialogTitle>
            <DialogDescription>
              {selectedExpense
                ? `Mã phiếu: ${selectedExpense.expense_code}`
                : 'Nhập thông tin chi phí phát sinh'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="expense_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã phiếu *</FormLabel>
                      <FormControl>
                        <Input placeholder="VD: CP2603001" {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expense_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngày chi *</FormLabel>
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
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại chi phí *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.category_name}
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số tiền (VND) *</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional: Show custom category name input when "Tự nhập khác" is selected */}
                {form.watch("category_id") === "cat_custom" && (
                  <FormField
                    control={form.control}
                    name="description"
                    render={() => (
                      <FormItem>
                        <FormLabel>Tên loại chi phí tự nhập *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="VD: Phí gửi xe, Bồi thường hàng..."
                            value={(form.getValues() as any).custom_category_name || ""}
                            onChange={(e) => form.setValue("description" as any, e.target.value)}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Nhập tên loại chi phí nếu không có trong danh sách
                        </p>
                      </FormItem>
                    )}
                  />
                )}

                <div className="col-span-1 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diễn giải *</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Chi tiết..." rows={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="trip_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chuyến hàng (nếu có)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn chuyến" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Không chọn --</SelectItem>
                          {trips?.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.trip_code}
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
                  name="vehicle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Xe (nếu có)</FormLabel>
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
                          <SelectItem value="none">-- Không chọn --</SelectItem>
                          {vehicles?.map(v => (
                            <SelectItem 
                                key={v.id} 
                                value={v.id}
                                disabled={v.status !== 'active'}
                            >
                              <div className="flex items-center justify-between w-full pr-2 gap-2">
                                <span>{v.license_plate}</span>
                                {v.status !== 'active' && (
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        ({v.status === 'maintenance' ? 'Đang bảo trì' : 'Ngưng HĐ'})
                                    </span>
                                )}
                              </div>
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
                  name="driver_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tài xế (nếu có)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                        defaultValue={field.value || "none"}
                        value={field.value || "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn tài xế" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">-- Không chọn --</SelectItem>
                          {drivers?.map(d => (
                            <SelectItem 
                                key={d.id} 
                                value={d.id}
                                disabled={d.status !== 'active'}
                            >
                              <div className="flex items-center justify-between w-full pr-2 gap-2">
                                <span>{d.full_name}</span>
                                {d.status !== 'active' && (
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        ({d.status === 'on_leave' ? 'Nghỉ phép' : 'Ngưng HĐ'})
                                    </span>
                                )}
                              </div>
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
                  name="document_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Số chứng từ</FormLabel>
                      <FormControl>
                        <Input placeholder="HD00123" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nhà cung cấp</FormLabel>
                      <FormControl>
                        <Input placeholder="Tên NCC" {...field} value={field.value || ''} />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Nháp</SelectItem>
                          <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                          <SelectItem value="cancelled">Đã hủy</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {selectedExpense ? 'Cập nhật' : 'Thêm mới'}
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
              Hành động này sẽ xóa phiếu chi <strong>{selectedExpense?.expense_code}</strong>.
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
