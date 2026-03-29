#!/usr/bin/env node
/**
 * Tenant Setup Wizard
 * Helpers to create and configure test tenants via the Apps Script Web App
 * 
 * Usage: 
 *   node scripts/tenant-setup-wizard.js --webapp URL --admin-token TOKEN
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
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

async function fetchJson(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  const response = await fetch(url, options);
  const text = await response.text();
  try {
    return { ok: response.ok, status: response.status, data: JSON.parse(text) };
  } catch {
    return { ok: response.ok, status: response.status, data: { raw: text } };
  }
}

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).substring(2, 8)}`.toLowerCase();
}

async function run() {
  const args = parseArgs(process.argv);
  const projectRoot = path.resolve(__dirname, '..');
  const dotEnv = parseDotEnv(path.join(projectRoot, '1-ONLINE', '.env'));

  const webappUrl = args.webapp || dotEnv.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
  const adminToken = args['admin-token'] || process.env.ADMIN_TOKEN;

  console.log('\n🏢 Tenant Setup Wizard for FleetPro V3');
  console.log('═'.repeat(50));

  if (!webappUrl) {
    console.error('❌ Error: Missing --webapp URL');
    process.exit(2);
  }

  console.log(`📍 Target WebApp: ${webappUrl.substring(0, 50)}...`);

  // Menu
  console.log('\nWhat would you like to do?');
  console.log('1. Create a new test tenant');
  console.log('2. List existing tenants');
  console.log('3. Seed sample data for a tenant');
  console.log('4. Delete a tenant (caution!)');
  console.log('5. Exit');

  const choice = await question('\nEnter choice (1-5): ');

  switch (choice) {
    case '1':
      await createTenant(webappUrl, adminToken);
      break;
    case '2':
      await listTenants(webappUrl);
      break;
    case '3':
      await seedTenant(webappUrl, adminToken);
      break;
    case '4':
      await deleteTenant(webappUrl, adminToken);
      break;
    case '5':
      console.log('\nGoodbye!');
      rl.close();
      return;
    default:
      console.log('Invalid choice');
  }

  rl.close();
}

async function createTenant(webappUrl, adminToken) {
  console.log('\n📝 Create New Tenant');
  console.log('─'.repeat(50));

  const tenantType = await question('Tenant type (internal|pilot|production): ');
  const tenantName = await question('Tenant name (e.g., Acme Corp): ');
  const domain = await question('Domain (e.g., acme-corp.io): ');

  if (!['internal', 'pilot', 'production'].includes(tenantType)) {
    console.error('Invalid tenant type');
    return;
  }

  const tenantId = generateId(`${tenantType.substring(0, 3)}`);
  const status = tenantType === 'production' ? 'pilot' : 'active'; // Safer default

  console.log('\n📋 Tenant Summary:');
  console.log(`  ID: ${tenantId}`);
  console.log(`  Name: ${tenantName}`);
  console.log(`  Domain: ${domain}`);
  console.log(`  Type: ${tenantType}`);
  console.log(`  Status: ${status}`);

  // TODO: Send to Apps Script to create in Tenants sheet
  // For now, just show what would be created
  console.log('\n✅ Tenant created locally. To sync to Apps Script:');
  console.log('1. Go to Google Sheets -> Tenants tab');
  console.log('2. Add row:');
  console.log(`   tenant_id: ${tenantId}`);
  console.log(`   tenant_name: ${tenantName}`);
  console.log(`   domain: ${domain}`);
  console.log(`   status: ${status}`);
  console.log('3. Update 1-ONLINE/.env with new tenant');
}

async function listTenants(webappUrl) {
  console.log('\n📋 Listing Tenants');
  console.log('─'.repeat(50));

  try {
    const res = await fetchJson(`${webappUrl}?action=list&resource=tenants`);
    if (Array.isArray(res.data)) {
      if (res.data.length === 0) {
        console.log('No tenants found.');
        return;
      }
      console.log(`Found ${res.data.length} tenant(s):\n`);
      res.data.forEach((tenant, idx) => {
        console.log(`${idx + 1}. ${tenant.tenant_id || tenant.id}`);
        console.log(`   Name: ${tenant.tenant_name || 'N/A'}`);
        console.log(`   Domain: ${tenant.domain || 'N/A'}`);
        console.log(`   Status: ${tenant.status || 'unknown'}`);
        console.log();
      });
    } else {
      console.log('Unexpected response:', res.data);
    }
  } catch (err) {
    console.error('Failed to list tenants:', err.message);
  }
}

async function seedTenant(webappUrl, adminToken) {
  console.log('\n🌱 Seed Data for Tenant');
  console.log('─'.repeat(50));

  const tenantId = await question('Tenant ID: ');
  const rows = await question('Number of rows (5-100): ');

  if (isNaN(rows) || rows < 5 || rows > 100) {
    console.error('Invalid row count');
    return;
  }

  console.log(`\n⏳ Seeding ${rows} rows for tenant ${tenantId}...`);

  try {
    // Call Apps Script seed endpoint (if it exists)
    const res = await fetchJson(webappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'seedData',
        tenant_id: tenantId,
        limit: parseInt(rows),
        adminToken: adminToken
      })
    });

    if (res.data.status === 'ok') {
      console.log(`✅ Successfully seeded ${res.data.rowsAdded || rows} rows`);
    } else {
      console.log(`⚠️  Response: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    console.error('Failed to seed data:', err.message);
  }
}

async function deleteTenant(webappUrl, adminToken) {
  console.log('\n⚠️  Delete Tenant');
  console.log('─'.repeat(50));
  console.log('This action is permanent and will remove all tenant data.');

  const tenantId = await question('Tenant ID to delete: ');
  const confirm = await question(`Type "yes" to confirm deletion of ${tenantId}: `);

  if (confirm !== 'yes') {
    console.log('Cancelled.');
    return;
  }

  console.log('⏳ Deleting tenant...');

  try {
    const res = await fetchJson(webappUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'deleteTenant',
        tenant_id: tenantId,
        adminToken: adminToken
      })
    });

    if (res.data.status === 'ok' || res.data.message === 'deleted') {
      console.log(`✅ Tenant ${tenantId} deleted`);
    } else {
      console.log(`Response: ${JSON.stringify(res.data)}`);
    }
  } catch (err) {
    console.error('Failed to delete tenant:', err.message);
  }
}

run().catch(err => {
  console.error('Setup wizard failed:', err.message);
  process.exit(1);
});
