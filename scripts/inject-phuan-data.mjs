import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = 'd:/AI-KILLS/V1-quanlyxeonline';
const serviceAccount = JSON.parse(readFileSync(resolve(root, 'fleetpro-app-service-account.json'), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan';
const COMPANY_NAME = 'Công ty TNHH Phú An';

const seedPath = resolve(root, 'scripts', 'tenantDemoSeed.json');
const seedData = JSON.parse(readFileSync(seedPath, 'utf8'));

/**
 * Hàm resolve ID chuẩn của hệ thống: [tenant_id]_[collection]_[old_id]
 */
const toDocId = (collectionName, sourceId) => {
  if (!sourceId) return null;
  const cleanSourceId = String(sourceId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${TENANT_ID}_${collectionName}_${cleanSourceId}`;
};

/**
 * Mapping các trường Foreign Key cần được chuyển đổi sang Doc ID thực tế
 */
const REFERENCE_MAP = {
  trips: ['vehicle_id', 'driver_id', 'customer_id', 'route_id'],
  expenses: ['trip_id', 'vehicle_id', 'driver_id'],
  maintenance: ['vehicle_id'],
  transportOrders: ['customer_id'],
  vehicles: ['assigned_driver_id', 'default_driver_id'],
  drivers: ['assigned_vehicle_id']
};

const COLLECTION_NAME_MAP = {
  vehicle_id: 'vehicles',
  driver_id: 'drivers',
  customer_id: 'customers',
  route_id: 'routes',
  trip_id: 'trips',
  assigned_driver_id: 'drivers',
  default_driver_id: 'drivers',
  assigned_vehicle_id: 'vehicles'
};

async function injectData() {
  console.log(`🚀 BẮT ĐẦU NẠP DỮ LIỆU THỰC CHIẾN - CÔNG TY PHÚ AN (${TENANT_ID})...`);

  const collections = seedData.collections;
  const nowIso = new Date().toISOString();

  // 1. Dọn dẹp dữ liệu cũ (Xóa triệt để để tránh rác, trừ drivers và users để giữ account alignment)
  const collectionsToWipe = ['trips', 'expenses', 'vehicles', 'routes', 'customers', 'company_settings', 'costs', 'accountingPeriods'];
  
  for (const coll of collectionsToWipe) {
    const snap = await db.collection(coll).where('tenant_id', '==', TENANT_ID).get();
    if (!snap.empty) {
      console.log(`🧹 Đang dọn dẹp ${snap.size} bản ghi từ ${coll}...`);
      const chunks = [];
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 450) { chunks.push(docs.slice(i, i + 450)); }
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }
  }

  // 2. Nạp dữ liệu mới với Logic Liên Kết ID chuẩn
  for (const [collectionName, rows] of Object.entries(collections)) {
    if (collectionName === 'users') continue; // Giữ lại users đã tạo Auth
    
    console.log(`📦 Đang xử lý ${rows.length} bản ghi của ${collectionName}...`);
    
    const chunks = [];
    for (let i = 0; i < rows.length; i += 450) { chunks.push(rows.slice(i, i + 450)); }

    for (const chunk of chunks) {
      const batch = db.batch();
      chunk.forEach(row => {
        const sourceId = row.id || row.record_id || row.expense_code || row.trip_code || row.vehicle_code || row.driver_code || row.customer_code || row.route_code;
        if (!sourceId && collectionName !== 'companySettings') return;

        // Xác định ID Document thực tế
        let docId;
        let targetColl = collectionName;
        if (collectionName === 'companySettings') {
          docId = TENANT_ID;
          targetColl = 'company_settings';
        } else {
          docId = toDocId(collectionName, sourceId);
        }

        // --- XỬ LÝ LIÊN KẾT (RELATIONAL MAPPING) ---
        const payload = { ...row, tenant_id: TENANT_ID };
        delete payload.id; // Dùng docId làm primary key

        const fieldsToMap = REFERENCE_MAP[collectionName] || [];
        fieldsToMap.forEach(field => {
          if (payload[field]) {
            const targetRefColl = COLLECTION_NAME_MAP[field];
            payload[field] = toDocId(targetRefColl, payload[field]);
          }
        });

        // Bổ sung audit fields
        payload.created_at = row.created_at || nowIso;
        payload.updated_at = nowIso;
        payload.is_deleted = 0;

        // Đặc biệt cho Trips: Đảm bảo doanh thu/chi phí không bằng 0
        if (collectionName === 'trips') {
           payload.total_cost = Number(payload.fuel_cost || 0) + Number(payload.toll_cost || 0) + Number(payload.driver_advance || 0);
           payload.gross_profit = Number(payload.gross_revenue || 0) - payload.total_cost;
        }

        batch.set(db.collection(targetColl).doc(docId), payload, { merge: true });
      });
      await batch.commit();
    }
  }

  console.log('✅ NẠP DỮ LIỆU HOÀN TẤT - LOGIC LIÊN KẾT ĐÃ ĐƯỢC KHÔI PHỤC!');
  process.exit(0);
}

injectData().catch(err => {
  console.error('❌ Lỗi nạp dữ liệu:', err);
  process.exit(1);
});
