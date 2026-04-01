#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sidebarPath = path.join(root, 'src', 'components', 'layout', 'AppSidebar.tsx');
const appPath = path.join(root, 'src', 'App.tsx');

const mustExistPages = [
  'src/pages/Vehicles.tsx',
  'src/pages/Drivers.tsx',
  'src/pages/Routes.tsx',
  'src/pages/Customers.tsx',
];

const mustExistRoutes = ['/vehicles', '/drivers', '/routes', '/customers'];
const mustOperationalRoutes = ['/trips', '/expenses', '/dispatch', '/transport-orders', '/reports'];

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

const sidebarSrc = read(sidebarPath);
const appSrc = read(appPath);

const results = [];
const warnings = [];

const check = (ok, passMsg, failMsg) => {
  results.push({ status: ok ? 'PASS' : 'FAIL', msg: ok ? passMsg : failMsg });
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

const navPaths = getNavPaths(sidebarSrc);
const routePaths = getRoutePaths(appSrc);

for (const p of mustExistPages) {
  check(exists(p), `Page exists: ${p}`, `Missing page file: ${p}`);
}

for (const r of mustExistRoutes) {
  check(navPaths.includes(r), `Master menu path exists: ${r}`, `Missing master menu path: ${r}`);
  check(routePaths.includes(r), `Master route exists: ${r}`, `Missing master route: ${r}`);
}

const hasMasterHooks =
  sidebarSrc.includes('useVehicles') &&
  sidebarSrc.includes('useDrivers') &&
  sidebarSrc.includes('useRoutes') &&
  sidebarSrc.includes('useCustomers');
check(hasMasterHooks, 'Master hooks imported in AppSidebar.', 'Master hooks are not fully imported in AppSidebar.');

const hasMasterDataExpr =
  sidebarSrc.includes('(vehicles?.length || 0) > 0') &&
  sidebarSrc.includes('(drivers?.length || 0) > 0') &&
  sidebarSrc.includes('(routes?.length || 0) > 0') &&
  sidebarSrc.includes('(customers?.length || 0) > 0');
check(hasMasterDataExpr, 'hasMasterData expression checks all 4 master lists.', 'hasMasterData expression is missing one or more master checks.');

const opTabMatch = sidebarSrc.match(/const\s+isOperationalTab\s*=\s*\[([^\]]+)\]\.includes\(item\.path\)/);
if (!opTabMatch) {
  check(false, '', 'isOperationalTab dependency gate expression not found.');
} else {
  const list = [...opTabMatch[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  const missingOps = mustOperationalRoutes.filter((r) => !list.includes(r));
  check(
    missingOps.length === 0,
    'Operational dependency gate covers required operational routes.',
    `Operational dependency gate missing routes: ${missingOps.join(', ')}`,
  );

  if (list.includes('/dashboard') && !navPaths.includes('/dashboard')) {
    warnings.push('isOperationalTab includes /dashboard but nav uses /. Consider normalizing.');
  }
}

const hasMissingDependency = sidebarSrc.includes('const isMissingDependency = isOperationalTab && !hasMasterData;');
check(hasMissingDependency, 'isMissingDependency gate is defined.', 'isMissingDependency gate definition not found.');

const hasDependencyToast = sidebarSrc.includes('Chưa đủ dữ liệu nền') && sidebarSrc.includes('Vui lòng nhập danh sách Xe, Tài xế, Tuyến đường và Khách hàng');
check(hasDependencyToast, 'Dependency gate toast message is present.', 'Dependency gate toast message is missing.');

console.log('\nPHASE 2 QA AUDIT: MASTER DATA + DEPENDENCY GATE');
console.log('===============================================');
results.forEach((r) => console.log(`${r.status}: ${r.msg}`));

if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach((w) => console.log(`WARN: ${w}`));
}

const failCount = results.filter((x) => x.status === 'FAIL').length;
console.log(`\nSUMMARY: ${results.length - failCount} PASS / ${failCount} FAIL / ${warnings.length} WARN`);
console.log(`RESULT: ${failCount > 0 ? 'FAIL' : 'PASS'}`);
process.exit(failCount > 0 ? 1 : 0);
