#!/usr/bin/env node
/**
 * Admin SDK Direct Seed — Bypass Firestore Rules
 * Usage: node scripts/admin-seed-demo.mjs [tenantId]
 * Default: seeds BOTH internal-tenant-1 and internal-tenant-phuan
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const SA_PATH = path.join(root, 'fleetpro-app-service-account.json');
const SEED_PATH = path.join(root, 'scripts', 'tenantDemoSeed.json');

if (!fs.existsSync(SA_PATH)) {
  console.error('❌ Service account not found:', SA_PATH);
  process.exit(1);
}
if (!fs.existsSync(SEED_PATH)) {
  console.error('❌ Seed JSON not found. Run: node scripts/generate-tenant-demo-seed.mjs');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const SEED = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

const TENANT_CONFIG = {
  'internal-tenant-1': {
    companyName: 'Công ty Vận Tải FleetPro Demo',
    adminEmail: 'admindemo@tnc.io.vn',
    adminName: 'Admin Hệ Thống',
    driverEmail: 'taixedemo@tnc.io.vn',
  },
  'internal-tenant-phuan': {
    companyName: 'Công ty TNHH Phú An',
    adminEmail: 'admin@phuancr.com',
    adminName: 'Admin Phú An',
    driverEmail: 'taixe1@phuancr.com',
  },
};

const toDocId = (tenantId, collectionName, sourceId) => {
  const clean = String(sourceId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${tenantId}_${collectionName}_${clean}`;
};

const resolveRef = (tenantId, field, value) => {
  const relationMap = {
    vehicle_id: 'vehicles', vehicleId: 'vehicles',
    driver_id: 'drivers', driverId: 'drivers',
    customer_id: 'customers', customerId: 'customers',
    route_id: 'routes', routeId: 'routes',
    trip_id: 'trips', tripId: 'trips',
    category_id: 'expenseCategories',
    item_id: 'inventory',
    current_vehicle_id: 'vehicles',
    expense_id: 'expenses',
    assigned_vehicle_id: 'vehicles',
    default_driver_id: 'drivers',
    assigned_driver_id: 'drivers',
  };
  if (!value || typeof value !== 'string') return value;
  const targetCollection = relationMap[field];
  if (!targetCollection) return value;
  if (value.startsWith(`${tenantId}_`)) return value;
  return toDocId(tenantId, targetCollection, value);
};

async function wipeTenant(tenantId) {
  const collections = [
    'vehicles', 'drivers', 'customers', 'routes', 'trips', 'expenses',
    'transportOrders', 'maintenance', 'inventory', 'inventoryTransactions',
    'tires', 'purchaseOrders', 'alerts', 'trip_location_logs',
    'expenseCategories', 'accountingPeriods', 'partners', 'costs',
    'companySettings',
  ];

  let totalDeleted = 0;
  for (const collName of collections) {
    try {
      const snap = await db.collection(collName)
        .where('tenant_id', '==', tenantId)
        .get();
      if (snap.empty) continue;

      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      totalDeleted += snap.size;
      console.log(`   🗑️  ${collName}: deleted ${snap.size}`);
    } catch (err) {
      console.warn(`   ⚠️  ${collName}: skip (${err.code || err.message})`);
    }
  }

  // Also delete the company_settings doc
  try { await db.collection('company_settings').doc(tenantId).delete(); } catch {}

  console.log(`   ✅ Wipe complete: ${totalDeleted} docs deleted`);
}

async function seedTenant(tenantId) {
  const config = TENANT_CONFIG[tenantId];
  if (!config) {
    console.error(`❌ Unknown tenant: ${tenantId}`);
    return;
  }

  const nowIso = new Date().toISOString();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 SEED: ${tenantId} — ${config.companyName}`);
  console.log(`${'='.repeat(60)}`);

  // Step 1: Wipe existing data
  console.log(`\n🧹 Step 1: Wiping existing data...`);
  await wipeTenant(tenantId);

  // Step 2: Prepare seed rows
  console.log(`\n📦 Step 2: Preparing seed data...`);
  const allWrites = [];

  for (const [collectionName, rows] of Object.entries(SEED.collections)) {
    if (collectionName === 'users') continue; // Users managed via Firebase Auth

    const processedRows = (rows).map(row => {
      const sourceId = String(row.id || '');
      const payload = { ...row };
      delete payload.id;

      // Resolve foreign keys
      Object.keys(payload).forEach(field => {
        payload[field] = resolveRef(tenantId, field, payload[field]);
      });

      // Stamp tenant + audit
      payload.tenant_id = tenantId;
      payload.created_at = payload.created_at || nowIso;
      payload.updated_at = payload.updated_at || nowIso;
      payload.is_deleted = 0;

      // Fix driver[0] email to match tenant config
      if (collectionName === 'drivers' && sourceId === 'TX0001') {
        payload.email = config.driverEmail;
      }

      // Fix company settings
      if (collectionName === 'companySettings') {
        payload.company_name = config.companyName;
        payload.email = config.adminEmail;
        payload.subscription = {
          plan: 'enterprise',
          status: 'active',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }

      const targetCollection = collectionName === 'companySettings' ? 'company_settings' : collectionName;
      const targetDocId = collectionName === 'companySettings' ? tenantId : toDocId(tenantId, collectionName, sourceId);

      return { targetCollection, docId: targetDocId, data: payload };
    });

    allWrites.push(...processedRows);
  }

  // Step 3: Batch write
  console.log(`\n📝 Step 3: Writing ${allWrites.length} docs to Firestore...`);
  const BATCH_SIZE = 450;
  for (let i = 0; i < allWrites.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = allWrites.slice(i, i + BATCH_SIZE);
    chunk.forEach(({ targetCollection, docId, data }) => {
      batch.set(db.collection(targetCollection).doc(docId), data, { merge: true });
    });
    await batch.commit();
    const progress = Math.min(i + BATCH_SIZE, allWrites.length);
    console.log(`   ✅ Batch: ${progress}/${allWrites.length}`);
  }

  // Step 4: Update tenant doc with version
  await db.collection('tenants').doc(tenantId).set({
    demo_data_version: SEED.metadata.generated_at,
    company_name: config.companyName,
    updated_at: nowIso,
  }, { merge: true });

  // Step 5: Summary
  const counts = {};
  allWrites.forEach(w => {
    counts[w.targetCollection] = (counts[w.targetCollection] || 0) + 1;
  });

  console.log(`\n✅ DONE — ${tenantId}:`);
  console.table(counts);
}

// --- MAIN ---
const args = process.argv.slice(2);
const targetTenants = args.length > 0
  ? args
  : Object.keys(TENANT_CONFIG);

console.log(`\n🚀 Admin SDK Direct Seed`);
console.log(`   Tenants: ${targetTenants.join(', ')}`);
console.log(`   Seed: ${SEED.metadata.source} (${SEED.metadata.generated_at})`);

for (const tenantId of targetTenants) {
  await seedTenant(tenantId);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`🎉 ALL DONE. Data is live on Firestore.`);
console.log(`${'='.repeat(60)}`);
process.exit(0);
