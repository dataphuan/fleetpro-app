#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.tsx');
const sidebarPath = path.join(root, 'src', 'components', 'layout', 'AppSidebar.tsx');

const pages = {
  trips: path.join(root, 'src', 'pages', 'Trips.tsx'),
  tripsRevenue: path.join(root, 'src', 'pages', 'TripsRevenue.tsx'),
  dispatch: path.join(root, 'src', 'pages', 'Dispatch.tsx'),
  expenses: path.join(root, 'src', 'pages', 'Expenses.tsx'),
  transportOrders: path.join(root, 'src', 'pages', 'TransportOrders.tsx'),
  maintenance: path.join(root, 'src', 'pages', 'Maintenance.tsx'),
  tireInventory: path.join(root, 'src', 'pages', 'inventory', 'TireInventory.tsx'),
};

const requiredRoutes = [
  '/trips',
  '/dispatch',
  '/expenses',
  '/transport-orders',
  '/maintenance',
  '/inventory/tires',
];

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

const getRoutePaths = (src) => {
  const out = [];
  const re = /<Route\s+path="([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const p = m[1];
    if (!p || p === '*') continue;
    out.push(p.startsWith('/') ? p : `/${p}`);
  }
  return [...new Set(out)];
};

const getNavPaths = (src) => {
  const out = [];
  const re = /\{\s*path:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push(m[1]);
  }
  return [...new Set(out)];
};

check(exists(appPath), 'App router file exists.', 'Missing app router file src/App.tsx');
check(exists(sidebarPath), 'App sidebar file exists.', 'Missing sidebar file src/components/layout/AppSidebar.tsx');

for (const [name, filePath] of Object.entries(pages)) {
  check(exists(filePath), `Page exists: ${name}`, `Missing page file: ${path.relative(root, filePath)}`);
}

if (exists(appPath) && exists(sidebarPath)) {
  const appSrc = read(appPath);
  const sidebarSrc = read(sidebarPath);
  const routes = getRoutePaths(appSrc);
  const navPaths = getNavPaths(sidebarSrc);

  for (const route of requiredRoutes) {
    check(routes.includes(route), `Route exists: ${route}`, `Missing route in App.tsx: ${route}`);
    check(navPaths.includes(route), `Menu path exists: ${route}`, `Missing nav item in AppSidebar: ${route}`);
  }
}

if (exists(pages.trips)) {
  const tripsSrc = read(pages.trips);
  check(
    tripsSrc.includes('import TripsRevenue from "./TripsRevenue"') && tripsSrc.includes('return <TripsRevenue />'),
    'Trips wrapper delegates to TripsRevenue.',
    'Trips page is not delegating to TripsRevenue as expected.',
  );
}

if (exists(pages.tripsRevenue)) {
  const src = read(pages.tripsRevenue);
  checkIncludes(
    src,
    ['useTrips', 'useCreateTrip', 'useUpdateTrip', 'useDeleteTrip'],
    'TripsRevenue includes full trip CRUD hooks.',
    'TripsRevenue is missing trip CRUD hooks',
  );
  checkIncludes(
    src,
    ['useVehiclesByStatus', 'useActiveDrivers', 'useRoutes', 'useCustomers'],
    'TripsRevenue includes master-data relation hooks.',
    'TripsRevenue is missing one or more master-data relation hooks',
  );
  checkIncludes(
    src,
    ['VALID_TRANSITIONS', 'getValidNextStatuses', 'draft', 'completed', 'cancelled'],
    'TripsRevenue contains lifecycle transition guards.',
    'TripsRevenue lifecycle transition guard is incomplete',
  );
}

if (exists(pages.dispatch)) {
  const src = read(pages.dispatch);
  checkIncludes(
    src,
    ['useTripsByDateRange', 'useUpdateTrip', 'AISuggestionDrawer'],
    'Dispatch has scheduling data + trip update + AI assist integration.',
    'Dispatch missing critical scheduling or update integration',
  );
  checkIncludes(
    src,
    ['useVehicles', 'useDrivers'],
    'Dispatch includes core fleet dependencies (vehicles + drivers).',
    'Dispatch missing one or more cross-module dependencies',
  );

  if (!src.includes('useRoutes') || !src.includes('useCustomers')) {
    warnings.push('Dispatch currently does not directly bind route/customer hooks; verify flow manually in UAT if required by business process.');
  }
}

if (exists(pages.expenses)) {
  const src = read(pages.expenses);
  checkIncludes(
    src,
    ['useExpenses', 'useCreateExpense', 'useUpdateExpense', 'useDeleteExpense'],
    'Expenses includes core CRUD hooks.',
    'Expenses missing one or more CRUD hooks',
  );
  checkIncludes(
    src,
    ['usePermissions', "usePermissions('expenses')", 'canCreate', 'canDelete', 'canExport'],
    'Expenses includes permission gating for create/delete/export.',
    'Expenses permission gating appears incomplete',
  );
}

if (exists(pages.transportOrders)) {
  const src = read(pages.transportOrders);
  checkIncludes(
    src,
    [
      'useTransportOrders',
      'useCreateTransportOrder',
      'useUpdateTransportOrder',
      'useDeleteTransportOrder',
      'useConfirmTransportOrder',
      'useStartTransportOrder',
      'useCompleteTransportOrder',
      'useCancelTransportOrder',
    ],
    'TransportOrders includes full lifecycle hook set.',
    'TransportOrders missing one or more lifecycle hooks',
  );
  check(
    src.includes('DateFilter'),
    'TransportOrders includes date filtering control.',
    'TransportOrders is missing DateFilter integration.',
  );
}

if (exists(pages.maintenance)) {
  const src = read(pages.maintenance);
  checkIncludes(
    src,
    ['useMaintenanceOrders', 'useCreateMaintenanceOrder', 'useUpdateMaintenanceOrder', 'useDeleteMaintenanceOrder'],
    'Maintenance includes core CRUD hooks.',
    'Maintenance missing one or more CRUD hooks',
  );
  checkIncludes(
    src,
    ['ExcelImportDialog', "usePermissions('maintenance')"],
    'Maintenance includes import + permission controls.',
    'Maintenance import/permission controls missing',
  );
}

if (exists(pages.tireInventory)) {
  const src = read(pages.tireInventory);
  checkIncludes(
    src,
    ['DashboardTab', 'OperationsTab', 'PurchasingTab', 'LifecycleTab', 'AnalyticsTab'],
    'TireInventory includes 5-tab operations workflow.',
    'TireInventory missing one or more tab modules',
  );

  const triggerCount = (src.match(/<TabsTrigger\s+value=/g) || []).length;
  check(triggerCount >= 5, `TireInventory has tab triggers (${triggerCount}).`, `TireInventory has insufficient tab triggers: ${triggerCount}`);

  if (!src.includes('useInventoryItems') || !src.includes('useTires')) {
    warnings.push('TireInventory imports inventory hooks but static audit could not verify runtime usage depth.');
  }
}

console.log('\nPHASE 3 QA AUDIT: OPERATIONS CORE');
console.log('=================================');
results.forEach((r) => console.log(`${r.status}: ${r.msg}`));

if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach((w) => console.log(`WARN: ${w}`));
}

const failCount = results.filter((x) => x.status === 'FAIL').length;
console.log(`\nSUMMARY: ${results.length - failCount} PASS / ${failCount} FAIL / ${warnings.length} WARN`);
console.log(`RESULT: ${failCount > 0 ? 'FAIL' : 'PASS'}`);
process.exit(failCount > 0 ? 1 : 0);
