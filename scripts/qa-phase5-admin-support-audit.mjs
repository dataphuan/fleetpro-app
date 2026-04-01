#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const files = {
  app: path.join(root, 'src', 'App.tsx'),
  sidebar: path.join(root, 'src', 'components', 'layout', 'AppSidebar.tsx'),
  reportsPage: path.join(root, 'src', 'pages', 'Reports.tsx'),
  reportsLayout: path.join(root, 'src', 'components', 'reports', 'ReportsLayout.tsx'),
  alerts: path.join(root, 'src', 'pages', 'Alerts.tsx'),
  profile: path.join(root, 'src', 'pages', 'UserProfilePage.tsx'),
  settings: path.join(root, 'src', 'pages', 'Settings.tsx'),
  members: path.join(root, 'src', 'pages', 'Members.tsx'),
  logs: path.join(root, 'src', 'pages', 'Logs.tsx'),
  useAlerts: path.join(root, 'src', 'hooks', 'useAlerts.ts'),
  useSmartAlerts: path.join(root, 'src', 'hooks', 'useSmartAlerts.ts'),
  driverDashboard: path.join(root, 'src', 'pages', 'driver', 'DriverDashboard.tsx'),
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
  const appSrc = read(files.app);
  checkIncludes(
    appSrc,
    ['path="/reports"', 'path="/alerts"', 'path="/profile"', 'path="/settings"', 'path="members"', 'path="logs"'],
    'App routes include phase-5 pages.',
    'App routes missing one or more phase-5 pages',
  );
}

if (exists(files.sidebar)) {
  const src = read(files.sidebar);
  checkIncludes(
    src,
    [
      '"/reports": ["admin", "manager", "accountant"]',
      '"/alerts": ["admin", "manager", "dispatcher"]',
      '"/settings": ["admin"]',
      '"/members": ["admin"]',
      '"/logs": ["admin"]',
    ],
    'Sidebar roleAccessMap contains expected phase-5 restrictions.',
    'Sidebar roleAccessMap missing expected restrictions for phase-5 routes',
  );
}

if (exists(files.reportsPage)) {
  const src = read(files.reportsPage);
  checkIncludes(
    src,
    ['ReportsLayout', 'return <ReportsLayout />'],
    'Reports page delegates to ReportsLayout.',
    'Reports page does not delegate to ReportsLayout',
  );
}

if (exists(files.reportsLayout)) {
  const src = read(files.reportsLayout);
  checkIncludes(
    src,
    [
      'ReportByVehicleTable',
      'ReportByDriverTable',
      'ReportByRouteTable',
      'ReportByCustomerTable',
      'ReportByRevenueTable',
      'ReportByExpenseTable',
      'ReportByProfitTable',
    ],
    'ReportsLayout includes all report dimensions (vehicle/driver/route/customer/revenue/expense/profit).',
    'ReportsLayout missing one or more report dimensions',
  );

  const triggerCount = (src.match(/<TabsTrigger\s+value=/g) || []).length;
  check(triggerCount >= 7, `ReportsLayout has tab triggers (${triggerCount}).`, `ReportsLayout has insufficient report tabs: ${triggerCount}`);
}

if (exists(files.alerts)) {
  const src = read(files.alerts);
  checkIncludes(
    src,
    ['useSmartAlerts', 'TabsTrigger value="critical"', 'TabsTrigger value="warning"', 'TabsTrigger value="resolved"'],
    'Alerts page includes smart alerts tabs and data hook.',
    'Alerts page smart alerts tab/hook implementation is incomplete',
  );
  checkIncludes(
    src,
    ['markResolved', 'markActive', 'sessionStorage.setItem("highlightVehicleId"', 'navigate("/vehicles")'],
    'Alerts page includes resolve workflow and vehicle drilldown action.',
    'Alerts page resolve workflow or vehicle drilldown action is incomplete',
  );
}

if (exists(files.useAlerts) && exists(files.useSmartAlerts) && exists(files.driverDashboard)) {
  const alertsHookSrc = read(files.useAlerts);
  const smartAlertsHookSrc = read(files.useSmartAlerts);
  const driverSrc = read(files.driverDashboard);
  const sidebarSrc = read(files.sidebar);

  checkIncludes(
    alertsHookSrc,
    ['useAlertsSummary', 'alertsAdapter.getSummary'],
    'Alerts summary hook exists for dashboard/header visibility.',
    'Alerts summary hook is incomplete',
  );

  checkIncludes(
    smartAlertsHookSrc,
    ['DATE_FIELDS', 'STORAGE_KEY', 'criticalBadgeCount', 'markResolved', 'markActive'],
    'Smart alerts hook contains generation, badge count, and resolve state management.',
    'Smart alerts hook is missing key generation/resolution behaviors',
  );

  checkIncludes(
    sidebarSrc,
    ['useSmartAlerts', 'criticalBadgeCount', 'item.path === "/alerts"'],
    'Sidebar binds smart alerts badge to /alerts navigation item.',
    'Sidebar smart alerts badge binding is incomplete',
  );

  checkIncludes(
    driverSrc,
    ['alertsAdapter.create', "alert_type: 'gps_anomaly'"],
    'GPS anomaly alert producer exists in driver tracking flow.',
    'GPS anomaly producer missing in driver tracking flow',
  );
}

if (exists(files.profile)) {
  const src = read(files.profile);
  checkIncludes(
    src,
    ['useAuth', 'ChangePasswordForm', 'updateDoc', 'avatar_url', 'handleSaveAvatar'],
    'User profile includes avatar update and change-password capability.',
    'User profile avatar/password flow is incomplete',
  );
}

if (exists(files.settings)) {
  const src = read(files.settings);
  checkIncludes(
    src,
    ['useCompanySettings', 'useSaveCompanySettings', 'useSecuritySettings', 'useSaveSecuritySettings'],
    'Settings includes company/security config flow.',
    'Settings company/security config flow is incomplete',
  );
  checkIncludes(
    src,
    ['useUsers', 'useAddUser', 'useUpdateUserRole', 'useDeleteUser', 'value="cloud"'],
    'Settings includes user admin and cloud settings sections.',
    'Settings user admin/cloud section is incomplete',
  );
}

if (exists(files.members)) {
  const src = read(files.members);
  checkIncludes(
    src,
    ['const isAdmin = currentUserRole === \'admin\'', '{isAdmin && (', 'useAddUser', 'useUpdateUserRole', 'useDeleteUser'],
    'Members page enforces admin-only management actions.',
    'Members admin action gating is incomplete',
  );
}

if (exists(files.logs)) {
  const src = read(files.logs);
  checkIncludes(
    src,
    ['if (role !== \'admin\')', 'enabled: !!tenantId && role === \'admin\'', 'collection(db, \'system_logs\')', 'searchQuery'],
    'Logs page enforces admin-only access and audit query path.',
    'Logs admin gate/audit query path is incomplete',
  );
}

console.log('\nPHASE 5 QA AUDIT: REPORTS + ALERTS + ADMIN SUPPORT');
console.log('===================================================');
results.forEach((r) => console.log(`${r.status}: ${r.msg}`));

if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach((w) => console.log(`WARN: ${w}`));
}

const failCount = results.filter((x) => x.status === 'FAIL').length;
console.log(`\nSUMMARY: ${results.length - failCount} PASS / ${failCount} FAIL / ${warnings.length} WARN`);
console.log(`RESULT: ${failCount > 0 ? 'FAIL' : 'PASS'}`);

process.exit(failCount > 0 ? 1 : 0);
