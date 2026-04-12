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

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {
  // Already initialized maybe
}

const db = admin.firestore();

const TENANT_ID = 'internal-tenant-phuan';

async function upgradeTenant() {
  console.log(`🚀 Kiểm tra cấu hình gói cước cho Tenant: ${TENANT_ID}...`);

  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  const docSnap = await tenantRef.get();
  
  if (docSnap.exists) {
      const data = docSnap.data();
      console.log(`📌 Gói cước hiện tại: ${data.subscription?.plan || data.plan || 'Chưa thiết lập'}`);
      console.dir(data.subscription || {}, {depth: null});
  } else {
      console.log(`📌 Tenant chưa tồn tại Data Cấu hình chung, tiến hành tạo mới khởi điểm.`);
  }

  // Nâng cấp gói Full Cao Nhất
  const upgradePayload = {
    plan: 'enterprise',
    subscription: {
        plan: 'enterprise',
        status: 'active',
        max_vehicles: 9999,
        max_drivers: 9999,
        features: {
            ai_optimization: true,
            gdrive_sync: true,
            ocr_receipt: true, // Note: We disabled UI mock, but feature flag is on
            telegram_bot: true,
            api_access: true,
            custom_domain: true,
            white_label: true
        },
        billing_cycle: 'yearly',
        next_billing_date: admin.firestore.Timestamp.fromDate(new Date('2030-12-31T00:00:00Z'))
    },
    updated_at: admin.firestore.FieldValue.serverTimestamp()
  };

  await tenantRef.set(upgradePayload, { merge: true });

  console.log(`\n💎 Đã Nâng Cấp Thành Công!`);
  console.log(`   🔸 Gói cước: ENTERPRISE (Cao nhất)`);
  console.log(`   🔸 Hạn dùng: 31/12/2030`);
  console.log(`   🔸 Full Quyền năng: Trí tuệ nhân tạo (AI), Đồng bộ GDrive, Custom Domain, White-label.`);
}

upgradeTenant().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
