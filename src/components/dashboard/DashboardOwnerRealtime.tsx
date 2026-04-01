import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicles } from '@/hooks/useVehicles';
import { useTrips } from '@/hooks/useTrips';
import { useExpenses } from '@/hooks/useExpenses';
import { useAlertsSummary } from '@/hooks/useAlerts';
import { AlertTriangle, Circle, Truck, Wallet } from 'lucide-react';

const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

const isToday = (value: unknown) => {
  if (!value) return false;
  const dt = new Date(String(value));
  if (Number.isNaN(dt.getTime())) return false;
  return toDateKey(dt) === toDateKey(new Date());
};

const daysLeft = (dateInput: unknown) => {
  if (!dateInput) return Number.POSITIVE_INFINITY;
  const dt = new Date(String(dateInput));
  if (Number.isNaN(dt.getTime())) return Number.POSITIVE_INFINITY;
  const diff = dt.getTime() - Date.now();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

function AnimatedValue({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const end = Number.isFinite(value) ? value : 0;
    const duration = 800;
    const startAt = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString('vi-VN')}</>;
}

export function DashboardOwnerRealtime() {
  const { data: vehicles = [], refetch: refetchVehicles } = useVehicles();
  const { data: trips = [], refetch: refetchTrips } = useTrips();
  const { data: expenses = [], refetch: refetchExpenses } = useExpenses();
  const { data: alertsSummary, refetch: refetchAlerts } = useAlertsSummary();
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(async () => {
      await Promise.all([refetchVehicles(), refetchTrips(), refetchExpenses(), refetchAlerts()]);
      setLastUpdatedAt(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [refetchVehicles, refetchTrips, refetchExpenses, refetchAlerts]);

  const activeVehicles = vehicles.filter((v: any) => v.status !== 'inactive').length;
  const runningTrips = trips.filter((t: any) => t.status === 'in_progress' && isToday(t.departure_date || t.created_at)).length;
  const revenueToday = trips
    .filter((t: any) => isToday(t.departure_date || t.created_at))
    .reduce((sum: number, t: any) => sum + Number(t.total_revenue || t.freight_revenue || 0), 0);
  const criticalAlerts = Number(alertsSummary?.critical ?? 0) + Number(alertsSummary?.high ?? 0);

  const currentTripByVehicle = useMemo(() => {
    const map = new Map<string, any>();
    trips.forEach((trip: any) => {
      if (trip.vehicle_id && trip.status === 'in_progress') {
        map.set(trip.vehicle_id, trip);
      }
    });
    return map;
  }, [trips]);

  const expenseTodayByVehicle = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((exp: any) => {
      if (!isToday(exp.expense_date || exp.created_at)) return;
      if (!exp.vehicle_id) return;
      map.set(exp.vehicle_id, (map.get(exp.vehicle_id) || 0) + Number(exp.amount || 0));
    });
    return map;
  }, [expenses]);

  const activityEvents = useMemo(() => {
    const events: Array<{ ts: string; text: string; icon: string }> = [];

    trips.forEach((trip: any) => {
      if (isToday(trip.actual_departure_time)) {
        events.push({
          ts: String(trip.actual_departure_time),
          icon: '🚛',
          text: `${trip.vehicle_plate || trip.vehicle_id || 'Xe'} xuất phát ${trip.route_name || ''}`.trim(),
        });
      }
      if (isToday(trip.actual_arrival_time) || isToday(trip.closed_at)) {
        events.push({
          ts: String(trip.actual_arrival_time || trip.closed_at),
          icon: '✅',
          text: `Chuyến ${trip.trip_code || trip.id} hoàn thành`,
        });
      }
    });

    expenses.forEach((exp: any) => {
      if (!isToday(exp.expense_date || exp.created_at)) return;
      events.push({
        ts: String(exp.expense_date || exp.created_at),
        icon: '💰',
        text: `Chi phí ${Number(exp.amount || 0).toLocaleString('vi-VN')}đ (${exp.vehicle_id || 'N/A'})`,
      });
    });

    return events
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 20);
  }, [trips, expenses]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Đội xe hoạt động</p>
            <p className="text-2xl font-bold text-primary"><AnimatedValue value={activeVehicles} /></p>
            <p className="text-xs text-muted-foreground">/{vehicles.length} xe</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Đang chạy</p>
            <p className="text-2xl font-bold text-primary"><AnimatedValue value={runningTrips} /></p>
            <p className="text-xs text-muted-foreground">xe hôm nay</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Thu hôm nay</p>
            <p className="text-2xl font-bold text-primary"><AnimatedValue value={revenueToday} /></p>
            <p className="text-xs text-muted-foreground">VNĐ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Cảnh báo</p>
            <p className="text-2xl font-bold text-primary"><AnimatedValue value={criticalAlerts} /></p>
            <p className="text-xs text-muted-foreground">cần xử lý</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle: any) => {
              const trip = currentTripByVehicle.get(vehicle.id);
              const insurance = daysLeft(vehicle.insurance_civil_expiry || vehicle.insurance_expiry_civil);
              const inspection = daysLeft(vehicle.inspection_expiry_date || vehicle.registration_expiry_date);
              const minDays = Math.min(insurance, inspection);
              const border = minDays <= 30 ? 'border-red-200' : minDays <= 60 ? 'border-amber-200' : 'border-border';

              const dotColor = vehicle.status === 'maintenance'
                ? 'text-red-500'
                : vehicle.status === 'inactive'
                  ? 'text-slate-400'
                  : trip
                    ? 'text-emerald-500'
                    : 'text-amber-500';

              return (
                <Card key={vehicle.id} className={border}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between gap-2">
                      <span className="truncate inline-flex items-center gap-1.5">
                        <Circle className={`h-3.5 w-3.5 fill-current ${dotColor}`} />
                        {vehicle.license_plate || vehicle.vehicle_code}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {vehicle.status === 'maintenance' ? 'Bảo trì' : vehicle.status === 'inactive' ? 'Tạm dừng' : trip ? 'Đang chạy' : 'Sẵn sàng'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs">
                    <p className="truncate">Tài xế: {trip?.driver_name || 'Chưa phân công'}</p>
                    <p className="truncate">Tuyến: {trip?.route_name || trip?.destination || '—'}</p>
                    <p>BH còn: {Number.isFinite(insurance) ? `${insurance} ngày` : '—'} | ĐK còn: {Number.isFinite(inspection) ? `${inspection} ngày` : '—'}</p>
                    <p>Chi phí hôm nay: {(expenseTodayByVehicle.get(vehicle.id) || 0).toLocaleString('vi-VN')}đ</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Hoạt động hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[520px] overflow-auto">
            {activityEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có hoạt động trong hôm nay.</p>
            ) : (
              activityEvents.map((evt, idx) => (
                <div key={`${evt.ts}-${idx}`} className="text-xs border-b border-dashed pb-2">
                  <p className="font-medium">{new Date(evt.ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {evt.icon}</p>
                  <p className="text-muted-foreground">{evt.text}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Cập nhật lúc {lastUpdatedAt.toLocaleTimeString('vi-VN')}
      </p>
    </div>
  );
}
