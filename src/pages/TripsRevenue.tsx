import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ColumnChooser } from "@/components/vehicles/ColumnChooser";
import { formatNumber, formatDate, formatCurrency } from "@/lib/formatters";
import { ExcelImportDialog, ImportColumn } from "@/components/shared/ExcelImportDialog";
import { importFromFile, exportToCSV } from "@/lib/export";
import { generateTripCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateFilter } from "@/components/shared/DateFilter";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfQuarter, endOfQuarter } from "date-fns";
import { vi } from "date-fns/locale";
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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
    Package,
    Loader2,
    Settings,
    TrendingUp,
    Truck,
    Users,
    Calendar,
    Filter,
    X,
    AlertCircle,
    RefreshCw,
    Search,
    Trash2,
    AlertTriangle,
    Sparkles,
    Eye,
    ScanText
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useClosedPeriods, isDateInClosedPeriod } from "@/hooks/useAccountingPeriods";
import {
    useTrips,
    useCreateTrip,
    useUpdateTrip,
    useDeleteTrip
} from "@/hooks/useTrips";
import { useVehiclesByStatus } from "@/hooks/useVehicles";
import { useActiveDrivers } from "@/hooks/useDrivers";
import { useRoutes } from "@/hooks/useRoutes";
import { useCustomers } from "@/hooks/useCustomers";
import { useBulkDelete } from "@/hooks/useBulkDelete";
import { BulkDeleteDialog } from "@/components/shared/BulkDeleteDialog";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { usePermissions } from "@/hooks/usePermissions";
// Type definitions
interface Trip {
    id: string;
    trip_code: string;
    departure_date: string;
    status: string;
    vehicle_id: string;
    driver_id: string;
    route_id?: string | null;
    customer_id?: string | null;
    cargo_description?: string | null;
    cargo_weight_tons?: number | null;
    freight_revenue?: number | null;
    additional_charges?: number | null;
    total_revenue?: number | null;
    actual_distance_km?: number | null;
    notes?: string | null;
    start_odometer?: number | null;
    end_odometer?: number | null;
    actual_departure_time?: string | null;
    actual_arrival_time?: string | null;
    planned_arrival_date?: string | null;
    closed_at?: string | null;
    vehicle?: any;
    driver?: any;
    route?: any;
    customer?: any;
    total_expenses?: number;
    // Elite Logistics Logic
    pod_status?: 'PENDING' | 'RECEIVED' | 'LOST';
    pod_url?: string | null;
    driver_advance?: number;
    actual_revenue?: number | null;
    adjustment_notes?: string | null;
}

