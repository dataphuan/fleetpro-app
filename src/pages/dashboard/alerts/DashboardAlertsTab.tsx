import { useState, useMemo } from "react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, AlertCircle, Loader2 } from "lucide-react";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { Button } from "@/components/ui/button";
import { useAlertsSummary } from "@/hooks/useAlerts";
import { AlertItem } from "../../../electron/alerts"; // To get type suggestions

export function DashboardAlertsTab() {
    const { data: summary, isLoading, isError } = useAlertsSummary();

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState<string>("all");

    // Severity options
    const severityOptions = [
        { value: 'critical', label: 'Nguy hiểm (Đã/Sắp quá hạn rất gần)' },
        { value: 'warning', label: 'Cảnh báo (Cần chú ý)' },
    ];

    // Derive Alerts
    const alerts = useMemo(() => {
        if (!summary || !summary.items) return [];
        
        return summary.items.filter(alert => {
            // Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!alert.entityName.toLowerCase().includes(query) && !alert.description.toLowerCase().includes(query)) return false;
            }

            // Severity
            if (severityFilter !== "all" && severityFilter) {
                if (alert.severity !== severityFilter) return false;
            }

            return true;
        });

    }, [summary, searchQuery, severityFilter]);

    const columns = useMemo<Column<AlertItem>[]>(() => [
        {
            key: 'severity',
            header: 'Mức độ',
            width: '120px',
            render: (_v, item) => {
                if (item.severity === 'critical') return <Badge variant="destructive" className="gap-1 animate-pulse"><AlertCircle className="w-3 h-3" /> Cao</Badge>;
                if (item.severity === 'warning') return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 gap-1"><AlertTriangle className="w-3 h-3" /> Trung bình</Badge>;
                return <Badge variant="outline" className="gap-1 text-slate-600"><Info className="w-3 h-3" /> Thấp</Badge>;
            }
        },
        { key: 'entityName', header: 'Đối tượng', width: '150px', render: (v) => <span className="font-semibold">{v as string}</span> },
        { key: 'description', header: 'Nội dung cảnh báo', render: (v) => <span className="text-sm">{v as string}</span> },
        {
            key: 'type',
            header: 'Phân loại',
            width: '150px',
            render: (v) => {
                const type = v as string;
                if (type.startsWith('vehicle')) return <Badge variant="outline">Cảnh báo Xe</Badge>;
                if (type.startsWith('driver')) return <Badge variant="outline">Tài xế</Badge>;
                if (type === 'trip_low_profit') return <Badge variant="outline" className="bg-red-50 text-red-700">Tài chính</Badge>;
                if (type === 'maintenance_overdue') return <Badge variant="outline">Bảo dưỡng</Badge>;
                return <Badge variant="outline">Hệ thống</Badge>;
            }
        },
    ], []);

    // Error handling
    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                <AlertTriangle className="w-12 h-12 mb-4" />
                <h3 className="text-lg font-semibold">Không thể tải dữ liệu cảnh báo</h3>
                <p className="text-sm text-muted-foreground">Vui lòng kiểm tra kết nối với Backend Service.</p>
                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Thử lại</Button>
            </div>
        );
    }

    if (isLoading) {
        return <div className="flex justify-center p-8 min-h-[400px] items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-orange-800">Trung Tâm Cảnh Báo (Đồng bộ Backend)</h3>
                <div className="flex gap-2">
                    <div className="text-sm font-medium bg-red-50 text-red-700 px-3 py-1 rounded-md border border-red-200 shadow-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4"/> Nguy cấp: <span className="font-bold text-lg ml-1">{summary?.criticalCount || 0}</span>
                    </div>
                    <div className="text-sm font-medium bg-amber-50 text-amber-700 px-3 py-1 rounded-md border border-amber-200 shadow-sm flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4"/> Chú ý: <span className="font-bold text-lg ml-1">{summary?.warningCount || 0}</span>
                    </div>
                </div>
            </div>

            <DashboardFilterBar
                onSearchChange={setSearchQuery}
                onDateRangeChange={() => {}} // Ignore date for alerts
                onFilterChange={(type, val) => setSeverityFilter(val)}
                showStatusFilter={true}
                statusOptions={severityOptions}
                placeholder="Tìm xe, tên tài xế, mã chuyến..."
            />

            <DataTable
                data={alerts}
                columns={columns}
                searchPlaceholder="Tìm kiếm..."
                emptyMessage="Hoạt động vận tải bình thường, không có cảnh báo nào cần xử lý."
                hideToolbar={true}
            />
        </div>
    );
}
