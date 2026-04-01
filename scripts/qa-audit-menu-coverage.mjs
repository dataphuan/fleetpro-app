#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sidebarPath = path.join(root, 'src', 'components', 'layout', 'AppSidebar.tsx');
const appPath = path.join(root, 'src', 'App.tsx');
const driverLayoutPath = path.join(root, 'src', 'components', 'layout', 'DriverLayout.tsx');

const read = (file) => fs.readFileSync(file, 'utf8');

const sidebarSrc = read(sidebarPath);
const appSrc = read(appPath);
const driverLayoutSrc = read(driverLayoutPath);

const unique = (arr) => [...new Set(arr)];

const normalizeRoute = (p) => {
  if (!p || p === '*') return p;
  if (p.startsWith('/')) return p;
  return `/${p}`;
};

const extractMenuPaths = (src) => {
  const out = [];
  const re = /\{\s*path:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({ path: m[1], label: m[2] });
  }
  return out;
};

const extractRoleMapKeys = (src) => {
  const out = [];
  const re = /"(\/[^"]*)"\s*:\s*\[/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push(m[1]);
  }
  return unique(out);
};

const extractRoutePaths = (src) => {
  const out = [];
  const raw = [];
  const re = /<Route\s+path="([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    raw.push(m[1]);
    const normalized = normalizeRoute(m[1]);
    if (normalized && normalized !== '*') out.push(normalized);
  }

  // Resolve common nested relative routes against known absolute parent route bases.
  const absoluteBases = unique(raw.filter((p) => p.startsWith('/')));
  const relativePaths = unique(raw.filter((p) => p && !p.startsWith('/') && p !== '*'));

  relativePaths.forEach((rel) => {
    // Root-level nested routes under main app layout.
    out.push(`/${rel}`);

    // Nested routes under absolute bases like /driver, /portal, etc.
    absoluteBases.forEach((base) => {
      const joined = `${base.replace(/\/$/, '')}/${rel}`;
      out.push(joined);
    });
  });

  return unique(out);
};

const extractDriverMenuPaths = (src) => {
  const out = [];
  const re = /<Link\s+to="([^"]+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const p = normalizeRoute(m[1]);
    if (p) out.push(p);
  }
  return unique(out);
};

const menuItems = extractMenuPaths(sidebarSrc);
const menuPaths = unique(menuItems.map((i) => i.path));
const roleKeys = extractRoleMapKeys(sidebarSrc);
const routePaths = extractRoutePaths(appSrc);
const driverMenuPaths = extractDriverMenuPaths(driverLayoutSrc);

const missingRouteForMenu = menuItems.filter((item) => !routePaths.includes(item.path));
const missingRoleForMenu = menuItems.filter((item) => !roleKeys.includes(item.path));
const roleWithoutRoute = roleKeys.filter((key) => !routePaths.includes(key));
const driverMenuWithoutRoute = driverMenuPaths.filter((p) => !routePaths.includes(p));

console.log('\nQA AUDIT: MENU COVERAGE');
console.log('=======================');
console.log(`Menu items: ${menuItems.length}`);
console.log(`Driver menu items: ${driverMenuPaths.length}`);
console.log(`Role access entries: ${roleKeys.length}`);
console.log(`Declared routes: ${routePaths.length}`);

if (missingRouteForMenu.length === 0) {
  console.log('\nPASS: All menu paths have matching routes.');
} else {
  console.log('\nFAIL: Menu paths without route:');
  missingRouteForMenu.forEach((x) => console.log(`- ${x.path} (${x.label})`));
}

if (missingRoleForMenu.length === 0) {
  console.log('PASS: All menu paths have role access mapping.');
} else {
  console.log('FAIL: Menu paths without role access mapping:');
  missingRoleForMenu.forEach((x) => console.log(`- ${x.path} (${x.label})`));
}

if (roleWithoutRoute.length === 0) {
  console.log('PASS: All role map keys have matching routes.');
} else {
  console.log('WARN: Role map keys without matching routes:');
  roleWithoutRoute.forEach((x) => console.log(`- ${x}`));
}

if (driverMenuWithoutRoute.length === 0) {
  console.log('PASS: All driver menu paths have matching routes.');
} else {
  console.log('FAIL: Driver menu paths without route:');
  driverMenuWithoutRoute.forEach((x) => console.log(`- ${x}`));
}

const hasBlockingFail =
  missingRouteForMenu.length > 0 ||
  missingRoleForMenu.length > 0 ||
  driverMenuWithoutRoute.length > 0;
console.log(`\nRESULT: ${hasBlockingFail ? 'FAIL' : 'PASS'}`);
process.exit(hasBlockingFail ? 1 : 0);
