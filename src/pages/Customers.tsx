import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
// Removed stale Supabase import
import { ExcelImportDialog, ImportColumn } from "@/components/shared/ExcelImportDialog";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Phone, Mail, Loader2, Trash2, AlertTriangle, CheckCircle2, XCircle, Search, Plus, Upload, Download, RefreshCw, FileText } from "lucide-react";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from "@/hooks/useCustomers";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryClient } from "@tanstack/react-query";
import { useBulkDelete } from "@/hooks/useBulkDelete";
import { BulkDeleteDialog } from "@/components/shared/BulkDeleteDialog";
import { BulkDeleteToolbar } from "@/components/shared/BulkDeleteToolbar";
import { Badge } from "@/components/ui/badge";
import { CustomerFilter } from "@/components/customers/CustomerFilter";
import { ColumnChooser } from "@/components/vehicles/ColumnChooser";
import { cn } from "@/lib/utils";
import { getNextCodeByPrefix } from "@/lib/code-generator";
import { customerAdapter } from "@/lib/data-adapter";

// Type definitions
type Customer = z.infer<typeof customerSchema> & { id: string };
type CustomerType = 'Doanh nghiệp' | 'Cá nhân';
type CustomerStatus = 'active' | 'inactive';

// Form Schema Validation
const customerSchema = z.object({
  customer_code: z.string().min(1, "Mã khách hàng là bắt buộc"),
  customer_name: z.string().min(1, "Tên khách hàng là bắt buộc"),
  customer_type: z.enum(['Doanh nghiệp', 'Cá nhân'] as const).default('Doanh nghiệp'),
  short_name: z.string().optional(),
  tax_code: z.string().optional(),
  phone: z.string().optional().refine(
    (val) => !val || /^(0[3-9])\d{8,9}$/.test(val.replace(/[\s.-]/g, '')),
    { message: "Số điện thoại không hợp lệ (VD: 0912345678)" }
  ),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal('')),
  contact_person: z.string().optional(),
  payment_terms: z.coerce.number().min(0, "Kỳ hạn phải >= 0"),
  credit_limit: z.coerce.number().min(0, "Hạn mức phải >= 0"),
  current_debt: z.coerce.number().default(0),
  address: z.string().optional(),
  status: z.enum(['active', 'inactive'] as const).default('active'),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function Customers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { canCreate, canDelete, canExport } = usePermissions('customers');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Import Columns Config
  const importColumns: ImportColumn[] = [
    { key: 'customer_code', header: 'Mã khách hàng', required: true },
    { key: 'customer_name', header: 'Tên khách hàng', required: true },
    { key: 'customer_type', header: 'Loại khách hàng' },
    { key: 'tax_code', header: 'MST' },
    { key: 'contact_person', header: 'Người liên hệ' },
    { key: 'phone', header: 'Điện thoại' },
    { key: 'email', header: 'Email' },
    { key: 'address', header: 'Địa chỉ' },
    { key: 'credit_limit', header: 'Hạn mức nợ', type: 'number' },
    { key: 'payment_terms', header: 'Hạn thanh toán', type: 'number' },
    { key: 'short_name', header: 'Tên viết tắt' },
    { key: 'status', header: 'Trạng thái' },
    { key: 'notes', header: 'Ghi chú' },
  ];

  // Selection State
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Column visibility state
  const allColumnKeys = [
    'customer_code', 'customer_name', 'customer_type', 'tax_code', 'contact_person',
    'phone', 'email', 'address', 'credit_limit', 'current_debt', // 10
    'payment_terms', 'debt_status', 'status', 'notes', 'id' // 14 + id
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys);

  // Filters state
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});

  // Hooks
  const { data: customers, isLoading } = useCustomers();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  // Bulk Delete Hook
  const { deleteIds: deleteCustomers, isDeleting: isBulkDeleting } = useBulkDelete({
    table: 'customers',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedRowIds(new Set());
      setBulkDeleteDialogOpen(false);
    }
  });

  // Form setup
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_code: "",
      customer_name: "",
      customer_type: "Doanh nghiệp",
      short_name: "",
      tax_code: "",
      phone: "",
      email: "",
      contact_person: "",
      payment_terms: 0,
      credit_limit: 0,
      current_debt: 0,
      address: "",
      status: "active",
      notes: "",
    },
  });

  // Filter Logic
  const filteredCustomers = useMemo(() => {
    let result = customers || [];

    // 1. Text Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.customer_code?.toLowerCase().includes(query) ||
        c.customer_name?.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.tax_code?.toLowerCase().includes(query)
      );
    }

    // 2. Advanced Filters
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value) && value.length === 0) return;

      result = result.filter(customer => {
        if (key === 'overdue') {
          const debt = customer.current_debt || 0;
          const limit = customer.credit_limit || 0;
          if (value === true) return debt > limit && limit > 0;
          return true;
        }
        if (key === 'has_debt' && value === true) {
          return (customer.current_debt || 0) > 0;
        }
        if (key === 'customer_type' && Array.isArray(value)) {
          return value.includes(customer.customer_type || 'Doanh nghiệp');
        }
        if (key === 'status' && Array.isArray(value)) {
          return value.includes(customer.status || 'active');
        }
        return true;
      });
    });

    return result;
  }, [customers, searchQuery, activeFilters]);

  // Handlers
  const handleBulkDelete = () => {
    if (selectedRowIds.size > 0) {
      setBulkDeleteDialogOpen(true);
    }
  };

  const confirmBulkDelete = () => {
    deleteCustomers(Array.from(selectedRowIds));
  };

  const handleSelectAll = () => {
    const allIds = filteredCustomers.map(c => c.id);
    setSelectedRowIds(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  const handleAdd = async () => {
    setSelectedCustomer(null);
    let nextCode = 'KH0001';
    try {
      const res = await customerAdapter.getNextCode();
      if (res) nextCode = res;
    } catch (err) {
      console.error("Failed to fetch next customer code", err);
      nextCode = getNextCodeByPrefix(
        (customers || []).map(c => c.customer_code),
        'KH',
        4
      );
    }

    form.reset({
      customer_code: nextCode,
      customer_name: "",
      customer_type: "Doanh nghiệp",
      short_name: "",
      tax_code: "",
      phone: "",
      email: "",
      contact_person: "",
      payment_terms: 0,
      credit_limit: 0,
      current_debt: 0,
      address: "",
      status: "active",
      notes: "",
    });
    setDialogOpen(true);
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.reset({
      customer_code: customer.customer_code,
      customer_name: customer.customer_name,
      customer_type: (customer.customer_type as CustomerType) || "Doanh nghiệp",
      short_name: customer.short_name || "",
      tax_code: customer.tax_code || "",
      phone: customer.phone || "",
      email: customer.email || "",
      contact_person: customer.contact_person || "",
      payment_terms: customer.payment_terms || 0,
      credit_limit: customer.credit_limit || 0,
      current_debt: customer.current_debt || 0,
      address: customer.address || "",
      status: (customer.status as CustomerStatus) || "active",
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = useCallback((e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    // Check if customer has debt before deleting (logic requirement 4)
    if ((customer.current_debt || 0) > 0) {
      toast({
        title: "Không thể xóa",
        description: "Khách hàng đang có công nợ. Vui lòng chuyển trạng thái sang 'Ngưng' thay vì xóa.",
        variant: "destructive"
      });
      return;
    }
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  }, [toast]);

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await deleteMutation.mutateAsync(selectedCustomer.id);
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      if (selectedCustomer) {
        await updateMutation.mutateAsync({
          id: selectedCustomer.id,
          updates: data,
        });
      } else {
        await createMutation.mutateAsync({
          customer_code: data.customer_code,
          customer_name: data.customer_name || 'Khách hàng mới',
          ...data,
        } as any);
      }
      setDialogOpen(false);
      toast({ title: "Thành công", description: selectedCustomer ? "Đã cập nhật thông tin khách hàng" : "Đã thêm khách hàng mới thành công" });
    } catch (error: any) {
      console.error("Customer submit error:", error);
      toast({
        title: "Lỗi lưu dữ liệu",
        description: error.message || "Có lỗi xảy ra khi lưu thông tin khách hàng",
        variant: "destructive"
      });
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "Đồng bộ thành công", description: "Dữ liệu khách hàng đã cập nhật" });
    } catch (error) {
      toast({ title: "Lỗi đồng bộ", description: "Không thể cập nhật dữ liệu", variant: 'destructive' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = () => {
    import('@/lib/export').then(({ exportToCSV }) => {
      exportToCSV(customers || [], 'Danh_sach_khach_hang', [
        { key: 'customer_code', header: 'Mã KH' },
        { key: 'customer_name', header: 'Tên khách hàng' },
        { key: 'customer_type', header: 'Loại KH' },
        { key: 'tax_code', header: 'MST' },
        { key: 'contact_person', header: 'Người liên hệ' },
        { key: 'phone', header: 'Điện thoại' },
        { key: 'email', header: 'Email' },
        { key: 'address', header: 'Địa chỉ' },
        { key: 'credit_limit', header: 'Hạn mức công nợ' },
        { key: 'current_debt', header: 'Công nợ hiện tại' },
        { key: 'payment_terms', header: 'Hạn TT (ngày)' },
        { key: 'status', header: 'Trạng thái KH' },
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
          customer_code: String(row.customer_code),
          customer_name: String(row.customer_name || 'Khách hàng mới'),
          customer_type: (row.customer_type as CustomerType) || 'Doanh nghiệp',
          phone: row.phone ? String(row.phone) : null,
          email: row.email ? String(row.email) : null,
          address: row.address ? String(row.address) : null,
          tax_code: row.tax_code ? String(row.tax_code) : null,
          short_name: row.short_name ? String(row.short_name) : null,
          contact_person: row.contact_person ? String(row.contact_person) : null,
          credit_limit: row.credit_limit ? Number(row.credit_limit) : 0,
          current_debt: 0,
          payment_terms: row.payment_terms ? Number(row.payment_terms) : 0,
          status: (row.status as CustomerStatus) || 'active',
          notes: row.notes ? String(row.notes) : null,
        } as any);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Import error", error);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['customers'] });

    toast({
      title: "Nhập khách hàng thành công",
      description: `Đã nhập ${successCount} khách hàng${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
    });
  };

  // Columns definition (useMemo for stability)
  const columns = useMemo<Column<Customer>[]>(() => [
    {
      key: 'customer_code',
      header: 'Mã KH',
      width: '100px',
      render: (value) => <span className="font-mono font-medium text-xs">{value as string}</span>,
    },
    {
      key: 'customer_name',
      header: 'Tên khách hàng',
      width: '200px',
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="font-medium truncate" title={value as string}>{value as string}</span>
          <span className="text-[10px] text-muted-foreground">{row.customer_type}</span>
        </div>
      ),
    },
    {
      key: 'customer_type',
      header: 'Loại KH',
      width: '100px',
      hidden: true, // Shown in name column subtext, but kept for chooser
    },
    {
      key: 'tax_code',
      header: 'MST',
      width: '100px',
      render: (value) => <span className="font-mono text-xs">{value as string}</span>,
    },
    {
      key: 'contact_person',
      header: 'Người liên hệ',
      width: '140px',
      render: (value) => <span className="text-xs truncate">{value as string}</span>,
    },
    {
      key: 'phone',
      header: 'Điện thoại',
      width: '100px',
      render: (value) => <span className="text-xs">{value as string}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      width: '150px',
      render: (value) => <span className="text-xs truncate max-w-[140px]" title={value as string}>{value as string}</span>,
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      width: '200px',
      render: (value) => <span className="text-xs truncate block max-w-[190px]" title={value as string}>{value as string}</span>,
    },
    {
      key: 'credit_limit',
      header: 'Hạn mức',
      align: 'right',
      width: '110px',
      render: (value) => <span className="tabular-nums text-xs">{formatCurrency(value as number)}</span>,
    },
    {
      key: 'current_debt',
      header: 'Công nợ',
      align: 'right',
      width: '110px',
      render: (value, row) => {
        const debt = value as number || 0;
        const limit = row.credit_limit || 0;
        const isOverLimit = limit > 0 && debt > limit;

        return (
          <div className="flex flex-col items-end">
            <span className={cn(
              "tabular-nums font-medium text-xs",
              isOverLimit ? "text-red-600" : "text-blue-600"
            )}>
              {formatCurrency(debt)}
            </span>
            {isOverLimit && (
              <span className="text-[9px] text-red-500 flex items-center">
                <AlertTriangle className="w-2 h-2 mr-0.5" /> Vượt hạn mức
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'payment_terms',
      header: 'Hạn TT',
      align: 'right',
      width: '80px',
      render: (value) => <span className="text-xs">{value || 0} ngày</span>,
    },
    // Computed 'debt_status' column for display
    {
      key: 'debt_status',
      header: 'TT Công nợ',
      width: '110px',
      render: (_, row) => {
        const debt = row.current_debt || 0;
        const limit = row.credit_limit || 0;
        // Logic: Check if over limit (Warning) or just Normal
        // In real app, we check invoice due dates. Here using Debt > Limit.
        if (limit > 0 && debt > limit) {
          return <Badge variant="destructive" className="text-[10px] h-5 px-1">Vượt hạn mức</Badge>;
        }
        if (debt > 0) {
          return <Badge variant="outline" className="text-[10px] h-5 px-1 border-amber-500 text-amber-600">Đang nợ</Badge>;
        }
        return <Badge variant="secondary" className="text-[10px] h-5 px-1 bg-green-100 text-green-700 hover:bg-green-100">Bình thường</Badge>;
      }
    },
    {
      key: 'status',
      header: 'Trạng thái',
      width: '100px',
      render: (value) => (
        <Badge variant={value === 'active' ? 'default' : 'secondary'} className={cn("text-[10px] h-5 px-1", value === 'active' ? "bg-green-600 hover:bg-green-700" : "")}>
          {value === 'active' ? 'Hoạt động' : 'Ngưng'}
        </Badge>
      )
    },
    {
      key: 'notes',
      header: 'Ghi chú',
      width: '150px',
      render: (value) => <span className="text-xs text-muted-foreground truncate block max-w-[140px]">{value as string}</span>,
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
    }] : []) as Column<Customer>[]
  ], [handleDeleteClick, canDelete]);

  const visibleColumnDefs = columns.filter(col => visibleColumns.includes(String(col.key)));

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
          <h1 className="text-xl font-bold tracking-tight">Danh Mục Khách Hàng</h1>
          <p className="text-muted-foreground text-sm">Quản lý khách hàng và công nợ</p>
        </div>
      </div>

      {/* 2. Unified Toolbar Row */}
      <div className="flex flex-col xl:flex-row gap-2 items-start xl:items-center justify-between bg-muted/10 p-2 rounded-lg border">
        {/* Left Side: Search + Filters */}
        <div className="flex flex-col sm:flex-row flex-1 w-full xl:w-auto gap-2">
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm mã KH, tên, MST..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-background"
            />
          </div>
          <div className="flex-1 overflow-x-auto pb-1 sm:pb-0">
            <CustomerFilter
              data={customers || []}
              activeFilters={activeFilters}
              onFilterChange={setActiveFilters}
              filterConfigs={[
                { key: 'customer_type', label: 'Loại khách hàng', type: 'multi-select' },
                { key: 'status', label: 'Trạng thái KH', type: 'multi-select' },
                { key: 'has_debt', label: 'Đang có nợ', type: 'boolean' },
                { key: 'overdue', label: 'Cảnh báo nợ', type: 'boolean' },
              ]}
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
              Xóa {selectedRowIds.size} khách hàng
            </Button>
          )}

          <ColumnChooser
            columns={columns.map(c => ({ key: String(c.key), header: c.header }))}
            visibleColumns={visibleColumns}
            onVisibilityChange={setVisibleColumns}
            storageKey="customers_visible_columns_v1"
            defaultRequiredKeys={['customer_code', 'customer_name']}
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
              Thêm khách hàng
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredCustomers}
        columns={visibleColumnDefs}
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
        entityName="khách hàng"
        onConfirm={confirmBulkDelete}
        isDeleting={isBulkDeleting}
      />

      {/* Hidden file input for import */}
      <ExcelImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportData}
        entityName="khách hàng"
        columns={importColumns}
        sampleData={[
          {
            customer_code: 'KH0001',
            customer_name: 'Công ty TNHH A',
            customer_type: 'Doanh nghiệp',
            tax_code: '0101234567',
            phone: '0243xxxx',
            address: 'Hà Nội',
            credit_limit: 50000000,
            payment_terms: 30
          }
        ]}
        existingCodes={customers?.map(c => c.customer_code) || []}
        codeField="customer_code"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedCustomer ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer
                ? `Mã KH: ${selectedCustomer.customer_code}`
                : 'Nhập thông tin khách hàng và thiết lập hạn mức tín dụng'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Group 1: Thông tin chung */}
                <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-sm text-blue-600 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Thông tin chung
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customer_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Mã khách hàng *</FormLabel>
                          <FormControl>
                            <Input placeholder="VD: KH0001" {...field} className="h-8" disabled />
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
                          <FormLabel className="text-xs">Mã số thuế</FormLabel>
                          <FormControl>
                            <Input placeholder="012..." {...field} className="h-8" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tên khách hàng *</FormLabel>
                        <FormControl>
                          <Input placeholder="Công ty TNHH..." {...field} className="h-8" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customer_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Loại khách hàng</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Doanh nghiệp">Doanh nghiệp</SelectItem>
                            <SelectItem value="Cá nhân">Cá nhân</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Group 2: Liên hệ */}
                <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-sm text-green-600 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Thông tin liên hệ
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_person"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Người liên hệ</FormLabel>
                          <FormControl>
                            <Input placeholder="Nguyễn Văn A" {...field} className="h-8" />
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
                          <FormLabel className="text-xs">Điện thoại</FormLabel>
                          <FormControl>
                            <Input placeholder="090..." {...field} className="h-8" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} className="h-8" />
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
                        <FormLabel className="text-xs">Địa chỉ</FormLabel>
                        <FormControl>
                          <Input placeholder="Địa chỉ..." {...field} className="h-8" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Group 3: Tài chính & Công nợ */}
                <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-sm text-amber-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Tài chính & Công nợ
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="credit_limit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Hạn mức tín dụng (VNĐ)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-8 font-medium text-blue-600" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Hạn thanh toán (ngày)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} className="h-8" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="current_debt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Công nợ hiện tại (VNĐ)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className="h-8 font-bold text-red-600" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Group 4: Trạng thái & Ghi chú */}
                <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                  <h3 className="font-semibold text-sm text-gray-600 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Khác
                  </h3>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Trạng thái</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Hoạt động</SelectItem>
                            <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Ghi chú</FormLabel>
                        <FormControl>
                          <Textarea {...field} className="h-20" />
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {selectedCustomer ? 'Cập nhật' : 'Thêm mới'}
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
              Hành động này sẽ xóa khách hàng <strong>{selectedCustomer?.customer_name}</strong> khỏi danh sách.
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
