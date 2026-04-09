import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../fleetpro-app-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

const KEEP_EMAILS = [
  'admindemo@tnc.io.vn',
  'quanlydemo@tnc.io.vn',
  'ketoandemo@tnc.io.vn',
  'taixedemo@tnc.io.vn'
];

const COMMON_PASS = 'Demo@1234';

const DEMO_TENANT_ID = 'demo-tenant-tnc-001';

const accountConfig = {
  'admindemo@tnc.io.vn': { role: 'admin', displayName: 'Admin Demo' },
  'quanlydemo@tnc.io.vn': { role: 'dispatcher', displayName: 'Quản Lý Demo' },
  'ketoandemo@tnc.io.vn': { role: 'accountant', displayName: 'Kế Toán Demo' },
  'taixedemo@tnc.io.vn': { role: 'driver', displayName: 'Tài Xế Demo' }
};

async function cleanup() {
  console.log('🚀 Starting test accounts cleanup...');
  
  let allUsers = [];
  let pageToken = undefined;

  // 1. Fetch all users
  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);
    allUsers = allUsers.concat(listUsersResult.users);
    pageToken = listUsersResult.pageToken;
  } while (pageToken);

  console.log(`Found ${allUsers.length} total users in Firebase Auth.`);

  // 2. Filter users to delete
  const usersToDelete = allUsers.filter(user => !KEEP_EMAILS.includes(user.email));
  const uidsToDelete = usersToDelete.map(user => user.uid);

  if (uidsToDelete.length > 0) {
    console.log(`Deleting ${uidsToDelete.length} users...`);
    
    // Auth allows deleting 1000 max at a time
    for (let i = 0; i < uidsToDelete.length; i += 1000) {
      const chunk = uidsToDelete.slice(i, i + 1000);
      const deleteResult = await auth.deleteUsers(chunk);
      console.log(`Deleted ${deleteResult.successCount} users. Failed: ${deleteResult.failureCount}`);
      if (deleteResult.failureCount > 0) {
        deleteResult.errors.forEach((err) => {
          console.log(`Failed to delete user:`, err.error.message);
        });
      }
    }
  } else {
    console.log('No extra users to delete.');
  }

  // 3. Ensure the 4 keep users exist and have the correct password / claims
  console.log('\nEnsuring required demo accounts exist and are properly configured...');
  for (const email of KEEP_EMAILS) {
    const config = accountConfig[email];
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log(`[${email}] Exists. Updating password...`);
        userRecord = await auth.updateUser(userRecord.uid, {
          password: COMMON_PASS,
        });
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`[${email}] Creating...`);
          userRecord = await auth.createUser({
            email,
            password: COMMON_PASS,
            displayName: config.displayName
          });
        } else {
          throw err;
        }
      }

      // Ensure custom claims are set
      await auth.setCustomUserClaims(userRecord.uid, {
        role: config.role,
        tenant_id: DEMO_TENANT_ID,
        demo: true,
        unlimited: true,
      });

      // Ensure firestore user doc exists
      await db
        .collection('tenants')
        .doc(DEMO_TENANT_ID)
        .collection('users')
        .doc(userRecord.uid)
        .set(
          {
            uid: userRecord.uid,
            email,
            displayName: config.displayName,
            role: config.role,
            tenant_id: DEMO_TENANT_ID,
            status: 'active',
            access: 'full-access',
            demo: true,
            unlimited: true,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        console.log(`[${email}] Configured successfully!`);
    } catch (error) {
      console.error(`[${email}] Error during setup:`, error);
    }
  }

  console.log('\n✅ Cleanup and configuration complete!');
}

cleanup().catch(console.error);
