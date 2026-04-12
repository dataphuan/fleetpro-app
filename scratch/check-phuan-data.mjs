import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '../fleetpro-app-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan';

async function checkPhuAnData() {
  console.log(`\n🔍 Checking data for tenant: ${TENANT_ID}`);
  
  const collections = ['vehicles', 'drivers', 'customers', 'trips'];
  
  for (const col of collections) {
    const snap = await db.collection(col).where('tenant_id', '==', TENANT_ID).get();
    console.log(`- Collection ${col}: ${snap.size} records`);
    
    if (snap.size > 0) {
      console.log(`  Sample IDs from ${col}:`);
      snap.docs.slice(0, 3).forEach(d => {
        const data = d.data();
        const codeKey = col === 'vehicles' ? 'vehicle_code' : (col === 'drivers' ? 'driver_code' : 'id');
        console.log(`    [${d.id}] ${codeKey}: ${data[codeKey]}`);
      });
    }
  }
}

checkPhuAnData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
