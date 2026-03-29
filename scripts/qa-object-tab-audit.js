#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function parseDotEnv(dotEnvPath) {
  const values = {};
  if (!fs.existsSync(dotEnvPath)) return values;

  const raw = fs.readFileSync(dotEnvPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const value = line.trim();
    if (!value || value.startsWith('#')) return;
    const split = value.indexOf('=');
    if (split < 0) return;

    const key = value.slice(0, split).trim();
    const val = value.slice(split + 1).trim();
    values[key] = val;
  });

  return values;
}

async function getFetch() {
  if (typeof fetch === 'function') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

async function httpGet(fetchFn, webappUrl, params) {
  const url = new URL(webappUrl);
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetchFn(url.toString(), { method: 'GET' });
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (_err) {
    payload = { raw: text };
  }

  return { ok: response.ok, status: response.status, payload, url: url.toString() };
}

async function httpPost(fetchFn, webappUrl, body) {
  const response = await fetchFn(webappUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (_err) {
    payload = { raw: text };
  }

  return { ok: response.ok, status: response.status, payload };
}

function pass(report, name, details) {
  report.push({ status: 'PASS', name, details });
}

function fail(report, name, details) {
  report.push({ status: 'FAIL', name, details });
}

function skip(report, name, details) {
  report.push({ status: 'SKIP', name, details });
}

function printReport(report) {
  console.log('\n=== QA OBJECT-TAB AUDIT REPORT ===');
  report.forEach((item) => {
    console.log(`[${item.status}] ${item.name}`);
    if (item.details) console.log(`  -> ${item.details}`);
  });

  const failed = report.filter((entry) => entry.status === 'FAIL').length;
  const passed = report.filter((entry) => entry.status === 'PASS').length;
  const skipped = report.filter((entry) => entry.status === 'SKIP').length;

  console.log('\nSummary:', { passed, failed, skipped });
  return failed;
}

function isUnknownActionPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return String(payload.message || '').toLowerCase().includes('unknown action');
}

function hasForbidden(payload) {
  return String(payload?.message || '').toLowerCase().includes('forbidden');
}

async function run() {
  const args = parseArgs(process.argv);
  const projectRoot = path.resolve(__dirname, '..');
  const localEnv = parseDotEnv(path.join(projectRoot, '.env'));

  const webappA = args['webapp-a'] || args.webapp || process.env.WEBAPP_A || process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL || localEnv.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
  const tenantA = args['tenant-a'] || process.env.TENANT_A || localEnv.TENANT_A;

  const webappB = args['webapp-b'] || process.env.WEBAPP_B || '';
  const tenantB = args['tenant-b'] || process.env.TENANT_B || localEnv.TENANT_B || '';

  const adminToken = args['admin-token'] || process.env.ADMIN_TOKEN || localEnv.ADMIN_TOKEN || '';
  const tenantAdminToken = args['tenant-admin-token'] || process.env.TENANT_ADMIN_TOKEN || localEnv.TENANT_ADMIN_TOKEN || '';
  const tenantEditorToken = args['tenant-editor-token'] || process.env.TENANT_EDITOR_TOKEN || localEnv.TENANT_EDITOR_TOKEN || '';
  const tenantUserToken = args['tenant-user-token'] || process.env.TENANT_USER_TOKEN || localEnv.TENANT_USER_TOKEN || '';

  if (!webappA || !tenantA) {
    console.error('Missing required args: --webapp-a (or --webapp) and --tenant-a');
    process.exit(2);
  }

  const fetchFn = await getFetch();
  const report = [];

  const tabResourceMap = [
    { tab: 'vehicles', resource: 'vehicles' },
    { tab: 'drivers', resource: 'drivers' },
    { tab: 'customers', resource: 'customers' },
    { tab: 'routes', resource: 'routes' },
    { tab: 'trips', resource: 'trips' },
    { tab: 'expenses', resource: 'expenses' },
    { tab: 'maintenance', resource: 'maintenance' },
  ];

  const cfgA = await httpGet(fetchFn, webappA, { action: 'tenant-config', tenant_id: tenantA });
  if (isUnknownActionPayload(cfgA.payload)) {
    skip(report, 'Tenant A identity profile', 'backend legacy: action=tenant-config not supported');
  } else if (cfgA.payload.status === 'ok') {
    pass(report, 'Tenant A identity profile', `tenant=${cfgA.payload.tenant_id}; app_name=${cfgA.payload.app_name || ''}; color=${cfgA.payload.primary_color || ''}`);
  } else {
    fail(report, 'Tenant A identity profile', JSON.stringify(cfgA.payload));
  }

  for (const item of tabResourceMap) {
    const res = await httpGet(fetchFn, webappA, { action: 'list', resource: item.resource, tenant_id: tenantA });
    if (Array.isArray(res.payload)) {
      pass(report, `Tab ${item.tab} data source`, `resource=${item.resource}; rows=${res.payload.length}`);
    } else {
      fail(report, `Tab ${item.tab} data source`, JSON.stringify(res.payload));
    }
  }

  if (tenantUserToken) {
    const userMut = await httpPost(fetchFn, webappA, {
      type: 'confirmTrip',
      token: tenantUserToken,
      tenant_id: tenantA,
      id: 'NON_EXISTENT_TRIP',
    });

    if (hasForbidden(userMut.payload)) {
      pass(report, 'Role user_tenant mutation denied', JSON.stringify(userMut.payload));
    } else {
      fail(report, 'Role user_tenant mutation denied', JSON.stringify(userMut.payload));
    }
  } else {
    skip(report, 'Role user_tenant mutation denied', 'provide --tenant-user-token');
  }

  if (tenantEditorToken) {
    const editorMut = await httpPost(fetchFn, webappA, {
      type: 'confirmTrip',
      token: tenantEditorToken,
      tenant_id: tenantA,
      id: 'NON_EXISTENT_TRIP',
    });

    if (hasForbidden(editorMut.payload)) {
      fail(report, 'Role editor_tenant mutation permission', JSON.stringify(editorMut.payload));
    } else {
      pass(report, 'Role editor_tenant mutation permission', JSON.stringify(editorMut.payload));
    }
  } else {
    skip(report, 'Role editor_tenant mutation permission', 'provide --tenant-editor-token');
  }

  if (adminToken || tenantAdminToken) {
    const adminLikeToken = adminToken || tenantAdminToken;
    const listUserAccounts = await httpGet(fetchFn, webappA, {
      action: 'list',
      resource: 'useraccounts',
      tenant_id: tenantA,
      token: adminLikeToken,
    });

    if (Array.isArray(listUserAccounts.payload)) {
      pass(report, 'Admin account sheet access (User Account)', `rows=${listUserAccounts.payload.length}`);
    } else {
      fail(report, 'Admin account sheet access (User Account)', JSON.stringify(listUserAccounts.payload));
    }
  } else {
    skip(report, 'Admin account sheet access (User Account)', 'provide --admin-token or --tenant-admin-token');
  }

  if (tenantUserToken) {
    const userListAccounts = await httpGet(fetchFn, webappA, {
      action: 'list',
      resource: 'useraccounts',
      tenant_id: tenantA,
      token: tenantUserToken,
    });
    if (userListAccounts.payload?.status === 'error' && hasForbidden(userListAccounts.payload)) {
      pass(report, 'Non-admin blocked from User Account sheet', JSON.stringify(userListAccounts.payload));
    } else {
      fail(report, 'Non-admin blocked from User Account sheet', JSON.stringify(userListAccounts.payload));
    }
  } else {
    skip(report, 'Non-admin blocked from User Account sheet', 'provide --tenant-user-token');
  }

  if (webappB && tenantB) {
    if (String(webappA).trim() === String(webappB).trim()) {
      fail(report, 'Multi-webapp isolation topology', 'webapp-a and webapp-b are identical, expected separate Apps Script endpoints');
    } else {
      pass(report, 'Multi-webapp isolation topology', 'tenant A and tenant B use different Apps Script endpoints');
    }

    const cfgB = await httpGet(fetchFn, webappB, { action: 'tenant-config', tenant_id: tenantB });
    if (isUnknownActionPayload(cfgA.payload) || isUnknownActionPayload(cfgB.payload)) {
      skip(report, 'Tenant A/B UI profile difference', 'backend legacy: tenant-config not supported on one of endpoints');
    } else if (cfgA.payload.status === 'ok' && cfgB.payload.status === 'ok') {
      const differs =
        String(cfgA.payload.app_name || '') !== String(cfgB.payload.app_name || '') ||
        String(cfgA.payload.primary_color || '') !== String(cfgB.payload.primary_color || '') ||
        String(cfgA.payload.domain || '') !== String(cfgB.payload.domain || '') ||
        String(cfgA.payload.spreadsheet_id || '') !== String(cfgB.payload.spreadsheet_id || '');
      if (differs) {
        pass(report, 'Tenant A/B UI profile difference', 'tenant identity fields differ as expected');
      } else {
        fail(report, 'Tenant A/B UI profile difference', 'tenant identity fields are identical; check branding config');
      }
    } else {
      fail(report, 'Tenant A/B UI profile difference', JSON.stringify({ tenantA: cfgA.payload, tenantB: cfgB.payload }));
    }
  } else {
    skip(report, 'Multi-tenant cross-webapp checks', 'provide --webapp-b and --tenant-b');
  }

  const failed = printReport(report);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('QA object-tab audit failed:', error.message || error);
  process.exit(1);
});
