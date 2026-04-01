import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tripLocationAdapter } from '@/lib/data-adapter';

export type TripLocationLog = {
  id: string;
  trip_id: string;
  trip_code?: string;
  driver_uid?: string;
  driver_email?: string;
  vehicle_id?: string;
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  speed_mps?: number | null;
  heading_deg?: number | null;
  event_type?: 'check_in' | 'track_point' | 'check_out';
  recorded_at: string;
  integrity_flags?: string[];
  integrity_risk_score?: number;
  inferred_speed_kmh?: number | null;
  distance_from_previous_m?: number | null;
};

const byRecordedAtAsc = (a: TripLocationLog, b: TripLocationLog) => {
  return new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime();
};

export const useTripLocationLogs = (tripId?: string) => {
  return useQuery({
    queryKey: ['trip-location-logs', tripId],
    queryFn: async () => {
      if (!tripId) return [] as TripLocationLog[];
      const rows = await tripLocationAdapter.listByTrip(tripId);
      return (rows as TripLocationLog[]).sort(byRecordedAtAsc);
    },
    enabled: !!tripId,
  });
};

export const useDriverLocationLogs = (driverEmail?: string) => {
  return useQuery({
    queryKey: ['driver-location-logs', driverEmail],
    queryFn: async () => {
      if (!driverEmail) return [] as TripLocationLog[];
      const rows = await tripLocationAdapter.listByDriverEmail(driverEmail);
      return (rows as TripLocationLog[]).sort(byRecordedAtAsc);
    },
    enabled: !!driverEmail,
  });
};

export const useTripPathSummary = (logs: TripLocationLog[]) => {
  return useMemo(() => {
    const suspicious = logs.filter((item) => (item.integrity_flags || []).length > 0).length;
    const first = logs[0] || null;
    const last = logs.length ? logs[logs.length - 1] : null;
    return {
      totalPoints: logs.length,
      suspiciousPoints: suspicious,
      firstPoint: first,
      lastPoint: last,
    };
  }, [logs]);
};
