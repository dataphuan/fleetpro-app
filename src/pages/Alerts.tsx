import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Calendar, Truck, User, Wrench, ShieldAlert, Wallet, Building2, Database, RefreshCw } from "lucide-react";
import { useVehicles, Vehicle } from "@/hooks/useVehicles";
import { useDrivers, Driver } from "@/hooks/useDrivers";
import { useMaintenanceOrders, MaintenanceOrder } from "@/hooks/useMaintenance";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { useCustomers } from "@/hooks/useCustomers";
import { format, differenceInDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ExcelFilterBar, FilterState } from "@/components/reports/ExcelFilterBar";
import { ColumnPicker } from "@/components/reports/ColumnPicker";
import { ExportButtons } from "@/components/reports/ExportButtons";
import * as XLSX from 'xlsx';


import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";


export default function Alerts() {
    const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles();
    const { data: drivers = [], isLoading: isLoadingDrivers } = useDrivers();
    const { data: expenses = [], isLoading: isLoadingExpenses } = useExpenses();
    const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();

    // Data Integrity State
    const [dataIntegrity, setDataIntegrity] = useState<{
        totalIssues: number;
        critical: Array<{ type: string; message: string; count: number; items?: any[] }>;
        warning: Array<{ type: string; message: string; count: number; items?: any[] }>;
        info: Array<{ type: string; message: string; count: number; items?: any[] }>;
    } | null>(null);
    const [isLoadingIntegrity, setIsLoadingIntegrity] = useState(false);

    const loadDataIntegrity = async () => {
        setIsLoadingIntegrity(true);
        try {
            const result = await (window as any).electronAPI?.database?.validateIntegrity();
            if (result?.success && result?.data) {
                setDataIntegrity(result.data);
            }
        } catch (error) {
            console.error('Failed to load data integrity:', error);
        } finally {
            setIsLoadingIntegrity(false);
        }
    };

    useEffect(() => {
        loadDataIntegrity();
    }, []);

    // Unusual Expenses State
    const [unusualExpenses, setUnusualExpenses] = useState<{
        highExpenses: Array<{
            id: string;
            expense_code: string;
            category_name: string;
            amount: number;
            avg_amount: number;
            ratio: number;
            expense_date: string;
            vehicle_plate: string | null;
        }>;
        duplicates: Array<{
            expense_code: string;
            vehicle_plate: string;
            expense_date: string;
            amount: number;
            duplicate_count: number;
        }>;
    } | null>(null);

    useEffect(() => {
        const loadUnusualExpenses = async () => {
            try {
                const result = await (window as any).electronAPI?.reports?.unusualExpenses();
                if (result?.success && result?.data) {
                    setUnusualExpenses(result.data);
                }
            } catch (error) {
                console.error('Failed to load unusual expenses:', error);
            }
        };
        loadUnusualExpenses();
    }, []);

    const [filters, setFilters] = useState<FilterState>({
        searchPromise: "",
        dateRange: undefined,
        status: [],
        vehicleIds: [],
        driverIds: [],
        vehicleType: undefined,
        revenueRange: undefined,
        customerId: undefined,
    });

    // Helper to determine status based on expiry date
    const getExpiryStatus = (dateStr: string | null) => {
        if (!dateStr) return { status: "unknown", color: "bg-gray-100 text-gray-800", label: "Chưa cập nhật" };

        const daysLeft = differenceInDays(new Date(dateStr), new Date());

        if (daysLeft < 0) return { status: "expired", color: "bg-red-100 text-red-800", label: "Đã hết hạn" };
        if (daysLeft <= 7) return { status: "critical", color: "bg-red-100 text-red-800", label: `Còn ${daysLeft} ngày` };
        if (daysLeft <= 30) return { status: "warning", color: "bg-yellow-100 text-yellow-800", label: `Còn ${daysLeft} ngày` };
        return { status: "safe", color: "bg-green-100 text-green-800", label: `Còn ${daysLeft} ngày` };
    };

    const vehicleWarnings = useMemo(() => {
        let result = vehicles.filter(v => {
            const maintStatus = getExpiryStatus((v as any).next_maintenance_date);
            const regStatus = getExpiryStatus((v as any).registration_expiry);
            const civilStatus = getExpiryStatus((v as any).insurance_civil_expiry);
            const bodyStatus = getExpiryStatus((v as any).insurance_body_expiry);

            let shouldAlert = false;
            if (maintStatus.status !== 'safe') shouldAlert = true;
            if (regStatus.status !== 'safe') shouldAlert = true;
            if (civilStatus.status !== 'safe') shouldAlert = true;
            if ((v as any).insurance_body_expiry && bodyStatus.status !== 'safe') shouldAlert = true;

            return shouldAlert;
        });

        // Apply filters
        if (filters.searchPromise) {
            const term = filters.searchPromise.toLowerCase();
            result = result.filter(v =>
                v.license_plate.toLowerCase().includes(term) ||
                (v as any).vehicle_code?.toLowerCase().includes(term)
            );
        }
        if (filters.vehicleType) {
            result = result.filter(v => (v as any).vehicle_type === filters.vehicleType);
        }

        return result;
    }, [vehicles, filters]);

    const driverWarnings = useMemo(() => {
        let result = drivers.filter(d => {
            const licenseStatus = getExpiryStatus(d.license_expiry);
            const healthStatus = getExpiryStatus((d as any).health_check_expiry);
            return licenseStatus.status !== 'safe' || healthStatus.status !== 'safe';
        });

        if (filters.searchPromise) {
            const term = filters.searchPromise.toLowerCase();
            result = result.filter(d =>
                d.full_name.toLowerCase().includes(term) ||
                d.driver_code.toLowerCase().includes(term)
            );
        }
        return result;
    }, [drivers, filters]);

    const maintenanceWarnings = useMemo(() => {
        let result = (vehicles as any[]).filter(v => { // Logic seems to filter vehicles, not maintenance orders?
            // Original code filtered vehicles based on next maintenance date.
            // Using maintenance orders (from useMaintenanceOrders link?) 
            // The original code used 'vehicles' list for maintenance warnings too.
            // Let's stick to original logic: vehicles with upcoming maintenance date.
            const maintStatus = getExpiryStatus(v.next_maintenance_date);
            return maintStatus.status !== 'safe';
        });

        if (filters.searchPromise) {
            const term = filters.searchPromise.toLowerCase();
            result = result.filter(v => v.license_plate.toLowerCase().includes(term));
        }

        return result;
    }, [vehicles, filters]);

    const licenseWarnings = useMemo(() => {
        let result = drivers.filter(d => {
            const licenseStatus = getExpiryStatus(d.license_expiry);
            return licenseStatus.status !== 'safe';
        });

        if (filters.searchPromise) {
            const term = filters.searchPromise.toLowerCase();
            result = result.filter(d => d.full_name.toLowerCase().includes(term));
        }
        return result;
    }, [drivers, filters]);

    const expenseWarnings = useMemo(() => {
        const result = expenses.filter(e => (e.amount || 0) > 10000000);

        if (filters.searchPromise) {
            // Basic search on expense?
        }
        return result;
    }, [expenses, filters]);

    // Customer debt warning - customers with amount owed exceeding credit limit or overdue
    const customerDebtWarnings = useMemo(() => {
        let result = customers.filter(c => {
            // Check if customer has debt that exceeds credit limit
            const creditLimit = (c as any).credit_limit || 0;
            const currentDebt = (c as any).current_debt || (c as any).outstanding_balance || 0;
            const paymentTerms = (c as any).payment_terms || 30; // default 30 days

            // Calculate if debt is overdue (simplified: if debt exists and payment_terms exceeded)
            // In real implementation, check last payment date vs payment_terms
            const isOverCreditLimit = currentDebt > creditLimit && creditLimit > 0;
            const hasHighDebt = currentDebt > 50000000; // > 50M VND

            return isOverCreditLimit || hasHighDebt;
        });

        if (filters.searchPromise) {
            const term = filters.searchPromise.toLowerCase();
            result = result.filter(c =>
                (c as any).customer_name?.toLowerCase().includes(term) ||
                (c as any).customer_code?.toLowerCase().includes(term)
            );
        }
        return result;
    }, [customers, filters]);

    const navigate = useNavigate();

    const handleNavigate = (path: string, key: string, id: string) => {
        sessionStorage.setItem(key, id);
        navigate(path);
    };

    // Column Definitions - wrapped in useMemo if needed, keeping simple
    const vehicleColumns: Column<Vehicle>[] = [
        { key: 'license_plate', header: 'Biển số', width: '120px' },
        {
            key: 'vehicle_type',
            header: 'Loại xe',
            width: '150px',
            render: (value, row) => (
                <span>{(row as any).brand} - {(row as any).model}</span>
            )
        },
        {
            key: 'next_maintenance_date',
            header: 'Bảo trì kế tiếp',
            width: '150px',
            render: (value) => {
                const status = getExpiryStatus(value as string);
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${status.color}`}>
                        {value ? format(new Date(value as string), 'dd/MM/yyyy') : 'N/A'}
                        <span className="block text-[10px] opacity-75">{status.label}</span>
                    </span>
                );
            }
        },
        {
            key: 'registration_expiry',
            header: 'Đăng kiểm',
            width: '150px',
            render: (value) => {
                const status = getExpiryStatus(value as string);
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${status.color}`}>
                        {value ? format(new Date(value as string), 'dd/MM/yyyy') : 'N/A'}
                        <span className="block text-[10px] opacity-75">{status.label}</span>
                    </span>
                );
            }
        },
        {
            key: 'insurance_expiry',
            header: 'Bảo hiểm',
            width: '200px',
            render: (_, row) => {
                const civil = getExpiryStatus((row as any).insurance_civil_expiry);
                const body = (row as any).insurance_body_expiry
                    ? getExpiryStatus((row as any).insurance_body_expiry)
                    : { status: 'safe', color: '', label: '' };

                return (
                    <div className="space-y-2 py-1">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-muted-foreground font-semibold">TNDS</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${civil.color}`}>
                                {(row as any).insurance_civil_expiry ? format(new Date((row as any).insurance_civil_expiry), 'dd/MM/yyyy') : 'Chưa có'}
                                <span className="block text-[10px] opacity-75">{civil.label}</span>
                            </span>
                        </div>
                        {(row as any).insurance_body_expiry && (
                            <div className="flex flex-col gap-1 border-t pt-1 mt-1">
                                <span className="text-[10px] uppercase text-muted-foreground font-semibold">Thân vỏ</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${body.color}`}>
                                    {format(new Date((row as any).insurance_body_expiry), 'dd/MM/yyyy')}
                                    <span className="block text-[10px] opacity-75">{body.label}</span>
                                </span>
                            </div>
                        )}
                    </div>
                );
            }
        }
    ];

    const driverColumns: Column<Driver>[] = [
        { key: 'driver_code', header: 'Mã TX', width: '100px' },
        { key: 'full_name', header: 'Họ và tên' },
        { key: 'license_class', header: 'Hạng bằng', width: '100px' },
        {
            key: 'license_expiry',
            header: 'Ngày hết hạn bằng lái',
            width: '200px',
            render: (value) => {
                const status = getExpiryStatus(value as string);
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${status.color}`}>
                        {value ? format(new Date(value as string), 'dd/MM/yyyy') : 'N/A'}
                        <span className="block text-[10px] opacity-75">{status.label}</span>
                    </span>
                );
            }
        },
        {
            key: 'health_check_expiry',
            header: 'Hết hạn khám SK',
            width: '200px',
            render: (value) => {
                const status = getExpiryStatus(value as string);
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${status.color}`}>
                        {value ? format(new Date(value as string), 'dd/MM/yyyy') : 'N/A'}
                        <span className="block text-[10px] opacity-75">{status.label}</span>
                    </span>
                );
            }
        }
    ];

    // Reuse maintenance columns but adapt to Vehicle type as per original logic if needed, 
    // or if `maintenanceWarnings` returns `Vehicle` objects, use `vehicleColumns` or specialized one.
    // Original logic: `const maintenanceWarnings = vehicles.filter(...)` -> returns Vehicles.
    // So we should use vehicle/maintenance specific columns.
    // The previous implementation used `maintenanceColumns` which expected `MaintenanceOrder`?? 
    // Wait, line 65 in original: `const maintenanceWarnings = vehicles.filter(...)`. It returns VEHICLES.
    // But column def at 199: `const maintenanceColumns: Column<MaintenanceOrder>[]`.
    // This is a type mismatch in the original code! `DataTable` uses `any` mostly so it didn't crash, 
    // but `maintenanceColumns` expects `row` to be `MaintenanceOrder`, accessing `row.order_code`.
    // `Vehicle` does NOT have `order_code`.
    // So the "Maintenance" tab in Alerts probably showed empty columns or crashed if accessing missing props.
    // I should fix this to display Vehicle info relevant to maintenance (Next Maint Date).

    const maintenanceAlertColumns: Column<Vehicle>[] = [
        { key: 'license_plate', header: 'Biển số', width: '120px' },
        {
            key: 'next_maintenance_date',
            header: 'Hạn bảo trì',
            render: (value) => {
                const status = getExpiryStatus(value as string);
                return <span className={status.color + " px-2 py-1 rounded"}>{value ? format(new Date(value as string), 'dd/MM/yyyy') : 'N/A'}</span>;
            }
        }
    ];

    const expenseColumns: Column<Expense>[] = [
        { key: 'document_number', header: 'Số chứng từ' },
        {
            key: 'vehicle_id',
            header: 'Biển số xe',
            render: (value) => {
                const v = vehicles?.find(veh => veh.id === value);
                return v?.license_plate || 'Unknown';
            }
        },
        { key: 'expense_type', header: 'Loại chi phí' },
        {
            key: 'amount',
            header: 'Số tiền',
            align: 'right',
            render: (value) => (
                <span className="font-semibold text-red-600">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value))}
                </span>
            )
        },
        { key: 'expense_date', header: 'Ngày phát sinh', render: (v) => format(new Date(v as string), 'dd/MM/yyyy') },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (value) => <Badge variant="destructive">Chưa thanh toán</Badge>
        }
    ];


    const handleExport = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1 — Vehicle warnings
        if (vehicleWarnings.length > 0) {
            const vData = vehicleWarnings.map(v => ({
                'Biển số': v.license_plate,
                'Loại xe': `${(v as any).brand || ''} - ${(v as any).model || ''}`,
                'Bảo trì kế tiếp': (v as any).next_maintenance_date || 'N/A',
                'Đăng kiểm': (v as any).registration_expiry || 'N/A',
                'BH TNDS': (v as any).insurance_civil_expiry || 'N/A',
                'BH Thân vỏ': (v as any).insurance_body_expiry || 'N/A',
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vData), 'CanhBaoXe');
        }

        // Sheet 2 — Driver warnings
        if (driverWarnings.length > 0) {
            const dData = driverWarnings.map(d => ({
                'Mã TX': d.driver_code,
                'Họ tên': d.full_name,
                'Hạng bằng': d.license_class || '',
                'Hết hạn bằng lái': d.license_expiry || 'N/A',
                'Hết hạn khám SK': (d as any).health_check_expiry || 'N/A',
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dData), 'CanhBaoTaiXe');
        }

        // Sheet 3 — Maintenance warnings
        if (maintenanceWarnings.length > 0) {
            const mData = maintenanceWarnings.map(v => ({
                'Biển số': v.license_plate,
                'Hạn bảo trì': (v as any).next_maintenance_date || 'N/A',
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mData), 'CanhBaoBaoTri');
        }

        // Sheet 4 — Customer debt
        if (customerDebtWarnings.length > 0) {
            const cData = customerDebtWarnings.map(c => ({
                'Mã KH': (c as any).customer_code || '',
                'Tên KH': (c as any).customer_name || '',
                'Công nợ': (c as any).current_debt || 0,
                'Hạn mức': (c as any).credit_limit || 0,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cData), 'CongNoQuaHan');
        }

        if (wb.SheetNames.length === 0) {
            alert('Không có dữ liệu cảnh báo để xuất');
            return;
        }

        const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `CanhBao_${ts}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Cảnh Báo & Nhắc Nhở"
                description="Theo dõi các cảnh báo quan trọng về xe và tài xế"
            />

            <Tabs defaultValue="vehicles" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="vehicles" className="gap-2">
                        <Truck className="w-4 h-4" />
                        Cảnh báo xe
                        {vehicleWarnings.length > 0 && (
                            <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {vehicleWarnings.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="drivers" className="gap-2">
                        <User className="w-4 h-4" />
                        Cảnh báo tài xế
                        {driverWarnings.length > 0 && (
                            <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {driverWarnings.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="gap-2">
                        <Wrench className="w-4 h-4" />
                        Cảnh báo bảo trì
                        {maintenanceWarnings.length > 0 && (
                            <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {maintenanceWarnings.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="gap-2">
                        <Wallet className="w-4 h-4" />
                        Cảnh báo chi phí
                    </TabsTrigger>
                    <TabsTrigger value="debt" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Công nợ quá hạn
                        {customerDebtWarnings.length > 0 && (
                            <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {customerDebtWarnings.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="dataIntegrity" className="gap-2">
                        <Database className="w-4 h-4" />
                        Kiểm tra dữ liệu
                        {dataIntegrity && dataIntegrity.totalIssues > 0 && (
                            <Badge variant={dataIntegrity.critical.length > 0 ? 'destructive' : 'secondary'}
                                className="ml-1 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                {dataIntegrity.totalIssues}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="vehicles">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ExcelFilterBar
                                filters={filters}
                                onFilterChange={setFilters}
                                showVehicleTypeFilter={true}
                                vehicleTypes={["Hino", "Hyundai", "Isuzu"]} // Mock types or derived
                            >
                                <div className="flex items-center gap-2 border-l pl-2 ml-2">
                                    <ExportButtons onExport={handleExport} />
                                </div>
                            </ExcelFilterBar>
                        </div>
                        <div className="border rounded-md bg-card">
                            <DataTable
                                data={vehicleWarnings}
                                columns={vehicleColumns}
                                onRowClick={(row) => handleNavigate('/vehicles', 'selectedVehicleId', (row as any).id)}
                                emptyMessage="Không có cảnh báo phương tiện nào"
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="drivers">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ExcelFilterBar filters={filters} onFilterChange={setFilters}>
                                <div className="flex items-center gap-2 border-l pl-2 ml-2">
                                    <ExportButtons onExport={handleExport} />
                                </div>
                            </ExcelFilterBar>
                        </div>
                        <div className="border rounded-md bg-card">
                            <DataTable
                                data={driverWarnings}
                                columns={driverColumns}
                                onRowClick={(row) => handleNavigate('/drivers', 'selectedDriverId', (row as any).id)}
                                emptyMessage="Không có cảnh báo tài xế nào"
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="maintenance">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ExcelFilterBar filters={filters} onFilterChange={setFilters}>
                                <div className="flex items-center gap-2 border-l pl-2 ml-2">
                                    <ExportButtons onExport={handleExport} />
                                </div>
                            </ExcelFilterBar>
                        </div>
                        <div className="border rounded-md bg-card">
                            <DataTable
                                data={maintenanceWarnings}
                                columns={maintenanceAlertColumns}
                                onRowClick={(row) => handleNavigate('/maintenance', 'selectedMaintenanceId', (row as any).id)}
                                emptyMessage="Không có cảnh báo bảo trì nào"
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="expenses">
                    <div className="space-y-4">
                        {/* Summary Cards */}
                        {unusualExpenses && (
                            <div className="grid gap-3 md:grid-cols-2">
                                {/* High Expenses */}
                                <Card className="border-orange-200 bg-orange-50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-orange-700 text-sm flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            Chi phí cao bất thường
                                        </CardTitle>
                                        <CardDescription className="text-orange-600 text-xs">
                                            Chi phí vượt 2x trung bình danh mục
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {unusualExpenses.highExpenses.length === 0 ? (
                                            <p className="text-sm text-green-600">✓ Không có chi phí bất thường</p>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {unusualExpenses.highExpenses.slice(0, 5).map((exp, idx) => (
                                                    <div key={idx} className="text-xs bg-white rounded p-2 shadow-sm flex justify-between items-center">
                                                        <div>
                                                            <span className="font-medium">{exp.expense_code}</span>
                                                            <span className="text-muted-foreground ml-2">({exp.category_name})</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="font-bold text-orange-600">{exp.amount.toLocaleString('vi-VN')}đ</span>
                                                            <span className="text-muted-foreground ml-1 text-[10px]">({exp.ratio}x TB)</span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {unusualExpenses.highExpenses.length > 5 && (
                                                    <p className="text-xs text-muted-foreground text-center">+{unusualExpenses.highExpenses.length - 5} chi phí khác</p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Duplicate Expenses */}
                                <Card className="border-red-200 bg-red-50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-red-700 text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Chi phí có thể trùng lặp
                                        </CardTitle>
                                        <CardDescription className="text-red-600 text-xs">
                                            Cùng xe + ngày + số tiền
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {unusualExpenses.duplicates.length === 0 ? (
                                            <p className="text-sm text-green-600">✓ Không có chi phí trùng lặp</p>
                                        ) : (
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {unusualExpenses.duplicates.slice(0, 5).map((dup, idx) => (
                                                    <div key={idx} className="text-xs bg-white rounded p-2 shadow-sm">
                                                        <div className="flex justify-between">
                                                            <span className="font-medium">{dup.vehicle_plate}</span>
                                                            <Badge variant="destructive" className="text-[10px]">{dup.duplicate_count} bản</Badge>
                                                        </div>
                                                        <div className="text-muted-foreground mt-1">
                                                            {dup.expense_date} - {dup.amount.toLocaleString('vi-VN')}đ
                                                        </div>
                                                    </div>
                                                ))}
                                                {unusualExpenses.duplicates.length > 5 && (
                                                    <p className="text-xs text-muted-foreground text-center">+{unusualExpenses.duplicates.length - 5} trường hợp khác</p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Legacy high amount list */}
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground">Chi phí lớn (trên 10 triệu)</h4>
                            <div className="border rounded-md bg-card">
                                <DataTable
                                    data={expenseWarnings}
                                    columns={expenseColumns}
                                    onRowClick={(row) => handleNavigate('/expenses', 'selectedExpenseId', (row as any).id)}
                                    emptyMessage="Không có cảnh báo chi phí nào"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="debt">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <ExcelFilterBar filters={filters} onFilterChange={setFilters}>
                                <div className="flex items-center gap-2 border-l pl-2 ml-2">
                                    <ExportButtons onExport={handleExport} />
                                </div>
                            </ExcelFilterBar>
                        </div>
                        <div className="border rounded-md bg-card">
                            <DataTable
                                data={customerDebtWarnings}
                                columns={[
                                    { key: 'customer_code', header: 'Mã KH', width: '100px' },
                                    { key: 'customer_name', header: 'Tên khách hàng', width: '200px' },
                                    {
                                        key: 'current_debt',
                                        header: 'Công nợ hiện tại',
                                        width: '150px',
                                        render: (value: number) => (
                                            <span className="font-semibold text-red-600">
                                                {(value || 0).toLocaleString('vi-VN')} đ
                                            </span>
                                        )
                                    },
                                    {
                                        key: 'credit_limit',
                                        header: 'Hạn mức',
                                        width: '150px',
                                        render: (value: number) => (
                                            <span>{(value || 0).toLocaleString('vi-VN')} đ</span>
                                        )
                                    },
                                    {
                                        key: 'payment_terms',
                                        header: 'Thanh toán (ngày)',
                                        width: '120px',
                                        render: (value: number) => <span>{value || 30} ngày</span>
                                    },
                                    {
                                        key: 'status',
                                        header: 'Trạng thái',
                                        width: '120px',
                                        render: (_, row: any) => {
                                            const isOver = (row.current_debt || 0) > (row.credit_limit || 0);
                                            return (
                                                <Badge variant={isOver ? 'destructive' : 'secondary'}>
                                                    {isOver ? 'Vượt hạn mức' : 'Công nợ cao'}
                                                </Badge>
                                            );
                                        }
                                    }
                                ]}
                                onRowClick={(row) => handleNavigate('/customers', 'selectedCustomerId', (row as any).id)}
                                emptyMessage="Không có khách hàng nào có công nợ quá hạn"
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="dataIntegrity">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Kiểm Tra Tính Toàn Vẹn Dữ Liệu</h3>
                            <Button variant="outline" size="sm" onClick={loadDataIntegrity} disabled={isLoadingIntegrity}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingIntegrity ? 'animate-spin' : ''}`} />
                                Làm mới
                            </Button>
                        </div>

                        {isLoadingIntegrity && (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        )}

                        {!isLoadingIntegrity && dataIntegrity && (
                            <div className="grid gap-4 md:grid-cols-3">
                                {/* Critical Issues */}
                                <Card className="border-red-200 bg-red-50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-red-700 text-base flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5" />
                                            Nghiêm trọng
                                        </CardTitle>
                                        <CardDescription className="text-red-600">
                                            {dataIntegrity.critical.reduce((sum, i) => sum + i.count, 0)} vấn đề
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                                        {dataIntegrity.critical.length === 0 ? (
                                            <p className="text-sm text-green-600">✓ Không có vấn đề nghiêm trọng</p>
                                        ) : (
                                            dataIntegrity.critical.map((issue, idx) => (
                                                <div key={idx} className="text-sm text-red-700 bg-white rounded p-2 shadow-sm">
                                                    <div className="font-medium flex justify-between items-center">
                                                        <span>{issue.message}</span>
                                                        {issue.type.includes('vehicle') && (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/vehicles')}>
                                                                Xem xe →
                                                            </Button>
                                                        )}
                                                        {issue.type.includes('driver') && (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/drivers')}>
                                                                Xem TX →
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {issue.items && issue.items.length > 0 && (
                                                        <div className="mt-2 space-y-1 border-t pt-2">
                                                            {issue.items.slice(0, 5).map((item: any, i: number) => (
                                                                <div key={i}
                                                                    className="text-xs flex justify-between items-center hover:bg-red-100 rounded px-1 py-0.5 cursor-pointer"
                                                                    onClick={() => {
                                                                        if (item.license_plate) navigate(`/vehicles?search=${item.license_plate}`);
                                                                        else if (item.driver_code) navigate(`/drivers?search=${item.driver_code}`);
                                                                    }}>
                                                                    <span className="font-mono">{item.license_plate || item.driver_code || item.full_name || '-'}</span>
                                                                    <span className="text-muted-foreground">{item.expiry_date || item.license_expiry || ''}</span>
                                                                </div>
                                                            ))}
                                                            {issue.items.length > 5 && (
                                                                <p className="text-[10px] text-muted-foreground">+{issue.items.length - 5} mục khác</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Warning Issues */}
                                <Card className="border-yellow-200 bg-yellow-50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-yellow-700 text-base flex items-center gap-2">
                                            <ShieldAlert className="w-5 h-5" />
                                            Cảnh báo
                                        </CardTitle>
                                        <CardDescription className="text-yellow-600">
                                            {dataIntegrity.warning.reduce((sum, i) => sum + i.count, 0)} vấn đề
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                                        {dataIntegrity.warning.length === 0 ? (
                                            <p className="text-sm text-green-600">✓ Không có cảnh báo</p>
                                        ) : (
                                            dataIntegrity.warning.map((issue, idx) => (
                                                <div key={idx} className="text-sm text-yellow-700 bg-white rounded p-2 shadow-sm">
                                                    <div className="font-medium flex justify-between items-center">
                                                        <span>{issue.message}</span>
                                                        {issue.type.includes('vehicle') && (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/vehicles')}>
                                                                Xem →
                                                            </Button>
                                                        )}
                                                        {issue.type.includes('trip') && (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/trips-revenue')}>
                                                                Chuyến →
                                                            </Button>
                                                        )}
                                                        {issue.type.includes('expense') && (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/expenses')}>
                                                                Chi phí →
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {issue.items && issue.items.length > 0 && (
                                                        <div className="mt-2 space-y-1 border-t pt-2">
                                                            {issue.items.slice(0, 5).map((item: any, i: number) => (
                                                                <div key={i}
                                                                    className="text-xs flex justify-between items-center hover:bg-yellow-100 rounded px-1 py-0.5 cursor-pointer"
                                                                    onClick={() => {
                                                                        if (item.license_plate) navigate(`/vehicles?search=${item.license_plate}`);
                                                                        else if (item.trip_code) navigate(`/trips-revenue?search=${item.trip_code}`);
                                                                        else if (item.expense_code) navigate(`/expenses?search=${item.expense_code}`);
                                                                    }}>
                                                                    <span className="font-mono">{item.license_plate || item.trip_code || item.expense_code || '-'}</span>
                                                                    <span className="text-muted-foreground">{item.next_maintenance_date || ''}</span>
                                                                </div>
                                                            ))}
                                                            {issue.items.length > 5 && (
                                                                <p className="text-[10px] text-muted-foreground">+{issue.items.length - 5} mục khác</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Info Issues */}
                                <Card className="border-blue-200 bg-blue-50">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-blue-700 text-base flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5" />
                                            Thông tin
                                        </CardTitle>
                                        <CardDescription className="text-blue-600">
                                            {dataIntegrity.info.reduce((sum, i) => sum + i.count, 0)} vấn đề
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                                        {dataIntegrity.info.length === 0 ? (
                                            <p className="text-sm text-green-600">✓ Dữ liệu đầy đủ</p>
                                        ) : (
                                            dataIntegrity.info.map((issue, idx) => (
                                                <div key={idx} className="text-sm text-blue-700 bg-white rounded p-2 shadow-sm">
                                                    <div className="font-medium flex justify-between items-center">
                                                        <span>{issue.message}</span>
                                                        {issue.type.includes('vehicle') && (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/vehicles')}>
                                                                Xem →
                                                            </Button>
                                                        )}
                                                        {issue.type.includes('driver') && (
                                                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => navigate('/drivers')}>
                                                                Xem →
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {issue.items && issue.items.length > 0 && (
                                                        <div className="mt-2 space-y-1 border-t pt-2">
                                                            {issue.items.slice(0, 5).map((item: any, i: number) => (
                                                                <div key={i}
                                                                    className="text-xs flex justify-between items-center hover:bg-blue-100 rounded px-1 py-0.5 cursor-pointer"
                                                                    onClick={() => {
                                                                        if (item.license_plate) navigate(`/vehicles?search=${item.license_plate}`);
                                                                        else if (item.driver_code) navigate(`/drivers?search=${item.driver_code}`);
                                                                    }}>
                                                                    <span className="font-mono">{item.license_plate || item.driver_code || item.full_name || '-'}</span>
                                                                </div>
                                                            ))}
                                                            {issue.items.length > 5 && (
                                                                <p className="text-[10px] text-muted-foreground">+{issue.items.length - 5} mục khác</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {!isLoadingIntegrity && !dataIntegrity && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nhấn "Làm mới" để kiểm tra dữ liệu</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
