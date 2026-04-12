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

async function fixData() {
  console.log(`🚀 Bắt đầu Audit và Dọn Dẹp dữ liệu cho Tenant: ${TENANT_ID}...`);

  // 1. Dọn dẹp Tài xế rác (Seed demo DRV) và fix lỗi TX
  const driversSnap = await db.collection('drivers').where('tenant_id', '==', TENANT_ID).get();
  console.log(`   🔸 Đang quét ${driversSnap.size} tài xế...`);
  
  let deletedCount = 0;
  const batch = db.batch();

  driversSnap.forEach(doc => {
    const data = doc.data();
    // Xóa những tài xế không phải TX (xóa DRV001, DRV002...)
    if (!data.driver_code || !data.driver_code.startsWith('TX-')) {
      console.log(`      - Đang xóa Data Demo rác: ${data.driver_code} (${data.full_name})`);
      batch.delete(doc.ref);
      deletedCount++;
    } 
    // Nếu là TX-13 nhưng bị lỗi tên mã hóa (như User phàn nàn), chuẩn hóa lại tên
    else if (data.driver_code === 'TX-13') {
        batch.update(doc.ref, { full_name: 'Tài xế 13', email: 'taixe13@phuancr.com' });
    }
  });

  if (deletedCount > 0) {
    await batch.commit();
    console.log(`   ✅ Đã xóa ${deletedCount} tài xế demo. Giữ lại duy nhất 15 tài xế Phú An.`);
  }

  // 2. Chuẩn hóa tuyến đường (Khoán 1 triệu cho tuyến đi về > 150km)
  // Ninh Hòa -> Phú Yên là ~100km 1 chiều / 200km 2 chiều.
  const routesSnap = await db.collection('routes').where('tenant_id', '==', TENANT_ID).get();
  console.log(`   🔸 Đang quét ${routesSnap.size} tuyến đường...`);
  
  let routeUpdateCount = 0;
  const routeBatch = db.batch();

  routesSnap.forEach(doc => {
    const r = doc.data();
    const distanceOneWay = Number(r.distance_km || 0);
    const roundTrip = distanceOneWay * 2;
    
    // Nếu tuyến khứ hồi > 150km (Ví dụ: Tuy Hòa là 100*2 = 200km)
    if (roundTrip >= 150) {
      console.log(`      - Nâng lương khoán tuyến ${r.route_name} (${roundTrip}km khứ hồi) lên 1.000.000đ`);
      routeBatch.update(doc.ref, { 
          driver_allowance_standard: 1000000, 
          // Update the existing notes
          notes: r.notes ? r.notes + ' [Khoán >150km = 1 Triệu]' : '[Khoán >150km = 1 Triệu]' 
      });
      routeUpdateCount++;
    }
  });

  if (routeUpdateCount > 0) {
    await routeBatch.commit();
    console.log(`   ✅ Đã cập nhật ${routeUpdateCount} tuyến đường.`);
  }

  console.log(`🎉 HOÀN TẤT DỌN DẸP!`);
}

fixData().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
