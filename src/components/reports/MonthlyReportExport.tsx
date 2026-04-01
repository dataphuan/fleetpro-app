import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileText, Link2, Loader2 } from 'lucide-react';
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrips } from '@/hooks/useTrips';
import { useExpenses } from '@/hooks/useExpenses';
import { useVehicles } from '@/hooks/useVehicles';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

type KPI = {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  tripCount: number;
};

type WeeklyRevenueRow = {
  weekLabel: string;
  revenue: number;
};

type VehicleMonthlyRow = {
  plate: string;
  tripCount: number;
  km: number;
  revenue: number;
  cost: number;
  profit: number;
};

type ExpenseDetailRow = {
  date: string;
  plate: string;
  category: string;
  description: string;
  amount: number;
};

type ExpenseSubtotalRow = {
  category: string;
  subtotal: number;
};

type MonthlyReportPayload = {
  periodLabel: string;
  companyName: string;
  kpi: KPI;
  weeklyRevenue: WeeklyRevenueRow[];
  vehicleRows: VehicleMonthlyRow[];
  expenseRows: ExpenseDetailRow[];
  expenseSubtotals: ExpenseSubtotalRow[];
};

function pickNumber(source: Record<string, any>, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const raw = source[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const num = Number(raw);
    if (!Number.isNaN(num)) return num;
  }
  return fallback;
}

function pickString(source: Record<string, any>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const raw = source[key];
    if (raw === null || raw === undefined) continue;
    const value = String(raw).trim();
    if (value) return value;
  }
  return fallback;
}

