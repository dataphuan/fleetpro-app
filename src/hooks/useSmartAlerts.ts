import { useMemo, useState, useEffect, useCallback } from 'react';
import { useVehicles } from '@/hooks/useVehicles';

export type SmartAlertSeverity = 'expired' | 'critical' | 'warning' | 'info';

export type SmartAlert = {
  id: string;
  vehicleId: string;
  plate: string;
  type: string;
  expiryDate: string;
  daysLeft: number;
  severity: SmartAlertSeverity;
  status: 'active' | 'resolved';
};

const DATE_FIELDS = [
  { keys: ['insurance_expiry_civil', 'insurance_civil_expiry'], label: 'BH Dân sự' },
  { keys: ['insurance_expiry_body', 'insurance_body_expiry'], label: 'BH Thân vỏ' },
  { keys: ['inspection_expiry_date', 'registration_expiry_date', 'registration_expiry'], label: 'Đăng kiểm' },
  { keys: ['license_expiry'], label: 'Giấy phép lưu hành' },
];

const STORAGE_KEY = 'fleetpro:resolved-smart-alerts';

const getDateValue = (vehicle: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    const value = vehicle[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const toStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const calcDaysLeft = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  const today = toStartOfDay(new Date());
  const target = toStartOfDay(date);
  const diffMs = target.getTime() - today.getTime();
  return Math.floor(diffMs / 86400000);
};

const getSeverity = (daysLeft: number): SmartAlertSeverity | null => {
  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 30) return 'critical';
  if (daysLeft <= 60) return 'warning';
  if (daysLeft <= 90) return 'info';
  return null;
};

const severityRank: Record<SmartAlertSeverity, number> = {
  expired: 0,
  critical: 1,
  warning: 2,
  info: 3,
};

export const useSmartAlerts = () => {
  const { data: vehicles = [], isLoading } = useVehicles();
  const [resolvedIds, setResolvedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setResolvedIds(parsed.filter((x) => typeof x === 'string'));
      }
    } catch {
      setResolvedIds([]);
    }
  }, []);

  const saveResolvedIds = useCallback((ids: string[]) => {
    setResolvedIds(ids);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const markResolved = useCallback((alertId: string) => {
    if (!alertId) return;
    if (resolvedIds.includes(alertId)) return;
    saveResolvedIds([...resolvedIds, alertId]);
  }, [resolvedIds, saveResolvedIds]);

  const markActive = useCallback((alertId: string) => {
    if (!alertId) return;
    saveResolvedIds(resolvedIds.filter((id) => id !== alertId));
  }, [resolvedIds, saveResolvedIds]);

  const alerts = useMemo<SmartAlert[]>(() => {
    const rows: SmartAlert[] = [];

    (vehicles as Record<string, any>[]).forEach((vehicle) => {
      const vehicleId = String(vehicle.id || vehicle.vehicle_code || '');
      const plate = String(vehicle.license_plate || vehicle.plate_number || vehicle.vehicle_code || 'Xe chưa rõ');
      if (!vehicleId) return;

      DATE_FIELDS.forEach((fieldInfo) => {
        const rawDate = getDateValue(vehicle, fieldInfo.keys);
        if (!rawDate) return;

        const daysLeft = calcDaysLeft(rawDate);
        const severity = getSeverity(daysLeft);
        if (!severity) return;

        const alertId = `${vehicleId}:${fieldInfo.label}:${rawDate}`;
        rows.push({
          id: alertId,
          vehicleId,
          plate,
          type: fieldInfo.label,
          expiryDate: rawDate,
          daysLeft,
          severity,
          status: resolvedIds.includes(alertId) ? 'resolved' : 'active',
        });
      });
    });

    return rows.sort((a, b) => {
      const rankDiff = severityRank[a.severity] - severityRank[b.severity];
      if (rankDiff !== 0) return rankDiff;
      return a.daysLeft - b.daysLeft;
    });
  }, [vehicles, resolvedIds]);

  const activeAlerts = useMemo(() => alerts.filter((a) => a.status === 'active'), [alerts]);
  const resolvedAlerts = useMemo(() => alerts.filter((a) => a.status === 'resolved'), [alerts]);

  const criticalBadgeCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'expired' || a.severity === 'critical').length,
    [activeAlerts]
  );

  return {
    isLoading,
    alerts,
    activeAlerts,
    resolvedAlerts,
    criticalBadgeCount,
    markResolved,
    markActive,
  };
};
