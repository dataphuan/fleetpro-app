#!/usr/bin/env node
/**
 * Online Backend Health Check Script
 * Validates that the Apps Script backend is properly configured and responding
 * 
 * Usage: node scripts/online-health-check.js [--webapp URL] [--verbose]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  content.split('\n').forEach(line => {
    if (!line || line.startsWith('#')) return;
    const [key, val] = line.split('=');
    if (key && val) result[key.trim()] = val.trim();
  });
  return result;
}

async function getFetch() {
  if (typeof fetch === 'function') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

async function fetchJson(url, options = {}) {
  const fetchFn = await getFetch();
  const response = await fetchFn(url, options);
  const text = await response.text();
  try {
    return { ok: response.ok, status: response.status, data: JSON.parse(text) };
  } catch {
    return { ok: response.ok, status: response.status, data: { raw: text } };
  }
}

async function run() {
  const args = parseArgs(process.argv);
  const verbose = args.verbose === 'true';

  // Load env
  const projectRoot = path.resolve(__dirname, '..');
  const envCandidates = [
    path.join(projectRoot, '.env'),
    path.join(process.cwd(), '1-ONLINE', '.env'),
    path.join(process.cwd(), '.env'),
  ];
  const dotEnv = envCandidates.reduce((acc, filePath) => {
    if (acc.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL) return acc;
    return parseDotEnv(filePath);
  }, {});
  const webappUrl = args.webapp || process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL || dotEnv.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;

  if (!webappUrl) {
    console.error('❌ Error: Missing VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL');
    console.error('   Set via: --webapp <URL> or 1-ONLINE/.env');
    process.exit(2);
  }

  console.log('🔍 Online Backend Health Check');
  console.log(`📍 Endpoint: ${webappUrl.substring(0, 60)}...`);
  console.log('');

  const checks = [];

  // Check 1: Connectivity
  try {
    const res = await fetchJson(`${webappUrl}?action=list&resource=trips&tenant_id=test-health-check`);
    if (res.ok || res.status === 200) {
      checks.push({ name: '✅ Endpoint Responsive', pass: true });
    } else {
      checks.push({ name: '❌ Endpoint Responds with Error', pass: false, detail: res.status });
    }
    if (verbose) console.log('  Status:', res.status, res.data);
  } catch (err) {
    checks.push({ name: '❌ Endpoint Unreachable', pass: false, detail: err.message });
    console.error('Network error:', err.message);
    process.exit(1);
  }

  // Check 2: GET parameter parsing
  try {
    const res = await fetchJson(`${webappUrl}?action=list&resource=trips&tenant_id=internal-test&limit=1`);
    if (Array.isArray(res.data) || res.data.status) {
      checks.push({ name: '✅ GET Parameter Parsing', pass: true });
    } else {
      checks.push({ name: '⚠️  GET Parameter Parsing (Unexpected Response)', pass: false, detail: typeof res.data });
    }
    if (verbose) console.log('  Response type:', typeof res.data, Array.isArray(res.data) ? 'array' : 'object');
  } catch (err) {
    checks.push({ name: '❌ GET Request Failed', pass: false, detail: err.message });
  }

  // Check 3: POST capability
  try {
    const res = await fetchJson(webappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'health', test: true })
    });
    if (res.ok || res.status === 200 || res.data.status) {
      checks.push({ name: '✅ POST Handler Available', pass: true });
    } else {
      checks.push({ name: '⚠️  POST Handler (Different Status)', pass: false, detail: res.status });
    }
    if (verbose) console.log('  Response:', res.data);
  } catch (err) {
    checks.push({ name: '⚠️  POST Handler (Connection Issue)', pass: false, detail: err.message });
  }

  // Check 4: Error handling
  try {
    const res = await fetchJson(`${webappUrl}?action=invalid-action-test&tenant_id=test`);
    if (res.data.status === 'error' || res.data.message === 'Unknown action') {
      checks.push({ name: '✅ Error Handling Present', pass: true });
    } else {
      checks.push({ name: '⚠️  Error Handling (Different Response)', pass: false, detail: res.data.status });
    }
    if (verbose) console.log('  Error response:', res.data);
  } catch (err) {
    checks.push({ name: '⚠️  Error Handling (Network Issue)', pass: false, detail: err.message });
  }

  // Print results
  console.log('Test Results:');
  console.log('─'.repeat(50));
  checks.forEach((check, idx) => {
    const status = check.pass ? '✅' : '❌';
    console.log(`${idx + 1}. ${check.name}`);
    if (check.detail) console.log(`   Detail: ${check.detail}`);
  });

  const passed = checks.filter(c => c.pass).length;
  const total = checks.length;
  console.log('─'.repeat(50));
  console.log(`Result: ${passed}/${total} checks passed`);

  if (passed === total) {
    console.log('✅ Backend appears healthy. Ready for testing.');
    process.exit(0);
  } else if (passed >= total - 1) {
    console.log('⚠️  Backend mostly working but has minor issues.');
    process.exit(0);
  } else {
    console.log('❌ Backend has significant issues. Check configuration.');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Health check failed:', err.message);
  process.exit(1);
});
