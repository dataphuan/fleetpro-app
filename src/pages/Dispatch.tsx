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
  Bot,
  Check,
  X,
  AlertCircle,
  List
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
import { useTripsByDateRange, useTrips } from "@/hooks/useTrips";
import { useVehicles } from "@/hooks/useVehicles";
import { useDrivers } from "@/hooks/useDrivers";
import { DispatchTripDrawer } from "@/components/dispatch/DispatchTripDrawer";
import { DayViewTimeline } from "@/components/dispatch/DayViewTimeline";
import { formatCurrency } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, endOfWeek, addDays, format, subWeeks, addWeeks, isSameDay, subDays, startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval, isSameMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { AISuggestionDrawer, AISuggestion } from "@/components/dispatch/AISuggestionDrawer";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateTrip } from "@/hooks/useTrips";
import { generateTripCode } from "@/lib/utils";

const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
import { FleetMap } from "@/components/dispatch/FleetMap";
import { QuickTripModal } from "@/components/trips/QuickTripModal";
import { DispatchHub } from "@/components/dispatch/DispatchHub";

export default function Dispatch() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null); // Replace with Trip type
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Day View states
  const [viewMode, setViewMode] = useState<'hub' | 'month' | 'week' | 'day' | 'map'>('hub');
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const { mutateAsync: updateTrip } = useUpdateTrip();
  const queryClient = useQueryClient();
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
  const toggleViewMode = (mode: 'hub' | 'month' | 'week' | 'day' | 'map') => {
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
    setAiSuggestions([]);

    toast({
        title: "Hệ thống đang quét kho hàng...",
        description: "Phân tích khả năng ghép tải trọng và chiều về...",
    });

    const suggestions = generateRealAiSuggestions(trips || []);
    setAiSuggestions(suggestions);
    setIsAiThinking(false);
    setAiDrawerOpen(true);
    
    if (suggestions.length > 0) {
        toast({
            title: "Trích xuất thành công!",
            description: `Tìm thấy ${suggestions.length} cơ hội ghép chuyến.`,
        });
    } else {
         toast({
            title: "Tối ưu",
            description: "Dữ liệu hiện tại đã được sắp xếp tốt, không có chuyến trùng lặp.",
        });
    }
  };

  // Logic for AI Logistics Optimization (Phase 2)
  const generateRealAiSuggestions = (allTrips: any[]): AISuggestion[] => {
      const results: AISuggestion[] = [];
      const pendingTrips = allTrips.filter(t => ['draft', 'confirmed'].includes(t.status));

      // 1. Consolidation Logic (Gom hàng)
      const routeGroups: Record<string, any[]> = {};
      pendingTrips.forEach(t => {
          const key = `${t.departure_date}_${t.route_id}`;
          if (!routeGroups[key]) routeGroups[key] = [];
          routeGroups[key].push(t);
      });

      Object.values(routeGroups).forEach(group => {
          if (group.length >= 2) {
              const totalWeight = group.reduce((sum, t) => sum + (t.cargo_weight_tons || 0), 0);
              if (totalWeight <= 20) { // Assume max truck capacity is 20 tons
                  results.push({
                      id: `cons_${group[0].id}`,
                      type: 'consolidation',
                      title: `Kết hợp: ${group.map(t => t.trip_code).join(' & ')}`,
                      description: `Các chuyến đi cùng tuyến ${group[0].route?.route_name || 'Chưa rõ'} cùng ngày ${group[0].departure_date}. Tổng tải trọng ${totalWeight}T (Dưới 20T).`,
                      confidence: 94,
                      trips: group,
                      savings: "Giảm 50% chi phí nhiên liệu & lương tài xế.",
                      logic: "Route Matching & Load Balance"
                  });
              }
          }
      });

      // 2. Backhaul suggestions (Kịch bản chiều về)
      // If trip A->B arrives and there is another trip B->A departing same day/next day
      const completedOrScheduled = allTrips.filter(t => ['dispatched', 'in_progress', 'completed', 'confirmed'].includes(t.status));
      completedOrScheduled.forEach(t1 => {
          const dest = t1.route?.destination_location;
          if (!dest) return;

          pendingTrips.forEach(t2 => {
              const start = t2.route?.start_location;
              if (start && start.toLowerCase().includes(dest.toLowerCase())) {
                  // Found a backhaul match
                  results.push({
                      id: `back_${t1.id}_${t2.id}`,
                      type: 'backhaul',
                      title: `Chiều về cho Xe ${t1.vehicle?.license_plate || 'Chưa có'}`,
                      description: `Sau khi giao hàng tại ${dest}, xe này có thể lấy hàng chuyến ${t2.trip_code} tại cùng khu vực thay vì chạy rỗng về kho.`,
                      confidence: 88,
                      trips: [t1, t2],
                      savings: "Tiết kiệm 200-300km tiền dầu chạy rỗng.",
                      logic: "Geospatial Proximity Match"
                  });
              }
          });
      });

      return results;
  };

  const handleAcceptSuggestion = async (suggestion: AISuggestion) => {
      setAiDrawerOpen(false);
      setIsAiThinking(true);
      
      try {
          if (suggestion.type === 'consolidation') {
              // Mark multiple trips as ready for consolidation (business rule)
              for (const trip of suggestion.trips) {
                  await updateTrip({
                      id: trip.id,
                      updates: { 
                        status: 'confirmed', 
                        notes: `${trip.notes || ''}\n[AI] Ghép chuyến tối ưu vào cùng tuyến.`
                      }
                  });
              }
              toast({ title: "Đã gộp chuyến thành công!", description: "Tất cả các lệnh vận tải đã được tối ưu vào cùng tuyến đường." });
          } else if (suggestion.type === 'backhaul') {
              // Auto-assign vehicle from first trip to second trip
              const [sourceTrip, targetTrip] = suggestion.trips;
              if (sourceTrip.vehicle_id) {
                  await updateTrip({
                      id: targetTrip.id,
                      updates: { 
                        vehicle_id: sourceTrip.vehicle_id, 
                        driver_id: sourceTrip.driver_id,
                        status: 'confirmed',
                        notes: `${targetTrip.notes || ''}\n[AI] Tự động xếp xe chiều về ${sourceTrip.vehicle?.license_plate || ''}.`
                      }
                  });
                  toast({ 
                      title: "Tự động xếp xe chiều về!", 
                      description: `Đã gán Xe ${sourceTrip.vehicle?.license_plate || 'mới'} cho chuyến ${targetTrip.trip_code}.`
                  });
              }
          }
          await queryClient.invalidateQueries({ queryKey: ['trips'] });
      } catch (err) {
          toast({ title: "Lỗi thực thi AI", description: "Không thể tự động cập nhật dữ liệu.", variant: "destructive" });
      } finally {
          setIsAiThinking(false);
      }
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
        String(t.trip_code || '').toLowerCase().includes(lowerQ) ||
        String(t.vehicle?.license_plate || '').toLowerCase().includes(lowerQ) ||
        String(t.driver?.full_name || '').toLowerCase().includes(lowerQ) ||
        String(t.route?.route_name || '').toLowerCase().includes(lowerQ) ||
        String(t.customer?.customer_name || '').toLowerCase().includes(lowerQ)
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
        String(t.trip_code || '').toLowerCase().includes(lowerQ) ||
        String(t.vehicle?.license_plate || '').toLowerCase().includes(lowerQ) ||
        String(t.driver?.full_name || '').toLowerCase().includes(lowerQ) ||
        String(t.route?.route_name || '').toLowerCase().includes(lowerQ) ||
        String(t.customer?.customer_name || '').toLowerCase().includes(lowerQ)
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
    <div className="space-y-4 animate-fade-in flex flex-col min-h-0">
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
                {isAiThinking ? "Đang Tính..." : "Lọc Tuyến Tối Ưu"}
            </Button>
            <QuickTripModal triggerLabel="Tạo chuyến mới" />
          </div>
        }
      />

      {/* ===== MOBILE: Draft Approval Panel ===== */}
      {(() => {
        const allDrafts = (trips || []).filter(t => t.status === 'draft');
        const driverDrafts = allDrafts.filter((t: any) => t.source === 'driver-self-draft');
        const pendingDrafts = driverDrafts.length > 0 ? driverDrafts : allDrafts.slice(0, 5);
        
        if (pendingDrafts.length === 0) return null;
        
        return (
          <div className="md:hidden">
            <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {pendingDrafts.length} Lệnh Nháp cần duyệt
                  </CardTitle>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-[10px]">
                    Chờ duyệt
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {pendingDrafts.map((trip: any) => (
                  <div key={trip.id} className="bg-white rounded-lg border p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-800">{trip.trip_code}</span>
                          {(trip as any).source === 'driver-self-draft' && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[9px] h-4 px-1">🚚 TX nháp</Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {trip.vehicle?.license_plate || '—'}
                            <span className="mx-1">•</span>
                            <User className="w-3 h-3" /> {trip.driver?.full_name || '—'}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {trip.route?.route_name || trip.customer?.customer_name || '—'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const newCode = trip.trip_code?.startsWith('LĐX') ? generateTripCode() : trip.trip_code;
                              await updateTrip({ id: trip.id, updates: { status: 'confirmed', trip_code: newCode } });
                              queryClient.invalidateQueries({ queryKey: ['trips'] });
                              toast({ title: '✅ Đã duyệt', description: `Lệnh ${newCode} đã xác nhận.` });
                            } catch (err: any) {
                              toast({ title: 'Lỗi duyệt', description: err.message, variant: 'destructive' });
                            }
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await updateTrip({ id: trip.id, updates: { status: 'cancelled', notes: (trip.notes || '') + ' [QL từ chối]' } });
                              queryClient.invalidateQueries({ queryKey: ['trips'] });
                              toast({ title: 'Đã từ chối', description: `Lệnh ${trip.trip_code} đã hủy.` });
                            } catch (err: any) {
                              toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
                            }
                          }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* ===== MOBILE: Compact KPI Strip ===== */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 shrink-0">
          <Truck className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-blue-700">{stats.activeVehicles} xe</span>
        </div>
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-2 shrink-0">
          <User className="w-3.5 h-3.5 text-green-600" />
          <span className="text-xs font-bold text-green-700">{stats.activeDrivers} TX</span>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 shrink-0">
          <CalendarIcon className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-bold text-amber-700">{stats.tripsThisWeek} CD</span>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-purple-600" />
          <span className="text-xs font-bold text-purple-700">{stats.tripsInProgress} chạy</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="hidden md:grid grid-cols-4 gap-4">
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
      <Card className="flex-1 flex flex-col overflow-visible md:overflow-hidden">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

            {/* View Mode Toggle + Navigation */}
            <div className="flex items-center gap-3">
              {/* Segmented Control */}
              <div className="inline-flex rounded-lg border bg-muted p-1 overflow-x-auto max-w-[calc(100vw-2rem)] md:max-w-none">
                <button
                  onClick={() => toggleViewMode('hub')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'hub'
                    ? 'bg-background shadow-sm text-foreground text-amber-600'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Trung tâm
                </button>
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
                <button
                  onClick={() => toggleViewMode('map')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'map'
                    ? 'bg-background shadow-sm text-foreground text-indigo-600 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Bản đồ
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

        <CardContent className="flex-1 p-0 overflow-auto relative min-h-[60vh]">
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

          {/* Map View - GIS Tracking */}
          {viewMode === 'map' && (
            <div className="h-full w-full p-4 bg-slate-100/50">
               <FleetMap 
                locations={vehicles?.map((v, idx) => {
                    const activeTrip = trips?.find(t => t.vehicle_id === v.id && ['dispatched', 'in_progress'].includes(t.status));
                    const hasLiveGps = activeTrip && activeTrip.last_location_lat && activeTrip.last_location_lng;
                    
                    // Kho bãi trung tâm (Đà Nẵng)
                    const hubLat = 16.0544;
                    const hubLng = 108.2022;

                    return {
                        id: v.id,
                        license_plate: v.license_plate,
                        lat: hasLiveGps ? activeTrip.last_location_lat : hubLat + (idx * 0.0015), // Offset slightly to reveal stacked pins
                        lng: hasLiveGps ? activeTrip.last_location_lng : hubLng + (idx * 0.0015),
                        status: activeTrip?.status === 'in_progress' ? 'moving' : 'idle',
                        driver_name: activeTrip?.driver?.full_name || v.default_driver_id || 'Chưa phân công',
                        trip_code: activeTrip?.trip_code || undefined
                    };
                }) || []} 
               />
            </div>
          )}
          
          {/* Dispatch Hub - Drag & Drop */}
          {viewMode === 'hub' && (
             <DispatchHub 
               trips={trips || []}
               vehicles={vehicles || []}
               drivers={drivers || []}
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

      <AISuggestionDrawer 
        open={aiDrawerOpen} 
        onOpenChange={setAiDrawerOpen}
        suggestions={aiSuggestions}
        isLoading={isAiThinking}
        onAccept={handleAcceptSuggestion}
        onReject={() => setAiDrawerOpen(false)}
      />
    </div>
  );
}
