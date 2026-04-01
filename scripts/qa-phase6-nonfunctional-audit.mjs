#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const files = {
  app: path.join(root, 'src', 'App.tsx'),
  trackingCenter: path.join(root, 'src', 'pages', 'TrackingCenter.tsx'),
  driverHistory: path.join(root, 'src', 'pages', 'driver', 'DriverHistory.tsx'),
  driverDashboard: path.join(root, 'src', 'pages', 'driver', 'DriverDashboard.tsx'),
  replayMap: path.join(root, 'src', 'components', 'tracking', 'TripReplayMap.tsx'),
  logs: path.join(root, 'src', 'pages', 'Logs.tsx'),
  members: path.join(root, 'src', 'pages', 'Members.tsx'),
  settings: path.join(root, 'src', 'pages', 'Settings.tsx'),
  exportLib: path.join(root, 'src', 'lib', 'export.ts'),
  pdfExport: path.join(root, 'src', 'lib', 'pdf-export.ts'),
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

for (const [name, filePath] of Object.entries(files)) {
  check(exists(filePath), `File exists: ${name}`, `Missing file: ${path.relative(root, filePath)}`);
}

if (exists(files.app)) {
  const src = read(files.app);
  checkIncludes(
    src,
    ['new QueryClient', 'staleTime', 'gcTime', 'retry: 1', 'refetchOnWindowFocus: false'],
    'App query client has non-functional cache/retry defaults.',
    'App query client defaults are incomplete',
  );
  checkIncludes(
    src,
    ['<ErrorBoundary>', '<Suspense fallback={<PageSkeleton />}>', 'path="*" element={<NotFound />}'],
    'App includes error boundary, loading fallback, and not-found guard.',
    'App resilience guards are incomplete',
  );
}

if (exists(files.trackingCenter)) {
  const src = read(files.trackingCenter);
  checkIncludes(
    src,
    ['isLoading', 'filteredLogs.length === 0', 'if (!filteredLogs.length) return;', 'handleExportReplayPdf'],
    'TrackingCenter handles loading/empty/export-guard states.',
    'TrackingCenter loading/empty/export-guard handling is incomplete',
  );
}

if (exists(files.driverHistory)) {
  const src = read(files.driverHistory);
  checkIncludes(
    src,
    ['isLoading', 'filteredLogs.length === 0', 'if (!filteredLogs.length) return;', 'handleExportReplay'],
    'DriverHistory handles loading/empty/export-guard states.',
    'DriverHistory loading/empty/export-guard handling is incomplete',
  );
}

if (exists(files.driverDashboard)) {
  const src = read(files.driverDashboard);
  checkIncludes(
    src,
    ['try {', 'catch', 'geolocationErrorToMessage', 'toast({', 'variant: \"destructive\"'],
    'DriverDashboard includes runtime error handling and user feedback.',
    'DriverDashboard runtime error handling appears incomplete',
  );
  checkIncludes(
    src,
    ['MAX_TRACKING_ACCURACY_M', 'TRACKING_PUSH_INTERVAL_MS', 'TRIP_LAST_LOCATION_SYNC_MS'],
    'DriverDashboard uses throttling/accuracy safeguards for tracking stability.',
    'DriverDashboard tracking stability safeguards are incomplete',
  );
}

if (exists(files.replayMap)) {
  const src = read(files.replayMap);
  checkIncludes(
    src,
    ['mapInstanceRef.current?.remove()', 'polylineRef.current.remove()', 'markersLayerRef.current.remove()', 'fitBounds'],
    'TripReplayMap performs cleanup and bounded viewport updates.',
    'TripReplayMap cleanup/viewport handling is incomplete',
  );
}

if (exists(files.logs)) {
  const src = read(files.logs);
  checkIncludes(
    src,
    ['if (role !== \'admin\')', 'isLoading ?', 'filteredLogs?.length === 0'],
    'Logs page includes permission guard, loading state, and empty state.',
    'Logs page non-functional state handling is incomplete',
  );
}

if (exists(files.members)) {
  const src = read(files.members);
  checkIncludes(
    src,
    ['if (isLoading)', 'Loader2', 'isAdmin'],
    'Members page includes loading handling and admin gating.',
    'Members page loading/admin gating is incomplete',
  );
}

if (exists(files.settings)) {
  const src = read(files.settings);
  checkIncludes(
    src,
    ['useDataExport', 'useDataBackup', 'useBackupsList', 'useHealthCheck', 'usePurgeData'],
    'Settings includes backup/export/health/purge operational controls.',
    'Settings operational controls for resilience are incomplete',
  );
  if (src.includes('// @ts-nocheck')) {
    warnings.push('Settings page currently uses @ts-nocheck; maintain manual regression verification for this module.');
  }
}

if (exists(files.exportLib) && exists(files.pdfExport)) {
  const exportSrc = read(files.exportLib);
  const pdfSrc = read(files.pdfExport);
  checkIncludes(
    exportSrc,
    ['prepareExcelData', 'exportToCSV', 'exportToJSON', 'XLSX.writeFile'],
    'Export library exposes CSV/JSON outputs with XLSX-backed file generation.',
    'Export library is missing expected export outputs',
  );
  checkIncludes(
    pdfSrc,
    ['jsPDF', 'autoTable', 'exportToPDF'],
    'PDF export utility is present with table rendering.',
    'PDF export utility is incomplete',
  );
}

console.log('\nPHASE 6 QA AUDIT: NON-FUNCTIONAL READINESS');
console.log('==========================================');
results.forEach((r) => console.log(`${r.status}: ${r.msg}`));

if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach((w) => console.log(`WARN: ${w}`));
}

const failCount = results.filter((x) => x.status === 'FAIL').length;
console.log(`\nSUMMARY: ${results.length - failCount} PASS / ${failCount} FAIL / ${warnings.length} WARN`);
console.log(`RESULT: ${failCount > 0 ? 'FAIL' : 'PASS'}`);

process.exit(failCount > 0 ? 1 : 0);
