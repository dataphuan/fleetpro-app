import { useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateFilter } from "@/components/shared/DateFilter";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
    Package, Loader2, Trash2, CheckCircle, PlayCircle, XCircle, ArrowRight,
    RefreshCw, Search, Plus, Download, Clock, FileText, TrendingUp, Wallet
} from "lucide-react";
import {
    useTransportOrders,
    useCreateTransportOrder,
    useUpdateTransportOrder,
    useDeleteTransportOrder,
    useConfirmTransportOrder,
    useStartTransportOrder,
    useCompleteTransportOrder,
    useCancelTransportOrder,
    TransportOrder,
} from "@/hooks/useTransportOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { getNextCodeByPrefix } from "@/lib/code-generator";

// Form Schema
const orderSchema = z.object({
    order_code: z.string().optional(),
    customer_id: z.string().min(1, "Khách hàng là bắt buộc"),
    order_date: z.string().min(1, "Ngày đơn hàng là bắt buộc"),
    expected_delivery_date: z.string().optional().nullable(),
    pickup_address: z.string().optional().nullable(),
    delivery_address: z.string().optional().nullable(),
    cargo_description: z.string().optional().nullable(),
    cargo_weight_tons: z.coerce.number().min(0, "Không được âm").nullable(),
    cargo_cbm: z.coerce.number().min(0, "Không được âm").nullable(),
    total_value: z.coerce.number().min(0, "Không được âm"),
    priority: z.enum(['low', 'normal', 'high', 'urgent'] as const),
    notes: z.string().optional().nullable(),
    status: z.enum(['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const priorityLabels: Record<string, string> = {
    low: 'Thấp',
    normal: 'Bình thường',
    high: 'Cao',
    urgent: 'Khẩn cấp',
};

const priorityColors: Record<string, string> = {
    low: 'text-muted-foreground',
    normal: 'text-foreground',
    high: 'text-orange-600 dark:text-orange-400 font-medium',
    urgent: 'text-red-600 dark:text-red-400 font-bold',
};

const statusLabels: Record<string, string> = {
    draft: 'Nháp',
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận',
    in_progress: 'Đang vận chuyển',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
};

export default function TransportOrders() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { canCreate, canDelete, canExport } = usePermissions('transport-orders');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<TransportOrder | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter State
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
    const [customerFilter, setCustomerFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [isDriverFilterActive, setIsDriverFilterActive] = useState(false);

    // Data Hooks
    const { data: orders, isLoading } = useTransportOrders();
    const { data: customers } = useCustomers();

    // Mutation Hooks
    const createMutation = useCreateTransportOrder();
    const updateMutation = useUpdateTransportOrder();
    const deleteMutation = useDeleteTransportOrder();
    const confirmMutation = useConfirmTransportOrder();
    const startMutation = useStartTransportOrder();
    const completeMutation = useCompleteTransportOrder();
    const cancelMutation = useCancelTransportOrder();

    // Form setup
    const form = useForm<OrderFormValues>({
        resolver: zodResolver(orderSchema),
        defaultValues: {
            order_code: "",
            customer_id: "",
            order_date: format(new Date(), 'yyyy-MM-dd'),
            expected_delivery_date: "",
            pickup_address: "",
            delivery_address: "",
            cargo_description: "",
            cargo_weight_tons: 0,
            cargo_cbm: 0,
            total_value: 0,
            priority: 'normal',
            notes: "",
            status: 'draft',
        },
    });

    // Handlers
    const handleAdd = useCallback(async () => {
        setSelectedOrder(null);
        const monthlyPrefix = `DH${format(new Date(), 'yyMM')}`;
        const nextCode = getNextCodeByPrefix(
            (orders || []).map(o => o.order_code),
            monthlyPrefix,
            4
        );

        form.reset({
            order_code: nextCode,
            customer_id: "",
            order_date: format(new Date(), 'yyyy-MM-dd'),
            expected_delivery_date: "",
            pickup_address: "",
            delivery_address: "",
            cargo_description: "",
            cargo_weight_tons: 0,
            cargo_cbm: 0,
            total_value: 0,
            priority: 'normal',
            notes: "",
            status: 'draft',
        });
        setDialogOpen(true);
    }, [form]);

    const handleRowClick = useCallback((order: TransportOrder) => {
        setSelectedOrder(order);
        form.reset({
            order_code: order.order_code,
            customer_id: order.customer_id,
            order_date: format(parseISO(order.order_date), 'yyyy-MM-dd'),
            expected_delivery_date: order.expected_delivery_date ? format(parseISO(order.expected_delivery_date), 'yyyy-MM-dd') : "",
            pickup_address: order.pickup_address || "",
            delivery_address: order.delivery_address || "",
            cargo_description: order.cargo_description || "",
            cargo_weight_tons: order.cargo_weight_tons || 0,
            cargo_cbm: order.cargo_cbm || 0,
            total_value: order.total_value || 0,
            priority: order.priority || 'normal',
            notes: order.notes || "",
            status: order.status || 'draft',
        });
        setDialogOpen(true);
    }, [form]);

    const handleDeleteClick = useCallback((e: React.MouseEvent, order: TransportOrder) => {
        e.stopPropagation();
        setSelectedOrder(order);
        setDeleteDialogOpen(true);
    }, []);

    const handleConfirmDelete = async () => {
        if (!selectedOrder) return;
        try {
            await deleteMutation.mutateAsync(selectedOrder.id);
            setDeleteDialogOpen(false);
            setSelectedOrder(null);
        } catch {
            // handled by hook
        }
    };

    const handleDeleteSelected = (ids: string[]) => {
        if (ids.length === 0) return;
        setSelectedIds(new Set(ids));
        setDeleteAllDialogOpen(true);
    };

    const handleConfirmDeleteAll = async () => {
        let successCount = 0;
        let errorCount = 0;
        for (const id of Array.from(selectedIds)) {
            try {
                await deleteMutation.mutateAsync(id);
                successCount++;
            } catch {
                errorCount++;
            }
        }
        setDeleteAllDialogOpen(false);
        setSelectedIds(new Set());
        toast({
            title: "Xóa hoàn tất",
            description: `Đã xóa ${successCount} đơn hàng${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`,
        });
    };

    const onSubmit = async (data: OrderFormValues) => {
        const processedData = {
            ...data,
            expected_delivery_date: data.expected_delivery_date === "" ? null : data.expected_delivery_date,
            notes: data.notes === "" ? null : data.notes,
        };

        try {
            if (selectedOrder) {
                await updateMutation.mutateAsync({
                    id: selectedOrder.id,
                    updates: processedData,
                });
            } else {
                await createMutation.mutateAsync(processedData);
            }
            setDialogOpen(false);
        } catch (error: any) {
            toast({
                title: "Lỗi lưu dữ liệu",
                description: error.message || "Có lỗi xảy ra",
                variant: "destructive"
            });
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            await queryClient.invalidateQueries({ queryKey: ['transportOrders'] });
            toast({ title: "Làm mới thành công", description: "Dữ liệu đơn hàng đã cập nhật" });
        } catch {
            toast({ title: "Lỗi đồng bộ", description: "Không thể cập nhật dữ liệu", variant: 'destructive' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExport = () => {
        import('@/lib/export').then(({ exportToCSV }) => {
            exportToCSV(orders || [], 'Danh_sach_don_hang', [
                { key: 'order_code', header: 'Mã đơn' },
                { key: 'customer.customer_name', header: 'Khách hàng' },
                { key: 'order_date', header: 'Ngày đặt hàng' },
                { key: 'expected_delivery_date', header: 'Ngày giao dự kiến' },
                { key: 'cargo_description', header: 'Mô tả hàng' },
                { key: 'cargo_weight_tons', header: 'Trọng lượng (tấn)' },
                { key: 'total_value', header: 'Giá trị' },
                { key: 'priority', header: 'Ưu tiên' },
                { key: 'status', header: 'Trạng thái' },
            ]);
        });
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    // Clear all filters
    const clearFilters = () => {
        setDateRange({ from: null, to: null });
        setCustomerFilter("all");
        setPriorityFilter("all");
        setStatusFilter("all");
        setSearchQuery("");
    };

    // Check if any filter is active
    const hasActiveFilters = dateRange.from || dateRange.to || customerFilter !== "all" || priorityFilter !== "all" || statusFilter !== "all" || searchQuery || isDriverFilterActive;

    // Filter data with all smart filters
    const filteredOrders = useMemo(() => {
        return (orders || []).filter(order => {
            // Date range filter
            if (dateRange.from && order.order_date) {
                if (parseISO(order.order_date) < dateRange.from) return false;
            }
            if (dateRange.to && order.order_date) {
                if (parseISO(order.order_date) > dateRange.to) return false;
            }

            // Customer filter
            if (customerFilter !== "all" && order.customer_id !== customerFilter) {
                return false;
            }

            // Priority filter
            if (priorityFilter !== "all" && order.priority !== priorityFilter) {
                return false;
            }

            // Status filter
            if (statusFilter !== "all" && order.status !== statusFilter) {
                return false;
            }

            // Driver requests filter
            if (isDriverFilterActive && order.source !== 'driver-self-draft') {
                return false;
            }

            // Search query filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    order.order_code?.toLowerCase().includes(query) ||
                    order.cargo_description?.toLowerCase().includes(query) ||
                    order.customer?.customer_name?.toLowerCase().includes(query) ||
                    order.pickup_address?.toLowerCase().includes(query) ||
                    order.delivery_address?.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [orders, dateRange, customerFilter, priorityFilter, statusFilter, searchQuery, isDriverFilterActive]);

    // KPI Summary
    const kpiSummary = useMemo(() => {
        const totalOrders = filteredOrders.length;
        const totalValue = filteredOrders.reduce((sum, o) => sum + (o.total_value || 0), 0);
        const confirmedValue = filteredOrders
            .filter(o => o.status === 'confirmed' || o.status === 'in_progress' || o.status === 'completed')
            .reduce((sum, o) => sum + (o.total_value || 0), 0);
        const inProgressCount = filteredOrders.filter(o => o.status === 'in_progress').length;
        const pendingCount = filteredOrders.filter(o => o.status === 'draft' || o.status === 'confirmed').length;
        const urgentCount = filteredOrders.filter(o => o.priority === 'urgent' || o.priority === 'high').length;

        return { totalOrders, totalValue, confirmedValue, inProgressCount, pendingCount, urgentCount };
    }, [filteredOrders]);

    // State transition buttons for the selected order
    const renderStateActions = () => {
        if (!selectedOrder) return null;
        const s = selectedOrder.status;
        const anyPending = confirmMutation.isPending || startMutation.isPending || completeMutation.isPending || cancelMutation.isPending;

        return (
            <div className="flex gap-2 flex-wrap border-t pt-4 mt-2">
                <span className="text-sm text-muted-foreground flex items-center mr-2">Chuyển trạng thái:</span>
                {s === 'draft' && (
                    <>
                        <Button size="sm" variant="default" disabled={anyPending}
                            onClick={async () => { await confirmMutation.mutateAsync(selectedOrder.id); setDialogOpen(false); }}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Xác nhận
                        </Button>
                        {selectedOrder.source === 'driver-self-draft' && (
                            <Button size="sm" variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" disabled={anyPending}
                                onClick={async () => { 
                                    await confirmMutation.mutateAsync(selectedOrder.id);
                                    setDialogOpen(false);
                                    toast({ title: "Đã phê duyệt", description: "Yêu cầu của tài xế đã được chuyển thành đơn hàng chính thức." });
                                }}>
                                <Sparkles className="w-4 h-4 mr-1" /> Phê duyệt & Điều xe
                            </Button>
                        )}
                        <Button size="sm" variant="destructive" disabled={anyPending}
                            onClick={async () => { await cancelMutation.mutateAsync(selectedOrder.id); setDialogOpen(false); }}>
                            <XCircle className="w-4 h-4 mr-1" /> Hủy
                        </Button>
                    </>
                )}
                {s === 'confirmed' && (
                    <>
                        <Button size="sm" variant="default" disabled={anyPending}
                            onClick={async () => { await startMutation.mutateAsync(selectedOrder.id); setDialogOpen(false); }}>
                            <PlayCircle className="w-4 h-4 mr-1" /> Bắt đầu vận chuyển
                        </Button>
                        <Button size="sm" variant="destructive" disabled={anyPending}
                            onClick={async () => { await cancelMutation.mutateAsync(selectedOrder.id); setDialogOpen(false); }}>
                            <XCircle className="w-4 h-4 mr-1" /> Hủy
                        </Button>
                    </>
                )}
                {s === 'in_progress' && (
                    <>
                        <Button size="sm" variant="default" disabled={anyPending}
                            onClick={async () => { await completeMutation.mutateAsync(selectedOrder.id); setDialogOpen(false); }}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Hoàn thành
                        </Button>
                        <Button size="sm" variant="destructive" disabled={anyPending}
                            onClick={async () => { await cancelMutation.mutateAsync(selectedOrder.id); setDialogOpen(false); }}>
                            <XCircle className="w-4 h-4 mr-1" /> Hủy
                        </Button>
                    </>
                )}
                {(s === 'completed' || s === 'cancelled') && (
                    <span className="text-sm italic text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="w-4 h-4" /> {statusLabels[s]} — trạng thái cuối cùng
                    </span>
                )}
            </div>
        );
    };

    const columns = useMemo<Column<TransportOrder>[]>(() => [
        {
            key: 'order_code',
            header: 'Mã đơn',
            width: '120px',
            render: (value) => <span className="font-mono font-medium">{value as string}</span>,
        },
        {
            key: 'customer',
            header: 'Khách hàng',
            render: (_, row) => <span>{row.customer?.customer_name || '—'}</span>,
        },
        {
            key: 'requested_by_driver_email',
            header: 'Người yêu cầu',
            render: (value, row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-blue-700">{value as string || '—'}</span>
                    <span className="text-[10px] text-muted-foreground">{row.requested_area || ''}</span>
                </div>
            ),
        },
        {
            key: 'order_date',
            header: 'Ngày đặt',
            render: (value) => formatDate(value as string),
        },
        {
            key: 'expected_delivery_date',
            header: 'Giao dự kiến',
            render: (value) => value ? formatDate(value as string) : <span className="text-muted-foreground">-</span>,
        },
        {
            key: 'cargo_description',
            header: 'Mô tả hàng',
            render: (value) => value ? <span className="truncate max-w-[200px] inline-block">{value as string}</span> : <span className="text-muted-foreground">-</span>,
        },
        {
            key: 'total_value',
            header: 'Giá trị',
            align: 'right',
            render: (value) => <span className="tabular-nums">{formatCurrency(value as number)}</span>,
        },
        {
            key: 'priority',
            header: 'Ưu tiên',
            width: '100px',
            render: (value) => <span className={priorityColors[value as string]}>{priorityLabels[value as string] || value}</span>,
        },
        {
            key: 'status',
            header: 'Trạng thái',
            width: '140px',
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
                title="Đơn Hàng Vận Chuyển"
                description="Quản lý đơn hàng vận chuyển và theo dõi tiến độ giao hàng"
            />

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Tổng đơn hàng</p>
                                <p className="text-2xl font-bold text-blue-700">{kpiSummary.totalOrders}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-emerald-600 font-medium">Tổng giá trị</p>
                                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(kpiSummary.totalValue)}</p>
                            </div>
                            <Wallet className="w-8 h-8 text-emerald-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 font-medium">Đang vận chuyển</p>
                                <p className="text-2xl font-bold text-amber-700">{kpiSummary.inProgressCount} đơn</p>
                            </div>
                            <PlayCircle className="w-8 h-8 text-amber-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-purple-600 font-medium">Chờ xử lý</p>
                                <p className="text-2xl font-bold text-purple-700">{kpiSummary.pendingCount} đơn</p>
                            </div>
                            <Clock className="w-8 h-8 text-purple-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Unified Toolbar */}
            <div className="flex flex-col xl:flex-row gap-2 items-start xl:items-center justify-between bg-muted/10 p-2 rounded-lg border">
                {/* Left Side: Filters */}
                <div className="flex flex-wrap items-center gap-2 flex-1">
                    <DateFilter
                        range={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
                        onChange={(range) => setDateRange({ from: range?.from || null, to: range?.to || null })}
                        className="bg-background border rounded-md shadow-sm"
                    />

                    <div className="relative w-64 shrink-0">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm mã đơn, hàng hóa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 bg-background"
                        />
                    </div>

                    <Select value={customerFilter} onValueChange={setCustomerFilter}>
                        <SelectTrigger className="w-[160px] h-9 bg-background">
                            <SelectValue placeholder="Khách hàng" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả KH</SelectItem>
                            {customers?.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.customer_name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[130px] h-9 bg-background">
                            <SelectValue placeholder="Ưu tiên" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="urgent">Khẩn cấp</SelectItem>
                            <SelectItem value="high">Cao</SelectItem>
                            <SelectItem value="normal">Bình thường</SelectItem>
                            <SelectItem value="low">Thấp</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] h-9 bg-background">
                            <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả</SelectItem>
                            <SelectItem value="draft">Nháp</SelectItem>
                            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                            <SelectItem value="in_progress">Đang vận chuyển</SelectItem>
                            <SelectItem value="completed">Hoàn thành</SelectItem>
                            <SelectItem value="cancelled">Đã hủy</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button 
                        variant={isDriverFilterActive ? "default" : "outline"}
                        size="sm"
                        className={`h-9 gap-1 transition-all ${isDriverFilterActive ? "bg-blue-600 shadow-blue-200 shadow-md text-white hover:bg-blue-700" : "text-blue-600 border-blue-200"}`}
                        onClick={() => setIsDriverFilterActive(!isDriverFilterActive)}
                    >
                        <Users className={`w-4 h-4 ${isDriverFilterActive ? "text-white" : "text-blue-600"}`} />
                        <span className="hidden lg:inline text-xs font-semibold">Yêu cầu từ Tài xế</span>
                    </Button>

                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1">
                            × Xóa lọc
                        </Button>
                    )}
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-1 shrink-0 w-full xl:w-auto justify-end pt-2 xl:pt-0">
                    {canDelete && selectedIds.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSelected(Array.from(selectedIds))}
                            className="h-8 gap-1 mr-2 px-3 shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Xóa {selectedIds.size}
                        </Button>
                    )}

                    <Button variant="ghost" size="icon" onClick={handleSyncAll} disabled={isSyncing} title="Đồng bộ" className="h-8 w-8">
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    </Button>

                    {canExport && (
                        <Button variant="outline" size="sm" onClick={handleExport} className="h-8 px-2 lg:px-3">
                            <Download className="w-4 h-4 lg:mr-2" />
                            <span className="hidden lg:inline">Xuất</span>
                        </Button>
                    )}

                    {canCreate && (
                        <Button size="sm" onClick={handleAdd} className="h-8 gap-1 ml-1">
                            <Plus className="w-4 h-4" />
                            Tạo đơn hàng
                        </Button>
                    )}
                </div>
            </div>

            <DataTable
                data={filteredOrders}
                columns={columns}
                selectable
                onRowClick={handleRowClick}
                selectedRowIds={selectedIds}
                onSelectionChange={setSelectedIds}
                hideToolbar={true}
            />

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            {selectedOrder ? 'Chi tiết đơn hàng' : 'Tạo đơn hàng mới'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedOrder
                                ? `Mã đơn: ${selectedOrder.order_code} — ${statusLabels[selectedOrder.status]}`
                                : 'Nhập thông tin đơn hàng vận chuyển'}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="order_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mã đơn *</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Tự động tạo" {...field} disabled />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField control={form.control} name="customer_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Khách hàng *</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn khách hàng" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {customers?.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.customer_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField control={form.control} name="order_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ngày đặt hàng *</FormLabel>
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

                                <FormField control={form.control} name="expected_delivery_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ngày giao dự kiến</FormLabel>
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

                                <FormField control={form.control} name="pickup_address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Địa chỉ lấy hàng</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nơi lấy hàng..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField control={form.control} name="delivery_address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Địa chỉ giao hàng</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nơi giao hàng..." {...field} value={field.value || ''} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-1 md:col-span-2">
                                    <FormField control={form.control} name="cargo_description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Mô tả hàng hóa</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Loại hàng, số lượng, đặc biệt..." rows={2} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField control={form.control} name="cargo_weight_tons"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Trọng lượng (tấn)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} value={field.value || 0} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField control={form.control} name="cargo_cbm"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Thể tích (CBM)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} value={field.value || 0} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField control={form.control} name="total_value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá trị đơn hàng (VNĐ)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="1000" {...field} value={field.value || 0} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField control={form.control} name="priority"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Mức ưu tiên</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn ưu tiên" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="low">Thấp</SelectItem>
                                                    <SelectItem value="normal">Bình thường</SelectItem>
                                                    <SelectItem value="high">Cao</SelectItem>
                                                    <SelectItem value="urgent">Khẩn cấp</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-1 md:col-span-2">
                                    <FormField control={form.control} name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ghi chú</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Ghi chú thêm..." rows={2} {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* State transition buttons */}
                            {selectedOrder && renderStateActions()}

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Hủy
                                </Button>
                                {(!selectedOrder || (selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled')) && (
                                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                        {(createMutation.isPending || updateMutation.isPending) && (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        )}
                                        {selectedOrder ? 'Cập nhật' : 'Tạo đơn'}
                                    </Button>
                                )}
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa đơn hàng</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn xóa đơn hàng "{selectedOrder?.order_code}"? Thao tác này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Dialog */}
            <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa nhiều đơn hàng</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc muốn xóa {selectedIds.size} đơn hàng đã chọn?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Xóa tất cả
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
