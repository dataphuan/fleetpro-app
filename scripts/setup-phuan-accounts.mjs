#!/usr/bin/env node
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const TENANT_ID = 'internal-tenant-phuan';

const phuanAccounts = [
  { email: 'admin@phuancr.com', password: 'Demo@1234', displayName: 'Admin Phú An', role: 'admin' },
  { email: 'quanly@phuancr.com', password: 'Demo@1234', displayName: 'Quản lý Phú An', role: 'manager' },
  { email: 'ketoan@phuancr.com', password: 'Demo@1234', displayName: 'Kế toán Phú An', role: 'accountant' },
  ...Array.from({ length: 15 }).map((_, i) => ({
    email: `taixe${i + 1}@phuancr.com`,
    password: 'Demo@1234',
    displayName: `Tài xế ${i + 1}`,
    role: 'driver',
    driverCode: `TX-${String(i + 1).padStart(2, '0')}`
  }))
];

async function setupPhuAn() {
  console.log(`🚀 Bắt đầu tạo 18 tài khoản cho Phú An (Tenant: ${TENANT_ID})...`);

  for (const acc of phuanAccounts) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(acc.email);
        // Optional: override password
        await auth.updateUser(userRecord.uid, { password: acc.password, displayName: acc.displayName });
        console.log(`✅ Cập nhật Auth: ${acc.email} (${userRecord.uid})`);
      } catch (e) {
        userRecord = await auth.createUser({
          email: acc.email,
          password: acc.password,
          displayName: acc.displayName,
        });
        console.log(`✅ Tạo mới Auth: ${acc.email} (${userRecord.uid})`);
      }

      await auth.setCustomUserClaims(userRecord.uid, {
        role: acc.role,
        tenant_id: TENANT_ID,
      });

      const userDoc = {
        email: acc.email,
        full_name: acc.displayName,
        role: acc.role,
        tenant_id: TENANT_ID,
        status: 'active',
        company_name: 'Công ty TNHH Phú An',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: true });
      console.log(`   🔸 Firestore User Doc Created/Merge`);

      // If driver, create driver profile
      if (acc.role === 'driver') {
        const driverId = `driver_${userRecord.uid}`;
        const driverDoc = {
          tenant_id: TENANT_ID,
          user_id: userRecord.uid,
          driver_code: acc.driverCode,
          full_name: acc.displayName,
          email: acc.email,
          status: 'active',
          availability_status: 'available',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        };
        await db.collection('drivers').doc(driverId).set(driverDoc, { merge: true });
        console.log(`   🔸 Firestore Driver Profile Created (${acc.driverCode})`);
      }

    } catch (err) {
      console.error(`❌ Lỗi tạo ${acc.email}:`, err.message);
    }
  }

  // Create standard company settings tenant for Phu An
  await db.collection('tenants').doc(TENANT_ID).set({
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    demo_mode: false,
    name: "CÔNG TY TNHH PHÚ AN"
  }, { merge: true });

  console.log(`🎉 HOÀN TẤT! Đã tạo xong 18 tài khoản.`);
}

setupPhuAn().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
