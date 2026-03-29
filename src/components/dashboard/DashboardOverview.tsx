import { useState, useMemo } from "react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import {
    Truck,
    Package,
    Wallet,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Users,
    AlertTriangle,
    Calendar,
    Wrench,
    Loader2,
    Filter
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Sector,
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
    useDashboardStats,
    useMonthlyTrend,
    useExpenseBreakdown,
    useRecentTrips,
    useMaintenanceAlerts,
    useDriverPerformance,
} from "@/hooks/useDashboard";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    startOfMonth, endOfMonth, subDays, format, startOfDay, endOfDay,
    startOfWeek, endOfWeek, subWeeks, subMonths,
    startOfQuarter, endOfQuarter, subQuarters,
    startOfYear, endOfYear, subYears
} from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { vi } from "date-fns/locale";

export function DashboardOverview() {
    const navigate = useNavigate();
    const [datePreset, setDatePreset] = useState("this_year");
    const [customDate, setCustomDate] = useState<DateRange | undefined>();
    const [activeIndex, setActiveIndex] = useState(0);

    const onPieEnter = (_: any, index: number) => {
        setActiveIndex(index);
    };

    // Calculate Date Range
    const { startDate, endDate, prevStartDate, prevEndDate, label } = useMemo(() => {
        const now = new Date();
        let start = startOfMonth(now);
        let end = endOfMonth(now);
        let prevStart = startOfMonth(subMonths(now, 1));
        let prevEnd = endOfMonth(subMonths(now, 1));
        let label = "so với tháng trước";

        switch (datePreset) {
            case "today":
                start = startOfDay(now);
                end = endOfDay(now);
                prevStart = startOfDay(subDays(now, 1));
                prevEnd = endOfDay(subDays(now, 1));
                label = "so với hôm qua";
                break;
            case "yesterday":
                start = startOfDay(subDays(now, 1));
                end = endOfDay(subDays(now, 1));
                prevStart = startOfDay(subDays(now, 2));
                prevEnd = endOfDay(subDays(now, 2));
                label = "so với hôm kia";
                break;
            case "this_week":
                start = startOfWeek(now, { locale: vi });
                end = endOfWeek(now, { locale: vi });
                prevStart = startOfWeek(subWeeks(now, 1), { locale: vi });
                prevEnd = endOfWeek(subWeeks(now, 1), { locale: vi });
                label = "so với tuần trước";
                break;
            case "last_week":
                start = startOfWeek(subWeeks(now, 1), { locale: vi });
                end = endOfWeek(subWeeks(now, 1), { locale: vi });
                prevStart = startOfWeek(subWeeks(now, 2), { locale: vi });
                prevEnd = endOfWeek(subWeeks(now, 2), { locale: vi });
                label = "so với 2 tuần trước";
                break;
            case "last_7_days":
                start = subDays(now, 7);
                end = now;
                prevStart = subDays(now, 14);
                prevEnd = subDays(now, 7);
                label = "so với 7 ngày trước";
                break;
            case "this_month":
                start = startOfMonth(now);
                end = endOfMonth(now);
                prevStart = startOfMonth(subMonths(now, 1));
                prevEnd = endOfMonth(subMonths(now, 1));
                label = "so với tháng trước";
                break;
            case "last_month":
                start = startOfMonth(subMonths(now, 1));
                end = endOfMonth(subMonths(now, 1));
                prevStart = startOfMonth(subMonths(now, 2));
                prevEnd = endOfMonth(subMonths(now, 2));
                label = "so với 2 tháng trước";
                break;
            case "last_30_days":
                start = subDays(now, 30);
                end = now;
                prevStart = subDays(now, 60);
                prevEnd = subDays(now, 30);
                label = "so với 30 ngày trước";
                break;
            case "this_quarter":
                start = startOfQuarter(now);
                end = endOfQuarter(now);
                prevStart = startOfQuarter(subQuarters(now, 1));
                prevEnd = endOfQuarter(subQuarters(now, 1));
                label = "so với quý trước";
                break;
            case "last_quarter":
                start = startOfQuarter(subQuarters(now, 1));
                end = endOfQuarter(subQuarters(now, 1));
                prevStart = startOfQuarter(subQuarters(now, 2));
                prevEnd = endOfQuarter(subQuarters(now, 2));
                label = "so với 2 quý trước";
                break;
            case "this_year":
                start = startOfYear(now);
                end = endOfYear(now);
                prevStart = startOfYear(subYears(now, 1));
                prevEnd = endOfYear(subYears(now, 1));
                label = "so với năm ngoái";
                break;
            case "last_year":
                start = startOfYear(subYears(now, 1));
                end = endOfYear(subYears(now, 1));
                prevStart = startOfYear(subYears(now, 2));
                prevEnd = endOfYear(subYears(now, 2));
                label = "so với năm kia";
                break;
            case "custom":
                if (customDate?.from) {
                    start = customDate.from;
                    end = customDate.to || customDate.from;
                    // For custom range, compare to "same duration before"
                    const diffTime = end.getTime() - start.getTime();
                    prevEnd = new Date(start.getTime() - 1); // 1ms before start
                    prevStart = new Date(prevEnd.getTime() - diffTime);
                    label = "so với kỳ trước";
                }
                break;
        }

        return {
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd'),
            prevStartDate: format(prevStart, 'yyyy-MM-dd'),
            prevEndDate: format(prevEnd, 'yyyy-MM-dd'),
            label
        };
    }, [datePreset, customDate]);

    // Fetch real data
    const { data: stats, isLoading: statsLoading } = useDashboardStats(startDate, endDate);
    const { data: prevStats } = useDashboardStats(prevStartDate, prevEndDate);

    const { data: trendData, isLoading: trendLoading, error: trendError } = useMonthlyTrend(6); // Trend usually specific logic, keeping 6 months for now

    // Pass date range to expense breakdown if supported, otherwise it defaults to month usually?
    // Checking hook: useExpenseBreakdown(startDate, endDate)
    const { data: expenseData, isLoading: expenseLoading, error: expenseError } = useExpenseBreakdown(startDate, endDate);

    const { data: recentTripsData, isLoading: recentLoading, error: recentError } = useRecentTrips(5);
    const { data: maintenanceData, isLoading: maintenanceLoading } = useMaintenanceAlerts();
    const { data: driverPerf, isLoading: driverLoading } = useDriverPerformance(5);

    // Fallback colors if no data
    const chartColors = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
    ];

    const withColor = (expenseData || []).map((item, idx) => ({
        ...item,
        color: chartColors[idx % chartColors.length]
    }));

    // Safe calculations for trends
    const revenueTrend = stats && prevStats
        ? Number((((stats.official.revenue - prevStats.official.revenue) / (prevStats.official.revenue || 1)) * 100).toFixed(1))
        : 0;

    const profitTrend = stats && prevStats
        ? Number((((stats.official.profit - prevStats.official.profit) / (prevStats.official.profit || 1)) * 100).toFixed(1))
        : 0;

    // Total expenses from expense breakdown
    const totalExpense = useMemo(() => {
        return (expenseData || []).reduce((sum, item) => sum + item.value, 0);
    }, [expenseData]);

    // Profit margin
    const totalRevenue = (stats?.official.revenue || 0) + (stats?.pending.revenue || 0);
    const totalProfit = (stats?.official.profit || 0) + (stats?.pending.profit || 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Custom Active Shape for Pie Chart
    const renderActiveShape = (props: any) => {
        const RADIAN = Math.PI / 180;
        const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        const cos = Math.cos(-RADIAN * midAngle);
        const sin = Math.sin(-RADIAN * midAngle);
        const sx = cx + (outerRadius + 10) * cos;
        const sy = cy + (outerRadius + 10) * sin;
        const mx = cx + (outerRadius + 30) * cos;
        const my = cy + (outerRadius + 30) * sin;
        const ex = mx + (cos >= 0 ? 1 : -1) * 22;
        const ey = my;
        const textAnchor = cos >= 0 ? 'start' : 'end';

        return (
            <g>
                <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-xl font-bold">
                </text>
                <Sector
                    cx={cx}
                    cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx}
                    cy={cy}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    innerRadius={outerRadius + 6}
                    outerRadius={outerRadius + 10}
                    fill={fill}
                />
            </g>
        );
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-popover border text-popover-foreground px-3 py-2 rounded-lg shadow-md text-sm">
                    <p className="font-semibold mb-1">{payload[0].name}</p>
                    <p className="text-primary font-mono">{formatCurrency(payload[0].value)}</p>
                    <p className="text-muted-foreground text-xs">{(payload[0].payload.percentage).toFixed(1)}% tổng chi phí</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4 animate-fade-in relative">
            {/* Header + Filter Row */}
            <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">


                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Thời gian:
                    </span>
                    <Select value={datePreset} onValueChange={setDatePreset}>
                        <SelectTrigger className="w-[180px] h-9 bg-background">
                            <SelectValue placeholder="Chọn thời gian" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hôm nay</SelectItem>
                            <SelectItem value="yesterday">Hôm qua</SelectItem>
                            <SelectItem value="this_week">Tuần này</SelectItem>
                            <SelectItem value="last_week">Tuần trước</SelectItem>
                            <SelectItem value="last_7_days">7 ngày qua</SelectItem>
                            <SelectItem value="this_month">Tháng này</SelectItem>
                            <SelectItem value="last_month">Tháng trước</SelectItem>
                            <SelectItem value="last_30_days">30 ngày qua</SelectItem>
                            <SelectItem value="this_quarter">Quý này</SelectItem>
                            <SelectItem value="last_quarter">Quý trước</SelectItem>
                            <SelectItem value="this_year">Năm nay</SelectItem>
                            <SelectItem value="last_year">Năm trước</SelectItem>
                            <SelectItem value="custom">Tùy chọn...</SelectItem>
                        </SelectContent>
                    </Select>

                    {datePreset === 'custom' && (
                        <DateRangePicker
                            date={customDate}
                            onSelect={setCustomDate}
                            className="w-[260px]"
                        />
                    )}
                </div>
            </div>

            {/* KPI Cards - 6 cards in 3x2 grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div onClick={() => navigate('/reports', { state: { filter: { status: 'closed' } } })} className="cursor-pointer">
                    <StatCard
                        title="Tổng doanh thu"
                        value={statsLoading ? "..." : formatCurrency((stats?.official.revenue || 0) + (stats?.pending.revenue || 0))}
                        subtitle={stats?.pending.revenue ? `(Gồm ${formatCurrency(stats.pending.revenue)} chưa chốt)` : undefined}
                        trend={{ value: revenueTrend, label: label }}
                        icon={<Wallet className="w-6 h-6" />}
                        className={statsLoading ? "opacity-50" : ""}
                    />
                </div>

                <StatCard
                    title="Tổng chi phí"
                    value={statsLoading ? "..." : formatCurrency((stats?.official.expense || 0) + (stats?.pending.expense || 0))}
                    subtitle={stats?.pending.expense ? `(Gồm ${formatCurrency(stats.pending.expense)} tạm tính)` : undefined}
                    icon={<TrendingDown className="w-6 h-6" />}
                    variant="loss"
                    className={statsLoading ? "opacity-50" : ""}
                />

                <div onClick={() => navigate('/reports', { state: { filter: { showProfit: true } } })} className="cursor-pointer">
                    <StatCard
                        title="Lợi nhuận"
                        value={statsLoading ? "..." : formatCurrency(totalProfit)}
                        variant="profit"
                        subtitle={stats?.pending.profit ? `(Gồm ${formatCurrency(stats.pending.profit)} tạm tính)` : undefined}
                        trend={{ value: profitTrend, label: label }}
                        icon={<TrendingUp className="w-6 h-6" />}
                        className={statsLoading ? "opacity-50" : ""}
                    />
                </div>

                <StatCard
                    title="Biên lợi nhuận"
                    value={statsLoading ? "..." : `${profitMargin.toFixed(1)}%`}
                    subtitle={profitMargin >= 20 ? "Tốt" : profitMargin >= 10 ? "Trung bình" : "Thấp"}
                    icon={<BarChart3 className="w-6 h-6" />}
                    className={statsLoading ? "opacity-50" : ""}
                />

                <StatCard
                    title="Chuyến hàng"
                    value={statsLoading ? "..." : formatNumber((stats?.official.count || 0) + (stats?.pending.count || 0))}
                    subtitle={statsLoading ? "Đang tải..." : `${stats?.inProgress.count || 0} đang thực hiện`}
                    icon={<Package className="w-6 h-6" />}
                    className={statsLoading ? "opacity-50" : ""}
                />

                <StatCard
                    title="Hệ thống"
                    value={statsLoading ? "..." : `${stats?.official.count || 0} / ${(stats?.official.count || 0) + (stats?.pending.count || 0)}`}
                    subtitle="chuyến đã đóng"
                    icon={<Truck className="w-6 h-6" />}
                    className={statsLoading ? "opacity-50" : ""}
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Doanh thu & Lợi nhuận</CardTitle>
                        <CardDescription>Biểu đồ xu hướng</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-center justify-center">
                            {trendLoading ? (
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            ) : trendError ? (
                                <p className="text-destructive text-sm">Lỗi tải biểu đồ</p>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData || []}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="month" className="text-xs" />
                                        <YAxis
                                            tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                                            className="text-xs"
                                        />
                                        <Tooltip
                                            formatter={(value: number) => formatCurrency(value)}
                                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                                            contentStyle={{
                                                backgroundColor: 'hsl(var(--card))',
                                                border: '1px solid hsl(var(--border))',
                                                borderRadius: '8px',
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="hsl(var(--chart-1))"
                                            fillOpacity={1}
                                            fill="url(#colorRevenue)"
                                            name="Doanh thu"
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="profit"
                                            stroke="hsl(var(--chart-4))"
                                            fillOpacity={1}
                                            fill="url(#colorProfit)"
                                            name="Lợi nhuận"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Expense Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cơ cấu chi phí</CardTitle>
                        <CardDescription>Phân bổ theo loại</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full relative">
                            {expenseLoading ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : expenseError ? (
                                <div className="flex justify-center items-center h-full">
                                    <p className="text-destructive text-sm">Lỗi tải chi phí</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            activeIndex={activeIndex}
                                            activeShape={renderActiveShape}
                                            data={withColor}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={2}
                                            dataKey="value"
                                            onMouseEnter={onPieEnter}
                                            onClick={(data) => {
                                                navigate('/expenses?search=' + encodeURIComponent(data.name));
                                            }}
                                            className="cursor-pointer outline-none"
                                        >
                                            {withColor.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                            ))}
                                        </Pie>
                                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                            <tspan x="50%" dy="-0.5em" fontSize="12" fill="#888">Tổng chi phí</tspan>
                                            <tspan x="50%" dy="1.2em" fontSize="16" fontWeight="bold" fill="#333">
                                                {formatNumber((expenseData || []).reduce((sum, item) => sum + item.value, 0) / 1000000, 1)}M
                                            </tspan>
                                        </text>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 mt-4 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                            {!expenseLoading && (expenseData || []).map((item, idx) => (
                                <div
                                    key={item.name}
                                    className={`flex items-center gap-2 text-sm p-1.5 rounded-md transition-colors cursor-pointer ${activeIndex === idx ? 'bg-muted' : 'hover:bg-muted/50'}`}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    onMouseLeave={() => setActiveIndex(-1)}
                                >
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                                    />
                                    <span className="text-muted-foreground truncate flex-1" title={item.name}>{item.name}</span>
                                    <div className="text-right">
                                        <span className="font-medium block">{formatCurrency(item.value)}</span>
                                        <span className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Trips */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Chuyến hàng gần đây</CardTitle>
                            <CardDescription>Cập nhật mới nhất</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate('/trips')}>
                            Xem tất cả
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recentLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : recentError ? (
                            <p className="text-destructive text-center py-4 text-sm">Lỗi tải dữ liệu</p>
                        ) : (
                            <div className="space-y-4">
                                {(recentTripsData || []).map((trip) => (
                                    <div
                                        key={trip.id}
                                        onClick={() => navigate(`/trips`)}
                                        className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 px-2 rounded transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-primary/10 rounded-full text-primary">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium font-mono text-sm">{trip.trip_code}</p>
                                                <p className="text-xs text-muted-foreground">{formatNumber(trip.cargo_weight_tons || 0, 1)} tấn • {trip.route_name || 'Chưa định tuyến'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-sm">{formatCurrency(trip.total_revenue || 0)}</p>
                                            <StatusBadge status={trip.status as string} />
                                        </div>
                                    </div>
                                ))}
                                {(!recentTripsData || recentTripsData.length === 0) && (
                                    <p className="text-sm text-muted-foreground text-center py-4">Chưa có chuyến hàng nào.</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Info Column */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Maintenance Alerts */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wrench className="w-5 h-5" />
                                Bảo trì xe
                            </CardTitle>
                            <CardDescription>Lịch bảo trì sắp tới</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {maintenanceLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(maintenanceData || []).map((alert) => (
                                        <div key={alert.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg border">
                                            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{alert.vehicle?.license_plate}</p>
                                                <p className="text-xs text-muted-foreground">{alert.maintenance_type === 'routine' ? 'Bảo dưỡng định kỳ' : alert.description}</p>
                                                <p className="text-xs text-orange-600 mt-1">
                                                    <Calendar className="w-3 h-3 inline mr-1" />
                                                    {new Date(alert.scheduled_date).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <StatusBadge status={alert.status as any} />
                                            </div>
                                        </div>
                                    ))}
                                    {(!maintenanceData || maintenanceData.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">Không có lịch bảo trì</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Hiệu suất tài xế
                            </CardTitle>
                            <CardDescription>Top 5 tài xế</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {driverLoading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {(driverPerf || []).map((driver: any, idx: number) => (
                                        <div key={driver.id || idx} className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-sm">{driver.driver_name || driver.full_name || `Tài xế #${idx + 1}`}</p>
                                                <p className="text-xs text-muted-foreground">{formatCurrency(driver.total_profit || 0)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm">{driver.trip_count || 0} chuyến</p>
                                                <p className="text-xs text-muted-foreground">{((driver.profit_margin || 0) * 100).toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!driverPerf || driverPerf.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
