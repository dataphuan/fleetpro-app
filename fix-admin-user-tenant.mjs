#!/usr/bin/env node
/**
 * Fix Admin User Tenant ID to Match Seeded Data
 * Ensures admin user can access vehicles/drivers in the correct tenant
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const TENANT_ID = 'demo-tenant-tnc-001';
const ADMIN_EMAIL = 'admin@demo.tnc.io.vn';

async function fixAdminUserTenant() {
  console.log('🔧 Fixing Admin User Tenant ID...\n');

  try {
    // Step 1: Find admin user by email
    console.log(`📋 Step 1: Finding admin user (${ADMIN_EMAIL})...`);
    const usersQuery = await db
      .collection('users')
      .where('email', '==', ADMIN_EMAIL)
      .limit(1)
      .get();

    if (usersQuery.empty) {
      console.log('⚠️  Admin user not found in root "users" collection');
      console.log('   Creating admin user document...');
      
      // Create the admin user document
      await db.collection('users').doc('admin_tnc_001').set({
        id: 'admin_tnc_001',
        email: ADMIN_EMAIL,
        full_name: 'Admin - TNC Demo',
        role: 'admin',
        tenant_id: TENANT_ID,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      console.log(`✅ Created admin user with tenant_id: ${TENANT_ID}\n`);
    } else {
      const adminDoc = usersQuery.docs[0];
      const adminData = adminDoc.data();
      const docId = adminDoc.id;

      console.log(`✅ Found admin user: ${docId}`);
      console.log(`   Current tenant_id: ${adminData.tenant_id || 'MISSING'}`);

      // Step 2: Update tenant_id
      if (adminData.tenant_id !== TENANT_ID) {
        console.log(`\n📋 Step 2: Updating tenant_id to ${TENANT_ID}...`);
        await db.collection('users').doc(docId).update({
          tenant_id: TENANT_ID,
          updated_at: new Date().toISOString(),
        });
        console.log(`✅ Updated tenant_id to: ${TENANT_ID}\n`);
      } else {
        console.log(`✅ Tenant ID already correct: ${TENANT_ID}\n`);
      }
    }

    // Step 3: Verify data is accessible
    console.log(`📋 Step 3: Verifying seeded data in tenant "${TENANT_ID}"...`);
    
    const vehicleCount = await db
      .collection('tenants')
      .doc(TENANT_ID)
      .collection('vehicles')
      .count()
      .get();
    
    const driverCount = await db
      .collection('tenants')
      .doc(TENANT_ID)
      .collection('drivers')
      .count()
      .get();

    console.log(`✅ Vehicles in tenant: ${vehicleCount.data().count}`);
    console.log(`✅ Drivers in tenant: ${driverCount.data().count}`);

    if (vehicleCount.data().count > 0 && driverCount.data().count > 0) {
      console.log(`\n✅ SUCCESS! Admin user can now access ${vehicleCount.data().count} vehicles & ${driverCount.data().count} drivers`);
      console.log('\n🔄 Refresh the app to see the data!');
    } else {
      console.log('\n⚠️  Data not found in Firestore tenant');
      console.log('   Run: node scripts/complete-demo-seed.mjs');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdminUserTenant().then(() => process.exit(0));
