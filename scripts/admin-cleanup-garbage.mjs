#!/usr/bin/env node
/**
 * DEEP CLEANUP — Delete ALL garbage from every collection
 * Keeps ONLY: internal-tenant-1, internal-tenant-phuan
 * Deletes by BOTH tenant_id field AND doc ID prefix
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const SA_PATH = path.join(root, 'fleetpro-app-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const VALID_TENANTS = new Set([
  'internal-tenant-1',
  'internal-tenant-phuan',
]);

const isValidDocId = (docId) => {
  for (const vt of VALID_TENANTS) {
    if (docId === vt || docId.startsWith(`${vt}_`)) return true;
  }
  return false;
};

const isValidTenantId = (tid) => {
  if (!tid) return true; // docs without tenant_id are system docs, keep them
  return VALID_TENANTS.has(tid);
};

// Scan EVERY collection in the database
async function getAllCollections() {
  const collections = await db.listCollections();
  return collections.map(c => c.id);
}

async function deepClean() {
  console.log(`\n🔥 DEEP CLEANUP — Deleting ALL garbage tenant data`);
  console.log(`   Valid: ${[...VALID_TENANTS].join(', ')}\n`);

  const allCollections = await getAllCollections();
  console.log(`📋 Found ${allCollections.length} collections: ${allCollections.join(', ')}\n`);

  let grandTotal = 0;
  const garbageTenants = new Map();

  for (const collName of allCollections) {
    try {
      // Get ALL docs in this collection
      const snap = await db.collection(collName).get();
      if (snap.empty) {
        console.log(`   ⬜ ${collName}: empty`);
        continue;
      }

      const garbageDocs = snap.docs.filter(d => {
        const data = d.data();
        const tid = data.tenant_id;
        const docId = d.id;

        // Rule 1: If doc has tenant_id and it's not valid → garbage
        if (tid && !isValidTenantId(tid)) return true;

        // Rule 2: company_settings, tenants — doc ID IS the tenant ID
        if ((collName === 'company_settings' || collName === 'tenants') && !isValidDocId(docId)) {
          return true;
        }

        // Rule 3: Doc ID starts with garbage tenant prefix
        if (docId.startsWith('tenant-') && !isValidDocId(docId)) return true;

        return false;
      });

      if (garbageDocs.length === 0) {
        console.log(`   ✅ ${collName}: ${snap.size} docs (all valid)`);
        continue;
      }

      // Track garbage tenant IDs
      garbageDocs.forEach(d => {
        const tid = d.data().tenant_id || d.id.split('_')[0];
        garbageTenants.set(tid, (garbageTenants.get(tid) || 0) + 1);
      });

      // Delete in batches
      const BATCH_SIZE = 450;
      for (let i = 0; i < garbageDocs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        garbageDocs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }

      grandTotal += garbageDocs.length;
      console.log(`   🗑️  ${collName}: deleted ${garbageDocs.length}/${snap.size} docs`);
    } catch (err) {
      console.warn(`   ⚠️  ${collName}: ${err.code || err.message}`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ DEEP CLEANUP COMPLETE`);
  console.log(`   Total garbage deleted: ${grandTotal}`);
  if (garbageTenants.size > 0) {
    console.log(`\n   Garbage tenants cleaned:`);
    const sorted = [...garbageTenants.entries()].sort((a, b) => b[1] - a[1]);
    for (const [tid, count] of sorted) {
      console.log(`      ${tid}: ${count} docs`);
    }
  }
  console.log(`${'='.repeat(60)}`);
}

await deepClean();
process.exit(0);
