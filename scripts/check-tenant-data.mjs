import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  const tenantId = 'internal-tenant-1';
  console.log(`Checking data for tenant: ${tenantId}`);
  
  const collections = ['vehicles', 'drivers', 'trips', 'expenses'];
  for (const coll of collections) {
    const snap = await db.collection(coll).where('tenant_id', '==', tenantId).get();
    console.log(`- Collection '${coll}': ${snap.size} records found.`);
  }
}

checkData().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
