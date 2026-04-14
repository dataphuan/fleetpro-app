import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Truck, MapPin, Search, Calendar, User, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Input } from "@/components/ui/input";
import { useUpdateTrip } from "@/hooks/useTrips";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface DispatchHubProps {
  trips: any[];
  vehicles: any[];
  drivers: any[];
}

export function DispatchHub({ trips, vehicles, drivers }: DispatchHubProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: updateTrip } = useUpdateTrip();
  
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [draggedVehicleId, setDraggedVehicleId] = useState<string | null>(null);

  // 1. Identify Idle Vehicles (Active, not currently in_progress or dispatched)
  const idleVehicles = useMemo(() => {
    if (!vehicles) return [];
    
    // Find vehicles currently involved in ongoing trips
    const busyVehicleIds = new Set(
      (trips || [])
        .filter(t => t.status === 'in_progress' || t.status === 'dispatched')
        .map(t => t.vehicle_id)
        .filter(Boolean)
    );

    return vehicles.filter(v => 
      v.status === 'active' && 
      !busyVehicleIds.has(v.id) &&
      (v.license_plate?.toLowerCase().includes(vehicleSearch.toLowerCase()) || 
       v.vehicle_type?.toLowerCase().includes(vehicleSearch.toLowerCase()))
    );
  }, [vehicles, trips, vehicleSearch]);

  // 2. Identify Pending Trips (Draft, Confirmed)
  const pendingTrips = useMemo(() => {
    return (trips || []).filter(t => t.status === 'draft' || t.status === 'confirmed');
  }, [trips]);

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, vehicleId: string) => {
    e.dataTransfer.setData("vehicleId", vehicleId);
    e.dataTransfer.effectAllowed = "copyMove";
    setDraggedVehicleId(vehicleId);
  };

  const handleDragEnd = () => {
    setDraggedVehicleId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = async (e: React.DragEvent, tripId: string) => {
    e.preventDefault();
    const vehicleId = e.dataTransfer.getData("vehicleId");
    if (!vehicleId) return;

    const vehicle = vehicles?.find(v => v.id === vehicleId);
    if (!vehicle) return;

    // Use vehicle's default driver if available
    const driverId = vehicle.default_driver_id || null;

    try {
      await updateTrip({
        id: tripId,
        updates: {
          vehicle_id: vehicleId,
          driver_id: driverId,
          status: 'dispatched'
        }
      });
      
      toast({
        title: "Điều xe thành công!",
        description: `Đã gán xe ${vehicle.license_plate} vào chuyến.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    } catch (err: any) {
      toast({
        title: "Lỗi điều xe",
        description: err.message || "Có lỗi xảy ra",
        variant: "destructive"
      });
    }
    
    setDraggedVehicleId(null);
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] bg-slate-50 gap-4 overflow-hidden rounded-lg border">
      
      {/* LEFT COLUMN: IDLE VEHICLES */}
      <div className="w-80 flex flex-col bg-white border-r shadow-sm z-10">
        <div className="p-4 border-b bg-slate-50/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Xe Sẵn Sàng
            </h3>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {idleVehicles.length}
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm biển số..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {idleVehicles.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Không có xe rảnh
            </div>
          ) : (
            idleVehicles.map(v => {
              const driver = drivers?.find(d => d.id === v.default_driver_id);
              return (
                <div
                  key={v.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, v.id)}
                  onDragEnd={handleDragEnd}
                  className="bg-white border rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-700 transition-colors">
                      {v.license_plate}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 bg-green-50">
                      Rảnh
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
                    <span className="truncate" title={v.vehicle_type}>{v.vehicle_type}</span>
                    <span className="text-right">{v.payload_capacity ? `${v.payload_capacity}T` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate font-medium text-slate-600">
                      {driver ? driver.full_name : <span className="text-amber-600 italic text-[10px]">Chưa gán tài xế cố định</span>}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: PENDING TRIPS (DROP ZONES) */}
      <div className="flex-1 flex flex-col bg-slate-50/30">
        <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm z-10">
          <div>
            <h3 className="font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              Cuốc Xe Chờ Chạy
            </h3>
            <p className="text-xs text-slate-500 mt-1">Kéo thả biển số xe vào thẻ để tạo lệnh điều động</p>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            {pendingTrips.length} chuyến
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 auto-rows-max items-start">
          {pendingTrips.length === 0 ? (
            <div className="col-span-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-400" />
              <p className="text-lg font-medium text-slate-600">Không có chuyến nào đang chờ</p>
              <p className="text-xs mt-1">Tất cả chuyến đã được điều xe</p>
            </div>
          ) : (
            pendingTrips.map(trip => {
              const isDragTarget = draggedVehicleId !== null;
              
              return (
                <div
                  key={trip.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, trip.id)}
                  className={`bg-white rounded-xl border-2 transition-all p-4 flex flex-col gap-3 relative shadow-sm
                    ${isDragTarget ? 'border-dashed border-blue-400 bg-blue-50/30 scale-[1.02] shadow-blue-100' : 'border-slate-200'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm font-mono text-slate-800">{trip.trip_code}</span>
                      <p className="text-xs text-slate-500 mt-0.5">{trip.departure_date ? format(new Date(trip.departure_date), 'dd/MM/yyyy') : '--'}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                      {trip.status === 'confirmed' ? 'Chốt chờ xe' : 'Khách đặt'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-start gap-2 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 mt-0.5 flex-shrink-0" />
                      <span className="font-medium text-slate-700">{trip.route?.route_name || 'Chưa định tuyến'}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs">
                      <User className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-600">{trip.customer?.customer_name || 'Khách vãng lai'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {trip.cargo_weight_tons ? `${trip.cargo_weight_tons} Tấn` : 'Không tải trọng'}
                    </span>
                    {trip.total_revenue > 0 && (
                      <span className="text-xs font-bold text-emerald-600">
                        {formatCurrency(trip.total_revenue)}
                      </span>
                    )}
                  </div>

                  {/* Absolute Drop Overlay when dragging */}
                  {isDragTarget && (
                    <div className="absolute inset-0 bg-blue-500/10 rounded-xl flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
                        Thả để Gán Xe
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
