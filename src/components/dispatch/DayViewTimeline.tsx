import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, User, MapPin, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";

// Status columns configuration
const STATUS_COLUMNS = [
    { key: 'draft', label: 'Nháp', color: 'bg-gray-100 border-gray-300', headerBg: 'bg-gray-50' },
    { key: 'confirmed', label: 'Đã xác nhận', color: 'bg-blue-50 border-blue-200', headerBg: 'bg-blue-50' },
    { key: 'dispatched', label: 'Đã điều xe', color: 'bg-amber-50 border-amber-200', headerBg: 'bg-amber-50' },
    { key: 'in_progress', label: 'Đang thực hiện', color: 'bg-purple-50 border-purple-200', headerBg: 'bg-purple-50' },
    { key: 'completed', label: 'Hoàn thành', color: 'bg-green-50 border-green-200', headerBg: 'bg-green-50' },
    { key: 'cancelled', label: 'Hủy', color: 'bg-red-50 border-red-200', headerBg: 'bg-red-50' },
] as const;

interface DayViewTimelineProps {
    trips: any[];
    onTripClick: (trip: any) => void;
    onCreateTrip: () => void;
    selectedDate: Date;
}

export function DayViewTimeline({ trips, onTripClick, onCreateTrip, selectedDate }: DayViewTimelineProps) {
    // Group trips by status
    const tripsByStatus = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        STATUS_COLUMNS.forEach(col => {
            grouped[col.key] = [];
        });

        trips?.forEach(trip => {
            const status = trip.status || 'draft';
            if (grouped[status]) {
                grouped[status].push(trip);
            } else {
                grouped['draft'].push(trip); // Fallback to draft
            }
        });

        return grouped;
    }, [trips]);

    const totalTrips = trips?.length || 0;

    return (
        <div className="h-full flex flex-col">
            {/* Day Summary Header */}
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-lg">
                        {format(selectedDate, 'EEEE, dd/MM/yyyy')}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                        {totalTrips} chuyến
                    </Badge>
                </div>
            </div>

            {/* Kanban Columns */}
            <div className="flex-1 overflow-x-auto p-4">
                <div className="flex gap-4 h-full min-h-[500px]">
                    {STATUS_COLUMNS.map((column) => {
                        const columnTrips = tripsByStatus[column.key] || [];

                        return (
                            <div
                                key={column.key}
                                className="flex-shrink-0 w-[280px] flex flex-col rounded-lg border bg-card"
                            >
                                {/* Column Header */}
                                <div className={`px-3 py-2 rounded-t-lg border-b ${column.headerBg}`}>
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-sm">{column.label}</span>
                                        <Badge variant="outline" className="text-xs h-5">
                                            {columnTrips.length}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Column Content */}
                                <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-350px)]">
                                    {columnTrips.length === 0 ? (
                                        <div className="h-24 flex items-center justify-center text-muted-foreground/50 text-sm border-2 border-dashed rounded-lg">
                                            Không có chuyến
                                        </div>
                                    ) : (
                                        columnTrips.map((trip) => (
                                            <TripCard
                                                key={trip.id}
                                                trip={trip}
                                                onClick={() => onTripClick(trip)}
                                                statusColor={column.color}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Empty State for No Trips */}
            {totalTrips === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center p-8 bg-white/80 rounded-xl shadow-sm">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                            <Truck className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                            Chưa có chuyến trong ngày
                        </h3>
                        <p className="text-sm text-muted-foreground/70 mb-4">
                            {format(selectedDate, 'dd/MM/yyyy')}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Trip Card Component
interface TripCardProps {
    trip: any;
    onClick: () => void;
    statusColor: string;
}

function TripCard({ trip, onClick, statusColor }: TripCardProps) {
    return (
        <div
            onClick={onClick}
            className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${statusColor}`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-xs font-mono">{trip.trip_code}</span>
                {trip.departure_date && !isNaN(new Date(trip.departure_date).getTime()) && (
                    <Badge variant="outline" className="text-[10px] px-1.5 h-4 bg-white/50 border-0">
                        <Clock className="w-2.5 h-2.5 mr-0.5" />
                        {format(new Date(trip.departure_date), 'HH:mm')}
                    </Badge>
                )}
            </div>

            {/* Details */}
            <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium truncate" title={trip.customer?.customer_name}>
                    <User className="w-3 h-3 opacity-70 flex-shrink-0" />
                    <span className="truncate">{trip.customer?.short_name || trip.customer?.customer_name || 'Khách lẻ'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs truncate" title={trip.route?.route_name}>
                    <MapPin className="w-3 h-3 opacity-70 flex-shrink-0" />
                    <span className="truncate">{trip.route?.route_name || 'Chưa có tuyến'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs truncate">
                    <Truck className="w-3 h-3 opacity-70 flex-shrink-0" />
                    <span className="truncate">{trip.vehicle?.license_plate || 'Chưa gán xe'}</span>
                </div>
            </div>

            {/* Revenue */}
            {trip.total_revenue > 0 && (
                <div className="text-[11px] text-right font-mono font-medium opacity-80 pt-2 mt-2 border-t border-black/5">
                    {formatCurrency(trip.total_revenue)}
                </div>
            )}
        </div>
    );
}
