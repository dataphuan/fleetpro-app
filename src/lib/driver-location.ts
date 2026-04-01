export type DriverGeoPoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
};

type WatchCallback = (point: DriverGeoPoint) => void;
type WatchErrorCallback = (error: GeolocationPositionError) => void;

const GEO_OPTIONS_HIGH_ACCURACY: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export const isGeolocationSupported = () => {
  return typeof navigator !== 'undefined' && !!navigator.geolocation;
};

const mapPositionToPoint = (position: GeolocationPosition): DriverGeoPoint => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy,
  altitude: position.coords.altitude,
  heading: position.coords.heading,
  speed: position.coords.speed,
  timestamp: position.timestamp,
});

const getCurrentPosition = (options: PositionOptions = GEO_OPTIONS_HIGH_ACCURACY) => {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!isGeolocationSupported()) {
      reject(new Error('Trinh duyet khong ho tro GPS.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
};

export const geolocationErrorToMessage = (error: unknown) => {
  if (!error) return 'Khong the lay vi tri hien tai.';

  if (error instanceof Error) {
    return error.message;
  }

  const geoError = error as GeolocationPositionError;
  if (geoError.code === 1) return 'Ban da tu choi quyen truy cap vi tri. Vui long cap quyen GPS de tiep tuc.';
  if (geoError.code === 2) return 'Khong xac dinh duoc vi tri. Thu den khu vuc thoang hon.';
  if (geoError.code === 3) return 'Het thoi gian lay vi tri. Thu lai trong vai giay.';
  return 'Khong the lay vi tri hien tai.';
};

export const getBestCurrentPosition = async (sampleCount = 4) => {
  const attempts = Array.from({ length: Math.max(1, sampleCount) });
  const points: DriverGeoPoint[] = [];

  for (const _ of attempts) {
    try {
      const pos = await getCurrentPosition(GEO_OPTIONS_HIGH_ACCURACY);
      points.push(mapPositionToPoint(pos));
    } catch {
      // Ignore failed sample and continue collecting.
    }
  }

  if (points.length === 0) {
    throw new Error('Khong lay duoc du lieu GPS. Vui long thu lai.');
  }

  points.sort((a, b) => a.accuracy - b.accuracy);
  return points[0];
};

export const startLocationWatch = (
  onPoint: WatchCallback,
  onError?: WatchErrorCallback,
  options?: PositionOptions,
) => {
  if (!isGeolocationSupported()) {
    throw new Error('Trinh duyet khong ho tro GPS.');
  }

  const mergedOptions: PositionOptions = {
    ...GEO_OPTIONS_HIGH_ACCURACY,
    maximumAge: 5000,
    ...(options || {}),
  };

  return navigator.geolocation.watchPosition(
    (position) => onPoint(mapPositionToPoint(position)),
    (error) => onError?.(error),
    mergedOptions,
  );
};

export const stopLocationWatch = (watchId: number | null) => {
  if (watchId === null || !isGeolocationSupported()) return;
  navigator.geolocation.clearWatch(watchId);
};
