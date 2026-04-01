import { useNavigate } from "react-router-dom";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface DrillDownTripTableProps {
    trips: any[];
    isLoading: boolean;
    onTripClick?: (trip: any) => void;
    onCloseDrawer?: () => void;
}

export function DrillDownTripTable({ trips, isLoading, onTripClick, onCloseDrawer }: DrillDownTripTableProps) {
    const navigate = useNavigate();
    const { role } = useAuth();
    const { toast } = useToast();
    const canViewFinance = ['admin', 'manager', 'accountant'].includes(role);
    const canOpenTripDetail = canViewFinance || role === 'dispatcher';

    const handleTripClick = (trip: any) => {
        if (!canOpenTripDetail) {
            toast({
                title: "Không có quyền",
                description: "Bạn không có quyền xem chi tiết doanh thu chuyến.",
                variant: "destructive",
            });
            return;
        }

        // Close the drawer first
        if (onCloseDrawer) {
            onCloseDrawer();
        }

        // If custom handler provided, use it
        if (onTripClick) {
            onTripClick(trip);
            return;
        }

        // Default: Navigate to revenue tab with trip selected
        // Store selected trip ID in sessionStorage for the target page to pick up
        sessionStorage.setItem('selectedTripId', trip.id);
        sessionStorage.setItem('selectedTripCode', trip.trip_code);
        navigate('/revenue');
    };

    if (isLoading) {
        return <div className="text-center py-4">Đang tải dữ liệu chuyến...</div>;
    }

    if (!trips || trips.length === 0) {
        return <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">Không tìm thấy chuyến nào trong kỳ báo cáo này.</div>;
    }

    return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Mã chuyến</TableHead>
                        <TableHead>Ngày đi</TableHead>
                        <TableHead>Lộ trình</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">Chi phí</TableHead>
                        <TableHead className="text-right">Lợi nhuận</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {trips.map((trip) => (
                        <TableRow key={trip.id} className="hover:bg-muted/50">
                            <TableCell>
                                <button
                                    onClick={() => handleTripClick(trip)}
                                    className="font-medium text-primary hover:text-primary/80 hover:underline flex items-center gap-1 cursor-pointer"
                                    title="Nhấn để xem chi tiết chuyến"
                                >
                                    {trip.trip_code}
                                    <ExternalLink className="w-3 h-3" />
                                </button>
                            </TableCell>
                            <TableCell>
                                {trip.departure_date ? format(new Date(trip.departure_date), 'dd/MM/yyyy') : '—'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={trip.route?.route_name || trip.route_name || trip.route_id || '—'}>
                                {trip.route?.route_name || trip.route_name || trip.route_id || '---'}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${canViewFinance ? "text-green-600" : "text-slate-400"}`}>
                                {canViewFinance ? formatCurrency(trip.total_revenue || 0) : '—'}
                            </TableCell>
                            <TableCell className={`text-right ${canViewFinance ? "text-red-600" : "text-slate-400"}`}>
                                {canViewFinance ? formatCurrency(trip.total_expense || 0) : '—'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${canViewFinance ? "text-blue-700" : "text-slate-400"}`}>
                                {canViewFinance ? formatCurrency(trip.profit || 0) : '—'}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
