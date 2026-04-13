import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load service account (using absolute path for safety)
const root = 'd:/AI-KILLS/V1-quanlyxeonline';
const serviceAccount = JSON.parse(readFileSync(resolve(root, 'fleetpro-app-service-account.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const TENANT_ID = 'internal-tenant-phuan';
const COMPANY_NAME = 'Công ty TNHH Phú An';
const COMMON_PASSWORD = 'Demo@1234';

const userList = [
  { email: 'admin@phuancr.com', role: 'admin', fullName: 'Admin Phú An' },
  { email: 'quanly@phuancr.com', role: 'manager', fullName: 'Quản Lý Phú An' },
  { email: 'ketoan@phuancr.com', role: 'accountant', fullName: 'Kế Toán Phú An' },
  ...Array.from({ length: 15 }, (_, i) => ({
    email: `taixe${i + 1}@phuancr.com`,
    role: 'driver',
    fullName: `Tài xế ${i + 1}`,
    driverCode: `TX${String(i + 1).padStart(4, '0')}`
  }))
];

async function provisionUsers() {
  console.log(`🚀 Starting Provisioning for ${COMPANY_NAME} (${TENANT_ID})...`);

  for (const user of userList) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(user.email);
        console.log(`ℹ️ User ${user.email} already exists in Auth. Updating...`);
        await auth.updateUser(userRecord.uid, {
          password: COMMON_PASSWORD,
          displayName: user.fullName
        });
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            email: user.email,
            password: COMMON_PASSWORD,
            displayName: user.fullName,
            emailVerified: true
          });
          console.log(`✅ Created Auth account for ${user.email}`);
        } else {
          throw e;
        }
      }

      // 2. Sync Firestore User Doc
      const userRef = db.collection('users').doc(userRecord.uid);
      await userRef.set({
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        tenant_id: TENANT_ID,
        company_name: COMPANY_NAME,
        status: 'active',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        // For drivers, link to their driver record
        ...(user.role === 'driver' ? { driver_code: user.driverCode } : {})
      }, { merge: true });

      // 3. If driver, sync the driver record as well
      if (user.role === 'driver' && user.driverCode) {
        // Driver ID format in seed logic: ${tenantId}_drivers_${sourceId}
        const driverId = `${TENANT_ID}_drivers_${user.driverCode}`;
        const driverRef = db.collection('drivers').doc(driverId);
        await driverRef.set({
          user_id: userRecord.uid,
          email: user.email,
          full_name: user.fullName,
          tenant_id: TENANT_ID,
          driver_code: user.driverCode,
          status: 'active'
        }, { merge: true });
        console.log(`🔗 Linked Driver ${user.driverCode} to Auth UID ${userRecord.uid}`);
      }

    } catch (error) {
      console.error(`❌ Error provisioning ${user.email}:`, error.message);
    }
  }

  console.log('✅ All accounts provisioned successfully!');
  process.exit(0);
}

provisionUsers();
