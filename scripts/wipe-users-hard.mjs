import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const DEMO_TENANT_ID = 'internal-tenant-1';

const coreAccounts = [
  { email: 'admindemo@tnc.io.vn', role: 'admin', displayName: 'Admin Hệ Thống', password: 'Demo@1234' },
  { email: 'quanlydemo@tnc.io.vn', role: 'manager', displayName: 'Quản Lý Vận Hành', password: 'Demo@1234' },
  { email: 'ketoandemo@tnc.io.vn', role: 'accountant', displayName: 'Kế Toán Trưởng', password: 'Demo@1234' },
  { email: 'taixedemo@tnc.io.vn', role: 'driver', displayName: 'Tài Xế Demo', password: 'Demo@1234' }
];

async function run() {
  console.log('🌋 BẮT ĐẦU QUÉT SẠCH TOÀN BỘ DATABASE USERS (WIPE OUT)...');

  // 1. Delete ALL Firestore users documents
  const usersRef = await db.collection('users').get();
  console.log(` - Tìm thấy ${usersRef.docs.length} tài liệu trong collection 'users'. Đang xóa...`);
  
  for (const doc of usersRef.docs) {
    await doc.ref.delete();
    console.log(`   ❌ Đã xóa doc: ${doc.id} (${doc.data().email})`);
  }

  // 2. Delete ALL users in Firebase Auth
  console.log('\n - Đang quét sạch danh sách Firebase Authentication...');
  let totalAuthDeleted = 0;
  async function deleteAuthUsers(nextPageToken) {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    for (const userRecord of listUsersResult.users) {
      await auth.deleteUser(userRecord.uid);
      console.log(`   ❌ Đã xóa Auth User: ${userRecord.uid} (${userRecord.email})`);
      totalAuthDeleted++;
    }
    if (listUsersResult.pageToken) {
      await deleteAuthUsers(listUsersResult.pageToken);
    }
  }
  await deleteAuthUsers();
  console.log(`✅ Đã xóa tổng cộng ${totalAuthDeleted} users trong Auth.`);

  console.log('\n🌟 ĐANG TẠO LẠI 4 TÀI KHOẢN CHUẨN (HỆ THỐNG TRẮNG)...');
  
  for (const acc of coreAccounts) {
     console.log(`\n===================`);
     console.log(`🔄 Khởi tạo: ${acc.email}...`);
     
     // Create Auth user
     const userRecord = await auth.createUser({
       email: acc.email,
       password: acc.password,
       displayName: acc.displayName
     });
     console.log(`   ✅ Firebase Auth UID: ${userRecord.uid}`);
     
     // Set Claims
     await auth.setCustomUserClaims(userRecord.uid, {
       role: acc.role,
       tenant_id: DEMO_TENANT_ID,
       demo: true
     });
     
     // Create Firestore doc
     await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: acc.email,
        full_name: acc.displayName,
        role: acc.role,
        tenant_id: DEMO_TENANT_ID,
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
     }, {merge: true});
     
     console.log(`   ✅ Firestore Doc created (Tenant: ${DEMO_TENANT_ID})`);
  }
}

run().then(() => {
  console.log('\n🔥🔥🔥 RESET HOÀN TẤT! HỆ THỐNG HIỆN CHỈ CÒN DUY NHẤT 4 TÀI KHOẢN CHUẨN.');
  process.exit(0);
}).catch(e => {
  console.error('\n❌ LỖI NGHIÊM TRỌNG:', e);
  process.exit(1);
});
