import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '../fleetpro-app-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan';

async function verifyPhuAnStatus() {
  console.log(`\n🔍 Verifying STATUS for ${TENANT_ID}...`);
  
  // 1. Check Settings & Plan
  const settingsDoc = await db.collection('company_settings').doc(TENANT_ID).get();
  if (settingsDoc.exists()) {
    const data = settingsDoc.data();
    console.log(`✅ Company Name: ${data.company_name}`);
    console.log(`✅ Subscription Plan: ${data.subscription?.plan || 'trial'}`);
  } else {
    console.log(`❌ Company Settings NOT FOUND for ${TENANT_ID}`);
  }

  // 2. Check Seed Data Counts
  const collections = ['vehicles', 'drivers', 'customers', 'trips', 'routes', 'expenses'];
  for (const col of collections) {
    const snap = await db.collection(col).where('tenant_id', '==', TENANT_ID).get();
    console.log(`📊 ${col}: ${snap.size} records`);
  }
}

verifyPhuAnStatus().then(() => process.exit(0));
