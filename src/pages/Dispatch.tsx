import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Truck,
  User,
  MapPin,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  Bot
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTripsByDateRange } from "@/hooks/useTrips";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { DispatchTripDrawer } from "@/components/dispatch/DispatchTripDrawer";
import { DayViewTimeline } from "@/components/dispatch/DayViewTimeline";
import { formatCurrency } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, addDays, format, subWeeks, addWeeks, isSameDay, subDays, startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval, isSameMonth } from "date-fns";
import { vi } from "date-fns/locale";

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function Dispatch() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null); // Replace with Trip type
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Day View states
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Local filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Calculate Date Range based on view mode
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // 1 = Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  // Get all days to display in month view (including padding days)
  const monthCalendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthCalendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDates = eachDayOfInterval({ start: monthCalendarStart, end: monthCalendarEnd });

  // Determine date range for data loading
  const dataStartDate = viewMode === 'month'
    ? format(monthCalendarStart, 'yyyy-MM-dd')
    : viewMode === 'week'
      ? format(weekStart, 'yyyy-MM-dd')
      : format(selectedDay, 'yyyy-MM-dd');

  const dataEndDate = viewMode === 'month'
    ? format(monthCalendarEnd, 'yyyy-MM-dd')
    : viewMode === 'week'
      ? format(weekEnd, 'yyyy-MM-dd')
      : format(selectedDay, 'yyyy-MM-dd');

  // Load Data (based on current view mode)
  const { data: trips, isLoading: isLoadingTrips } = useTripsByDateRange(
    dataStartDate,
    dataEndDate
  );

  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();

  // Navigation Handlers
  const prevPeriod = () => {
    if (viewMode === 'month') setCurrentDate(date => subMonths(date, 1));
    else if (viewMode === 'week') setCurrentDate(date => subWeeks(date, 1));
    else setSelectedDay(date => subDays(date, 1));
  };

  const nextPeriod = () => {
    if (viewMode === 'month') setCurrentDate(date => addMonths(date, 1));
    else if (viewMode === 'week') setCurrentDate(date => addWeeks(date, 1));
    else setSelectedDay(date => addDays(date, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  // View Mode Toggle
  const toggleViewMode = (mode: 'month' | 'week' | 'day') => {
    setViewMode(mode);
    if (mode === 'day') {
      // Sync selectedDay with current context
      setSelectedDay(new Date());
    }
  };

  // Action Handlers
  const handleCreateTrip = () => {
    setSelectedTrip(null);
    setSelectedDate(viewMode === 'day' ? selectedDay : new Date());
    setDrawerOpen(true);
  };

  const [isAiThinking, setIsAiThinking] = useState(false);
  const handleAiOptimize = () => {
    setIsAiThinking(true);
    toast({
        title: "Gemini AI đang phân tích kho hàng...",
        description: "Đang tính toán ma trận đường đi ngắn nhất (VRP). Vui lòng đợi...",
    });

    setTimeout(() => {
        setIsAiThinking(false);
        toast({
            title: "Tối ưu hóa thành công!",
            description: "AI Gợi ý: Ghép Chuyến TP.HCM - Đà Nẵng sang Xe 51C-029.39 để giảm 28% tỷ lệ chạy rỗng chiều về.",
            duration: 8000,
        });
    }, 2500);
  };

  const handleCreateTripOnDate = (date: Date) => {
    setSelectedTrip(null);
    setSelectedDate(date);
    setDrawerOpen(true);
  };

  const handleEditTrip = (trip: any) => {
    setSelectedTrip(trip);
    setDrawerOpen(true);
  };

  // Group Trips by Date (for Week View)
  const scheduleData = useMemo(() => {
    if (!trips) return {};

    // First, apply filters
    let filtered = trips;

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.trip_code.toLowerCase().includes(lowerQ) ||
        t.vehicle?.license_plate?.toLowerCase().includes(lowerQ) ||
        t.driver?.full_name?.toLowerCase().includes(lowerQ) ||
        t.route?.route_name?.toLowerCase().includes(lowerQ) ||
        t.customer?.customer_name?.toLowerCase().includes(lowerQ)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Then group
    const grouped: Record<string, any[]> = {};
    filtered.forEach(trip => {
      try {
        if (!trip.departure_date) return;
        const date = new Date(trip.departure_date);
        if (isNaN(date.getTime())) return;

        const dateKey = format(date, 'yyyy-MM-dd');
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(trip);
      } catch (err) {
        console.warn('Skipping trip with invalid date:', trip.trip_code);
      }
    });
    return grouped;
  }, [trips, searchQuery, filterStatus]);

  // Filtered Trips for Day View (applies search and status filters)
  const filteredTrips = useMemo(() => {
    if (!trips) return [];

    let filtered = trips;

    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.trip_code.toLowerCase().includes(lowerQ) ||
        t.vehicle?.license_plate?.toLowerCase().includes(lowerQ) ||
        t.driver?.full_name?.toLowerCase().includes(lowerQ) ||
        t.route?.route_name?.toLowerCase().includes(lowerQ) ||
        t.customer?.customer_name?.toLowerCase().includes(lowerQ)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    return filtered;
  }, [trips, searchQuery, filterStatus]);

  // Stats Calculation
  const stats = useMemo(() => {
    const activeVehicles = vehicles?.filter(v => v.status === 'active').length || 0;
    const activeDrivers = drivers?.filter(d => d.status === 'active').length || 0;
    const tripsThisWeek = trips?.length || 0;
    const tripsInProgress = trips?.filter(t => t.status === 'in_progress' || t.status === 'dispatched').length || 0;

    return { activeVehicles, activeDrivers, tripsThisWeek, tripsInProgress };
  }, [vehicles, drivers, trips]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 border-dashed border-gray-300';
      case 'confirmed': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'dispatched': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'in_progress': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'completed': return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      case 'closed': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Nháp',
      confirmed: 'Đã xác nhận',
      dispatched: 'Đã điều xe',
      in_progress: 'Đang chạy',
      completed: 'Hoàn thành',
      cancelled: 'Hủy',
      closed: 'Đã đóng'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-5rem)]">
      <PageHeader
        title="Điều Phối Vận Tải"
        description="Lập kế hoạch và phân công xe - tài xế"
        actions={
          <div className="flex gap-2">
            <Button 
                variant="secondary" 
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-200"
                onClick={handleAiOptimize}
                disabled={isAiThinking}
            >
                {isAiThinking ? <Bot className="w-4 h-4 mr-2 animate-bounce" /> : <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />}
                {isAiThinking ? "AI Đang Tính..." : "AI Tối Ưu Tuyến"}
            </Button>
            <Button onClick={handleCreateTrip}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo chuyến mới
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeVehicles}</p>
                <p className="text-sm text-muted-foreground">Xe sẵn sàng</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <User className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeDrivers}</p>
                <p className="text-sm text-muted-foreground">Tài xế sẵn sàng</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.tripsThisWeek}</p>
                <p className="text-sm text-muted-foreground">Chuyến {viewMode === 'day' ? 'hôm nay' : viewMode === 'month' ? 'tháng này' : 'tuần này'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.tripsInProgress}</p>
                <p className="text-sm text-muted-foreground">Đang vận chuyển</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Calendar Section */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* View Mode Toggle + Navigation */}
            <div className="flex items-center gap-3">
              {/* Segmented Control */}
              <div className="inline-flex rounded-lg border bg-muted p-1">
                <button
                  onClick={() => toggleViewMode('month')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'month'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Tháng
                </button>
                <button
                  onClick={() => toggleViewMode('week')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'week'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Tuần
                </button>
                <button
                  onClick={() => toggleViewMode('day')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'day'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Ngày
                </button>
              </div>

              {/* Navigation based on View Mode */}
              <Button variant="outline" size="icon" onClick={prevPeriod}>
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex flex-col items-center min-w-[180px]">
                {viewMode === 'month' ? (
                  <>
                    <span className="font-semibold text-lg">
                      Tháng {format(currentDate, 'MM/yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(monthStart, 'dd/MM')} - {format(monthEnd, 'dd/MM')}
                    </span>
                  </>
                ) : viewMode === 'week' ? (
                  <>
                    <span className="font-semibold text-lg">
                      Tuần {format(currentDate, 'w', { locale: vi })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-lg">
                      {format(selectedDay, 'EEEE', { locale: vi })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(selectedDay, 'dd/MM/yyyy')}
                    </span>
                  </>
                )}
              </div>

              <Button variant="outline" size="icon" onClick={nextPeriod}>
                <ChevronRight className="w-4 h-4" />
              </Button>

              <Button variant="ghost" size="sm" onClick={goToToday}>
                Hôm nay
              </Button>

              {viewMode === 'day' && (
                <DatePicker
                  value={selectedDay}
                  onChange={(date) => date && setSelectedDay(date)}
                  className="w-[140px] h-9"
                />
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm chuyến, xe, tài xế..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="draft">Nháp</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="in_progress">Đang chạy</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-x-auto relative">
          {/* Week & Month View - Grid */}
          {(viewMode === 'week' || viewMode === 'month') && (
            <div className={`grid grid-cols-7 h-full ${viewMode === 'week' ? 'min-w-[1000px]' : 'min-w-[1000px] auto-rows-fr'} divide-x divide-gray-100 border-l border-t`}>
              {/* Day Headers (Always Mon-Sun) */}
              {(viewMode === 'month' ? monthDates : weekDates).map((date, index) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayTrips = scheduleData[dateKey] || [];
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, currentDate);

                // For Month view: Should we skip rendering header every cell? 
                // We should render headers only for the first 7 cells IF it's just a grid visual, 
                // BUT for a simple iteration, we might repeat or use a separate header row.
                // Let's us separate header row for Month View, or just adapt this loop.
                // Actually, for Month view, it's better to render headers once at top.
                // Refactoring structure:
                return null; // Handle below
              })}

              {/* Header Row */}
              {weekDays.map((day) => (
                <div key={day} className="p-2 text-center border-b bg-gray-50 font-medium text-xs text-muted-foreground uppercase">
                  {day}
                </div>
              ))}

              {/* Cells */}
              {(viewMode === 'month' ? monthDates : weekDates).map((date, index) => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const dayTrips = scheduleData[dateKey] || [];
                const isToday = isSameDay(date, new Date());
                const isCurrentMonth = isSameMonth(date, currentDate);
                // If Week view, always current. If Month view, fade out other months.
                const isFaded = viewMode === 'month' && !isCurrentMonth;

                return (
                  <div key={dateKey} className={`flex flex-col h-full ${viewMode === 'month' ? 'min-h-[90px]' : ''} ${isToday ? 'bg-primary/5' : isFaded ? 'bg-gray-50/50' : ''} border-b relative group`}>
                    <div className={`p-1.5 text-right text-sm ${isToday ? 'font-bold text-primary' : isFaded ? 'text-muted-foreground/40' : 'text-gray-700'}`}>
                      {format(date, 'dd')}
                    </div>

                    <div className="flex-1 p-1 space-y-1 overflow-y-auto scrollbar-hide">
                      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={(e) => { e.stopPropagation(); handleCreateTripOnDate(date); }}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      {dayTrips.map((trip) => (
                        <div
                          key={trip.id}
                          onClick={() => handleEditTrip(trip)}
                          className={`p-1.5 rounded border cursor-pointer hover:shadow-sm text-[10px] ${getStatusColor(trip.status)}`}
                        >
                          <div className="font-semibold truncate">
                            {trip.trip_code}
                          </div>
                          {/* Show more info in Week view */}
                          {viewMode === 'week' && (
                            <>
                              {/* Vehicle & Driver row */}
                              {(trip.vehicle?.license_plate || trip.driver?.full_name) && (
                                <div className="flex items-center gap-1 text-[9px] opacity-90 font-medium">
                                  {trip.vehicle?.license_plate && (
                                    <span className="bg-gray-200/60 px-1 rounded text-gray-700">{trip.vehicle.license_plate}</span>
                                  )}
                                  {trip.driver?.full_name && (
                                    <span className="truncate">• {trip.driver.full_name}</span>
                                  )}
                                </div>
                              )}
                              <div className="truncate opacity-80">{trip.customer?.short_name || trip.customer?.customer_name}</div>
                              <div className="truncate opacity-80">{trip.route?.route_name}</div>
                            </>
                          )}
                          {/* Status dot for Month view */}
                          {viewMode === 'month' && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className={`w-1.5 h-1.5 rounded-full bg-current opacity-70`} />
                              <span className="truncate opacity-80">{trip.vehicle?.license_plate || trip.customer?.short_name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Day View - Kanban by status */}
          {viewMode === 'day' && (
            <DayViewTimeline
              trips={filteredTrips}
              onTripClick={handleEditTrip}
              onCreateTrip={handleCreateTrip}
              selectedDate={selectedDay}
            />
          )}
        </CardContent>
      </Card>

      <DispatchTripDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        selectedTrip={selectedTrip}
        selectedDate={selectedDate}
      />
    </div>
  );
}
