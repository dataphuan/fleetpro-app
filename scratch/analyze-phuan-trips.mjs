import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '../fleetpro-app-service-account.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan';

async function analyzeTrips() {
  const snap = await db.collection('trips').where('tenant_id', '==', TENANT_ID).get();
  const vehicleIds = new Set();
  const driverIds = new Set();
  const licensePlates = new Set();

  snap.forEach(doc => {
    const d = doc.data();
    if (d.vehicle_id) vehicleIds.add(d.vehicle_id);
    if (d.driver_id) driverIds.add(d.driver_id);
    if (d.license_plate) licensePlates.add(d.license_plate);
  });

  console.log(`\n--- Phú An Trip Analysis ---`);
  console.log(`Total Trips: ${snap.size}`);
  console.log(`Referenced Vehicle IDs:`, Array.from(vehicleIds));
  console.log(`Referenced Driver IDs:`, Array.from(driverIds));
  console.log(`Referenced License Plates:`, Array.from(licensePlates));
}

analyzeTrips().then(() => process.exit(0));
