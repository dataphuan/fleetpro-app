import { useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVehicles } from "@/hooks/useVehicles";
import { useTrips } from "@/hooks/useTrips";
import { useExpenses } from "@/hooks/useExpenses";

const COLORS = ["#0f766e", "#0284c7", "#7c3aed", "#ea580c"];

type MetricRow = {
  plate: string;
  revenue: number;
  costPerKm: number;
  tripCount: number;
  marginPct: number;
  distanceKm: number;
};

function dateInRange(raw: unknown, from: Date, to: Date) {
  if (!raw) return false;
  const date = String(raw).includes("T") ? new Date(String(raw)) : parseISO(String(raw));
  if (Number.isNaN(date.getTime())) return false;
  return date >= from && date <= to;
}

const currency = (v: number) => `${Math.round(v).toLocaleString("vi-VN")}đ`;

export function ReportVehicleBenchmark() {
  const { data: vehicles = [] } = useVehicles();
  const { data: trips = [] } = useTrips();
  const { data: expenses = [] } = useExpenses();

  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectableVehicles = useMemo(() => vehicles.slice(0, 12), [vehicles]);

  const metrics = useMemo<MetricRow[]>(() => {
    const from = parseISO(fromDate);
    const to = parseISO(toDate);

    return selectedIds.map((vehicleId) => {
      const vehicle = vehicles.find((v: any) => String(v.id) === vehicleId);
      const plate = String(vehicle?.license_plate || vehicle?.vehicle_code || vehicleId);

      const tripRows = trips.filter(
        (trip: any) => String(trip.vehicle_id || trip.vehicleId) === vehicleId && dateInRange(trip.departure_date || trip.trip_date || trip.created_at, from, to),
      );
      const expenseRows = expenses.filter(
        (expense: any) => String(expense.vehicle_id || expense.vehicleId) === vehicleId && dateInRange(expense.expense_date || expense.created_at, from, to),
      );

      const revenue = tripRows.reduce((sum: number, row: any) => sum + Number(row.total_revenue || row.freight_revenue || 0), 0);
      const cost = expenseRows.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
      const distanceKm = tripRows.reduce((sum: number, row: any) => sum + Number(row.actual_distance_km || row.route?.distance_km || 0), 0);
      const tripCount = tripRows.length;
      const marginPct = revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
      const costPerKm = distanceKm > 0 ? cost / distanceKm : 0;

      return {
        plate,
        revenue,
        costPerKm,
        tripCount,
        marginPct,
        distanceKm,
      };
    });
  }, [selectedIds, vehicles, trips, expenses, fromDate, toDate]);

  const chartData = useMemo(() => {
    const dims = [
      { key: "revenue", label: "Doanh thu" },
      { key: "marginPct", label: "Margin %" },
      { key: "tripCount", label: "So chuyen" },
      { key: "distanceKm", label: "Km" },
      { key: "costPerKm", label: "Chi phi/km" },
    ] as const;

    return dims.map((dim) => {
      const row: Record<string, number | string> = { metric: dim.label };
      metrics.forEach((item, idx) => {
        row[`v${idx}`] = Number(item[dim.key]);
      });
      return row;
    });
  }, [metrics]);

  const insight = useMemo(() => {
    if (metrics.length < 2) return "Chon tu 2 xe tro len de nhan insight so sanh.";

    const bestByMargin = [...metrics].sort((a, b) => b.marginPct - a.marginPct)[0];
    const worstByCost = [...metrics].sort((a, b) => b.costPerKm - a.costPerKm)[0];
    return `Xe ${bestByMargin.plate} hieu suat tot nhat: margin ${bestByMargin.marginPct.toFixed(1)}%. Xe ${worstByCost.plate} can chu y: chi phi/km cao nhat ${Math.round(worstByCost.costPerKm).toLocaleString("vi-VN")}đ.`;
  }, [metrics]);

  const toggleVehicle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const bestWorst = useMemo(() => {
    const bestRevenue = Math.max(...metrics.map((m) => m.revenue), 0);
    const bestMargin = Math.max(...metrics.map((m) => m.marginPct), -Infinity);
    const worstCostKm = Math.max(...metrics.map((m) => m.costPerKm), 0);
    return { bestRevenue, bestMargin, worstCostKm };
  }, [metrics]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>So Sánh Xe (Benchmark)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Tu ngay</Label>
              <input type="date" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>Den ngay</Label>
              <input type="date" className="mt-1 w-full rounded border px-3 py-2 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => {
                setFromDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                setToDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
              }}>
                Thang nay
              </Button>
              <Button variant="outline" onClick={() => {
                const last = subMonths(new Date(), 1);
                setFromDate(format(startOfMonth(last), "yyyy-MM-dd"));
                setToDate(format(endOfMonth(last), "yyyy-MM-dd"));
              }}>
                Thang truoc
              </Button>
            </div>
          </div>

          <div>
            <Label>Chon 2-4 xe</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectableVehicles.map((vehicle: any, idx) => {
                const id = String(vehicle.id);
                const selected = selectedIds.includes(id);
                const plate = String(vehicle.license_plate || vehicle.vehicle_code || id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${selected ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 bg-white"}`}
                    onClick={() => toggleVehicle(id)}
                  >
                    {selected ? "✓ " : ""}{plate}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bieu do so sanh</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          {metrics.length < 2 ? (
            <div className="text-sm text-muted-foreground">Chon it nhat 2 xe de hien thi bieu do so sanh.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                {metrics.map((m, idx) => (
                  <Bar key={m.plate} dataKey={`v${idx}`} name={m.plate} fill={COLORS[idx % COLORS.length]} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Chi so</th>
                {metrics.map((m) => (
                  <th key={m.plate} className="p-2 text-right">{m.plate}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2 font-medium">Doanh thu</td>
                {metrics.map((m) => (
                  <td key={`${m.plate}-rev`} className={`p-2 text-right ${m.revenue === bestWorst.bestRevenue ? "bg-emerald-50" : ""}`}>
                    {currency(m.revenue)}
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Chi phi / km</td>
                {metrics.map((m) => (
                  <td key={`${m.plate}-cpkm`} className={`p-2 text-right ${m.costPerKm === bestWorst.worstCostKm ? "bg-red-50" : ""}`}>
                    {Math.round(m.costPerKm).toLocaleString("vi-VN")}đ
                  </td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">So chuyen</td>
                {metrics.map((m) => (
                  <td key={`${m.plate}-trip`} className="p-2 text-right">{m.tripCount}</td>
                ))}
              </tr>
              <tr className="border-b">
                <td className="p-2 font-medium">Margin</td>
                {metrics.map((m) => (
                  <td key={`${m.plate}-margin`} className={`p-2 text-right ${m.marginPct === bestWorst.bestMargin ? "bg-emerald-50" : ""}`}>
                    {m.marginPct.toFixed(1)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-2 font-medium">Km da chay</td>
                {metrics.map((m) => (
                  <td key={`${m.plate}-km`} className="p-2 text-right">{Math.round(m.distanceKm).toLocaleString("vi-VN")}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-violet-200 bg-violet-50/60">
        <CardContent className="pt-4 text-sm">
          <Badge className="mb-2 bg-violet-600">AI Insight</Badge>
          <p className="text-violet-900">{insight}</p>
        </CardContent>
      </Card>
    </div>
  );
}