function parseDateLike(value: unknown): Date | null {
  if (!value) return null;
  try {
    const s = String(value);
    const parsed = s.includes('T') ? new Date(s) : parseISO(s);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

function drawRevenueChart(doc: jsPDF, weeklyData: WeeklyRevenueRow[], startY: number) {
  const chartX = 16;
  const chartY = startY;
  const chartW = 176;
  const chartH = 45;

  doc.setDrawColor(220, 220, 220);
  doc.rect(chartX, chartY, chartW, chartH);

  const maxRevenue = Math.max(...weeklyData.map((w) => w.revenue), 1);
  const points = weeklyData.map((row, idx) => {
    const x = chartX + 12 + (idx * (chartW - 24)) / Math.max(weeklyData.length - 1, 1);
    const y = chartY + chartH - 8 - (row.revenue / maxRevenue) * (chartH - 16);
    return { x, y, label: row.weekLabel, value: row.revenue };
  });

  doc.setTextColor(100);
  doc.setFontSize(9);
  doc.text('Biểu đồ doanh thu theo tuần', chartX + 3, chartY + 5);

  if (points.length > 1) {
    doc.setDrawColor(1, 105, 111);
    doc.setLineWidth(0.8);
    for (let i = 1; i < points.length; i += 1) {
      doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
    }
  }

  doc.setFillColor(1, 105, 111);
  points.forEach((point) => {
    doc.circle(point.x, point.y, 1.3, 'F');
    doc.setTextColor(80);
    doc.setFontSize(8);
    doc.text(point.label, point.x, chartY + chartH - 2, { align: 'center' });
  });
}

function generateMonthlyPdf(payload: MonthlyReportPayload) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(1, 105, 111);
  doc.text('FleetPro', 14, 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(22, 22, 22);
  doc.text(`BÁO CÁO THÁNG ${payload.periodLabel}`, 14, 24);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(payload.companyName, 14, 30);

  const kpis = [
    { label: 'Tổng doanh thu', value: formatVnd(payload.kpi.totalRevenue) },
    { label: 'Tổng chi phí', value: formatVnd(payload.kpi.totalCost) },
    { label: 'Lãi gộp', value: formatVnd(payload.kpi.grossProfit) },
    { label: 'Số chuyến', value: String(payload.kpi.tripCount) },
  ];

  const boxY = 36;
  const boxW = 43;
  kpis.forEach((item, idx) => {
    const x = 14 + idx * (boxW + 3);
    doc.setDrawColor(210, 210, 210);
    doc.roundedRect(x, boxY, boxW, 20, 2, 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(item.label, x + 3, boxY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(1, 105, 111);
    doc.text(item.value, x + 3, boxY + 14);
  });

  drawRevenueChart(doc, payload.weeklyRevenue, 62);

  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 22, 22);
  doc.text('TRANG 2 - CHI TIẾT THEO XE', 14, 16);

  autoTable(doc, {
    startY: 22,
    theme: 'grid',
    head: [['STT', 'Biển số', 'Chuyến', 'Km', 'Doanh thu', 'Chi phí', 'Lãi gộp']],
    body: payload.vehicleRows.map((row, index) => [
      index + 1,
      row.plate,
      row.tripCount,
      Math.round(row.km),
      formatVnd(row.revenue),
      formatVnd(row.cost),
      formatVnd(row.profit),
    ]),
    foot: [[
      '',
      'TỔNG CỘNG',
      payload.vehicleRows.reduce((s, r) => s + r.tripCount, 0),
      Math.round(payload.vehicleRows.reduce((s, r) => s + r.km, 0)),
      formatVnd(payload.vehicleRows.reduce((s, r) => s + r.revenue, 0)),
      formatVnd(payload.vehicleRows.reduce((s, r) => s + r.cost, 0)),
      formatVnd(payload.vehicleRows.reduce((s, r) => s + r.profit, 0)),
    ]],
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [1, 105, 111] },
    footStyles: { fillColor: [240, 248, 255], textColor: [33, 33, 33], fontStyle: 'bold' },
  });

  doc.addPage();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 22, 22);
  doc.text('TRANG 3 - CHI TIẾT CHI PHÍ', 14, 16);

  autoTable(doc, {
    startY: 22,
    theme: 'grid',
    head: [['Ngày', 'Xe', 'Loại chi phí', 'Mô tả', 'Số tiền']],
    body: payload.expenseRows.map((row) => [row.date, row.plate, row.category, row.description, formatVnd(row.amount)]),
    styles: { font: 'helvetica', fontSize: 8.5 },
    headStyles: { fillColor: [1, 105, 111] },
    columnStyles: {
      3: { cellWidth: 70 },
      4: { halign: 'right' },
    },
  });

  const tableEndY = (doc as any).lastAutoTable?.finalY || 40;
  autoTable(doc, {
    startY: tableEndY + 6,
    theme: 'striped',
    head: [['Loại chi phí', 'Tổng cộng']],
    body: payload.expenseSubtotals.map((item) => [item.category, formatVnd(item.subtotal)]),
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [90, 90, 90] },
    columnStyles: { 1: { halign: 'right' } },
  });

  const totalPages = doc.getNumberOfPages();
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: vi });
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Được tạo bởi FleetPro AI — ${generatedAt}`, 14, 290);
    doc.text(`Trang ${page}/${totalPages}`, 196, 290, { align: 'right' });
  }

  doc.save(`BaoCaoThang_${payload.periodLabel.replace('/', '_')}.pdf`);
}

export function MonthlyReportExport() {
  const { toast } = useToast();
  const { tenantId } = useAuth();
  const { data: trips = [] } = useTrips();
  const { data: expenses = [] } = useExpenses();
  const { data: vehicles = [] } = useVehicles();
  const { data: companySettings } = useCompanySettings();

  const [open, setOpen] = useState(false);
  const [monthValue, setMonthValue] = useState(format(new Date(), 'yyyy-MM'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPayload, setGeneratedPayload] = useState<MonthlyReportPayload | null>(null);
  const [shareLink, setShareLink] = useState('');

  const buttonLabel = useMemo(() => {
    const [year, month] = monthValue.split('-');
    if (!year || !month) return '📄 Xuất Báo Cáo Tháng';
    return `📄 Xuất Báo Cáo Tháng ${month}/${year}`;
  }, [monthValue]);

  const buildPayload = (): MonthlyReportPayload => {
    const monthStart = startOfMonth(parseISO(`${monthValue}-01`));
    const monthEnd = endOfMonth(monthStart);

    const tripInMonth = trips.filter((trip: any) => {
      const dt = parseDateLike(
        pickString(trip, ['departure_date', 'trip_date', 'date', 'created_at'], '')
      );
      if (!dt) return false;
      return dt >= monthStart && dt <= monthEnd;
    });

    const expenseInMonth = expenses.filter((expense: any) => {
      const dt = parseDateLike(
        pickString(expense, ['expense_date', 'date', 'created_at'], '')
      );
      if (!dt) return false;
      return dt >= monthStart && dt <= monthEnd;
    });

    const totalRevenue = tripInMonth.reduce(
      (sum: number, trip: any) => sum + pickNumber(trip, ['total_revenue', 'freight_revenue', 'revenue', 'actual_revenue']),
      0,
    );

    const totalCost = expenseInMonth.reduce(
      (sum: number, expense: any) => sum + pickNumber(expense, ['amount', 'total_amount', 'cost']),
      0,
    );

    const vehicleMap = new Map<string, any>();
    vehicles.forEach((vehicle: any) => {
      vehicleMap.set(String(vehicle.id), vehicle);
    });

    const vehicleAgg = new Map<string, VehicleMonthlyRow>();
    tripInMonth.forEach((trip: any) => {
      const vehicleId = pickString(trip, ['vehicle_id', 'vehicleId']);
      const vehicle = vehicleMap.get(vehicleId);
      const plate = vehicle
        ? pickString(vehicle, ['license_plate', 'plate_number'], '—')
        : pickString(trip, ['vehicle_plate', 'plate_number'], '—');

      if (!vehicleAgg.has(vehicleId || plate)) {
        vehicleAgg.set(vehicleId || plate, {
          plate,
          tripCount: 0,
          km: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        });
      }
      const row = vehicleAgg.get(vehicleId || plate)!;
      row.tripCount += 1;
      row.km += pickNumber(trip, ['actual_distance_km', 'distance_km', 'planned_distance_km', 'route_distance_km']);
      row.revenue += pickNumber(trip, ['total_revenue', 'freight_revenue', 'revenue', 'actual_revenue']);
    });

    expenseInMonth.forEach((expense: any) => {
      const vehicleId = pickString(expense, ['vehicle_id', 'vehicleId']);
      const vehicle = vehicleMap.get(vehicleId);
      const plate = vehicle
        ? pickString(vehicle, ['license_plate', 'plate_number'], '—')
        : pickString(expense, ['vehicle_plate', 'plate_number'], '—');

      if (!vehicleAgg.has(vehicleId || plate)) {
        vehicleAgg.set(vehicleId || plate, {
          plate,
          tripCount: 0,
          km: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        });
      }
      const row = vehicleAgg.get(vehicleId || plate)!;
      row.cost += pickNumber(expense, ['amount', 'total_amount', 'cost']);
    });

    const vehicleRows = Array.from(vehicleAgg.values())
      .map((row) => ({ ...row, profit: row.revenue - row.cost }))
      .sort((a, b) => b.profit - a.profit);

    const weeklyRevenue = Array.from({ length: 5 }).map((_, index) => {
      const weekNumber = index + 1;
      return {
        weekLabel: `Tuần ${weekNumber}`,
        revenue: 0,
      };
    });

    tripInMonth.forEach((trip: any) => {
      const dt = parseDateLike(
        pickString(trip, ['departure_date', 'trip_date', 'date', 'created_at'], '')
      );
      if (!dt) return;
      const weekIndex = Math.min(4, Math.floor((dt.getDate() - 1) / 7));
      weeklyRevenue[weekIndex].revenue += pickNumber(trip, ['total_revenue', 'freight_revenue', 'revenue', 'actual_revenue']);
    });

    const expenseRows = expenseInMonth
      .map((expense: any) => {
        const dt = parseDateLike(pickString(expense, ['expense_date', 'date', 'created_at'], ''));
        const vehicleId = pickString(expense, ['vehicle_id', 'vehicleId']);
        const vehicle = vehicleMap.get(vehicleId);
        return {
          date: dt ? format(dt, 'dd/MM/yyyy', { locale: vi }) : '—',
          plate: vehicle
            ? pickString(vehicle, ['license_plate', 'plate_number'], '—')
            : pickString(expense, ['vehicle_plate', 'plate_number'], '—'),
          category: pickString(expense, ['category_name', 'expense_type', 'type'], 'Khác'),
          description: pickString(expense, ['description', 'title'], '—'),
          amount: pickNumber(expense, ['amount', 'total_amount', 'cost']),
        };
      })
      .sort((a, b) => {
        const da = parseDateLike(a.date.split('/').reverse().join('-'))?.getTime() || 0;
        const db = parseDateLike(b.date.split('/').reverse().join('-'))?.getTime() || 0;
        return da - db;
      });

    const subtotalMap = new Map<string, number>();
    expenseRows.forEach((row) => {
      subtotalMap.set(row.category, (subtotalMap.get(row.category) || 0) + row.amount);
    });
    const expenseSubtotals = Array.from(subtotalMap.entries())
      .map(([category, subtotal]) => ({ category, subtotal }))
      .sort((a, b) => b.subtotal - a.subtotal);

    return {
      periodLabel: format(monthStart, 'MM/yyyy'),
      companyName: pickString(companySettings as any, ['company_name'], 'FleetPro Logistics'),
      kpi: {
        totalRevenue,
        totalCost,
        grossProfit: totalRevenue - totalCost,
        tripCount: tripInMonth.length,
      },
      weeklyRevenue,
      vehicleRows,
      expenseRows,
      expenseSubtotals,
    };
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 450));
      const payload = buildPayload();
      const mock = `https://fleetpro.ai/share/${tenantId || 'tenant'}/report-${monthValue.replace('-', '')}`;
      setGeneratedPayload(payload);
      setShareLink(mock);
      toast({ title: 'Tạo báo cáo thành công', description: `Đã tạo báo cáo tháng ${payload.periodLabel}.` });
    } catch (error) {
      toast({ title: 'Không thể tạo báo cáo', description: String(error), variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedPayload) return;
    generateMonthlyPdf(generatedPayload);
    toast({ title: 'Đang tải xuống', description: 'Báo cáo PDF đã được xuất thành công.' });
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast({ title: 'Đã copy link', description: 'Bạn có thể gửi link mock này cho kế toán.' });
    } catch {
      toast({ title: 'Không copy được', description: 'Trình duyệt không cho phép clipboard.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="h-11">
          <FileText className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Xuất Báo Cáo Tháng 1 Click</DialogTitle>
          <DialogDescription>
            Chọn tháng để tạo báo cáo PDF gồm tóm tắt KPI, chi tiết theo xe và chi tiết chi phí.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="monthly-picker">Tháng báo cáo</Label>
            <Input
              id="monthly-picker"
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              max={format(new Date(), 'yyyy-MM')}
            />
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={isGenerating || !monthValue}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang tạo báo cáo...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" /> Tạo báo cáo tháng
              </>
            )}
          </Button>

          {generatedPayload && (
            <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
              <div className="text-sm text-muted-foreground">
                Báo cáo {generatedPayload.periodLabel} đã sẵn sàng. Chọn thao tác bên dưới:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" /> ⬇️ Tải xuống
                </Button>
                <Button variant="outline" onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" /> 🔗 Copy link
                </Button>
              </div>
              <div className="text-xs text-muted-foreground break-all">{shareLink}</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
