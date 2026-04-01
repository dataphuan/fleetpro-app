import type { DriverGeoPoint } from '@/lib/driver-location';

export type IntegrityEventType = 'check_in' | 'track_point' | 'check_out';

export type IntegrityResult = {
  shouldPersist: boolean;
  riskScore: number;
  flags: string[];
  inferredSpeedKmh: number | null;
  distanceFromPreviousM: number | null;
  elapsedSeconds: number | null;
};

export type IntegrityThresholdProfile = {
  maxReasonableSpeedKmh: number;
  jumpDistanceM: number;
  jumpTimeSeconds: number;
  minAccuracyWarningM: number;
};

const EARTH_RADIUS_M = 6371000;
const DEFAULT_PROFILE: IntegrityThresholdProfile = {
  maxReasonableSpeedKmh: 140,
  jumpDistanceM: 1000,
  jumpTimeSeconds: 12,
  minAccuracyWarningM: 80,
};

export const getIntegrityProfileByVehicleType = (vehicleType?: string): IntegrityThresholdProfile => {
  const normalized = (vehicleType || '').toLowerCase();

  if (normalized.includes('container')) {
    return {
      maxReasonableSpeedKmh: 110,
      jumpDistanceM: 900,
      jumpTimeSeconds: 14,
      minAccuracyWarningM: 90,
    };
  }

  if (normalized.includes('ben') || normalized.includes('tải') || normalized.includes('tai')) {
    return {
      maxReasonableSpeedKmh: 120,
      jumpDistanceM: 950,
      jumpTimeSeconds: 13,
      minAccuracyWarningM: 85,
    };
  }

  if (normalized.includes('bus') || normalized.includes('khach')) {
    return {
      maxReasonableSpeedKmh: 100,
      jumpDistanceM: 850,
      jumpTimeSeconds: 14,
      minAccuracyWarningM: 85,
    };
  }

  return DEFAULT_PROFILE;
};

const toRad = (value: number) => (value * Math.PI) / 180;

export const distanceMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const hav =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
};

export const evaluateLocationIntegrity = (
  current: DriverGeoPoint,
  previous: DriverGeoPoint | null,
  eventType: IntegrityEventType,
  profile: IntegrityThresholdProfile = DEFAULT_PROFILE,
): IntegrityResult => {
  const flags: string[] = [];
  let riskScore = 0;

  if (current.accuracy > profile.minAccuracyWarningM && eventType !== 'track_point') {
    flags.push('low_accuracy');
    riskScore += 25;
  }

  let inferredSpeedKmh: number | null = null;
  let distanceFromPreviousM: number | null = null;
  let elapsedSeconds: number | null = null;

  if (previous) {
    distanceFromPreviousM = distanceMeters(current, previous);
    elapsedSeconds = Math.max(1, (current.timestamp - previous.timestamp) / 1000);
    inferredSpeedKmh = (distanceFromPreviousM / elapsedSeconds) * 3.6;

    if (distanceFromPreviousM > profile.jumpDistanceM && elapsedSeconds < profile.jumpTimeSeconds) {
      flags.push('gps_jump');
      riskScore += 45;
    }

    if (inferredSpeedKmh > profile.maxReasonableSpeedKmh) {
      flags.push('speed_anomaly');
      riskScore += 30;
    }
  }

  if (typeof current.speed === 'number' && current.speed * 3.6 > profile.maxReasonableSpeedKmh) {
    flags.push('device_speed_anomaly');
    riskScore += 25;
  }

  const shouldPersist = !flags.includes('gps_jump') || eventType !== 'track_point';

  return {
    shouldPersist,
    riskScore,
    flags,
    inferredSpeedKmh,
    distanceFromPreviousM,
    elapsedSeconds,
  };
};
