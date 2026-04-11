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
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const DEMO_TENANT_ID = 'internal-tenant-1';

const accounts = [
  { email: 'admindemo@tnc.io.vn', role: 'admin', displayName: 'Admin Hệ Thống', password: 'Demo@1234' },
  { email: 'quanlydemo@tnc.io.vn', role: 'manager', displayName: 'Quản Lý Vận Hành', password: 'Demo@1234' },
  { email: 'ketoandemo@tnc.io.vn', role: 'accountant', displayName: 'Kế Toán Trưởng', password: 'Demo@1234' },
  { email: 'taixedemo@tnc.io.vn', role: 'driver', displayName: 'Tài Xế Demo', password: 'Demo@1234' }
];

async function run() {
  console.log('🧹 Xóa và khởi tạo lại 4 tài khoản Demo chuẩn...');
  
  for (const acc of accounts) {
     console.log(`\n===================`);
     console.log(`🔄 Đang xử lý ${acc.email}...`);
     
     // 1. Delete Auth user
     try {
       const u = await auth.getUserByEmail(acc.email);
       if (u) {
         await auth.deleteUser(u.uid);
         console.log(` - Đã xóa trên Firebase Auth: ${u.uid}`);
       }
     } catch(e) {
       console.log(' - User không tồn tại trên Firebase Auth');
     }
     
     // 2. Delete Firestore users records
     try {
       const q = await db.collection('users').where('email', '==', acc.email).get();
       for (const doc of q.docs) {
         await doc.ref.delete();
         console.log(` - Đã xóa old user doc trên DB: ${doc.id}`);
       }
     } catch(e) {
       console.log(' - Lỗi xóa Firestore docs:', e.message);
     }
     
     // 3. Create Auth user
     const userRecord = await auth.createUser({
       email: acc.email,
       password: acc.password,
       displayName: acc.displayName
     });
     console.log(` - Đã khởi tạo lại trên Firebase Auth: ${userRecord.uid}`);
     
     // 4. Set claims
     await auth.setCustomUserClaims(userRecord.uid, {
       role: acc.role,
       tenant_id: DEMO_TENANT_ID,
       demo: true
     });
     
     // 5. Create Firestore doc
     await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: acc.email,
        full_name: acc.displayName, // FleetPro data format uses full_name
        role: acc.role,
        tenant_id: DEMO_TENANT_ID,
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
     }, {merge: true});
     
     console.log(` - Đã tạo mới Firestore user document, gắn với tenant: ${DEMO_TENANT_ID}`);
  }
}

run().then(() => {
  console.log('\n✅✅✅ HOÀN TẤT!');
  process.exit(0);
}).catch(e => {
  console.error('\n❌ CÓ LỖI:', e);
  process.exit(1);
});
