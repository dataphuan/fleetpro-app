import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = 'd:/AI-KILLS/V1-quanlyxeonline';
const serviceAccount = JSON.parse(readFileSync(resolve(root, 'fleetpro-app-service-account.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-1';

const collectionsToWipe = [
    'trips',
    'expenses',
    'maintenance',
    'transportOrders',
    'purchaseOrders',
    'inventoryTransactions',
    'alerts',
    'trip_location_log',
    'vehicles', // Xóa Xe mẫu
    'customers', // Xóa Khách mẫu
    'routes', // Xóa Tuyến mẫu
];

async function wipeTenantData() {
  console.log(`🧹 BẮT ĐẦU DỌN DẸP DỮ LIỆU RÁC CHO TENANT: ${TENANT_ID}`);
  
  for (const collectionName of collectionsToWipe) {
      console.log(`Tiến hành quét dọn Collection: [${collectionName}]...`);
      const snapshot = await db.collection(collectionName).where('tenant_id', '==', TENANT_ID).get();
      
      let deletedCount = 0;
      const batchList = [];
      let currentBatch = db.batch();
      let opCount = 0;

      snapshot.docs.forEach((doc) => {
          currentBatch.delete(doc.ref);
          deletedCount++;
          opCount++;

          if (opCount === 490) {
              batchList.push(currentBatch);
              currentBatch = db.batch();
              opCount = 0;
          }
      });

      if (opCount > 0) {
          batchList.push(currentBatch);
      }

      for (const batch of batchList) {
          await batch.commit();
      }
      console.log(`✅ Đã xóa ${deletedCount} docs trong [${collectionName}].`);
  }

  // Reset Counters to 0 so they can start fresh IDs (CD0001, XE0001, etc)
  console.log(`Tiến hành Reset Hệ đếm ID (Counters)...`);
  const countersSnap = await db.collection('system_counters').where('tenant_id', '==', TENANT_ID).get();
  const counterBatch = db.batch();
  let counterReset = 0;
  countersSnap.docs.forEach((doc) => {
      // Do not reset driver counter since we keep the drivers
      if (doc.id !== `${TENANT_ID}_TX`) {
        counterBatch.update(doc.ref, { current_value: 0 });
        counterReset++;
      }
  });
  if (counterReset > 0) {
      await counterBatch.commit();
      console.log(`✅ Đã Reset ${counterReset} System Counters về 0.`);
  }

  console.log(`\n🎉 HOÀN TẤT! Tenant [${TENANT_ID}] đã Trắng Trơn, sẵn sàng cho TÂN KHÁCH HÀNG!`);
  process.exit(0);
}

wipeTenantData().catch(console.error);
