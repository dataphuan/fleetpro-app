import { useState, useRef, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { generateTripCode } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Loader2, Trash2, CalendarCheck } from "lucide-react";
import {
    useTrips,
    useCreateTrip,
    useUpdateTrip,
    useDeleteTrip,
    useTrip
} from "@/hooks/useTrips";
import { useVehiclesByStatus } from "@/hooks/useVehicles";
import { useDrivers, useActiveDrivers } from "@/hooks/useDrivers";
import { useRoutes } from "@/hooks/useRoutes";
import { useCustomers } from "@/hooks/useCustomers";
import { useClosedPeriods, isDateInClosedPeriod } from '@/hooks/useAccountingPeriods';
import { useQueryClient } from "@tanstack/react-query";
// Types
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
    notes?: string | null;
    start_odometer?: number | null;
    end_odometer?: number | null;
    actual_departure_time?: string | null;
    actual_arrival_time?: string | null;
    vehicle?: any;
    driver?: any;
    route?: any;
    customer?: any;
    total_expense?: number;
    profit?: number;
}

// Valid status values
const STATUS_OPTIONS = [
    { value: 'draft', label: 'Nháp' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'dispatched', label: 'Đã điều xe' },
    { value: 'in_progress', label: 'Đang làm hàng' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'closed', label: 'Đã đóng' },
    { value: 'cancelled', label: 'Hủy' },
];

// Form Schema
const tripSchema = z.object({
    trip_code: z.string().optional(), // Auto-generated if empty
    vehicle_id: z.string().min(1, "Xe là bắt buộc"),
    driver_id: z.string().min(1, "Tài xế là bắt buộc"),
    route_id: z.string().optional().nullable(),
    customer_id: z.string().optional().nullable(),
    departure_date: z.string().min(1, "Ngày đi là bắt buộc"),
    cargo_description: z.string().optional().nullable(),
    cargo_weight_tons: z.coerce.number().min(0).nullable(),
    freight_revenue: z.coerce.number().min(0, "Doanh thu phải >= 0").nullable(),
    additional_charges: z.coerce.number().min(0).nullable(),
    notes: z.string().optional().nullable(),
    status: z.enum(['draft', 'confirmed', 'dispatched', 'in_progress', 'completed', 'closed', 'cancelled'] as const),
    start_odometer: z.coerce.number().min(0).nullable(),
    end_odometer: z.coerce.number().min(0).nullable(),
    actual_departure_time: z.string().optional().nullable(),
    actual_arrival_time: z.string().optional().nullable(),
});

type TripFormValues = z.infer<typeof tripSchema>;

interface RevenueManagerProps {
    embedded?: boolean; // If true, hide global page header or adjust styles
}

