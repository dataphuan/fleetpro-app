/**
 * DASHBOARD PROFESSIONAL (OPTION 3)
 * Target: Management/High-level decision makers
 * Focus: YoY comparison, detailed analytics, forecasting
 * UX: Data-rich, professional, export capabilities
 */

import { useState } from 'react';
import { Loader2, TrendingUp, BarChart3, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardStats, useMonthlyTrend, useExpenseBreakdown, useDriverPerformance, useVehiclePerformance, useRecentTrips } from '@/hooks/useDashboard';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from 'recharts';
import { format, subMonths } from 'date-fns';

export function DashboardProfessional() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const startMonth = format(subMonths(new Date(), 1), 'yyyy-MM-dd');

  const { data: stats, isLoading: statsLoading } = useDashboardStats(startMonth, today);
  const { data: monthlyTrend, isLoading: trendLoading } = useMonthlyTrend(12);
  const { data: topDrivers, isLoading: driversLoading } = useDriverPerformance(5);
  const { data: topRoutes, isLoading: routesLoading } = useVehiclePerformance(5);
  
  const isLoading = statsLoading || trendLoading || driversLoading || routesLoading;
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // YoY Comparison (Mock data - in real app, fetch from API)
  const yoyGrowth = {
    revenue: 154.5,
    trips: 154.5,
    profit: 141.0,
    ebitda: 77.5,
  };

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* HEADER - Tháng + YoY */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">📊 Tháng 3/2026</h2>
          <p className="text-sm text-muted-foreground">YoY: +{yoyGrowth.revenue}% (so sánh T3/2025) vs +{yoyGrowth.trips}% chuyến</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Cập Nhật
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* 5 KPI CHÍNH - MỌI CHỈ SỐ QUAN TRỌNG */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Doanh Thu */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Doanh Thu</p>
              <p className="text-2xl font-bold text-foreground">
                {((stats?.official?.revenue || 0) + (stats?.pending?.revenue || 0)).toLocaleString('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-emerald-600">↑ {yoyGrowth.revenue.toFixed(1)}% YoY</p>
            </div>
          </CardContent>
        </Card>

        {/* Chi Phí */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Chi Phí</p>
              <p className="text-2xl font-bold text-foreground">
                {((stats?.official?.expense || 0) + (stats?.pending?.expense || 0)).toLocaleString('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })}
              </p>
              <p className="text-xs text-muted-foreground">→ Không đổi</p>
            </div>
          </CardContent>
        </Card>

        {/* Lợi Nhuận */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Lợi Nhuận</p>
              <p className="text-2xl font-bold text-foreground">
                {(((stats?.official?.revenue || 0) + (stats?.pending?.revenue || 0)) - ((stats?.official?.expense || 0) + (stats?.pending?.expense || 0))).toLocaleString('vi-VN', {
                  notation: 'compact',
                  maximumFractionDigits: 1,
                })}
              </p>
              <p className="text-xs text-emerald-600">↑ {yoyGrowth.profit.toFixed(1)}% YoY</p>
            </div>
          </CardContent>
        </Card>

        {/* EBITDA % */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">EBITDA %</p>
              <p className="text-2xl font-bold text-foreground">{yoyGrowth.ebitda.toFixed(1)}%</p>
              <p className="text-xs text-emerald-600">↑ 2 pts from last month</p>
            </div>
          </CardContent>
        </Card>

        {/* Xe Hoạt Động */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Xe Hoạt Động</p>
              <p className="text-2xl font-bold text-foreground">18/20</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ANALYTICS TABS */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="revenue">Doanh Thu</TabsTrigger>
          <TabsTrigger value="routes">Tuyến Đường</TabsTrigger>
          <TabsTrigger value="drivers">Tài Xế</TabsTrigger>
          <TabsTrigger value="expenses">Chi Phí</TabsTrigger>
        </TabsList>

        {/* TAB 1: REVENUE TREND */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Doanh Thu & Chi Phí (3 tháng)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart
                  data={monthlyTrend?.slice(-12) || []}
                  margin={{ top: 20, right: 30, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
                    formatter={(value) => value.toLocaleString('vi-VN')}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    fill="#3b82f6"
                    stroke="#3b82f6"
                    name="Doanh Thu"
                    opacity={0.7}
                  />
                  <Bar yAxisId="right" dataKey="expense" fill="#ef4444" name="Chi Phí" opacity={0.7} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TOP ROUTES */}
        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Loại Xe (Theo Doanh Thu)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topRoutes?.slice(0, 8) || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="license_plate" tick={{ fontSize: 12 }} angle={-25} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => (value as number).toLocaleString('vi-VN')} />
                  <Legend />
                  <Bar dataKey="total_revenue" fill="#3b82f6" name="Doanh Thu" />
                  <Bar dataKey="total_profit" fill="#10b981" name="Lợi Nhuận" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Routes List */}
          <Card>
            <CardHeader>
              <CardTitle>Chi Tiết Top 3 Xa (Theo Doanh Thu)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topRoutes?.slice(0, 3).map((vehicle, idx) => (
                  <div key={idx} className="border-b pb-3 dark:border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{idx + 1}. {vehicle?.license_plate || 'Xe #' + idx}</p>
                        <p className="text-xs text-muted-foreground">{vehicle?.trip_count || 0} chuyến</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{(vehicle?.total_revenue || 0).toLocaleString('vi-VN', { notation: 'compact' })}</p>
                        <p className="text-xs text-emerald-600">{(vehicle?.profit_margin || 0).toFixed(1)}% margin</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: TOP DRIVERS */}
        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tài Xế Hiệu Suất Cao</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topDrivers?.slice(0, 5).map((driver, idx) => (
                  <div key={idx} className="border-b pb-3 dark:border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{idx + 1}. {driver?.full_name || 'Tài Xế #' + idx}</p>
                        <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                          <span>📊 Chuyến: {driver?.trip_count || 0}</span>
                          <span>💰 Doanh: {(driver?.total_revenue || 0).toLocaleString('vi-VN', { notation: 'compact' })}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{(driver?.profit_margin || 0).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Hiệu suất</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: EXPENSE BREAKDOWN */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Chi Phí Theo Loại</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Lương', value: 51 },
                        { name: 'Nhiên liệu', value: 36 },
                        { name: 'Bảo trì', value: 5 },
                        { name: 'Khác', value: 8 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2, 3].map((index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chi Tiết Chi Phí</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Lương Tài Xế', value: 1071.6, pct: 51 },
                    { name: 'Nhiên Liệu', value: 749.2, pct: 36 },
                    { name: 'Bảo Trì', value: 104.5, pct: 5 },
                    { name: 'Khác', value: 169.8, pct: 8 },
                  ].map((item, idx) => (
                    <div key={idx} className="border-b pb-2 dark:border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-xs font-bold">{item.pct}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.value}M VND</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ACTIONS */}
      <div className="flex flex-wrap gap-2">
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Export Excel
        </Button>
        <Button variant="outline">📊 In PDF</Button>
        <Button variant="outline">📧 Email Report</Button>
        <Button variant="outline">📈 Chạy Dự Báo</Button>
      </div>
    </div>
  );
}
