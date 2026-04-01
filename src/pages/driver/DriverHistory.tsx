import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTrips } from '@/hooks/useTrips';
import { useTripLocationLogs, useTripPathSummary } from '@/hooks/useTripLocationLogs';
import { TripReplayMap } from '@/components/tracking/TripReplayMap';
import { exportToCSV } from '@/lib/export';
import { Download } from 'lucide-react';

export default function DriverHistory() {
  const { user } = useAuth();
  const { data: trips = [] } = useTrips();
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const completedTrips = useMemo(() => {
    let rows = trips
      .filter((trip: any) => {
        const mine = trip.driver_id === user?.email || trip.driver?.email === user?.email || trip.driver_id === user?.id;
        const isDone = ['completed', 'closed', 'cancelled'].includes(trip.status);
        return mine && isDone;
      })
      .sort((a: any, b: any) => {
        return new Date(b.departure_date || 0).getTime() - new Date(a.departure_date || 0).getTime();
      });

    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`).getTime();
      rows = rows.filter((trip: any) => new Date(trip.departure_date || 0).getTime() >= from);
    }
    if (toDate) {
      const to = new Date(`${toDate}T23:59:59`).getTime();
      rows = rows.filter((trip: any) => new Date(trip.departure_date || 0).getTime() <= to);
    }

    return rows;
  }, [trips, user?.email, user?.id, fromDate, toDate]);

  const effectiveTripId = selectedTripId || completedTrips[0]?.id || '';
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

  const handleExportReplay = () => {
    if (!filteredLogs.length) return;
    exportToCSV(filteredLogs, `driver_replay_${effectiveTripId || 'trip'}`, [
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

  return (
    <div className="p-4 pb-24 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Lich su hanh trinh</CardTitle>
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
          </div>

          <Select value={effectiveTripId || undefined} onValueChange={(value) => setSelectedTripId(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Chon chuyen de xem hanh trinh" />
            </SelectTrigger>
            <SelectContent>
              {completedTrips.map((trip: any) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.trip_code} - {trip.departure_date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">Tong diem: {summary.totalPoints}</Badge>
            <Badge variant={summary.suspiciousPoints > 0 ? 'destructive' : 'secondary'}>
              Diem nghi ngo: {summary.suspiciousPoints}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-sm text-slate-600">Dang tai hanh trinh...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-sm text-slate-600">Chuyen nay chua co du lieu dinh vi.</div>
          ) : (
            <TripReplayMap logs={filteredLogs} highlightedIndex={highlightedIndex} />
          )}
        </CardContent>
      </Card>

      {filteredLogs.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Timeline vi tri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-72 overflow-y-auto">
            {filteredLogs.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left rounded border border-slate-200 p-2 hover:bg-slate-50"
                onClick={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{item.event_type || 'track_point'}</span>
                  <span>{new Date(item.recorded_at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)} | acc {Math.round(item.accuracy_m || 0)}m
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
