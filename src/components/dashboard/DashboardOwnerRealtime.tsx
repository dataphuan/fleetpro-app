import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicles } from '@/hooks/useVehicles';
import { useTrips } from '@/hooks/useTrips';
import { useExpenses } from '@/hooks/useExpenses';
import { useAlertsSummary } from '@/hooks/useAlerts';
import { AlertTriangle, Circle, Truck, Wallet, Sparkles, TrendingUp, Info } from 'lucide-react';

const AIInsightCard = ({ icon: Icon, title, message, colorClass }: { icon: any, title: string, message: string, colorClass: string }) => (
    <div className={`flex items-start gap-2 p-2 rounded-lg border ${colorClass} bg-white/50 transition-all hover:shadow-sm`}>
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
            <p className="text-[10px] font-bold uppercase tracking-tight opacity-70 leading-none mb-1">{title}</p>
            <p className="text-xs font-medium leading-tight">{message}</p>
        </div>
    </div>
);

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

  const aiInsights = useMemo(() => {
    const insights: Array<{ icon: any; title: string; message: string; colorClass: string }> = [];

    // 1. Expiration Insights (from seeded data)
    const expiringSoon = vehicles.filter((v: any) => {
        const days = Math.min(
            daysLeft(v.insurance_civil_expiry || v.insurance_expiry_civil),
            daysLeft(v.inspection_expiry_date || v.registration_expiry_date)
        );
        return days >= 0 && days <= 7;
    });
    if (expiringSoon.length > 0) {
        insights.push({
            icon: AlertTriangle,
            title: 'Hết hạn giấy tờ',
            message: `Phát hiện ${expiringSoon.length} xe (${expiringSoon.map((v: any) => v.license_plate).join(', ')}) sắp hết hạn đăng kiểm/bảo hiểm trong tuần này.`,
            colorClass: 'border-red-200 text-red-700 bg-red-50'
        });
    }

    // 2. High Cost Insights (Logic based on seeded Premium cost data)
    const highCostVehicles = vehicles.filter((v: any) => expenseTodayByVehicle.get(v.id) || 0 > 2000000);
    if (highCostVehicles.length > 0) {
        insights.push({
            icon: TrendingUp,
            title: 'Cảnh báo chi phí',
            message: `Xe ${highCostVehicles[0].license_plate} đang có chi phí vận hành cao đột biến trong ngày (>2tr VND).`,
            colorClass: 'border-amber-200 text-amber-700 bg-amber-50'
        });
    }

    // 3. Efficiency Insights
    if (runningTrips > 0) {
        insights.push({
            icon: Sparkles,
            title: 'Hiệu suất vận hành',
            message: `Hệ thống đang điều phối ${runningTrips} chuyến đi đồng thời. Tỉ lệ xe trống lệnh hiện tại là ${Math.round(((vehicles.length - runningTrips) / vehicles.length) * 100)}%.`,
            colorClass: 'border-blue-200 text-blue-700 bg-blue-50'
        });
    }

    // 4. Maintenance Insight
    const inMaintenance = vehicles.filter((v: any) => v.status === 'maintenance');
    if (inMaintenance.length > 0) {
        insights.push({
            icon: Info,
            title: 'Bảo trì định kỳ',
            message: `${inMaintenance.length} xe đang nằm bãi bảo dưỡng, cần đôn đốc giải phóng xe để nhận lệnh mới.`,
            colorClass: 'border-slate-200 text-slate-700 bg-slate-50'
        });
    }

    return insights;
  }, [vehicles, runningTrips, expenseTodayByVehicle]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-70 mb-1">Đội xe hoạt động</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-primary"><AnimatedValue value={activeVehicles} /></span>
              <span className="text-[10px] text-muted-foreground font-medium">/{vehicles.length} xe</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-70 mb-1">Đang chạy</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-primary"><AnimatedValue value={runningTrips} /></span>
              <span className="text-[10px] text-muted-foreground font-medium">xe hôm nay</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-70 mb-1">Thu hôm nay</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-primary"><AnimatedValue value={revenueToday} /></span>
              <span className="text-[10px] text-muted-foreground font-medium">VNĐ</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-70 mb-1">Cảnh báo</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-red-600"><AnimatedValue value={criticalAlerts} /></span>
              <span className="text-[10px] text-muted-foreground font-medium">cần xử lý</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* AI OPERATING INSIGHTS - WOW FACTOR FOR CEO */}
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30">
        <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-800">
                <Sparkles className="h-4 w-4 fill-indigo-500 text-indigo-500" />
                Trợ Lý AI Phân Tích (Live Insights)
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiInsights.length > 0 ? aiInsights.map((insight, idx) => (
                    <AIInsightCard key={idx} {...insight} />
                )) : (
                    <div className="col-span-2 text-center py-4 text-xs text-muted-foreground italic">
                        Đang quét dữ liệu hoạt động để đưa ra phân tích...
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

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
