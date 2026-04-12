/**
 * DASHBOARD SIMPLE (OPTION 1)
 * Target: Tài xế, Staff bình thường
 * Focus: Một chuyến tiếp theo + 3 metrics chính
 * UX: Không quá tải, dễ hiểu, CTA rõ ràng
 */

import { useState } from 'react';
import { Loader2, MapPin, Clock, AlertTriangle, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStats, useRecentTrips, useMaintenanceAlerts } from '@/hooks/useDashboard';
import { cn } from '@/lib/utils';
import { format, subMonths } from 'date-fns';

export function DashboardSimple() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const startMonth = format(subMonths(new Date(), 1), 'yyyy-MM-dd');

  const { data: stats, isLoading: statsLoading } = useDashboardStats(startMonth, today);
  const { data: recentTrips, isLoading: tripsLoading } = useRecentTrips(5);
  const { data: alerts, isLoading: alertsLoading } = useMaintenanceAlerts();

  const isLoading = statsLoading || tripsLoading || alertsLoading;
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HÔM NAY - 3 KPI CHÍNH */}
      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Hôm Nay</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Chuyến Đang Làm */}
          <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-50 dark:from-blue-950/20 dark:to-blue-950/10">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">📍 Chuyến Đang Làm</span>
                  <span className="text-2xl font-bold text-blue-600">{stats?.inProgress?.count || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Trip đang chạy</p>
              </div>
            </CardContent>
          </Card>

          {/* Thu Hôm Nay */}
          <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-50 dark:from-emerald-950/20 dark:to-emerald-950/10">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">💰 Thu Hôm Nay</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {((stats?.official?.revenue || 0) + (stats?.pending?.revenue || 0)).toLocaleString('vi-VN', { notation: 'compact' })}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">VND</p>
              </div>
            </CardContent>
          </Card>
 
          {/* Cảnh Báo */}
          <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-50 dark:from-orange-950/20 dark:to-orange-950/10">
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">⚠️ Cảnh Báo</span>
                  <span className="text-2xl font-bold text-orange-600">{alerts?.length || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Cần chú ý</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CHUYẾN TIẾP THEO - NỔIBẬT */}
      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">Chuyến Tiếp Theo</h2>
        {recentTrips && recentTrips.length > 0 ? (
          <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5">
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Trip Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <span className="text-sm font-bold text-primary">{recentTrips[0]?.route_code || 'Đang cập nhật'}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {recentTrips[0]?.origin || 'Bãi đi'} → {recentTrips[0]?.destination || 'Điểm đến'}
                    </p>
                    <p className="text-sm text-muted-foreground">{recentTrips[0]?.actual_distance_km || recentTrips[0]?.distance_km || 0} km</p>
                  </div>
                  <span className="text-3xl font-bold text-primary">{recentTrips[0]?.actual_distance_km || recentTrips[0]?.distance_km || 0}km</span>
                </div>

                {/* Customer */}
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Khách Hàng</p>
                  <p className="font-semibold text-foreground">{recentTrips[0]?.customer_name || 'Đang cập nhật'}</p>
                </div>

                {/* Time */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Giờ xuất: {recentTrips[0]?.actual_departure_time ? format(new Date(recentTrips[0].actual_departure_time), 'HH:mm') : 'Chưa xuất'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Thời gian: {recentTrips[0]?.estimated_duration_hours || 0}h</span>
                  </div>
                </div>

                {/* CTA Button - RÕRÀNG */}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-primary text-base font-semibold">
                    ✓ Bắt Đầu Chuyến
                  </Button>
                  <Button variant="outline">Chi Tiết</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Không có chuyến tiếp theo</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* TÀI XẾ GẦN ĐÓ */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Tài Xế Cùng Chuyến</h2>
        <div className="flex flex-wrap gap-2">
          {recentTrips && recentTrips.slice(0, 3).map((trip, idx) => (
            <Button key={idx} variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              <span>{trip?.driver_name || `Tài Xế ${idx + 1}`}</span>
              <span className="text-xs text-muted-foreground">({trip?.route_name || 'Đang chạy'})</span>
            </Button>
          ))}
        </div>
      </div>

      {/* QUICK LINKS */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="ghost" className="text-xs">
          Chuyến Đi
        </Button>
        <Button variant="ghost" className="text-xs">
          Doanh Thu
        </Button>
        <Button variant="ghost" className="text-xs">
          Cảnh Báo
        </Button>
        <Button variant="ghost" className="text-xs">
          Hỗ Trợ
        </Button>
      </div>
    </div>
  );
}
