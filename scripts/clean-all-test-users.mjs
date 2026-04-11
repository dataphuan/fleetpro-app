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
  console.log('🧹 BẮT ĐẦU DỌN DẸP TOÀN BỘ RÁC TỪ CÁC LẦN TEST TRƯỚC...');

  // 1. Delete Firestore users that are test/demo accounts
  const usersRef = await db.collection('users').get();
  
  let deletedCount = 0;
  for (const doc of usersRef.docs) {
    const data = doc.data();
    const email = (data.email || '').toLowerCase();
    const isTest = 
       email.includes('test') || 
       email.includes('demo') || 
       email.includes('audit') || 
       email.includes('qa') || 
       doc.id.startsWith('user_');
       
    // Delete if it's a test/demo account, OR if it matches our core accounts (to assure clean recreation)
    if (isTest || coreAccounts.some(a => a.email === email)) {
       await doc.ref.delete();
       console.log(` - Đã xóa Firestore Test/Demo rác: ${doc.id} (${email})`);
       deletedCount++;
    }
  }
  console.log(`✅ Đã dọn dẹp ${deletedCount} tài liệu users test trên Firestore.`);

  // 2. Delete ALL Auth users since the only Auth users right now are demo, except maybe others? 
  // Let's do selective delete just in case, or list them and delete all 'demo/test' from Auth too.
  const authUsers = await auth.listUsers(1000);
  for (const u of authUsers.users) {
      const email = (u.email || '').toLowerCase();
      const isTest = email.includes('test') || email.includes('demo') || email.includes('audit') || email.includes('qa');
      if (isTest || coreAccounts.some(a => a.email === email)) {
         await auth.deleteUser(u.uid);
         console.log(` - Đã xóa Auth Test/Demo rác: ${u.uid} (${email})`);
      }
  }

  console.log('\n🌟 ĐANG TẠO LẠI 4 TÀI KHOẢN CHUẨN...');
  
  for (const acc of coreAccounts) {
     console.log(`\n===================`);
     console.log(`🔄 Tạo ${acc.email}...`);
     
     // Create Auth user
     const userRecord = await auth.createUser({
       email: acc.email,
       password: acc.password,
       displayName: acc.displayName
     });
     console.log(` - Firebase Auth: ${userRecord.uid}`);
     
     // Set claims
     await auth.setCustomUserClaims(userRecord.uid, {
       role: acc.role,
       tenant_id: DEMO_TENANT_ID,
       demo: true
     });
     
     // Create Firestore doc
     await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: acc.email,
        full_name: acc.displayName, // FleetPro uses full_name
        role: acc.role,
        tenant_id: DEMO_TENANT_ID,
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
     }, {merge: true});
     
     console.log(` - Đã gắn Tenant: ${DEMO_TENANT_ID}`);
  }
}

run().then(() => {
  console.log('\n✅✅✅ XONG! DATABASE ĐÃ SẠCH SẼ VÀ CHỈ CÒN NHỮNG TÀI KHOẢN CHUẨN MỰC.');
  process.exit(0);
}).catch(e => {
  console.error('\n❌ CÓ LỖI:', e);
  process.exit(1);
});