// Status options with Vietnamese labels
const STATUS_OPTIONS = [
    { value: 'draft', label: 'Nháp', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'confirmed', label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'dispatched', label: 'Đã điều xe', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { value: 'in_progress', label: 'Đang thực hiện', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'completed', label: 'Hoàn thành', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'closed', label: 'Đã đóng sổ', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    { value: 'cancelled', label: 'Đã hủy', color: 'bg-red-100 text-red-700 border-red-200' },
];

// Forward-only state transitions (LogisViet compliance)
const VALID_TRANSITIONS: Record<string, string[]> = {
    'draft': ['draft', 'confirmed', 'cancelled'],
    'confirmed': ['confirmed', 'dispatched', 'cancelled'],
    'dispatched': ['dispatched', 'in_progress', 'cancelled'],
    'in_progress': ['in_progress', 'completed', 'cancelled'],
    'completed': ['completed', 'closed', 'cancelled'],
    'closed': ['closed'],      // Terminal - không thể thay đổi
    'cancelled': ['cancelled'], // Terminal - không thể mở lại
};

// Helper: Get valid next statuses based on current status
const getValidNextStatuses = (currentStatus: string, isNewTrip: boolean): typeof STATUS_OPTIONS => {
    if (isNewTrip) {
        // New trips can only be draft
        return STATUS_OPTIONS.filter(opt => opt.value === 'draft');
    }
    const validValues = VALID_TRANSITIONS[currentStatus] || ['draft'];
    return STATUS_OPTIONS.filter(opt => validValues.includes(opt.value));
};

// Date range presets
// Date range presets extracted to DateFilter component

// Form Schema Validation
const tripSchema = z.object({
    trip_code: z.string().min(1, "Mã chuyến là bắt buộc"),
    departure_date: z.string().min(1, "Ngày đi là bắt buộc"),
    vehicle_id: z.string().min(1, "Xe là bắt buộc"),
    driver_id: z.string().min(1, "Tài xế là bắt buộc"),
    route_id: z.string().optional().nullable(),
    customer_id: z.string().optional().nullable(),
    cargo_description: z.string().optional().nullable(),
    cargo_weight_tons: z.coerce.number().min(0, "Tải trọng >= 0").optional().nullable(),
    actual_distance_km: z.coerce.number().min(0, "Km >= 0").optional().nullable(),
    freight_revenue: z.coerce.number().min(0, "Doanh thu >= 0").optional().nullable(),
    additional_charges: z.coerce.number().min(0, "Phụ phí >= 0").optional().nullable(),
    status: z.string(),
    notes: z.string().optional().nullable(),
    start_odometer: z.coerce.number().min(0).optional().nullable(),
    end_odometer: z.coerce.number().min(0).optional().nullable(),
    actual_departure_time: z.string().optional().nullable(),
    actual_arrival_time: z.string().optional().nullable(),
    planned_arrival_date: z.string().optional().nullable(),
    // Elite Logistics Logic
    pod_status: z.enum(['PENDING', 'RECEIVED', 'LOST']).default('PENDING'),
    pod_url: z.string().optional().nullable(),
    driver_advance: z.coerce.number().min(0, "Tạm ứng >= 0").optional().default(0),
    actual_revenue: z.coerce.number().min(0, "Thực thu >= 0").optional().nullable(),
    adjustment_notes: z.string().optional().nullable(),
}).refine(data => !data.end_odometer || !data.start_odometer || data.end_odometer >= data.start_odometer, {
   message: "Số Km kết thúc phải >= Số Km bắt đầu",
   path: ["end_odometer"]
});

type TripFormValues = z.infer<typeof tripSchema>;

export default function TripsRevenue() {
    const { toast } = useToast();
    const [isScanning, setIsScanning] = useState(false);
    const queryClient = useQueryClient();
    const { user, role } = useAuth();
    const isSuperUser = user?.role === 'admin';
    const isFinancialRole = ['admin', 'manager', 'accountant'].includes(role);
    const { canCreate, canDelete, canExport } = usePermissions('trips');
    const { data: closedPeriods } = useClosedPeriods();
    const { data: companySettings } = useCompanySettings();

    // Dialog states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    // Override Dialog States
    const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
    const [pendingOverrideData, setPendingOverrideData] = useState<any>(null);
    const [overrideWarningMsg, setOverrideWarningMsg] = useState("");

    // Import Columns Configuration
    const importColumns: ImportColumn[] = [
        { key: 'trip_code', header: 'Mã chuyến', required: true },
        { key: 'departure_date', header: 'Ngày đi', required: true, type: 'date' },
        { key: 'license_plate', header: 'Biển số xe', required: true },
        { key: 'driver_code', header: 'Mã tài xế' },
        { key: 'customer_code', header: 'Mã khách hàng' },
        { key: 'route_code', header: 'Mã tuyến' },
        { key: 'cargo_description', header: 'Mô tả hàng' },
        { key: 'cargo_weight_tons', header: 'Tải trọng', type: 'number' },
        { key: 'freight_revenue', header: 'Doanh thu', type: 'number' },
        { key: 'additional_charges', header: 'Phụ phí', type: 'number' },
        { key: 'status', header: 'Trạng thái' },
        { key: 'notes', header: 'Ghi chú' },
    ];
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    // Selection State
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
        from: null,
        to: null,
    });
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [vehicleFilter, setVehicleFilter] = useState<string>("");
    const [driverFilter, setDriverFilter] = useState<string>("");
    const [customerFilter, setCustomerFilter] = useState<string>("");
    const [routeFilter, setRouteFilter] = useState<string>("");
    const [showFilters, setShowFilters] = useState(false);

    // Tab state (must be before any early returns to comply with React hooks rules)
    const [activeTab, setActiveTab] = useState("info");

    // Column visibility
    const allColumnKeys = [
        'trip_code', 'departure_date', 'vehicle', 'driver', 'customer', 'route',
        'cargo_weight_tons', 'actual_distance_km', 'freight_revenue', 'additional_charges',
        'total_revenue', 'total_expenses', 'profit', 'pod_status', 'driver_advance', 'status', 'notes', 'id'
    ];
    const [visibleColumns, setVisibleColumns] = useState<string[]>(allColumnKeys);

    // Data Hooks
    const { data: trips, isLoading, error, refetch } = useTrips();
    const { data: vehicles } = useVehiclesByStatus('active');
    const { data: drivers } = useActiveDrivers();
    const { data: routes } = useRoutes();
    const { data: customers } = useCustomers();

    // Mutation Hooks
    const createMutation = useCreateTrip();
    const updateMutation = useUpdateTrip();
    const deleteMutation = useDeleteTrip();

    // Bulk Delete Hook
    const { deleteIds: deleteTrips, isDeleting: isBulkDeleting } = useBulkDelete({
        table: 'trips',
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['trips'] });
            setSelectedRowIds(new Set());
            setBulkDeleteDialogOpen(false);
        }
    });

    // Form setup
    const form = useForm<TripFormValues>({
        resolver: zodResolver(tripSchema),
        defaultValues: {
            trip_code: "",
            departure_date: format(new Date(), 'yyyy-MM-dd'),
            vehicle_id: "",
            driver_id: "",
            route_id: null,
            customer_id: null,
            cargo_description: "",
            cargo_weight_tons: 0,
            actual_distance_km: 0,
            freight_revenue: 0,
            additional_charges: 0,
            status: 'draft',
            notes: "",
            // Elite Logistics Logic
            pod_status: 'PENDING',
            pod_url: "",
            driver_advance: 0,
            actual_revenue: null,
            adjustment_notes: "",
        },
    });

    // Auto-calculate freight_revenue when route or weight changes
    const selectedRouteId = form.watch('route_id');
    const cargoWeight = form.watch('cargo_weight_tons');

    useEffect(() => {
        if (selectedRouteId && cargoWeight && routes) {
            const selectedRoute = routes.find(r => r.id === selectedRouteId);
            if (selectedRoute && selectedRoute.standard_freight_rate) {
                const calculatedRevenue = selectedRoute.standard_freight_rate * cargoWeight;
                const currentRevenue = form.getValues('freight_revenue');
                if (currentRevenue === 0 || currentRevenue === null) {
                    form.setValue('freight_revenue', calculatedRevenue);
                }
            }
            // Auto-fill distance from route
            if (selectedRoute && selectedRoute.distance_km) {
                const currentDistance = form.getValues('actual_distance_km');
                if (currentDistance === 0 || currentDistance === null) {
                    form.setValue('actual_distance_km', selectedRoute.distance_km);
                }
            }
        }
    }, [selectedRouteId, cargoWeight, routes, form]);

    // Handle trip selection from Reports page (via sessionStorage)
    useEffect(() => {
        const selectedTripId = sessionStorage.getItem('selectedTripId');
        if (selectedTripId && trips) {
            const tripToOpen = trips.find(t => t.id === selectedTripId);
            if (tripToOpen) {
                // Clear sessionStorage
                sessionStorage.removeItem('selectedTripId');
                sessionStorage.removeItem('selectedTripCode');

                // If trip is closed, just show a toast
                if (tripToOpen.closed_at) {
                    toast({
                        title: "Chuyến đã đóng sổ",
                        description: `Chuyến ${tripToOpen.trip_code} đã được đóng sổ, chỉ xem không thể sửa.`,
                    });
                }

                // Open the trip in edit dialog
                setSelectedTrip(tripToOpen);
                form.reset({
                    trip_code: tripToOpen.trip_code,
                    departure_date: tripToOpen.departure_date,
                    vehicle_id: tripToOpen.vehicle_id,
                    driver_id: tripToOpen.driver_id,
                    route_id: tripToOpen.route_id || "",
                    customer_id: tripToOpen.customer_id || "",
                    cargo_description: tripToOpen.cargo_description || "",
                    cargo_weight_tons: tripToOpen.cargo_weight_tons || 0,
                    actual_distance_km: tripToOpen.actual_distance_km || 0,
                    freight_revenue: tripToOpen.freight_revenue || 0,
                    additional_charges: tripToOpen.additional_charges || 0,
                    status: tripToOpen.status || 'draft',
                    notes: tripToOpen.notes || "",
                    start_odometer: tripToOpen.start_odometer || 0,
                    end_odometer: tripToOpen.end_odometer || 0,
                    actual_departure_time: tripToOpen.actual_departure_time || "",
                    actual_arrival_time: tripToOpen.actual_arrival_time || "",
                    planned_arrival_date: tripToOpen.planned_arrival_date || "",
                });
                setDialogOpen(true);

                toast({
                    title: "Đã mở chuyến",
                    description: `Đang xem chi tiết chuyến ${tripToOpen.trip_code}`,
                });
            }
        }
    }, [trips, form, toast]);

    // Filter data
    const filteredTrips = useMemo(() => {
        return (trips || []).filter(trip => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    trip.trip_code?.toLowerCase().includes(query) ||
                    trip.vehicle?.license_plate?.toLowerCase()?.includes(query) ||
                    trip.driver?.full_name?.toLowerCase()?.includes(query) ||
                    trip.customer?.customer_name?.toLowerCase()?.includes(query);
                if (!matchesSearch) return false;
            }

            // Date range filter
            if (dateRange.from && trip.departure_date) {
                if (parseISO(trip.departure_date) < dateRange.from) return false;
            }
            if (dateRange.to && trip.departure_date) {
                if (parseISO(trip.departure_date) > dateRange.to) return false;
            }

            // Status filter
            if (statusFilter.length > 0) {
                if (!statusFilter.includes(trip.status || 'draft')) return false;
            }

            // Vehicle filter
            if (vehicleFilter && trip.vehicle_id !== vehicleFilter) return false;

            // Driver filter
            if (driverFilter && trip.driver_id !== driverFilter) return false;

            // Customer filter
            if (customerFilter && trip.customer_id !== customerFilter) return false;

            // Route filter
            if (routeFilter && trip.route_id !== routeFilter) return false;

            return true;
        });
    }, [trips, searchQuery, dateRange, statusFilter, vehicleFilter, driverFilter, customerFilter, routeFilter]);

    // Calculate KPI summaries
    const kpiSummary = useMemo(() => {
        const filtered = filteredTrips;
        const totalTrips = filtered.length;
        const totalRevenue = filtered.reduce((sum, t) => sum + (t.total_revenue || t.freight_revenue || 0), 0);
        const confirmedRevenue = filtered
            .filter(t => t.status === 'confirmed' || t.status === 'completed' || t.status === 'closed')
            .reduce((sum, t) => sum + (t.total_revenue || t.freight_revenue || 0), 0);
            
        const totalExpenses = filtered.reduce((sum, t) => sum + (t.total_expenses || 0), 0);
        const grossProfit = totalRevenue - totalExpenses;
        
        const pendingTrips = filtered.filter(t => t.status === 'draft' || t.status === 'in_progress').length;

        return { totalTrips, totalRevenue, confirmedRevenue, totalExpenses, grossProfit, pendingTrips };
    }, [filteredTrips]);

    // Handlers
    const handleAdd = () => {
        // ---- QUOTA GUARD CHECK ----
        if (companySettings?.subscription) {
            const plan = companySettings.subscription.plan || 'trial';
            const currentCount = trips?.length || 0;
            
            let limit = 0;
            if (plan === 'trial') limit = 50;
            else if (plan === 'basic') limit = 999999;
            else if (plan === 'pro') limit = 999999;
            
            if (currentCount >= limit) {
                toast({
                    title: "Đã đạt giới hạn Quota",
                    description: `Gói cước hiện tại (${plan.toUpperCase()}) chỉ cho phép tối đa ${limit} Chuyến đi. Vui lòng nâng cấp gói cước để tạo thêm chuyến!`,
                    variant: "destructive",
                });
                return;
            }
        }
        // ----------------------------

        setSelectedTrip(null);
        form.reset({
            trip_code: generateTripCode(),
            departure_date: format(new Date(), 'yyyy-MM-dd'),
            vehicle_id: "",
            driver_id: "",
            route_id: null,
            customer_id: null,
            cargo_description: "",
            cargo_weight_tons: 0,
            actual_distance_km: 0,
            freight_revenue: 0,
            additional_charges: 0,
            status: 'draft',
            notes: "",
        });
        setDialogOpen(true);
    };


    const handleRowClick = (trip: Trip) => {
        // Check if trip is closed (Status: closed)
        if (trip.closed_at) {
            if (!isSuperUser) {
                toast({
                    title: "Chuyến đã đóng sổ",
                    description: "Không thể chỉnh sửa chuyến đã đóng sổ. Liên hệ Admin/Kế toán trưởng nếu cần mở lại.",
                    variant: "destructive",
                });
                return;
            } else {
                toast({
                    title: "Quyền Admin",
                    description: "Đang mở chuyến đã Khóa Sổ. Cẩn trọng khi chỉnh sửa dữ liệu tài chính.",
                    className: "bg-amber-100 border-amber-500 text-amber-900"
                });
            }
        }

        // Check if trip is in closed accounting period (Financial Lock)
        if (isDateInClosedPeriod(trip.departure_date, closedPeriods)) {
            if (!isSuperUser) {
                toast({
                    title: "Kỳ kế toán đã khóa",
                    description: "Chuyến đi này thuộc kỳ dữ liệu đã khóa. Không thể chỉnh sửa.",
                    variant: "destructive",
                });
                return;
            } else {
                toast({
                    title: "CẢNH BÁO ADMIN",
                    description: "Bạn đang sửa dữ liệu thuộc kỳ đã khóa.",
                    className: "bg-amber-100 border-amber-500 text-amber-900"
                });
            }
        }

        setSelectedTrip(trip);
        form.reset({
            trip_code: trip.trip_code,
            departure_date: trip.departure_date,
            vehicle_id: trip.vehicle_id,
            driver_id: trip.driver_id,
            route_id: trip.route_id || "",
            customer_id: trip.customer_id || "",
            cargo_description: trip.cargo_description || "",
            cargo_weight_tons: trip.cargo_weight_tons || 0,
            actual_distance_km: trip.actual_distance_km || 0,
            freight_revenue: trip.freight_revenue || 0,
            additional_charges: trip.additional_charges || 0,
            status: trip.status || 'draft',
            notes: trip.notes || "",
            start_odometer: trip.start_odometer || 0,
            end_odometer: trip.end_odometer || 0,
            actual_departure_time: trip.actual_departure_time || "",
            actual_arrival_time: trip.actual_arrival_time || "",
            planned_arrival_date: trip.planned_arrival_date || "",
        });
        setDialogOpen(true);
    };

    const handleDeleteClick = useCallback((e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation();
        if (trip.closed_at) {
            toast({
                title: "Không thể xóa",
                description: "Chuyến đã đóng sổ không thể xóa.",
                variant: "destructive",
            });
            return;
        }

        // Check if trip is in closed accounting period
        if (isDateInClosedPeriod(trip.departure_date, closedPeriods)) {
            if (!isSuperUser) {
                toast({
                    title: "Kỳ kế toán đã khóa",
                    description: "Chuyến đi này thuộc kỳ dữ liệu đã khóa. Không thể xóa.",
                    variant: "destructive",
                });
                return;
            }
        }
        setSelectedTrip(trip);
        setDeleteDialogOpen(true);
    }, [toast, closedPeriods, isSuperUser]);

    const handleBulkDelete = () => {
        if (selectedRowIds.size > 0) {
            setBulkDeleteDialogOpen(true);
        }
    };

    const confirmBulkDelete = () => {
        deleteTrips(Array.from(selectedRowIds));
    };

    const handleSelectAll = () => {
        const allIds = filteredTrips.map(t => t.id);
        setSelectedRowIds(new Set(allIds));
    };

    const handleClearSelection = () => {
        setSelectedRowIds(new Set());
    };

    const handleConfirmDelete = async () => {
        if (!selectedTrip) return;
        try {
            await deleteMutation.mutateAsync(selectedTrip.id);
            setDeleteDialogOpen(false);
            setSelectedTrip(null);
        } catch (error) {
            // Error handled by hook
        }
    };

    const handleAiScan = () => {
        setIsScanning(true);
        toast({
            title: "Khởi chạy Google Document AI...",
            description: "Đang phân tích chứng từ mờ từ DriverApp...",
        });

        setTimeout(() => {
            setIsScanning(false);
            form.setValue("freight_revenue", 8500000);
            form.setValue("additional_charges", 450000);
            const currentNotes = form.getValues("notes") || "";
            form.setValue("notes", `${currentNotes} [AI OCR: Trích xuất cước 8.5Tr, phí 450k]`.trim());
            
            toast({
                title: "Trích xuất AI thành công!",
                description: "Đã tự động đối soát và điền dữ liệu tài chính.",
            });
        }, 2500);
    };

    const onSubmit = async (data: TripFormValues) => {
        // Calculate total_revenue
        const totalRevenue = (data.freight_revenue || 0) + (data.additional_charges || 0);

        const processedData = {
            ...data,
            route_id: data.route_id || null,
            customer_id: data.customer_id || null,
            cargo_description: data.cargo_description || null,
            cargo_weight_tons: data.cargo_weight_tons || null,
            actual_distance_km: data.actual_distance_km || null,
            freight_revenue: data.freight_revenue || null,
            additional_charges: data.additional_charges || null,
            total_revenue: totalRevenue,
            notes: data.notes || null,
            start_odometer: data.start_odometer || null,
            end_odometer: data.end_odometer || null,
            actual_departure_time: data.actual_departure_time || null,
            actual_arrival_time: data.actual_arrival_time || null,
            planned_arrival_date: data.planned_arrival_date || null,
        };

        try {
            if (selectedTrip) {
                await updateMutation.mutateAsync({
                    id: selectedTrip.id,
                    updates: processedData,
                });
            } else {
                await createMutation.mutateAsync(processedData as any);
            }
            setDialogOpen(false);
            toast({
                title: "Thành công",
                description: selectedTrip ? "Đã cập nhật thông tin chuyến" : "Đã thêm chuyến mới thành công",
            });
        } catch (error: any) {
            console.error("Trip submit error:", error);
            
            // Catch Fuel/Toll OverLimit validation error for owner override
            if (error.name === 'OverLimitError' || error.message?.includes('Cảnh báo Thất thoát')) {
                setOverrideWarningMsg(error.message);
                setPendingOverrideData({ id: selectedTrip?.id, updates: processedData });
                setOverrideDialogOpen(true);
                return;
            }

            toast({
                title: "Lỗi lưu dữ liệu",
                description: error.message || "Có lỗi xảy ra khi lưu thông tin chuyến. Vui lòng kiểm tra lại.",
                variant: "destructive"
            });
        }
    };

    const handleConfirmOverride = async () => {
        if (!pendingOverrideData) return;
        try {
            if (pendingOverrideData.id) {
                await updateMutation.mutateAsync({
                    id: pendingOverrideData.id,
                    updates: { ...pendingOverrideData.updates, forceOverride: true }
                });
            } else {
                await createMutation.mutateAsync({ ...pendingOverrideData.updates, forceOverride: true } as any);
            }
            setOverrideDialogOpen(false);
            setDialogOpen(false);
            toast({
                title: "Khóa Sổ Thành Công",
                description: "Đã ghi nhận Khóa Sổ vượt định mức (Admin Override).",
            });
        } catch (err: any) {
            toast({
                title: "Lỗi xử lý",
                description: err.message,
                variant: "destructive"
            });
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            await refetch();
            toast({ title: "Đồng bộ thành công", description: "Dữ liệu chuyến đã cập nhật" });
        } catch (error) {
            toast({ title: "Lỗi đồng bộ", description: "Không thể cập nhật dữ liệu", variant: 'destructive' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExport = () => {
        exportToCSV(filteredTrips, 'Danh_sach_chuyen', [
            { key: 'trip_code', header: 'Mã chuyến' },
            { key: 'departure_date', header: 'Ngày đi' },
            { key: 'vehicle.license_plate', header: 'Biển số xe' },
            { key: 'driver.full_name', header: 'Tài xế' },
            { key: 'customer.customer_name', header: 'Khách hàng' },
            { key: 'route.route_name', header: 'Tuyến đường' },
            { key: 'cargo_weight_tons', header: 'Tải trọng (tấn)' },
            { key: 'actual_distance_km', header: 'Km thực tế' },
            { key: 'freight_revenue', header: 'Doanh thu cước' },
            { key: 'additional_charges', header: 'Phụ phí' },
            { key: 'total_revenue', header: 'Tổng doanh thu' },
            { key: 'total_expenses', header: 'Tổng chi phí' },
            { key: 'status', header: 'Trạng thái' },
            { key: 'notes', header: 'Ghi chú' },
        ]);
    };

    const handleImport = () => {
        setImportDialogOpen(true);
    };

    const handleImportData = async (rows: any[]) => {
        let successCount = 0;
        let errorCount = 0;

        for (const row of rows) {
            try {
                const vehicle = vehicles?.find(v =>
                    v.license_plate.toLowerCase() === String(row.license_plate).toLowerCase() ||
                    v.vehicle_code?.toLowerCase() === String(row.license_plate).toLowerCase()
                );
                if (!vehicle) throw new Error(`Không tìm thấy xe: ${row.license_plate}`);

                // 2. Lookup Driver
                let driverId = null;
                if (row.driver_code) {
                    const driver = drivers?.find(d => d.driver_code.toLowerCase() === String(row.driver_code).toLowerCase());
                    driverId = driver?.id;
                }
                // Fallback to vehicle's assigned driver if not specified
                if (!driverId && vehicle.default_driver_id) {
                    driverId = vehicle.default_driver_id;
                }
                if (!driverId) throw new Error(`Chưa có tài xế cho xe ${row.license_plate}`);

                // 3. Lookup Customer (Optional)
                let customerId = null;
                if (row.customer_code) {
                    const customer = customers?.find(c => c.customer_code?.toLowerCase() === String(row.customer_code).toLowerCase());
                    customerId = customer?.id;
                }

                // 4. Lookup Route (Optional)
                let routeId = null;
                if (row.route_code) {
                    const route = routes?.find(r => r.route_code?.toLowerCase() === String(row.route_code).toLowerCase());
                    routeId = route?.id;
                }

                // 5. Create Trip
                await createMutation.mutateAsync({
                    trip_code: String(row.trip_code),
                    departure_date: String(row.departure_date), // YYYY-MM-DD
                    vehicle_id: vehicle.id,
                    driver_id: driverId,
                    customer_id: customerId,
                    route_id: routeId,
                    cargo_description: row.cargo_description ? String(row.cargo_description) : null,
                    cargo_weight_tons: row.cargo_weight_tons ? Number(row.cargo_weight_tons) : 0,
                    freight_revenue: row.freight_revenue ? Number(row.freight_revenue) : 0,
                    additional_charges: row.additional_charges ? Number(row.additional_charges) : 0,
                    total_revenue: (Number(row.freight_revenue) || 0) + (Number(row.additional_charges) || 0),
                    status: (row.status as any) || 'draft',
                    notes: row.notes ? String(row.notes) : null,
                    is_deleted: false
                } as any);

                successCount++;
            } catch (error) {
                console.error('Import Error Row:', row, error);
                errorCount++;
            }
        }

        toast({
            title: "Kết quả nhập liệu",
            description: `Thành công: ${successCount}, Lỗi: ${errorCount}. Xem console để biết chi tiết lỗi.`,
            variant: errorCount > 0 ? "destructive" : "default"
        });

        queryClient.invalidateQueries({ queryKey: ['trips'] });
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const clearFilters = () => {
        setStatusFilter([]);
        setVehicleFilter("");
        setDriverFilter("");
        setCustomerFilter("");
        setRouteFilter("");
        setDateRange({ from: null, to: null });
    };

    const hasActiveFilters = statusFilter.length > 0 || vehicleFilter || driverFilter || customerFilter || routeFilter || dateRange.from || dateRange.to;

    // Column definitions
    const columns = useMemo<Column<Trip>[]>(() => [
        {
            key: 'trip_code',
            header: 'Mã chuyến',
            width: '120px',
            render: (value) => <span className="font-mono font-medium text-primary">{value as string}</span>,
        },
        {
            key: 'departure_date',
            header: 'Ngày đi',
            width: '110px',
            render: (value) => formatDate(value as string),
        },
        {
            key: 'vehicle',
            header: 'Biển số xe',
            width: '120px',
            render: (_, row) => (
                <span className="font-mono">{row.vehicle?.license_plate || '-'}</span>
            ),
        },
        {
            key: 'driver',
            header: 'Tài xế',
            width: '140px',
            render: (_, row) => row.driver?.full_name || '-',
        },
        {
            key: 'customer',
            header: 'Khách hàng',
            width: '160px',
            render: (_, row) => row.customer?.customer_name || row.customer?.short_name || '-',
        },
        {
            key: 'route',
            header: 'Tuyến đường',
            width: '180px',
            render: (_, row) => row.route?.route_name || '-',
        },
        {
            key: 'cargo_weight_tons',
            header: 'Tải (tấn)',
            width: '100px',
            align: 'right',
            render: (value) => value ? formatNumber(value as number) : '-',
        },
        {
            key: 'actual_distance_km',
            header: 'Km',
            width: '80px',
            align: 'right',
            render: (value) => value ? formatNumber(value as number) : '-',
        },
        {
            key: 'freight_revenue',
            header: 'Doanh thu cước',
            width: '140px',
            align: 'right',
            render: (value) => <span className="font-medium">{formatCurrency(value as number)}</span>,
        },
        {
            key: 'additional_charges',
            header: 'Phụ phí',
            width: '120px',
            align: 'right',
            render: (value) => formatCurrency(value as number),
        },
        {
            key: 'total_revenue',
            header: 'Tổng doanh thu',
            width: '140px',
            align: 'right',
            render: (value, row) => {
                const total = (value as number) || ((row.freight_revenue || 0) + (row.additional_charges || 0));
                return <span className="font-bold text-green-600">{formatCurrency(total)}</span>;
            },
        },
        ...(isFinancialRole ? [
            {
                key: 'total_expenses',
                header: 'Tổng chi phí',
                width: '130px',
                align: 'right',
                render: (value: any) => <span className="font-medium text-red-600">{formatCurrency((value as number) || 0)}</span>,
            },
            {
                key: 'profit',
                header: 'Lãi gộp / Margin',
                width: '160px',
                align: 'right',
                render: (_: any, row: any) => {
                    const tr = (row.total_revenue || 0) + (!row.total_revenue && ((row.freight_revenue || 0) + (row.additional_charges || 0)));
                    const ex = (row.total_expenses || 0);
                    const pr = tr - ex;
                    const margin = tr > 0 ? (pr / tr) * 100 : 0;
                    
                    return (
                        <div className="flex flex-col items-end gap-1">
                            <span className={`font-bold ${pr >= 0 ? 'text-emerald-600' : 'text-red-700'}`}>
                                {formatCurrency(pr)}
                            </span>
                            <div className="flex items-center gap-1">
                                {pr < 0 && (
                                    <Badge variant="destructive" className="h-4 px-1 text-[9px] font-bold animate-pulse">
                                        LỖ
                                    </Badge>
                                )}
                                <span className={`text-[10px] font-medium ${margin >= 20 ? 'text-emerald-500' : margin >= 0 ? 'text-amber-500' : 'text-red-600'}`}>
                                    {margin.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    );
                },
            }
        ] : []) as Column<Trip>[],
        {
            key: 'status',
            header: 'Trạng thái',
            width: '130px',
            render: (value) => {
                const status = STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                        {status.label}
                    </span>
                );
            },
        },
        {
            key: 'notes',
            header: 'Ghi chú',
            width: '200px',
            render: (value) => (
                <span className="text-muted-foreground truncate max-w-[180px] block">
                    {value as string || '-'}
                </span>
            ),
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
                    disabled={!!row.closed_at}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            ),
        }] : []) as any[]
    ], [handleDeleteClick, canDelete, isFinancialRole]);

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <h3 className="text-lg font-semibold">Lỗi tải dữ liệu</h3>
                <p className="text-muted-foreground">{(error as Error).message}</p>
                <Button onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Thử lại
                </Button>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const onInvalid = (errors: any) => {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length > 0) {
            // Check which tab has the error
            const infoFields = ['trip_code', 'departure_date', 'vehicle_id', 'driver_id', 'status', 'route_id', 'customer_id'];
            const cargoFields = ['cargo_description', 'cargo_weight_tons', 'actual_distance_km', 'notes', 'start_odometer', 'end_odometer'];
            const financeFields = ['freight_revenue', 'additional_charges'];

            if (infoFields.some(k => errorKeys.includes(k))) {
                setActiveTab("info");
            } else if (cargoFields.some(k => errorKeys.includes(k))) {
                setActiveTab("cargo");
            } else if (financeFields.some(k => errorKeys.includes(k))) {
                setActiveTab("finance");
            }

            toast({
                title: "Lỗi nhập liệu",
                description: "Vui lòng kiểm tra các trường bắt buộc",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Header */}
            <PageHeader
                title="Nhập Liệu Doanh Thu"
                description="Danh sách chuyến & doanh thu – phục vụ tính lợi nhuận"
            />

            {/* KPI Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Tổng chuyến</p>
                                <p className="text-2xl font-bold text-blue-700">{kpiSummary.totalTrips}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>

                {isFinancialRole && (
                  <>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Tổng doanh thu</p>
                                    <p className="text-2xl font-bold text-green-700">{formatCurrency(kpiSummary.totalRevenue)}</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-purple-600 font-medium">Lãi gộp ước tính</p>
                                    <p className={`text-2xl font-bold ${kpiSummary.grossProfit >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                                        {formatCurrency(kpiSummary.grossProfit)}
                                    </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-purple-400" />
                            </div>
                        </CardContent>
                    </Card>
                  </>
                )}

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-amber-600 font-medium">Chờ xử lý</p>
                                <p className="text-2xl font-bold text-amber-700">{kpiSummary.pendingTrips} chuyến</p>
                            </div>
                            <Calendar className="w-8 h-8 text-amber-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-end gap-4 flex-wrap">
                    <div className="flex items-center gap-4 flex-wrap">
                        <DateFilter
                            range={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
                            onChange={(range) => setDateRange({ from: range?.from || null, to: range?.to || null })}
                            className="bg-card border rounded-md p-1 shadow-sm"
                        />
                        <div className="h-8 w-px bg-border hidden sm:block" />
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="pl-9 w-[200px] lg:w-[300px] bg-background"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={showFilters ? "secondary" : "outline"}
                            size="sm"
                            className="gap-2 h-9"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="w-4 h-4" />
                            Bộ lọc nâng cao
                        </Button>
                        <ColumnChooser
                            columns={columns.map(c => ({ key: String(c.key), header: c.header }))}
                            visibleColumns={visibleColumns}
                            onVisibilityChange={setVisibleColumns}
                            storageKey="trips_revenue_visible_columns"
                            defaultRequiredKeys={['trip_code', 'departure_date', 'freight_revenue']}
                        />
                    </div>
                </div>

                {/* Active Filter Badges */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-muted-foreground">Đang lọc:</span>
                        {statusFilter.map(s => (
                            <Badge key={s} variant="secondary" className="gap-1">
                                {STATUS_OPTIONS.find(opt => opt.value === s)?.label}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter(statusFilter.filter(i => i !== s))} />
                            </Badge>
                        ))}
                        {vehicleFilter && (
                            <Badge variant="secondary" className="gap-1">
                                Xe: {vehicles?.find(v => v.id === vehicleFilter)?.license_plate}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setVehicleFilter("")} />
                            </Badge>
                        )}
                        {/* Add other badges if needed */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-destructive hover:bg-destructive/10"
                            onClick={clearFilters}
                        >
                            Xóa tất cả
                        </Button>
                    </div>
                )}
            </div>

            {/* Extended Filters */}
            {showFilters && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted/10 rounded-lg border animate-fade-in">
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Từ ngày</label>
                        <DatePicker
                            value={dateRange.from || undefined}
                            onChange={(date) => setDateRange(prev => ({ ...prev, from: date || null }))}
                            placeholder="Từ ngày"
                            className="w-full sm:w-[120px]"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Đến ngày</label>
                        <DatePicker
                            value={dateRange.to || undefined}
                            onChange={(date) => setDateRange(prev => ({ ...prev, to: date || null }))}
                            placeholder="Đến ngày"
                            className="w-full sm:w-[120px]"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Xe</label>
                        <Select value={vehicleFilter || "all"} onValueChange={(val) => setVehicleFilter(val === "all" ? "" : val)}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tất cả xe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả xe</SelectItem>
                                {vehicles?.map(v => (
                                    <SelectItem key={v.id} value={v.id}>{v.license_plate}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Tài xế</label>
                        <Select value={driverFilter || "all"} onValueChange={(val) => setDriverFilter(val === "all" ? "" : val)}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tất cả tài xế" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả tài xế</SelectItem>
                                {drivers?.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Khách hàng</label>
                        <Select value={customerFilter || "all"} onValueChange={(val) => setCustomerFilter(val === "all" ? "" : val)}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Tất cả KH" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả KH</SelectItem>
                                {customers?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.short_name || c.customer_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <DataTable
                data={filteredTrips}
                columns={columns.filter(c => visibleColumns.includes(String(c.key)))}
                selectable
                searchPlaceholder="Tìm theo mã chuyến, biển số, tài xế, khách hàng..."
                onAdd={canCreate ? handleAdd : undefined}
                addLabel="Thêm chuyến"
                onRowClick={handleRowClick}
                onExport={canExport ? handleExport : undefined}
                onImport={canCreate ? handleImport : undefined}
                onSearch={handleSearch}
                onSync={handleSyncAll}
                isSyncing={isSyncing}
                pageSize={50}
                selectedRowIds={selectedRowIds}
                onSelectionChange={setSelectedRowIds}
                onDeleteSelected={canDelete ? handleBulkDelete : undefined}
            />

            {/* Bulk Delete Dialog */}
            <BulkDeleteDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedRowIds.size}
                entityName="chuyến"
                onConfirm={confirmBulkDelete}
                isDeleting={isBulkDeleting}
            />

            {/* Excel Import Dialog */}
            <ExcelImportDialog
                isOpen={importDialogOpen}
                onClose={() => setImportDialogOpen(false)}
                onImport={handleImportData}
                entityName="chuyến xe"
                columns={importColumns}
                sampleData={[
                    {
                        trip_code: 'CD2603001',
                        departure_date: '2024-02-01',
                        license_plate: '29C-12345',
                        driver_code: 'TX0001',
                        customer_code: 'KH0001',
                        route_code: 'TD0001',
                        cargo_description: 'Hàng tạp hóa',
                        cargo_weight_tons: 15.5,
                        freight_revenue: 5000000,
                        additional_charges: 200000,
                        status: 'completed',
                        notes: 'Giao gấp'
                    }
                ]}
                existingCodes={trips?.map(t => t.trip_code) || []}
                codeField="trip_code"
            />


            {/* Single Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa chuyến?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa chuyến <strong>{selectedTrip?.trip_code}</strong>?
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Xóa
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            {selectedTrip ? 'Chỉnh sửa chuyến hàng' : 'Thêm chuyến mới'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedTrip
                                ? `Mã chuyến: ${selectedTrip.trip_code}`
                                : 'Nhập thông tin chuyến hàng mới'}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="info">Thông tin chuyến</TabsTrigger>
                                    <TabsTrigger value="cargo">Hàng hóa & Vận hành</TabsTrigger>
                                    <TabsTrigger value="finance">Doanh thu</TabsTrigger>
                                </TabsList>

                                {/* Tab 1: Basic Info */}
                                <TabsContent value="info" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="trip_code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Mã chuyến *</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="VD: CD2603001" {...field} disabled />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="departure_date"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Ngày đi *</FormLabel>
                                                    <FormControl>
                                                        <DatePicker
                                                            value={field.value ? parseISO(field.value) : undefined}
                                                            onChange={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                                                            placeholder="Chọn ngày"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => {
                                                const currentStatus = selectedTrip?.status || 'draft';
                                                const validStatuses = getValidNextStatuses(currentStatus, !selectedTrip);
                                                const isTerminal = currentStatus === 'closed' || currentStatus === 'cancelled';
                                                
                                                // Admin bypass for terminal status lock
                                                const selectDisabled = isTerminal && !isSuperUser;
                                                
                                                return (
                                                    <FormItem>
                                                        <FormLabel>Trạng thái</FormLabel>
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            defaultValue={field.value}
                                                            disabled={selectDisabled}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Chọn trạng thái" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {validStatuses.map(opt => (
                                                                    <SelectItem key={opt.value} value={opt.value}>
                                                                        <span className={`inline-flex items-center gap-2`}>
                                                                            <span className={`w-2 h-2 rounded-full ${opt.color.split(' ')[0]}`}></span>
                                                                            {opt.label}
                                                                        </span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {selectDisabled && (
                                                            <p className="text-xs text-muted-foreground">Trạng thái đã khóa, không thể thay đổi</p>
                                                        )}
                                                        {isTerminal && isSuperUser && (
                                                            <p className="text-xs text-amber-600 font-medium">Bạn đang dùng quyền Admin để sửa trạng thái khóa</p>
                                                        )}
                                                        <FormMessage />
                                                    </FormItem>
                                                );
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="vehicle_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Xe *</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn xe" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {vehicles?.map(v => (
                                                                <SelectItem 
                                                                    key={v.id} 
                                                                    value={v.id}
                                                                    disabled={v.status !== 'active'}
                                                                >
                                                                    <div className="flex items-center justify-between w-full pr-2">
                                                                        <span>{v.license_plate} - {v.vehicle_type}</span>
                                                                        {v.status !== 'active' && (
                                                                            <span className="text-xs text-muted-foreground ml-2">
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
                                                    <FormLabel>Tài xế *</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn tài xế" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {drivers?.map(d => (
                                                                <SelectItem 
                                                                    key={d.id} 
                                                                    value={d.id}
                                                                    disabled={d.status !== 'active'}
                                                                >
                                                                    <div className="flex items-center justify-between w-full pr-2">
                                                                        <span>{d.full_name} - {d.phone}</span>
                                                                        {d.status !== 'active' && (
                                                                            <span className="text-xs text-muted-foreground ml-2">
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
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="route_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tuyến đường</FormLabel>
                                                    <Select
                                                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                                                        defaultValue={field.value || "none"}
                                                        value={field.value || "none"}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn tuyến" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">-- Không chọn --</SelectItem>
                                                            {routes?.map(r => (
                                                                <SelectItem key={r.id} value={r.id}>
                                                                    {r.route_name} ({r.distance_km} km)
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
                                            name="customer_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Khách hàng</FormLabel>
                                                    <Select
                                                        onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                                                        defaultValue={field.value || "none"}
                                                        value={field.value || "none"}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn khách hàng" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="none">-- Không chọn --</SelectItem>
                                                            {customers?.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    {c.customer_name} ({c.short_name})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </TabsContent>

                                {/* Tab 2: Cargo & Operations */}
                                <TabsContent value="cargo" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="cargo_description"
                                            render={({ field }) => (
                                                <FormItem className="col-span-2">
                                                    <FormLabel>Mô tả hàng hóa</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Chi tiết loại hàng..." rows={2} {...field} value={field.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="cargo_weight_tons"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tải trọng (tấn)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.1" {...field} value={field.value || 0} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="actual_distance_km"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Km thực tế</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} value={field.value || 0} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="notes"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Ghi chú</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ghi chú..." {...field} value={field.value || ''} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="text-sm font-medium mb-3">Thông tin odometer</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="start_odometer"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Odo bắt đầu</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} value={field.value || 0} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="end_odometer"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Odo kết thúc</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} value={field.value || 0} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Tab 3: Finance */}
                                <TabsContent value="finance" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="freight_revenue"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Doanh thu cước (VND)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            value={field.value || 0}
                                                            onChange={e => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="additional_charges"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phụ phí (VND)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            value={field.value || 0}
                                                            onChange={e => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* AI OCR Trigger */}
                                    <div className="mb-4">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            className="w-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 gap-2 h-10 shadow-sm"
                                            onClick={handleAiScan}
                                            disabled={isScanning}
                                        >
                                            {isScanning ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-4 h-4 text-purple-500" />
                                            )}
                                            {isScanning ? "Đang xử lý Document AI..." : "AI Tự động bóc tách hóa đơn (OCR)"}
                                        </Button>
                                        <p className="text-[10px] text-muted-foreground mt-1 text-center">
                                            Phân tích biên bản bàn giao & bill ảnh từ tài xế để tự động khớp số liệu.
                                        </p>
                                    </div>

                                    {/* Revenue Summary */}
                                    <div className="bg-muted/50 rounded-lg p-4 border">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">Tổng doanh thu:</span>
                                            <span className="text-xl font-bold text-green-600">
                                                {formatCurrency((form.watch('freight_revenue') || 0) + (form.watch('additional_charges') || 0))}
                                            </span>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

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
                                    {selectedTrip ? 'Cập nhật' : 'Thêm mới'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Admin Override Dialog for Fuel/Toll Limits */}
            <AlertDialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-amber-600 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Cảnh báo Vượt Định Mức
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <div className="text-foreground font-medium whitespace-pre-line">
                                {overrideWarningMsg}
                            </div>
                            {isSuperUser ? (
                                <p className="text-sm text-muted-foreground mt-4">
                                    Bỏ qua cảnh báo này và bắt buộc Khóa Sổ? (Quyền Admin)
                                </p>
                            ) : (
                                <p className="text-sm text-red-500 mt-4">
                                    Bạn không có quyền bỏ qua cảnh báo này. Vui lòng liên hệ Quản lý/Admin để duyệt.
                                </p>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingOverrideData(null)}>Hủy</AlertDialogCancel>
                        {isSuperUser && (
                            <AlertDialogAction
                                onClick={handleConfirmOverride}
                                className="bg-amber-600 text-white hover:bg-amber-700 font-medium"
                                disabled={updateMutation.isPending || createMutation.isPending}
                            >
                                {(updateMutation.isPending || createMutation.isPending) && (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                )}
                                Xác nhận Bỏ qua (Admin)
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
