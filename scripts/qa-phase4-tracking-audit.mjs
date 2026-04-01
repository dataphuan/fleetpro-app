#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const files = {
  app: path.join(root, 'src', 'App.tsx'),
  driverDashboard: path.join(root, 'src', 'pages', 'driver', 'DriverDashboard.tsx'),
  driverHistory: path.join(root, 'src', 'pages', 'driver', 'DriverHistory.tsx'),
  trackingCenter: path.join(root, 'src', 'pages', 'TrackingCenter.tsx'),
  replayMap: path.join(root, 'src', 'components', 'tracking', 'TripReplayMap.tsx'),
  integrity: path.join(root, 'src', 'lib', 'location-integrity.ts'),
  tripLocationHooks: path.join(root, 'src', 'hooks', 'useTripLocationLogs.ts'),
};

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

const results = [];
const warnings = [];

const check = (ok, passMsg, failMsg) => {
  results.push({ status: ok ? 'PASS' : 'FAIL', msg: ok ? passMsg : failMsg });
};

const checkIncludes = (src, patterns, passMsg, failMsg) => {
  const missing = patterns.filter((p) => !src.includes(p));
  check(missing.length === 0, passMsg, `${failMsg}. Missing: ${missing.join(', ')}`);
};

for (const [key, filePath] of Object.entries(files)) {
  check(exists(filePath), `File exists: ${key}`, `Missing file: ${path.relative(root, filePath)}`);
}

if (exists(files.app)) {
  const appSrc = read(files.app);
  checkIncludes(
    appSrc,
    ['path="/tracking-center"', 'path="/driver"', 'path="history"', 'DriverDashboard', 'DriverHistory'],
    'App routes include tracking center and driver replay paths.',
    'App routing is missing required tracking/driver paths',
  );
}

if (exists(files.driverDashboard)) {
  const src = read(files.driverDashboard);
  checkIncludes(
    src,
    [
      'startLocationWatch',
      'stopLocationWatch',
      'getBestCurrentPosition',
      'persistTripLocation',
      'tripLocationAdapter.create',
      'tripAdapter.update',
    ],
    'DriverDashboard includes check-in + live tracking persistence flow.',
    'DriverDashboard is missing tracking persistence flow pieces',
  );
  checkIncludes(
    src,
    ['evaluateLocationIntegrity', 'getIntegrityProfileByVehicleType', 'integrity.flags', 'integrity.riskScore'],
    'DriverDashboard binds integrity evaluation and risk metadata.',
    'DriverDashboard integrity binding is incomplete',
  );
  checkIncludes(
    src,
    ['alertsAdapter.create', "alert_type: 'gps_anomaly'", "eventType: 'check_in' | 'track_point' | 'check_out'"],
    'DriverDashboard includes anomaly alert signaling and event typing.',
    'DriverDashboard anomaly alert/event typing is incomplete',
  );
}

if (exists(files.integrity)) {
  const src = read(files.integrity);
  checkIncludes(
    src,
    ['evaluateLocationIntegrity', 'gps_jump', 'speed_anomaly', 'device_speed_anomaly', 'shouldPersist'],
    'Location integrity module contains anti-fraud scoring and persist guard.',
    'Location integrity module missing anti-fraud scoring logic',
  );
  checkIncludes(
    src,
    ['getIntegrityProfileByVehicleType', 'maxReasonableSpeedKmh', 'jumpDistanceM', 'jumpTimeSeconds'],
    'Location integrity module includes vehicle-type threshold profiles.',
    'Location integrity threshold profiles are incomplete',
  );
}

if (exists(files.tripLocationHooks)) {
  const src = read(files.tripLocationHooks);
  checkIncludes(
    src,
    ['useTripLocationLogs', 'useTripPathSummary', 'tripLocationAdapter.listByTrip', 'sort(byRecordedAtAsc)'],
    'Trip location hooks provide sorted replay logs and path summary.',
    'Trip location hooks missing replay query/sorting/summary pieces',
  );
}

if (exists(files.trackingCenter)) {
  const src = read(files.trackingCenter);
  checkIncludes(
    src,
    ['useTripLocationLogs', 'useTripPathSummary', 'TripReplayMap', 'fromDate', 'toDate'],
    'TrackingCenter includes replay map and date-range filtering.',
    'TrackingCenter missing replay map/date filtering features',
  );
  checkIncludes(
    src,
    ['exportToCSV', 'exportToJSON', 'handleExportReplayPdf', "await import('@/lib/pdf-export')"],
    'TrackingCenter includes CSV/JSON/PDF replay export paths.',
    'TrackingCenter export paths are incomplete',
  );
}

if (exists(files.driverHistory)) {
  const src = read(files.driverHistory);
  checkIncludes(
    src,
    ['useTripLocationLogs', 'useTripPathSummary', 'TripReplayMap', 'fromDate', 'toDate'],
    'DriverHistory includes replay map and date-range filtering.',
    'DriverHistory missing replay map/date filtering features',
  );
  checkIncludes(
    src,
    ['exportToCSV', 'handleExportReplay', 'driver_replay_'],
    'DriverHistory includes replay export capability.',
    'DriverHistory replay export capability missing',
  );
  if (!src.includes('exportToJSON') && !src.includes('exportToPDF')) {
    warnings.push('DriverHistory currently exports CSV only; JSON/PDF export remains admin-centric via TrackingCenter.');
  }
}

if (exists(files.replayMap)) {
  const src = read(files.replayMap);
  checkIncludes(
    src,
    ['L.polyline', 'L.circleMarker', 'integrity_flags', 'highlightedIndex'],
    'TripReplayMap renders route polyline, risk markers, and highlight navigation.',
    'TripReplayMap replay visualization logic is incomplete',
  );
}

console.log('\nPHASE 4 QA AUDIT: DRIVER TRACKING + REPLAY + INTEGRITY');
console.log('=======================================================');
results.forEach((r) => console.log(`${r.status}: ${r.msg}`));

if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach((w) => console.log(`WARN: ${w}`));
}

const failCount = results.filter((x) => x.status === 'FAIL').length;
console.log(`\nSUMMARY: ${results.length - failCount} PASS / ${failCount} FAIL / ${warnings.length} WARN`);
console.log(`RESULT: ${failCount > 0 ? 'FAIL' : 'PASS'}`);

process.exit(failCount > 0 ? 1 : 0);
