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

async function upgradeToEnterprise() {
  console.log(`\n🚀 UPGRADING ${TENANT_ID} TO ENTERPRISE...`);
  
  const settingsRef = db.collection('company_settings').doc(TENANT_ID);
  const now = new Date().toISOString();
  
  await settingsRef.set({
    company_name: 'Vận Tải Phú An',
    address: 'Q7, TP. Hồ Chí Minh',
    subscription: {
      plan: 'enterprise',
      status: 'active',
      started_at: now,
      expires_at: '2099-12-31T23:59:59Z'
    },
    updated_at: now
  }, { merge: true });

  console.log(`✅ ${TENANT_ID} upgraded to ENTERPRISE plan.`);
}

upgradeToEnterprise().then(() => process.exit(0));
