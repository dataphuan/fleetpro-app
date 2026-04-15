import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, Truck, Send, MessageCircle } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCreateTrip, useTrips } from '@/hooks/useTrips';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useRoutes } from '@/hooks/useRoutes';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/hooks/use-auth';
import { generateTripCode } from '@/lib/utils';
import { sendDriverDispatchNotification } from '@/lib/driver-notifications';
import { db } from '@/lib/firebase';

type Props = {
  triggerLabel?: string;
  triggerClassName?: string;
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  enableShortcut?: boolean;
};

const ACTIVE_TRIP_STATUSES = new Set(['draft', 'confirmed', 'dispatched', 'in_progress']);

export function QuickTripModal({
  triggerLabel = 'Tạo chuyến nhanh',
  triggerClassName,
  showTrigger = true,
  open,
  onOpenChange,
  enableShortcut = true,
}: Props) {
  const { toast } = useToast();
  const { tenantId, userId } = useAuth();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const { data: routes = [] } = useRoutes();
  const { data: customers = [] } = useCustomers();
  const { data: trips = [] } = useTrips();
  const createTrip = useCreateTrip();

  const [internalOpen, setInternalOpen] = useState(false);
  const controlledOpen = typeof open === 'boolean' ? open : internalOpen;
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next);
    if (typeof open !== 'boolean') setInternalOpen(next);
  };

  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [customerId, setCustomerId] = useState('none');
  const [departureAt, setDepartureAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState('');
  const [sendDriverNotify, setSendDriverNotify] = useState(true);

  const selectedVehicle = useMemo(
    () => vehicles.find((v: any) => String(v.id) === vehicleId),
    [vehicleId, vehicles]
  );

  const selectedRoute = useMemo(
    () => routes.find((r: any) => String(r.id) === routeId),
    [routeId, routes]
  );

  const selectedDriver = useMemo(
    () => drivers.find((d: any) => String(d.id) === driverId),
    [driverId, drivers],
  );

  const selectedCustomer = useMemo(
    () => customers.find((c: any) => String(c.id) === customerId),
    [customerId, customers],
  );

  const activeTripOnVehicle = useMemo(() => {
    if (!vehicleId) return null;
    return trips.find((trip: any) => trip.vehicle_id === vehicleId && ACTIVE_TRIP_STATUSES.has(String(trip.status || '')));
  }, [trips, vehicleId]);

  const activeTripOnDriver = useMemo(() => {
    if (!driverId) return null;
    return trips.find((trip: any) => trip.driver_id === driverId && ACTIVE_TRIP_STATUSES.has(String(trip.status || '')));
  }, [trips, driverId]);

  const isVehicleExpired = useMemo(() => {
    if (!selectedVehicle) return false;
    const now = new Date();
    const reg = selectedVehicle.registration_expiry ? new Date(selectedVehicle.registration_expiry) : null;
    const ins = selectedVehicle.insurance_expiry ? new Date(selectedVehicle.insurance_expiry) : null;
    return (reg && reg < now) || (ins && ins < now);
  }, [selectedVehicle]);

  const isDriverExpired = useMemo(() => {
    if (!selectedDriver) return false;
    const now = new Date();
    const lic = selectedDriver.license_expiry ? new Date(selectedDriver.license_expiry) : null;
    return (lic && lic < now);
  }, [selectedDriver]);

  const isOverloaded = useMemo(() => {
    if (!selectedVehicle || !selectedRoute) return false;
    const weight = Number(selectedRoute.cargo_weight_standard || selectedRoute.cargo_tons || 0);
    const capacity = Number(selectedVehicle.payload_capacity || 0);
    return capacity > 0 && weight > capacity;
  }, [selectedVehicle, selectedRoute]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const assignedDriverId = selectedVehicle.default_driver_id || selectedVehicle.assigned_driver_id;
    if (assignedDriverId) {
      setDriverId(String(assignedDriverId));
      return;
    }

    const linkedDriver = drivers.find((d: any) => d.assigned_vehicle_id === selectedVehicle.id);
    if (linkedDriver) {
      setDriverId(String(linkedDriver.id));
    }
  }, [selectedVehicle, drivers]);

  useEffect(() => {
    if (!enableShortcut) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const hasMod = isMac ? event.metaKey : event.ctrlKey;
      if (hasMod && event.key.toLowerCase() === 'n') {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || target?.getAttribute('contenteditable') === 'true') {
          return;
        }
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enableShortcut]);

  const resetForm = () => {
    setVehicleId('');
    setDriverId('');
    setRouteId('');
    setCustomerId('none');
    setDepartureAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setNotes('');
    setSendDriverNotify(true);
  };

  const validate = () => {
    if (!vehicleId) return 'Vui lòng chọn xe.';
    if (!routeId) return 'Vui lòng chọn tuyến đường.';
    if (!departureAt) return 'Vui lòng chọn ngày giờ xuất phát.';
    if (!driverId) return 'Xe này chưa có tài xế phân công. Vui lòng chọn tài xế.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      toast({ title: 'Thiếu thông tin bắt buộc', description: validationError, variant: 'destructive' });
      return;
    }

    const estimatedRevenue = Number(selectedRoute?.base_price || selectedRoute?.transport_revenue_standard || 0);
    const tripCode = generateTripCode();

    await createTrip.mutateAsync({
      trip_code: tripCode,
      departure_date: departureAt.slice(0, 10),
      vehicle_id: vehicleId,
      driver_id: driverId,
      route_id: routeId,
      customer_id: customerId === 'none' ? null : customerId,
      cargo_description: null,
      cargo_weight_tons: Number(selectedRoute?.cargo_weight_standard || selectedRoute?.cargo_tons || 0),
      actual_distance_km: Number(selectedRoute?.distance_km || 0),
      freight_revenue: estimatedRevenue,
      additional_charges: 0,
      total_revenue: estimatedRevenue,
      status: 'draft',
      notes: notes || null,
      is_deleted: 0,
    } as any);

    toast({
      title: '✅ Tạo chuyến nhanh thành công',
      description: `Chuyến ${tripCode} đã được tạo và cập nhật danh sách ngay.`,
    });

    if (sendDriverNotify) {
      const notifyResult = await sendDriverDispatchNotification({
        tripCode,
        driverName: selectedDriver?.full_name || 'Tai xe',
        driverPhone: selectedDriver?.phone || selectedDriver?.phone_number || null,
        driverTelegramChatId:
          selectedDriver?.telegram_chat_id ||
          selectedDriver?.telegramChatId ||
          selectedDriver?.chat_id ||
          null,
        licensePlate: selectedVehicle?.license_plate || selectedVehicle?.vehicle_code || 'Chua cap nhat',
        departureAt,
        origin: selectedRoute?.origin || selectedRoute?.pickup_location || null,
        destination: selectedRoute?.destination || selectedRoute?.delivery_location || null,
        distanceKm: Number(selectedRoute?.distance_km || 0),
        customerName: selectedCustomer?.short_name || selectedCustomer?.customer_name || null,
      });

      try {
        if (tenantId) {
          await addDoc(collection(db, 'driver_notifications'), {
            tenant_id: tenantId,
            trip_code: tripCode,
            trip_id: null,
            driver_id: driverId,
            driver_name: selectedDriver?.full_name || 'Tai xe',
            driver_phone: selectedDriver?.phone || selectedDriver?.phone_number || null,
            channel: notifyResult.channel,
            status: notifyResult.ok ? 'delivered' : 'failed',
            error_message: notifyResult.ok ? null : notifyResult.message,
            created_by: userId || 'system',
            created_at: new Date().toISOString(),
          });
        }
      } catch (logError) {
        console.warn('Khong the ghi log driver_notifications:', logError);
      }

      if (notifyResult.ok) {
        toast({
          title: '📨 Đã gửi thông báo tài xế',
          description: `Kênh gửi: ${notifyResult.channel === 'telegram' ? 'Telegram' : 'Khác'}.`,
        });
      } else {
        toast({
          title: '⚠️ Tạo chuyến thành công nhưng gửi thông báo chưa thành công',
          description: notifyResult.message,
          variant: 'destructive',
        });
      }
    }

    setOpen(false);
    resetForm();
  };

  return (
    <>
      {showTrigger && (
        <Button className={triggerClassName} onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      )}

      <Dialog open={controlledOpen} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Tạo Chuyến Nhanh</DialogTitle>
            <DialogDescription>
              Hoàn tất trong một form. Phím tắt mở nhanh: Ctrl+N (hoặc Cmd+N).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Chọn xe <span className="text-red-500">*</span></Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn xe và tài xế phân công" />
                </SelectTrigger>
                <SelectContent>
                  {/* Priority 1: My assigned vehicle */}
                  {(() => {
                    const available = vehicles.filter((v: any) => v.status === 'active' && !v.is_deleted);
                    const myVehicle = available.filter((v: any) => v.assigned_driver_id === userId || v.default_driver_id === userId);
                    const poolVehicles = available.filter((v: any) => v.assignment_type === 'pool' && !myVehicle.find((m: any) => m.id === v.id));
                    const otherVehicles = available.filter((v: any) => !myVehicle.find((m: any) => m.id === v.id) && v.assignment_type !== 'pool');

                    return (
                      <>
                        {myVehicle.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-bold text-blue-600 bg-blue-50">🔒 Xe của tôi</div>
                            {myVehicle.map((vehicle: any) => {
                              const assignedDriver = drivers.find((d: any) => d.id === vehicle.default_driver_id || d.id === vehicle.assigned_driver_id || d.assigned_vehicle_id === vehicle.id);
                              return (
                                <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                  ⭐ {vehicle.license_plate || vehicle.vehicle_code} {assignedDriver ? `• ${assignedDriver.full_name}` : ''}
                                </SelectItem>
                              );
                            })}
                          </>
                        )}
                        {poolVehicles.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-bold text-purple-600 bg-purple-50">🔄 Xe Pool (dùng chung)</div>
                            {poolVehicles.map((vehicle: any) => (
                              <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                {vehicle.license_plate || vehicle.vehicle_code} • Pool
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {otherVehicles.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-bold text-slate-500 bg-slate-50">📋 Xe khác có sẵn</div>
                            {otherVehicles.map((vehicle: any) => {
                              const assignedDriver = drivers.find((d: any) => d.id === vehicle.default_driver_id || d.id === vehicle.assigned_driver_id || d.assigned_vehicle_id === vehicle.id);
                              return (
                                <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                                  {vehicle.license_plate || vehicle.vehicle_code} {assignedDriver ? `• ${assignedDriver.full_name}` : '• Chưa phân công'}
                                </SelectItem>
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tuyến đường *</Label>
              <Select value={routeId} onValueChange={setRouteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tuyến đường" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route: any) => (
                    <SelectItem key={route.id} value={String(route.id)}>
                      {route.route_name || `${route.origin || '—'} → ${route.destination || '—'}`} • {Number(route.distance_km || 0)} km • ~{Number(route.estimated_duration_hours || 0)}h
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Ngày giờ xuất phát *</Label>
              <Input type="datetime-local" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tài xế (tự điền)</Label>
                <Select value={driverId} onValueChange={setDriverId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài xế" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver: any) => (
                      <SelectItem key={driver.id} value={String(driver.id)}>
                        {driver.full_name} {driver.driver_code ? `(${driver.driver_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Khách hàng (tùy chọn)</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Không chọn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn</SelectItem>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={String(customer.id)}>
                        {customer.short_name || customer.customer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Ghi chú (tùy chọn)</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Ưu tiên giao trước 12h"
              />
            </div>

            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Checkbox
                id="send-driver-notify"
                checked={sendDriverNotify}
                onCheckedChange={(checked) => setSendDriverNotify(Boolean(checked))}
              />
              <Label htmlFor="send-driver-notify" className="text-sm leading-5 cursor-pointer">
                📱 Gửi thông báo phân công cho tài xế (ưu tiên Telegram API miễn phí, fallback endpoint server)
              </Label>
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Tự điền thông tin</p>
              <p className="text-muted-foreground">
                {selectedRoute
                  ? `Tuyến: ${selectedRoute.origin || '—'} → ${selectedRoute.destination || '—'} • ${Number(selectedRoute.distance_km || 0)} km • Doanh thu ước tính ${Number(selectedRoute.base_price || selectedRoute.transport_revenue_standard || 0).toLocaleString('vi-VN')}đ`
                  : 'Chọn tuyến để xem km và doanh thu ước tính.'}
              </p>
            </div>

            {activeTripOnVehicle && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
                <div className="mt-0.5">⚠️</div>
                <div>
                  Cảnh báo: Xe này đang có chuyến {activeTripOnVehicle.trip_code || activeTripOnVehicle.id} chưa hoàn tất (Trạng thái: {activeTripOnVehicle.status}).
                </div>
              </div>
            )}

            {activeTripOnDriver && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
                <div className="mt-0.5">⚠️</div>
                <div>
                  Cảnh báo: Tài xế này đang bận thực hiện chuyến {activeTripOnDriver.trip_code || activeTripOnDriver.id}.
                </div>
              </div>
            )}

            {isVehicleExpired && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex items-start gap-2">
                <div className="mt-0.5">🚫</div>
                <div>
                  <strong>NGUY HIỂM:</strong> Xe này đã hết hạn Đăng kiểm hoặc Bảo hiểm. Vui lòng kiểm tra giấy tờ trước khi cho xe lăn bánh để tránh bị phạt nặng!
                </div>
              </div>
            )}

            {isDriverExpired && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex items-start gap-2">
                <div className="mt-0.5">🚫</div>
                <div>
                  <strong>CẢNH BÁO PHÁP LÝ:</strong> Bằng lái của tài xế này đã hết hạn. Không được phép điều phối tài xế này.
                </div>
              </div>
            )}

            {isOverloaded && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 flex items-start gap-2">
                <div className="mt-0.5">⚖️</div>
                <div>
                  <strong>CẢNH BÁO TẢI TRỌNG:</strong> Khối hàng ({Number(selectedRoute?.cargo_weight_standard || 0)}T) đang vượt quá tải trọng cho phép của xe ({selectedVehicle?.payload_capacity}T).
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit} disabled={createTrip.isPending} className="min-w-[150px]">
              {createTrip.isPending ? (
                <>
                  <Truck className="mr-2 h-4 w-4 animate-pulse" /> Đang tạo...
                </>
              ) : (
                'Tạo Chuyến Ngay'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
