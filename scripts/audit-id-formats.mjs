import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initializing Admin SDK
const serviceAccountPath = path.join(__dirname, '..', 'fleetpro-app-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Service account file not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const TENANTS = ['internal-tenant-phuan', 'internal-tenant-1'];
const COLLECTIONS = ['vehicles', 'drivers', 'trips', 'routes', 'customers', 'transportOrders', 'expenses', 'maintenance'];

const NEW_ID_REGEX = /^[A-Z]{2}\d{4}-\d+$/;

async function auditIds() {
  console.log('--- STARTING ID AUDIT ---');
  
  for (const tenantId of TENANTS) {
    console.log(`\nTenant: ${tenantId}`);
    
    for (const collName of COLLECTIONS) {
      const fullPath = `${tenantId}_${collName}`;
      const snapshot = await db.collection(fullPath).get();
      
      let oldFormatCount = 0;
      let newFormatCount = 1; // Start with 1 to avoid division by zero or just count
      let total = snapshot.size;
      
      const sampleOld = [];
      const sampleNew = [];
      
      snapshot.forEach(doc => {
        if (NEW_ID_REGEX.test(doc.id)) {
          newFormatCount++;
          if (sampleNew.length < 3) sampleNew.push(doc.id);
        } else {
          oldFormatCount++;
          if (sampleOld.length < 3) sampleOld.push(doc.id);
        }
      });
      
      if (total > 0) {
        console.log(`  [${collName.padEnd(15)}] Total: ${total.toString().padStart(4)} | New: ${String(newFormatCount - 1).padStart(4)} | Old: ${oldFormatCount.toString().padStart(4)}`);
        if (sampleOld.length > 0) console.log(`    Samples Old: ${sampleOld.join(', ')}`);
        if (sampleNew.length > 1) console.log(`    Samples New: ${sampleNew.join(', ')}`);
      }
    }
  }
}

auditIds().catch(console.error);