export function RevenueManager({ embedded = false }: RevenueManagerProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    // Data Hooks
    const { data: trips, isLoading } = useTrips();
    const { data: selectedTripData } = useTrip(selectedTripId || undefined);
    const { data: closedPeriods } = useClosedPeriods();

    // Lookup Hooks
    const { data: vehicles } = useVehiclesByStatus('active');
    const { data: drivers } = useActiveDrivers();
    const { data: routes } = useRoutes();
    const { data: customers } = useCustomers();

    // Mutation Hooks
    const createMutation = useCreateTrip();
    const updateMutation = useUpdateTrip();
    const deleteMutation = useDeleteTrip();

    // Form setup
    const form = useForm<TripFormValues>({
        resolver: zodResolver(tripSchema),
        defaultValues: {
            trip_code: "",
            vehicle_id: "",
            driver_id: "",
            departure_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'draft',
            freight_revenue: 0,
            additional_charges: 0,
            cargo_weight_tons: 0,
            start_odometer: 0,
        },
    });

    // P0-1: Auto-calculate freight_revenue when route or weight changes
    const selectedRouteId = form.watch('route_id');
    const cargoWeight = form.watch('cargo_weight_tons');

    useEffect(() => {
        if (selectedRouteId && cargoWeight && routes) {
            const selectedRoute = routes.find(r => r.id === selectedRouteId);
            if (selectedRoute && selectedRoute.standard_freight_rate) {
                const calculatedRevenue = selectedRoute.standard_freight_rate * cargoWeight;
                // Only auto-fill if current value is 0 or not manually edited
                const currentRevenue = form.getValues('freight_revenue');
                if (currentRevenue === 0 || currentRevenue === null) {
                    form.setValue('freight_revenue', calculatedRevenue);
                }
            }
        }
    }, [selectedRouteId, cargoWeight, routes, form]);

    // Handle opening dialog for Add
    const handleAdd = () => {
        setSelectedTripId(null);
        form.reset({
            trip_code: generateTripCode(),
            vehicle_id: "",
            driver_id: "",
            departure_date: format(new Date(), 'yyyy-MM-dd'),
            status: 'draft',
            freight_revenue: 0,
            cargo_weight_tons: 0,
            cargo_description: "",
            notes: "",
        });
        setDialogOpen(true);
    };

    // Handle opening dialog for Edit
    const handleRowClick = (trip: Trip) => {
        // Prevent editing if trip is in a closed accounting period
        if (isDateInClosedPeriod(trip.departure_date, closedPeriods)) {
            toast({ title: 'Chuyến bị khóa', description: 'Chuyến này nằm trong kỳ đã đóng. Không thể chỉnh sửa.', variant: 'destructive' });
            return;
        }

        setSelectedTripId(trip.id);
        form.reset({
            trip_code: trip.trip_code,
            vehicle_id: trip.vehicle_id,
            driver_id: trip.driver_id,
            route_id: trip.route_id,
            customer_id: trip.customer_id,
            departure_date: format(parseISO(trip.departure_date), 'yyyy-MM-dd'),
            cargo_description: trip.cargo_description || "",
            cargo_weight_tons: trip.cargo_weight_tons || 0,
            freight_revenue: trip.freight_revenue || 0,
            additional_charges: trip.additional_charges || 0,
            notes: trip.notes || "",
            status: trip.status || 'draft',
            start_odometer: trip.start_odometer || 0,
            end_odometer: trip.end_odometer || 0,
            actual_departure_time: trip.actual_departure_time ? format(parseISO(trip.actual_departure_time), 'yyyy-MM-dd') : "",
            actual_arrival_time: trip.actual_arrival_time ? format(parseISO(trip.actual_arrival_time), 'yyyy-MM-dd') : "",
        });
        setDialogOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, trip: Trip) => {
        e.stopPropagation();
        setSelectedTripId(trip.id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedTripId) return;
        try {
            await deleteMutation.mutateAsync(selectedTripId);
            setDeleteDialogOpen(false);
            setSelectedTripId(null);
        } catch (error) {
            // handled by hook
        }
    };

    const onSubmit = async (data: TripFormValues) => {
        let selectedVehicle = vehicles?.find(v => v.id === data.vehicle_id);

        if (!selectedVehicle && selectedTripId && selectedTripData?.vehicle_id === data.vehicle_id) {
            if (selectedTripData.vehicle) {
                selectedVehicle = selectedTripData.vehicle as any;
            }
        }

        if (!selectedVehicle) {
            toast({
                title: 'Lỗi',
                description: 'Không tìm thấy xe được chọn (hoặc xe đã bị xóa)',
                variant: 'destructive',
            });
            return;
        }

        const isVehicleChanged = selectedTripId ? selectedTripData?.vehicle_id !== data.vehicle_id : true;

        if (isVehicleChanged && selectedVehicle.status !== 'active') {
            toast({
                title: 'Xe không khả dụng',
                description: `Xe ${selectedVehicle.license_plate} hiện có trạng thái "${selectedVehicle.status}". Chỉ có thể sử dụng xe "Hoạt động".`,
                variant: 'destructive',
            });
            return;
        }

        const processedData = {
            ...data,
            route_id: data.route_id === "none" ? null : data.route_id,
            customer_id: data.customer_id === "none" ? null : data.customer_id,
            actual_departure_time: data.actual_departure_time === "" ? null : data.actual_departure_time,
            actual_arrival_time: data.actual_arrival_time === "" ? null : data.actual_arrival_time,
        };

        try {
            if (selectedTripId) {
                await updateMutation.mutateAsync({
                    id: selectedTripId,
                    updates: processedData,
                });
            } else {
                await createMutation.mutateAsync(processedData);
            }
            setDialogOpen(false);
        } catch (error) {
            // handled by hook
        }
    };

    const handleSyncAll = async () => {
        setIsSyncing(true);
        try {
            await queryClient.invalidateQueries({ queryKey: ['trips'] });
            toast({ title: "Đồng bộ thành công", description: "Dữ liệu chuyến đã cập nhật" });
        } catch (error) {
            toast({ title: "Lỗi đồng bộ", description: "Không thể cập nhật dữ liệu", variant: 'destructive' });
        } finally {
            setIsSyncing(false);
        }
    };

    const columns = useMemo<Column<Trip>[]>(() => [
        {
            key: 'trip_code',
            header: 'Mã chuyến',
            width: '120px',
            render: (value) => <span className="font-mono font-medium">{value as string}</span>,
        },
        {
            key: 'departure_date',
            header: 'Ngày đi',
            width: '100px',
            render: (value) => formatDate(value as string),
        },
        {
            key: 'route',
            header: 'Tuyến đường',
            render: (_, row) => (
                <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    {row.route?.route_name || 'N/A'}
                </span>
            ),
        },
        {
            key: 'vehicle',
            header: 'Xe / Tài xế',
            render: (_, row) => (
                <div>
                    <span className="font-mono text-sm block">{row.vehicle?.license_plate || 'N/A'}</span>
                    <p className="text-xs text-muted-foreground">{row.driver?.full_name || 'N/A'}</p>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng',
            render: (_, row) => (
                <span className="text-sm">{row.customer?.short_name || row.customer?.customer_name || '-'}</span>
            ),
        },
        {
            key: 'cargo_weight_tons',
            header: 'Tải trọng',
            align: 'right',
            render: (value) => `${formatNumber(value as number, 1)} tấn`,
        },
        {
            key: 'freight_revenue',
            header: 'Doanh thu',
            align: 'right',
            render: (value) => <span className="tabular-nums">{formatCurrency(value as number)}</span>,
        },
        {
            key: 'profit',
            header: 'Lợi nhuận',
            align: 'right',
            render: (value, row) => {
                const profit = value as number || 0;
                if (row.status === 'draft') {
                    return <span className="text-muted-foreground">-</span>;
                }
                return (
                    <span className={profit >= 0 ? 'profit-indicator' : 'loss-indicator'}>
                        {formatCurrency(profit)}
                    </span>
                );
            },
        },
        {
            key: 'status',
            header: 'Trạng thái',
            width: '140px',
            render: (value) => <StatusBadge status={value as string} />,
        },
        {
            key: 'id',
            header: '',
            width: '50px',
            render: (_, row) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => handleDeleteClick(e, row)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            ),
        }
    ], [handleDeleteClick]);

    const [searchQuery, setSearchQuery] = useState("");

    const filteredTrips = (trips || []).filter(item => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        return (
            (item.trip_code && item.trip_code.toLowerCase().includes(searchLower)) ||
            (item.vehicle?.license_plate && item.vehicle.license_plate.toLowerCase().includes(searchLower)) ||
            (item.customer?.customer_name && item.customer.customer_name.toLowerCase().includes(searchLower)) ||
            (item.customer?.short_name && item.customer.short_name.toLowerCase().includes(searchLower)) ||
            (item.driver?.full_name && item.driver.full_name.toLowerCase().includes(searchLower))
        );
    });

    const handleExport = () => {
        import('@/lib/export').then(({ exportToCSV }) => {
            exportToCSV(filteredTrips, 'Danh_sach_chuyen', [
                { key: 'trip_code', header: 'Mã chuyến' },
                { key: 'departure_date', header: 'Ngày đi' },
                { key: 'route.route_name', header: 'Tuyến đường' },
                { key: 'vehicle.license_plate', header: 'Xe' },
                { key: 'driver.full_name', header: 'Tài xế' },
                { key: 'customer.customer_name', header: 'Khách hàng' },
                { key: 'cargo_weight_tons', header: 'Tải trọng' },
                { key: 'freight_revenue', header: 'Doanh thu' },
                { key: 'profit', header: 'Lợi nhuận' },
                { key: 'status', header: 'Trạng thái' },
            ]);
        });
    };

    const handleImport = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const { importFromFile } = await import('@/lib/export');
            const importedData = await importFromFile(file, [
                { key: 'trip_code', header: 'Mã chuyến', required: true },
                { key: 'departure_date', header: 'Ngày đi', required: true },
                { key: 'cargo_weight_tons', header: 'Tải trọng' },
                { key: 'freight_revenue', header: 'Doanh thu' },
                { key: 'status', header: 'Trạng thái' },
            ]);

            let errorCount = 0;

            for (const data of importedData) {
                try {
                    toast({
                        title: "Tính năng nhập chuyến",
                        description: "Nhập chuyến hàng yêu cầu chọn xe, tài xế, tuyến đường. Vui lòng thêm thủ công.",
                        variant: 'default'
                    });
                    errorCount++;
                } catch (error) {
                    errorCount++;
                }
            }

            await queryClient.invalidateQueries({ queryKey: ['trips'] });
        } catch (error) {
            toast({
                title: "Lỗi nhập file",
                description: error instanceof Error ? error.message : "Không thể nhập file",
                variant: 'destructive',
            });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

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
                title="Nhập Liệu Doanh Thu"
                description="Danh sách chuyến hàng và theo dõi lợi nhuận"
                className={embedded ? "hidden" : ""}
            />

            <DataTable
                data={filteredTrips}
                columns={columns}
                selectable
                searchPlaceholder="Tìm theo mã chuyến, biển số, khách hàng..."
                onSearch={setSearchQuery}
                onAdd={handleAdd}
                addLabel="Thêm chuyến"
                onRowClick={handleRowClick}
                onExport={handleExport}
                onImport={handleImport}
                onSync={handleSyncAll}
                isSyncing={isSyncing}
            />

            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
            />

            {/* Main Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto w-full">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            {selectedTripId ? 'Chi tiết chuyến hàng' : 'Tạo chuyến hàng mới'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedTripId
                                ? `Mã chuyến: ${form.getValues('trip_code')}`
                                : 'Nhập thông tin chuyến hàng mới'}
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                            <Tabs defaultValue="info" className="mt-4 w-full">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="info">Thông tin chung</TabsTrigger>
                                    <TabsTrigger value="cargo">Hàng hóa & Vận hành</TabsTrigger>
                                    <TabsTrigger value="finance">Tài chính</TabsTrigger>
                                </TabsList>

                                {/* TAB 1: INFO */}
                                <TabsContent value="info" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="trip_code"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Mã chuyến *</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="CD26..." {...field} disabled />
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
                                                    <FormLabel>Ngày khởi hành *</FormLabel>
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
                                            name="vehicle_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Xe *</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn xe" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {vehicles?.map(v => (
                                                                <SelectItem key={v.id} value={v.id}>
                                                                    {v.license_plate} - {v.vehicle_type}
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
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn tài xế" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {drivers?.map(d => (
                                                                <SelectItem key={d.id} value={d.id}>
                                                                    {d.full_name} ({d.driver_code})
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
                                                                    {r.route_name}
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

                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Trạng thái</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Chọn trạng thái" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {STATUS_OPTIONS.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ghi chú</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Ghi chú chung..." {...field} value={field.value || ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </TabsContent>

                                {/* TAB 2: CARGO & OPS */}
                                <TabsContent value="cargo" className="space-y-4 mt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-1 md:col-span-2">
                                            <FormField
                                                control={form.control}
                                                name="cargo_description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Mô tả hàng hóa</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="Chi tiết loại hàng..." rows={2} {...field} value={field.value || ''} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="cargo_weight_tons"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Trọng lượng (tấn)</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.1" {...field} value={field.value || 0} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="border-t pt-4 mt-4">
                                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                            <CalendarCheck className="w-4 h-4" />
                                            Thông tin vận hành thực tế
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="start_odometer"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Odo Bắt đầu</FormLabel>
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
                                                        <FormLabel>Odo Kết thúc</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} value={field.value || 0} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="actual_departure_time"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Thời gian đi thực tế</FormLabel>
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
                                                name="actual_arrival_time"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Thời gian đến thực tế</FormLabel>
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
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* TAB 3: FINANCE */}
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
                                                            onChange={e => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="bg-muted/50 p-4 rounded-lg">
                                        <p className="text-sm font-medium mb-2">Tạm tính:</p>
                                        <div className="flex justify-between items-center text-sm">
                                            <span>Tổng doanh thu:</span>
                                            <span className="font-bold text-primary">
                                                {formatCurrency((form.watch('freight_revenue') || 0) + (form.watch('additional_charges') || 0))}
                                            </span>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <DialogFooter className="mt-6">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
                                <Button type="submit">
                                    {selectedTripId ? 'Cập nhật' : 'Tạo chuyến'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa chuyến hàng</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hành động này không thể hoàn tác. Chuyến hàng và các dữ liệu liên quan sẽ bị xóa.
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
        </div>
    );
}
