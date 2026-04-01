#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sidebarPath = path.join(root, 'src', 'components', 'layout', 'AppSidebar.tsx');
const appPath = path.join(root, 'src', 'App.tsx');
const protectedRoutePath = path.join(root, 'src', 'components', 'auth', 'ProtectedRoute.tsx');
const driverLayoutPath = path.join(root, 'src', 'components', 'layout', 'DriverLayout.tsx');
const portalLayoutPath = path.join(root, 'src', 'components', 'layout', 'CustomerPortalLayout.tsx');

const APP_ROLES = ['admin', 'manager', 'dispatcher', 'accountant', 'driver', 'viewer'];

const read = (p) => fs.readFileSync(p, 'utf8');

const sidebarSrc = read(sidebarPath);
const appSrc = read(appPath);
const protectedSrc = read(protectedRoutePath);
const driverSrc = read(driverLayoutPath);
const portalSrc = read(portalLayoutPath);

const findings = [];
const warnings = [];

const assertPass = (ok, passMsg, failMsg) => {
  if (ok) {
    findings.push({ status: 'PASS', msg: passMsg });
  } else {
    findings.push({ status: 'FAIL', msg: failMsg });
  }
};

const getRoleMap = (src) => {
  const m = src.match(/const\s+roleAccessMap\s*:\s*Record<[^>]+>\s*=\s*\{([\s\S]*?)\};/);
  if (!m) return null;
  const body = m[1];
  const map = {};
  const pairRe = /"(\/[^"]*)"\s*:\s*\[([^\]]*)\]/g;
  let pm;
  while ((pm = pairRe.exec(body)) !== null) {
    const key = pm[1];
    const rolesRaw = pm[2];
    const roles = [...rolesRaw.matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
    map[key] = roles;
  }
  return map;
};

const getNavItems = (src) => {
  const items = [];
  const re = /\{\s*path:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    items.push({ path: m[1], label: m[2] });
  }
  return items;
};

const roleMap = getRoleMap(sidebarSrc);
const navItems = getNavItems(sidebarSrc);

assertPass(!!roleMap, 'Found roleAccessMap in AppSidebar.', 'Missing roleAccessMap in AppSidebar.');
assertPass(navItems.length > 0, `Found navItems (${navItems.length}).`, 'No navItems found in AppSidebar.');

if (roleMap) {
  const roleMapKeys = Object.keys(roleMap);
  const navPaths = navItems.map((x) => x.path);

  const navWithoutRole = navPaths.filter((p) => !roleMapKeys.includes(p));
  assertPass(
    navWithoutRole.length === 0,
    'All navItems are mapped in roleAccessMap.',
    `Nav items missing role mapping: ${navWithoutRole.join(', ')}`,
  );

  const invalidRoles = [];
  for (const [route, roles] of Object.entries(roleMap)) {
    const invalid = roles.filter((r) => !APP_ROLES.includes(r));
    if (invalid.length) {
      invalidRoles.push({ route, invalid });
    }
  }
  assertPass(
    invalidRoles.length === 0,
    'All roleAccessMap roles are valid domain roles.',
    `Invalid roles detected: ${invalidRoles.map((x) => `${x.route}=>${x.invalid.join('|')}`).join('; ')}`,
  );

  const rootRoles = roleMap['/'] || [];
  const missingAtRoot = APP_ROLES.filter((r) => !rootRoles.includes(r));
  assertPass(
    missingAtRoot.length === 0,
    'Dashboard route "/" allows all roles.',
    `Dashboard route missing roles: ${missingAtRoot.join(', ')}`,
  );

  const adminMissing = roleMapKeys.filter((k) => !(roleMap[k] || []).includes('admin'));
  assertPass(
    adminMissing.length === 0,
    'Admin has access to all roleAccessMap routes.',
    `Admin missing access on routes: ${adminMissing.join(', ')}`,
  );
}

const hasMainProtected = appSrc.includes('<ProtectedRoute>') && appSrc.includes('<AppLayout>');
assertPass(hasMainProtected, 'Main app routes are wrapped by ProtectedRoute.', 'Main app routes are not clearly protected by ProtectedRoute.');

const hasDriverProtected = appSrc.includes('path="/driver"') && appSrc.includes('<DriverLayout />') && appSrc.includes('<ProtectedRoute>');
assertPass(hasDriverProtected, 'Driver routes are under ProtectedRoute.', 'Driver route protection is missing or malformed.');

const hasPortalProtected = appSrc.includes('path="/portal"') && appSrc.includes('<CustomerPortalLayout />') && appSrc.includes('<ProtectedRoute>');
assertPass(hasPortalProtected, 'Portal routes are under ProtectedRoute.', 'Portal route protection is missing or malformed.');

const hasAuthBypassInProtected = protectedSrc.includes('if (!userId)') && protectedSrc.includes('Navigate to="/auth"');
assertPass(hasAuthBypassInProtected, 'ProtectedRoute redirects unauthenticated users to /auth.', 'ProtectedRoute unauthenticated redirect not found.');

const driverRoleGate = driverSrc.match(/if\s*\(!\[([^\]]+)\]\.includes\(normalizedRole\)\)/);
if (driverRoleGate) {
  const roles = [...driverRoleGate[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  const invalid = roles.filter((r) => !APP_ROLES.includes(r));
  assertPass(
    invalid.length === 0,
    `Driver layout gate roles are valid: ${roles.join(', ')}`,
    `Driver layout has invalid gate role(s): ${invalid.join(', ')}`,
  );
  if (!roles.includes('driver')) {
    warnings.push('DriverLayout role gate does not include role "driver".');
  }
}

const portalRoleGate = portalSrc.match(/if\s*\(!\[([^\]]+)\]\.includes\(normalizedRole\)\)/);
if (portalRoleGate) {
  const roles = [...portalRoleGate[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  const invalid = roles.filter((r) => !APP_ROLES.includes(r));
  assertPass(
    invalid.length === 0,
    `Portal layout gate roles are valid: ${roles.join(', ')}`,
    `Portal layout has invalid gate role(s): ${invalid.join(', ')}`,
  );
}

console.log('\nPHASE 1 QA AUDIT: RBAC + AUTH + NAV');
console.log('===================================');

findings.forEach((f) => {
  const icon = f.status === 'PASS' ? 'PASS' : 'FAIL';
  console.log(`${icon}: ${f.msg}`);
});

if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach((w) => console.log(`WARN: ${w}`));
}

const failCount = findings.filter((x) => x.status === 'FAIL').length;
console.log(`\nSUMMARY: ${findings.length - failCount} PASS / ${failCount} FAIL / ${warnings.length} WARN`);
console.log(`RESULT: ${failCount > 0 ? 'FAIL' : 'PASS'}`);

process.exit(failCount > 0 ? 1 : 0);
