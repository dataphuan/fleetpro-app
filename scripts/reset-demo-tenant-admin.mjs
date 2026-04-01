#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import admin from 'firebase-admin';

const ROOT = process.cwd();
const SERVICE_ACCOUNT_PATH = path.join(ROOT, 'fleetpro-app-service-account.json');
const SEED_PATH = path.join(ROOT, 'src', 'data', 'tenantDemoSeed.ts');

const TENANT_ID = process.env.TENANT_ID || 'internal-tenant-1';
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'admindemo@tnc.io.vn';
const DEMO_ACCOUNTS = [
  { email: 'admindemo@tnc.io.vn', role: 'admin', fullName: 'Admin - TNC Demo' },
  { email: 'quanlydemo@tnc.io.vn', role: 'manager', fullName: 'Quan ly - TNC Demo' },
  { email: 'ketoandemo@tnc.io.vn', role: 'accountant', fullName: 'Ke toan - TNC Demo' },
  { email: 'taixedemo@tnc.io.vn', role: 'driver', fullName: 'Tai xe - TNC Demo' },
];

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadSeedPayload(seedPath) {
  const src = fs.readFileSync(seedPath, 'utf8');
  const marker = 'export const TENANT_DEMO_SEED = ';
  const markerIndex = src.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error('Cannot parse TENANT_DEMO_SEED from src/data/tenantDemoSeed.ts');
  }

  const start = src.indexOf('{', markerIndex + marker.length);
  if (start === -1) {
    throw new Error('Cannot locate object start for TENANT_DEMO_SEED');
  }

  let inString = false;
  let escaped = false;
  let depth = 0;
  let end = -1;

  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    throw new Error('Cannot locate object end for TENANT_DEMO_SEED');
  }

  const objectLiteral = src.slice(start, end + 1);
  return JSON.parse(objectLiteral);
}

function normalizeDoc(collectionName, row, tenantId) {
  const now = new Date().toISOString();
  const { id, ...rest } = row;

  const payload = {
    ...rest,
    tenant_id: tenantId,
    is_deleted: typeof rest.is_deleted === 'undefined' ? 0 : rest.is_deleted,
    created_at: rest.created_at || now,
    updated_at: now,
    updated_by: 'reset-demo-tenant-admin',
    record_id: rest.record_id || `${tenantId}_${collectionName}_${id}`,
  };

  if (collectionName === 'customers' && !payload.name && payload.customer_name) {
    payload.name = payload.customer_name;
  }
  if (collectionName === 'routes' && !payload.name && payload.route_name) {
    payload.name = payload.route_name;
  }

  return payload;
}

async function deleteTenantDocs(db, collectionName, tenantId) {
  let totalDeleted = 0;

  while (true) {
    const snap = await db
      .collection(collectionName)
      .where('tenant_id', '==', tenantId)
      .limit(400)
      .get();

    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    totalDeleted += snap.size;
    if (snap.size < 400) break;
  }

  return totalDeleted;
}

async function seedCollection(db, collectionName, rows, tenantId) {
  let totalSeeded = 0;
  const chunkSize = 350;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = rows.slice(i, i + chunkSize);

    for (const row of chunk) {
      if (!row.id) continue;
      const payload = normalizeDoc(collectionName, row, tenantId);
      batch.set(db.collection(collectionName).doc(String(row.id)), payload, { merge: false });
      totalSeeded += 1;
    }

    await batch.commit();
  }

  return totalSeeded;
}

async function ensureDemoUserProfiles(db, tenantId, adminEmail) {
  const accountMap = new Map(DEMO_ACCOUNTS.map((x) => [x.email, x]));
  if (!accountMap.has(adminEmail)) {
    accountMap.set(adminEmail, { email: adminEmail, role: 'admin', fullName: 'Admin Demo' });
  }

  const accounts = Array.from(accountMap.values());
  try {
    for (const account of accounts) {
      try {
        const user = await admin.auth().getUserByEmail(account.email);
        const now = new Date().toISOString();
        await db.collection('users').doc(user.uid).set(
          {
            email: user.email || account.email,
            full_name: user.displayName || account.fullName,
            role: account.role,
            status: 'active',
            tenant_id: tenantId,
            is_deleted: 0,
            created_at: now,
            updated_at: now,
            updated_by: 'reset-demo-tenant-admin',
            record_id: `${tenantId}_users_${user.uid}`,
          },
          { merge: true }
        );
        console.log(`✅ Ensured demo profile: ${account.email} (uid=${user.uid}, role=${account.role})`);
      } catch (error) {
        console.warn(`⚠️ Could not ensure demo profile for ${account.email}: ${error.message}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not ensure demo user profiles: ${error.message}`);
  }
}

async function main() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`Service account file not found: ${SERVICE_ACCOUNT_PATH}`);
  }
  if (!fs.existsSync(SEED_PATH)) {
    throw new Error(`Seed file not found: ${SEED_PATH}`);
  }

  const serviceAccount = readJsonFile(SERVICE_ACCOUNT_PATH);
  const seed = loadSeedPayload(SEED_PATH);
  const collections = seed.collections || {};

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  const db = admin.firestore();

  console.log('='.repeat(72));
  console.log('🚿 FleetPro Demo Data Reset + Reseed (Admin SDK)');
  console.log('='.repeat(72));
  console.log(`Project : ${serviceAccount.project_id}`);
  console.log(`Tenant  : ${TENANT_ID}`);
  console.log(`Seed src: src/data/tenantDemoSeed.ts`);

  const rootCollections = await db.listCollections();
  let deletedTotal = 0;
  for (const colRef of rootCollections) {
    const deleted = await deleteTenantDocs(db, colRef.id, TENANT_ID);
    deletedTotal += deleted;
    if (deleted > 0) {
      console.log(`🗑️  ${colRef.id}: deleted ${deleted}`);
    }
  }

  let seededTotal = 0;
  for (const [collectionName, rows] of Object.entries(collections)) {
    const seeded = await seedCollection(db, collectionName, rows || [], TENANT_ID);
    seededTotal += seeded;
    console.log(`🌱 ${collectionName}: seeded ${seeded}`);
  }

  await ensureDemoUserProfiles(db, TENANT_ID, DEMO_ADMIN_EMAIL);

  console.log('-'.repeat(72));
  console.log(`Deleted docs: ${deletedTotal}`);
  console.log(`Seeded docs : ${seededTotal}`);
  console.log('✅ Reset + reseed completed.');
}

main()
  .catch((error) => {
    console.error('❌ Reset failed:', error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await admin.app().delete();
    } catch {
      // ignore
    }
  });
