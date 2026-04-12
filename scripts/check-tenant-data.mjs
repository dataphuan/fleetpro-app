import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditTenant(tenantId) {
  console.log(`\n🔍 AUDITING TENANT: ${tenantId}`);
  console.log('='.repeat(40));

  const collections = ['vehicles', 'drivers', 'trips', 'expenses', 'customers', 'routes', 'companySettings'];
  
  for (const coll of collections) {
    console.log(`\n--- Collection: ${coll} ---`);
    
    // 1. Check Root Collection with tenant_id
    const rootSnap = await db.collection(coll).where('tenant_id', '==', tenantId).get();
    console.log(`📍 Root Collection: ${rootSnap.size} records found.`);
    if (rootSnap.size > 0) {
        const sample = rootSnap.docs[0];
        console.log(`   Sample ID: ${sample.id}`);
        if (!sample.id.startsWith(tenantId)) {
            console.log(`   ⚠️ WARNING: ID does not follow prefix pattern '${tenantId}_${coll}_'`);
        }
    }

    // 2. Check Legacy Subcollection
    const subSnap = await db.collection('tenants').doc(tenantId).collection(coll).get();
    if (subSnap.size > 0) {
        console.log(`❌ LEGACY SUBCOLLECTION: ${subSnap.size} records found! (These will be hidden in UI)`);
    } else {
        console.log(`✅ No legacy subcollection data found.`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const targetTenant = args[0] || 'internal-tenant-1';
  
  await auditTenant(targetTenant);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
