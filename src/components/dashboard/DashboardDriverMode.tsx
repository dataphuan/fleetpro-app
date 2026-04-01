import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTrips, useStartTrip } from '@/hooks/useTrips';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

const isUpcomingTrip = (status: string) => ['confirmed', 'dispatched', 'draft'].includes(status);

export function DashboardDriverMode() {
  const { user } = useAuth();
  const { data: trips = [] } = useTrips();
  const { mutateAsync: startTrip, isPending } = useStartTrip();
  const { toast } = useToast();

  const myTrips = useMemo(() => {
    return trips.filter((trip: any) => {
      return (
        trip.driver_id === user?.id ||
        trip.driver_id === user?.email ||
        trip.driver?.email === user?.email
      );
    });
  }, [trips, user?.id, user?.email]);

  const nextTrip = useMemo(() => {
    return myTrips
      .filter((trip: any) => isUpcomingTrip(trip.status))
      .sort((a: any, b: any) => new Date(a.departure_date || a.created_at).getTime() - new Date(b.departure_date || b.created_at).getTime())[0];
  }, [myTrips]);

  const incomeToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return myTrips
      .filter((trip: any) => (trip.departure_date || '').slice(0, 10) === today)
      .reduce((sum: number, trip: any) => sum + Number(trip.driver_income || trip.driver_fee || 0), 0);
  }, [myTrips]);

  const handleStartTrip = async () => {
    if (!nextTrip) return;
    const ok = window.confirm(`Bắt đầu chuyến ${nextTrip.trip_code || nextTrip.id}?`);
    if (!ok) return;

    try {
      await startTrip({
        id: nextTrip.id,
        actualDepartureTime: new Date().toISOString(),
      });
    } catch (error: any) {
      toast({
        title: 'Không thể bắt đầu chuyến',
        description: error?.message || 'Vui lòng thử lại.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Xin chào, {user?.full_name || user?.email || 'Tài xế'}</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chuyến tiếp theo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {nextTrip ? (
            <>
              <p className="text-2xl font-bold">{nextTrip.origin || 'Điểm đi'} → {nextTrip.destination || 'Điểm đến'}</p>
              <p className="text-xl text-primary font-semibold">
                Giờ xuất phát: {nextTrip.departure_time || nextTrip.departure_date || 'Chưa chốt giờ'}
              </p>
              <p>Khách hàng: {nextTrip.customer_name || '—'}</p>
              <p>Khoảng cách: {nextTrip.distance_km || nextTrip.route_distance_km || 0} km</p>
              <Button
                className="h-16 w-full text-xl font-semibold"
                onClick={handleStartTrip}
                disabled={isPending}
              >
                {isPending ? 'Đang xử lý...' : '✅ BẮT ĐẦU CHUYẾN'}
              </Button>
            </>
          ) : (
            <p className="text-lg text-muted-foreground">Hôm nay chưa có chuyến - nghỉ ngơi nhé 😊</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thu nhập hôm nay</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold text-primary">{incomeToday.toLocaleString('vi-VN')}đ</p>
        </CardContent>
      </Card>
    </div>
  );
}
