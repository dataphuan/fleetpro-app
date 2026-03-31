/**
 * DASHBOARD BALANCED (OPTION 2)
 * Target: Quản lý/Giám sát bình thường
 * Focus: 4 KPI chính + Chuyến đang chạy + Cảnh báo
 * UX: Đủ thông tin để quyết định, không phức tạp
 */

import { useState } from 'react';
import { Loader2, TrendingUp, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDashboardStats, useMonthlyTrend, useExpenseBreakdown, useRecentTrips, useMaintenanceAlerts } from '@/hooks/useDashboard';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { format, subMonths } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export function DashboardBalanced() {
  const { role } = useAuth();
  const isFinancialRole = ['admin', 'manager', 'accountant'].includes(role || '');
  const today = format(new Date(), 'yyyy-MM-dd');
  const startMonth = format(subMonths(new Date(), 1), 'yyyy-MM-dd');

  const { data: stats, isLoading: statsLoading } = useDashboardStats(startMonth, today);
  const { data: monthlyTrend, isLoading: trendLoading } = useMonthlyTrend(6);
  const { data: expenseBreakdown, isLoading: expenseLoading } = useExpenseBreakdown(startMonth, today);
  const { data: recentTrips, isLoading: tripsLoading } = useRecentTrips(10);
  const { data: alerts, isLoading: alertsLoading } = useMaintenanceAlerts();

  const isLoading = statsLoading || trendLoading || expenseLoading || tripsLoading || alertsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  const activeTrips = (recentTrips || []).filter(t => ['pending', 'confirmed', 'dispatched', 'in_progress'].includes(t?.status || ''));

  return (
    <div className="space-y-6">
      {/* TÓM TẮT HÔM NAY - 4 KPI */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Tóm Tắt Hôm Nay</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Tổng Doanh Thu */}
          {isFinancialRole && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-muted-foreground">📊 Tổng Doanh Thu</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {((stats?.official?.revenue || 0) + (stats?.pending?.revenue || 0)).toLocaleString('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-xs text-emerald-600">↑ 12% vs hôm qua</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chuyến Hoàn Thành */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-medium text-muted-foreground">✅ Hoàn Thành</span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.official?.count || 0}/{(stats?.official?.count || 0) + (stats?.pending?.count || 0) + (stats?.draft?.count || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Chuyến</p>
              </div>
            </CardContent>
          </Card>

          {/* Lợi Nhuận */}
          {isFinancialRole && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-muted-foreground">💰 Lợi Nhuận</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {((stats?.official?.profit || 0) + (stats?.pending?.profit || 0)).toLocaleString('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })}
                  </p>
                  <p className="text-xs text-muted-foreground">VND</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hiệu Suất Xe */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium text-muted-foreground">⚡ Hiệu Suất Xe</span>
                </div>
                <p className="text-2xl font-bold text-foreground">78%</p>
                <p className="text-xs text-emerald-600">↑ 2.5% vs tháng trước</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CHUYẾN ĐANG CHẠY + CẢNH BÁO */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chuyến Đang Chạy (2/3) */}
        <div className="lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Chuyến Đang Chạy ({activeTrips.length})</h3>
          <div className="space-y-3">
            {activeTrips.slice(0, 3).map((trip, idx) => (
              <Card key={idx} className="hover:border-primary/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">► {trip.route_code}</span>
                        <span className="text-xs text-muted-foreground">Xe {trip.vehicle_code}</span>
                      </div>
                      <p className="text-sm font-semibold">{trip.origin} → {trip.destination}</p>
                      <p className="text-xs text-muted-foreground">Khách: {trip.customer_name}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>📍 {trip.distance_km}km</span>
                        <span>⏱️ ETA: {trip.estimated_duration_hours}h</span>
                        <span className="text-emerald-600">💰 {(trip.freight_revenue || 0).toLocaleString('vi-VN', { notation: 'compact' })}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Chi Tiết
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {activeTrips.length > 3 && (
              <Button variant="ghost" className="w-full text-xs">
                Xem tất cả ({activeTrips.length})
              </Button>
            )}
          </div>
        </div>

        {/* Cảnh Báo (1/3) */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-foreground">Cảnh Báo ({alerts?.length || 0})</h3>
          <Card className="border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/20">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {alerts?.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="border-b border-orange-200 pb-2 dark:border-orange-900/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-600" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-orange-900 dark:text-orange-100">{alert.title}</p>
                        <p className="text-xs text-orange-700 dark:text-orange-200">{alert.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {alerts?.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">Không có cảnh báo</p>
                )}
              </div>
              {alerts?.length > 3 && (
                <Button variant="ghost" className="mt-2 w-full text-xs">
                  Xem tất cả
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* BIỂU ĐỒ - Doanh thu & Chi phí */}
      {isFinancialRole && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Line Chart - Revenue Trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Doanh Thu & Chi Phí (15 ngày gần nhất)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyTrend?.slice(-15)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => value.toLocaleString('vi-VN')} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Doanh Thu" />
                  <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Chi Phí" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Chi Phí Chi Tiết</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm">📊 Chi Tiết Ngày</Button>
        <Button size="sm" variant="outline">
          📈 Báo Cáo Tuần
        </Button>
        <Button size="sm" variant="outline">
          💾 Export Excel
        </Button>
        <Button size="sm" variant="outline">
          📧 Gửi Report
        </Button>
      </div>
    </div>
  );
}
