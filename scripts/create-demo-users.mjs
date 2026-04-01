#!/usr/bin/env node
/**
 * Create Firebase Auth users for demo purposes
 * Run: node scripts/create-demo-users.mjs
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'fleetpro-app-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const auth = admin.auth();
const db = admin.firestore();

const DEMO_USERS = [
  {email: 'demo.admin@fleetpro.vn', password: 'Demo123!', full_name: 'Demo Admin', role: 'admin'},
  {email: 'demo.manager@fleetpro.vn', password: 'Demo123!', full_name: 'Demo Manager', role: 'manager'},
  {email: 'demo.dispatcher@fleetpro.vn', password: 'Demo123!', full_name: 'Demo Dispatcher', role: 'dispatcher'},
  {email: 'demo.accountant@fleetpro.vn', password: 'Demo123!', full_name: 'Demo Accountant', role: 'accountant'},
  {email: 'demo.driver@fleetpro.vn', password: 'Demo123!', full_name: 'Demo Driver', role: 'driver'},
  {email: 'demo.viewer@fleetpro.vn', password: 'Demo123!', full_name: 'Demo Viewer', role: 'viewer'}
];

async function createDemoUsers() {
  console.log('🚀 Creating demo Firebase Auth users...\n');

  try {
    for (const userData of DEMO_USERS) {
      try {
        // Check if user already exists
        const existingUser = await auth.getUserByEmail(userData.email);
        console.log(`⚠️  User ${userData.email} already exists (UID: ${existingUser.uid})`);

        // Update Firestore user document
        await db.collection('users').doc(existingUser.uid).set({
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          status: 'active',
          tenant_id: 'internal-tenant-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { merge: true });

        console.log(`✅ Updated Firestore user document for ${userData.email}`);

      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new user
          const userRecord = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.full_name,
            emailVerified: true
          });

          console.log(`✅ Created Auth user: ${userData.email} (UID: ${userRecord.uid})`);

          // Create Firestore user document
          await db.collection('users').doc(userRecord.uid).set({
            email: userData.email,
            full_name: userData.full_name,
            role: userData.role,
            status: 'active',
            tenant_id: 'internal-tenant-1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          console.log(`✅ Created Firestore user document for ${userData.email}`);

        } else {
          console.error(`❌ Error with ${userData.email}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Demo users creation complete!');
    console.log('\n📋 Demo Login Credentials:');
    DEMO_USERS.forEach(user => {
      console.log(`   ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
    });
    console.log('\n💡 You can now login to FleetPro app with these credentials');

  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  } finally {
    admin.app().delete();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDemoUsers();
}

export { createDemoUsers };