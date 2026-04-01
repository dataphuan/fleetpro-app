import { useMemo, useState } from 'react';
import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { AlertTriangle, Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useVehicles } from '@/hooks/useVehicles';
import { useTrips } from '@/hooks/useTrips';
import { useExpenses } from '@/hooks/useExpenses';
import { exportToExcel } from '@/lib/export-utils';
import { exportToPDF } from '@/lib/pdf-export';
import { useToast } from '@/hooks/use-toast';

type DatePreset = 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';

type DateRange = {
  from: Date;
  to: Date;
};

type VehiclePnLRow = {
  vehicleId: string;
  vehicleCode: string;
  plate: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  prevMargin: number;
  trendPct: number;
  tripCount: number;
};

const currency = (v: number) => `${Math.round(v).toLocaleString('vi-VN')}đ`;

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  try {
    const raw = String(value);
    const date = raw.includes('T') ? new Date(raw) : parseISO(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

function inRange(value: unknown, range: DateRange) {
  const dt = parseDate(value);
  if (!dt) return false;
  return !isBefore(dt, range.from) && !isAfter(dt, range.to);
}

function getRangeFromPreset(preset: DatePreset): DateRange {
  const today = new Date();
  if (preset === 'lastMonth') {
    const lastMonth = subMonths(today, 1);
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
  }
  if (preset === 'thisQuarter') {
    return { from: startOfQuarter(today), to: endOfQuarter(today) };
  }
  if (preset === 'thisYear') {
    return { from: startOfYear(today), to: endOfYear(today) };
  }
  return { from: startOfMonth(today), to: endOfMonth(today) };
}

function previousRange(range: DateRange): DateRange {
  const diff = range.to.getTime() - range.from.getTime();
  const prevTo = new Date(range.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - diff);
  return { from: prevFrom, to: prevTo };
}

export function ReportVehiclePnL() {
  const { toast } = useToast();
  const { data: vehicles = [] } = useVehicles();
  const { data: trips = [] } = useTrips();
  const { data: expenses = [] } = useExpenses();

  const [preset, setPreset] = useState<DatePreset>('thisMonth');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const dateRange = useMemo<DateRange>(() => {
    if (preset !== 'custom') return getRangeFromPreset(preset);
    return {
      from: parseISO(customFrom),
      to: parseISO(customTo),
    };
  }, [preset, customFrom, customTo]);

  const prevRange = useMemo(() => previousRange(dateRange), [dateRange]);

  const rows = useMemo<VehiclePnLRow[]>(() => {
    const reportRows = vehicles.map((vehicle: any) => {
      const vehicleId = String(vehicle.id || '');

      const revenue = trips
        .filter((trip: any) => trip.vehicle_id === vehicleId && inRange(trip.departure_date || trip.trip_date || trip.created_at, dateRange))
        .reduce((sum: number, trip: any) => sum + Number(trip.total_revenue || trip.freight_revenue || 0), 0);

      const cost = expenses
        .filter((expense: any) => expense.vehicle_id === vehicleId && inRange(expense.expense_date || expense.created_at, dateRange))
        .reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0);

      const prevRevenue = trips
        .filter((trip: any) => trip.vehicle_id === vehicleId && inRange(trip.departure_date || trip.trip_date || trip.created_at, prevRange))
        .reduce((sum: number, trip: any) => sum + Number(trip.total_revenue || trip.freight_revenue || 0), 0);

      const prevCost = expenses
        .filter((expense: any) => expense.vehicle_id === vehicleId && inRange(expense.expense_date || expense.created_at, prevRange))
        .reduce((sum: number, expense: any) => sum + Number(expense.amount || 0), 0);

      const margin = revenue - cost;
      const prevMargin = prevRevenue - prevCost;
      const trendPct = prevMargin === 0 ? (margin === 0 ? 0 : 100) : ((margin - prevMargin) / Math.abs(prevMargin)) * 100;

      const tripCount = trips.filter((trip: any) => trip.vehicle_id === vehicleId && inRange(trip.departure_date || trip.trip_date || trip.created_at, dateRange)).length;

      return {
        vehicleId,
        vehicleCode: String(vehicle.vehicle_code || vehicle.id || '—'),
        plate: String(vehicle.license_plate || '—'),
        revenue,
        cost,
        margin,
        marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
        prevMargin,
        trendPct,
        tripCount,
      };
    });

    return reportRows.sort((a, b) => b.margin - a.margin);
  }, [vehicles, trips, expenses, dateRange, prevRange]);

  const chartData = useMemo(() => rows.map((row) => ({
    plate: row.plate,
    margin: Math.round(row.margin),
    revenue: Math.round(row.revenue),
    cost: Math.round(row.cost),
  })), [rows]);

  const dateLabel = `${format(dateRange.from, 'dd/MM/yyyy', { locale: vi })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: vi })}`;

  const handleExportExcel = () => {
    const data = rows.map((row, index) => ({
      STT: index + 1,
      'Mã xe': row.vehicleCode,
      'Biển số xe': row.plate,
      'Số chuyến': row.tripCount,
      'Doanh thu': Math.round(row.revenue),
      'Chi phí': Math.round(row.cost),
      'Lãi gộp': Math.round(row.margin),
      'Margin %': Number(row.marginPct.toFixed(1)),
      'So với kỳ trước %': Number(row.trendPct.toFixed(1)),
    }));

    exportToExcel(data, `LaiLo_TheoXe_${format(new Date(), 'yyyyMMdd_HHmmss')}`, 'LaiLoTheoXe');
    toast({ title: 'Xuất Excel thành công', description: 'Đã tải xuống báo cáo Lãi/Lỗ theo xe.' });
  };

  const handleExportPdf = () => {
    exportToPDF({
      title: 'BÁO CÁO LÃI/LỖ THEO XE',
      subtitle: `Kỳ báo cáo: ${dateLabel}`,
      filename: `BaoCao_LaiLo_TheoXe_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`,
      columns: [
        { header: 'Mã xe', dataKey: 'vehicleCode', width: 25 },
        { header: 'Biển số', dataKey: 'plate', width: 30 },
        { header: 'Số chuyến', dataKey: 'tripCount', width: 20 },
        { header: 'Doanh thu', dataKey: 'revenue', width: 30 },
        { header: 'Chi phí', dataKey: 'cost', width: 30 },
        { header: 'Lãi gộp', dataKey: 'margin', width: 30 },
        { header: 'Margin %', dataKey: 'marginPct', width: 20 },
        { header: 'So kỳ trước %', dataKey: 'trendPct', width: 25 },
      ],
      data: rows.map((row) => ({
        ...row,
        marginPct: Number(row.marginPct.toFixed(1)),
        trendPct: Number(row.trendPct.toFixed(1)),
      })),
      orientation: 'landscape',
    });

    toast({ title: 'Xuất PDF thành công', description: 'Đã tạo báo cáo PDF Lãi/Lỗ theo xe.' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Lãi/Lỗ Theo Xe</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Xem xe nào đang lãi/lỗ để ra quyết định vận hành nhanh.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" /> Xuất Excel
              </Button>
              <Button variant="outline" onClick={handleExportPdf}>
                <Download className="h-4 w-4 mr-2" /> Xuất PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Bộ lọc thời gian</Label>
              <Select value={preset} onValueChange={(value) => setPreset(value as DatePreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">Tháng này</SelectItem>
                  <SelectItem value="lastMonth">Tháng trước</SelectItem>
                  <SelectItem value="thisQuarter">Quý này</SelectItem>
                  <SelectItem value="thisYear">Năm này</SelectItem>
                  <SelectItem value="custom">Tùy chỉnh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {preset === 'custom' && (
              <>
                <div className="space-y-1">
                  <Label>Từ ngày</Label>
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Đến ngày</Label>
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-2">Kỳ đang xem: {dateLabel}</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Biểu đồ Lãi Gộp Theo Xe</CardTitle>
        </CardHeader>
        <CardContent className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => `${Math.round(Number(v) / 1000000)}M`} />
              <YAxis type="category" dataKey="plate" width={110} />
              <Tooltip
                formatter={(value: number, name: string) => [currency(Number(value)), name === 'margin' ? 'Lãi gộp' : name]}
                labelFormatter={(label) => `Xe ${label}`}
              />
              <Bar dataKey="margin" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={`cell-${entry.plate}-${idx}`} fill={entry.margin >= 0 ? '#16a34a' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="p-2">Xe</th>
                <th className="p-2">Biển số</th>
                <th className="p-2 text-right">Doanh thu</th>
                <th className="p-2 text-right">Chi phí</th>
                <th className="p-2 text-right">Lãi gộp</th>
                <th className="p-2 text-right">Margin%</th>
                <th className="p-2 text-right">So tháng trước</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.vehicleId} className="border-b hover:bg-muted/30">
                  <td className="p-2 font-medium">{row.vehicleCode}</td>
                  <td className="p-2 font-mono">{row.plate}</td>
                  <td className="p-2 text-right">{currency(row.revenue)}</td>
                  <td className="p-2 text-right">{currency(row.cost)}</td>
                  <td className={`p-2 text-right font-semibold ${row.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {currency(row.margin)}
                  </td>
                  <td className={`p-2 text-right font-semibold ${row.margin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {row.marginPct.toFixed(1)}%
                  </td>
                  <td className="p-2 text-right">
                    <span className={row.trendPct >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                      {row.trendPct >= 0 ? '↑' : '↓'} {Math.abs(row.trendPct).toFixed(1)}%
                    </span>
                    {row.margin < 0 && (
                      <span className="inline-flex items-center ml-2 text-amber-700" title="Xe này đang lỗ — kiểm tra lại chi phí">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
