import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTrips } from '@/hooks/useTrips';
import { useTripLocationLogs, useTripPathSummary } from '@/hooks/useTripLocationLogs';
import { TripReplayMap } from '@/components/tracking/TripReplayMap';
import { exportToCSV, exportToJSON } from '@/lib/export';
import { Download, FileJson, FileText } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { TrackingPlaceholderFleetMap, buildMockMarkers } from '@/components/tracking/TrackingPlaceholderFleetMap';

export default function TrackingCenter() {
  const { data: trips = [] } = useTrips();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const recentTrips = useMemo(() => {
    let rows = [...trips]
      .filter((trip: any) => ['in_progress', 'completed', 'closed', 'cancelled'].includes(trip.status))
      .sort((a: any, b: any) => new Date(b.departure_date || 0).getTime() - new Date(a.departure_date || 0).getTime());

    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`).getTime();
      rows = rows.filter((trip: any) => new Date(trip.departure_date || 0).getTime() >= from);
    }

    if (toDate) {
      const to = new Date(`${toDate}T23:59:59`).getTime();
      rows = rows.filter((trip: any) => new Date(trip.departure_date || 0).getTime() <= to);
    }

    return rows.slice(0, 200);
  }, [trips, fromDate, toDate]);

  const effectiveTripId = selectedTripId || recentTrips[0]?.id || '';
  const { data: logs = [], isLoading } = useTripLocationLogs(effectiveTripId);

  const filteredLogs = useMemo(() => {
    let rows = [...logs];
    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`).getTime();
      rows = rows.filter((item) => new Date(item.recorded_at).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(`${toDate}T23:59:59`).getTime();
      rows = rows.filter((item) => new Date(item.recorded_at).getTime() <= to);
    }
    return rows;
  }, [logs, fromDate, toDate]);

  const summary = useTripPathSummary(filteredLogs);

  const selectedTrip = useMemo(() => {
    return recentTrips.find((trip: any) => trip.id === effectiveTripId) || null;
  }, [recentTrips, effectiveTripId]);

  const maxRiskScore = useMemo(() => {
    if (!filteredLogs.length) return 0;
    return Math.max(...filteredLogs.map((item) => Number(item.integrity_risk_score || 0)));
  }, [filteredLogs]);

  const mockFleetMarkers = useMemo(() => buildMockMarkers(vehicles, drivers, trips), [vehicles, drivers, trips]);

  const handleExportReplay = () => {
    if (!filteredLogs.length) return;
    exportToCSV(filteredLogs, `tracking_replay_${effectiveTripId || 'trip'}`, [
      { key: 'trip_code', header: 'Ma chuyen' },
      { key: 'event_type', header: 'Su kien' },
      { key: 'recorded_at', header: 'Thoi gian' },
      { key: 'latitude', header: 'Vi do' },
      { key: 'longitude', header: 'Kinh do' },
      { key: 'accuracy_m', header: 'Do lech m' },
      { key: 'inferred_speed_kmh', header: 'Toc do suy luan kmh' },
      { key: 'integrity_risk_score', header: 'Risk score' },
      { key: 'integrity_flags', header: 'Flags' },
    ]);
  };

  const handleExportReplayJson = () => {
    if (!filteredLogs.length) return;

    const payload = {
      generated_at: new Date().toISOString(),
      trip: selectedTrip
        ? {
            id: selectedTrip.id,
            trip_code: selectedTrip.trip_code,
            status: selectedTrip.status,
            departure_date: selectedTrip.departure_date,
          }
        : null,
      filters: {
        from_date: fromDate || null,
        to_date: toDate || null,
      },
      summary: {
        total_points: summary.totalPoints,
        suspicious_points: summary.suspiciousPoints,
        max_risk_score: maxRiskScore,
        first_recorded_at: summary.firstPoint?.recorded_at || null,
        last_recorded_at: summary.lastPoint?.recorded_at || null,
      },
      logs: filteredLogs,
    };

    exportToJSON(payload, `tracking_replay_audit_${effectiveTripId || 'trip'}`);
  };

  const handleExportReplayPdf = async () => {
    if (!filteredLogs.length) return;

    const { exportToPDF } = await import('@/lib/pdf-export');

    exportToPDF({
      title: 'BAO CAO AUDIT HANH TRINH',
      subtitle: `Chuyen ${selectedTrip?.trip_code || effectiveTripId || ''} | Diem: ${summary.totalPoints} | Nghi ngo: ${summary.suspiciousPoints} | Risk max: ${maxRiskScore}`,
      filename: `BaoCao_Audit_Tracking_${effectiveTripId || 'trip'}.pdf`,
      columns: [
        { header: 'Thoi gian', dataKey: 'recorded_at', width: 35 },
        { header: 'Su kien', dataKey: 'event_type', width: 22 },
        { header: 'Vi do', dataKey: 'latitude', width: 22 },
        { header: 'Kinh do', dataKey: 'longitude', width: 22 },
        { header: 'Acc(m)', dataKey: 'accuracy_m', width: 18 },
        { header: 'Speed(kmh)', dataKey: 'inferred_speed_kmh', width: 22 },
        { header: 'Risk', dataKey: 'integrity_risk_score', width: 15 },
        { header: 'Flags', dataKey: 'flags_text', width: 50 },
      ],
      data: filteredLogs.map((item) => ({
        ...item,
        flags_text: (item.integrity_flags || []).join(', '),
      })),
      orientation: 'landscape',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tracking Replay Center</h1>
        <p className="text-sm text-slate-600">Xem lai hanh trinh va diem nghi ngo GPS theo tung chuyen.</p>
      </div>

      <TrackingPlaceholderFleetMap markers={mockFleetMarkers} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bo loc chuyen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-slate-600">Tu ngay</label>
              <input
                type="date"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Den ngay</label>
              <input
                type="date"
                className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); }}>
              Xoa loc
            </Button>
            <Button size="sm" onClick={handleExportReplay} disabled={!filteredLogs.length}>
              <Download className="mr-2 h-4 w-4" /> Export replay
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReplayJson} disabled={!filteredLogs.length}>
              <FileJson className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReplayPdf} disabled={!filteredLogs.length}>
              <FileText className="mr-2 h-4 w-4" /> Export PDF
            </Button>
          </div>

          <Select value={effectiveTripId || undefined} onValueChange={(value) => setSelectedTripId(value)}>
            <SelectTrigger className="max-w-xl">
              <SelectValue placeholder="Chon chuyen" />
            </SelectTrigger>
            <SelectContent>
              {recentTrips.map((trip: any) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.trip_code} | {trip.status} | {trip.departure_date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">Tong diem: {summary.totalPoints}</Badge>
            <Badge variant={summary.suspiciousPoints > 0 ? 'destructive' : 'secondary'}>
              Diem nghi ngo: {summary.suspiciousPoints}
            </Badge>
            {summary.firstPoint ? <Badge variant="outline">Bat dau: {new Date(summary.firstPoint.recorded_at).toLocaleString()}</Badge> : null}
            {summary.lastPoint ? <Badge variant="outline">Ket thuc: {new Date(summary.lastPoint.recorded_at).toLocaleString()}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-sm text-slate-600">Dang tai track logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-sm text-slate-600">Chuyen nay chua co track logs.</div>
          ) : (
            <TripReplayMap logs={filteredLogs} highlightedIndex={highlightedIndex} />
          )}
        </CardContent>
      </Card>

      {filteredLogs.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Danh sach diem vi tri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {filteredLogs.map((item, index) => {
              const hasFlags = (item.integrity_flags || []).length > 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded border border-slate-200 p-2 text-left hover:bg-slate-50"
                  onClick={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{item.event_type || 'track_point'}</span>
                    <span>{new Date(item.recorded_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} | acc {Math.round(item.accuracy_m || 0)}m
                  </div>
                  {hasFlags ? (
                    <div className="mt-1 text-xs text-red-600">
                      Flag: {(item.integrity_flags || []).join(', ')} | Risk: {item.integrity_risk_score || 0}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
