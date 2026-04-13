import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = 'd:/AI-KILLS/V1-quanlyxeonline';
const serviceAccount = JSON.parse(readFileSync(resolve(root, 'fleetpro-app-service-account.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan';

async function auditData() {
  console.log(`🔍 Auditing data for ${TENANT_ID}...`);
  
  const tripCount = await db.collection('trips').where('tenant_id', '==', TENANT_ID).get();
  console.log(`📈 Trips: ${tripCount.size}`);
  
  const vehicleCount = await db.collection('vehicles').where('tenant_id', '==', TENANT_ID).get();
  console.log(`🚛 Vehicles: ${vehicleCount.size}`);

  const driverCount = await db.collection('drivers').where('tenant_id', '==', TENANT_ID).get();
  console.log(`👤 Drivers: ${driverCount.size}`);

  const expenseCount = await db.collection('expenses').where('tenant_id', '==', TENANT_ID).get();
  console.log(`💸 Expenses: ${expenseCount.size}`);

  process.exit(0);
}

auditData();
