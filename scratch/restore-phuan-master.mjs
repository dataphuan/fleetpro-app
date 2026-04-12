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

async function restorePhuAnMasterData() {
  console.log(`\n🚀 RESTORING MASTER DATA FOR PHU AN (${TENANT_ID})...`);
  
  const now = new Date().toISOString();
  
  // 1. Create Vehicles
  const vehicles = [
    { code: 'XE0001', plate: '51C-12345', type: 'Đầu kéo', brand: 'Hyundai' },
    { code: 'XE0002', plate: '51D-67890', type: 'Tải 15 tấn', brand: 'Hino' },
    { code: 'XE0003', plate: '72A-55555', type: 'Đầu kéo', brand: 'Chenglong' }
  ];

  for (const v of vehicles) {
    const docId = `${TENANT_ID}_vehicles_${v.code}`;
    await db.collection('vehicles').doc(docId).set({
      tenant_id: TENANT_ID,
      vehicle_code: v.code,
      license_plate: v.plate,
      vehicle_type: v.type,
      brand: v.brand,
      status: 'active',
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      current_odometer: 150000,
      capacity_tons: 15
    });
    console.log(`✅ Restored Vehicle: ${v.code} (${v.plate})`);
  }

  // 2. Create Drivers
  const drivers = [
    { code: 'TX0001', name: 'Nguyễn Văn Phú' },
    { code: 'TX0002', name: 'Trần Văn An' },
    { code: 'TX0003', name: 'Lê Hoàng Việt' }
  ];

  for (const d of drivers) {
    const docId = `${TENANT_ID}_drivers_${d.code}`;
    await db.collection('drivers').doc(docId).set({
      tenant_id: TENANT_ID,
      driver_code: d.code,
      full_name: d.name,
      status: 'active',
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      phone: '0901234567',
      license_number: '1234567890'
    });
    console.log(`✅ Restored Driver: ${d.code} (${d.name})`);
  }

  console.log(`\n✨ PHU AN MASTER DATA RESTORED SUCCESSFULLY ✨`);
}

restorePhuAnMasterData().then(() => process.exit(0));
