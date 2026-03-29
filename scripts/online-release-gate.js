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
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      url.searchParams.set(key, String(params[key]));
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
  report.push({ name, status: 'PASS', details });
}

function fail(report, name, details) {
  report.push({ name, status: 'FAIL', details });
}

function skip(report, name, details) {
  report.push({ name, status: 'SKIP', details });
}

function isUnknownActionPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  return String(payload.message || '').toLowerCase().includes('unknown action');
}

function printReport(report) {
  console.log('\n=== ONLINE RELEASE GATE REPORT ===');
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

async function run() {
  const args = parseArgs(process.argv);
  const projectRoot = path.resolve(__dirname, '..');
  const localEnv = parseDotEnv(path.join(projectRoot, '.env'));

  const webapp = args.webapp || process.env.WEBAPP_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL || localEnv.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
  const tenantA = args['tenant-a'] || process.env.TENANT_A || localEnv.TENANT_A || args.tenant;
  const tenantB = args['tenant-b'] || process.env.TENANT_B || localEnv.TENANT_B || '';
  const unknownTenant = args['unknown-tenant'] || process.env.UNKNOWN_TENANT || 'unknown-tenant-zz';

  const userToken = args['user-token'] || process.env.TENANT_USER_TOKEN || localEnv.TENANT_USER_TOKEN || '';
  const editorToken = args['editor-token'] || process.env.TENANT_EDITOR_TOKEN || localEnv.TENANT_EDITOR_TOKEN || '';

  const report = [];

  if (!webapp || !tenantA) {
    console.error('Missing required args: --webapp <WEBAPP_URL> and --tenant-a <TENANT_ID|DOMAIN>.');
    console.error('Optional: --tenant-b --user-token --editor-token --unknown-tenant');
    process.exit(2);
  }

  const fetchFn = await getFetch();

  const cfgA = await httpGet(fetchFn, webapp, { action: 'tenant-config', tenant_id: tenantA });
  const tenantResolverSupported = !isUnknownActionPayload(cfgA.payload);

  if (!tenantResolverSupported) {
    skip(report, 'Tenant resolver active tenant', 'backend does not support action=tenant-config (legacy deployment)');
    skip(report, 'Fallback not-found', 'backend does not support tenant fallback contract; redeploy latest backend-gas.js to enable');
  } else {
    if (cfgA.payload.status === 'ok') {
      pass(report, 'Tenant resolver active tenant', `tenant=${tenantA}`);
    } else {
      fail(report, 'Tenant resolver active tenant', JSON.stringify(cfgA.payload));
    }

    const cfgUnknown = await httpGet(fetchFn, webapp, { action: 'tenant-config', tenant_id: unknownTenant });
    if (cfgUnknown.payload.status === 'error' && cfgUnknown.payload.fallback === 'not-found') {
      pass(report, 'Fallback not-found', `tenant=${unknownTenant}`);
    } else {
      fail(report, 'Fallback not-found', JSON.stringify(cfgUnknown.payload));
    }
  }

  const listTripsA = await httpGet(fetchFn, webapp, { action: 'list', resource: 'trips', tenant_id: tenantA });
  if (Array.isArray(listTripsA.payload)) {
    pass(report, 'List trips tenant A', `rows=${listTripsA.payload.length}`);
  } else {
    fail(report, 'List trips tenant A', JSON.stringify(listTripsA.payload));
  }

  if (tenantB) {
    const listTripsB = await httpGet(fetchFn, webapp, { action: 'list', resource: 'trips', tenant_id: tenantB });
    if (Array.isArray(listTripsB.payload)) {
      pass(report, 'List trips tenant B', `rows=${listTripsB.payload.length}`);
    } else {
      fail(report, 'List trips tenant B', JSON.stringify(listTripsB.payload));
    }

    const firstTripB = Array.isArray(listTripsB.payload) && listTripsB.payload[0] ? listTripsB.payload[0]['Mã chuyến'] : '';
    if (firstTripB) {
      const probeA = await httpGet(fetchFn, webapp, {
        action: 'get',
        resource: 'trips',
        tenant_id: tenantA,
        keyColumn: 'Mã chuyến',
        keyValue: firstTripB,
      });

      if (probeA.payload.status === 'error' || !probeA.payload['Mã chuyến']) {
        pass(report, 'Isolation read probe A->B key', `trip=${firstTripB}`);
      } else {
        fail(report, 'Isolation read probe A->B key', `leaked trip=${firstTripB}`);
      }
    } else {
      skip(report, 'Isolation read probe A->B key', 'tenant B has no trips to probe');
    }
  } else {
    skip(report, 'Tenant B isolation checks', 'provide --tenant-b to enable cross-tenant checks');
  }

  if (userToken) {
    const unauthorizedMutation = await httpPost(fetchFn, webapp, {
      type: 'confirmTrip',
      token: userToken,
      tenant_id: tenantA,
      id: 'NON_EXISTENT_TRIP',
    });

    if (unauthorizedMutation.payload.status === 'error') {
      pass(report, 'Role enforcement user token mutation', JSON.stringify(unauthorizedMutation.payload));
    } else {
      fail(report, 'Role enforcement user token mutation', JSON.stringify(unauthorizedMutation.payload));
    }
  } else {
    skip(report, 'Role enforcement user token mutation', 'provide --user-token to verify');
  }

  if (editorToken) {
    skip(report, 'Close-trip guard live mutation', 'not auto-executed to avoid mutating production data; run controlled test tenant flow manually');
  } else {
    skip(report, 'Close-trip guard live mutation', 'provide --editor-token and controlled test tenant to run manually');
  }

  // Phase-2 auth API contract checks.
  // We do not expect success here (credentials may be placeholder),
  // but we must ensure backend recognizes POST types.
  const loginProbe = await httpPost(fetchFn, webapp, {
    type: 'authLogin',
    tenant_id: tenantA,
    email: 'healthcheck@fleetpro.local',
    api_token: 'invalid-token-probe',
  });

  if (String(loginProbe?.payload?.message || '') === 'Unknown POST type') {
    fail(report, 'Phase-2 authLogin endpoint available', JSON.stringify(loginProbe.payload));
  } else {
    pass(report, 'Phase-2 authLogin endpoint available', JSON.stringify(loginProbe.payload));
  }

  const registerProbe = await httpPost(fetchFn, webapp, {
    type: 'registerUser',
    tenant_id: tenantA,
    user_id: 'qa-probe-user',
    email: 'qa-probe-user@fleetpro.local',
    display_name: 'QA Probe User',
    role: 'driver',
    status: 'active',
  });

  if (String(registerProbe?.payload?.message || '') === 'Unknown POST type') {
    fail(report, 'Phase-2 registerUser endpoint available', JSON.stringify(registerProbe.payload));
  } else {
    pass(report, 'Phase-2 registerUser endpoint available', JSON.stringify(registerProbe.payload));
  }

  const failed = printReport(report);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('Release gate script failed:', error.message || error);
  process.exit(1);
});
