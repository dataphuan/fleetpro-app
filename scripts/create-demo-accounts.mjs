#!/usr/bin/env node

/**
 * Create professional demo accounts for FleetPro Online
 * 
 * This script creates demo accounts with professional domain names
 * for SEO and marketing purposes
 * 
 * Demo Accounts:
 * - CEO@demo.tnc.io.vn / Demo@1234
 * - Manager@demo.tnc.io.vn / Demo@1234
 * - Driver@demo.tnc.io.vn / Demo@1234
 * - Developer@demo.tnc.io.vn / Demo@1234
 */

import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app.js';
import { getAuth } from 'firebase-admin/auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'firebase-admin/firestore.js';

// Read Firebase service account
function getServiceAccountKey() {
  const keyPath = path.join(process.cwd(), 'fleetpro-app-service-account.json');
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Service account file not found: ${keyPath}`);
  }
  return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

const serviceAccount = getServiceAccountKey();
const app = initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth(app);
const db = getFirestore(app);

// Demo accounts configuration
const DEMO_ACCOUNTS = [
  {
    email: 'CEO@demo.tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'CEO - FleetPro Demo',
    role: 'admin',
    company: 'FleetPro Demo Company',
    tenantId: 'demo-company',
  },
  {
    email: 'Manager@demo.tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'Manager - FleetPro Demo',
    role: 'manager',
    company: 'FleetPro Demo Company',
    tenantId: 'demo-company',
  },
  {
    email: 'Driver@demo.tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'Driver - FleetPro Demo',
    role: 'driver',
    company: 'FleetPro Demo Company',
    tenantId: 'demo-company',
  },
  {
    email: 'Developer@demo.tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'Developer - FleetPro Demo',
    role: 'admin',
    company: 'FleetPro Demo Company',
    tenantId: 'demo-company',
  },
];

async function createDemoAccount(accountConfig) {
  try {
    console.log(`\n🔧 Creating account: ${accountConfig.email}`);

    // Create user in Firebase Auth
    let user;
    try {
      user = await auth.getUserByEmail(accountConfig.email);
      console.log(`✓ User already exists: ${accountConfig.email} (UID: ${user.uid})`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email: accountConfig.email,
          password: accountConfig.password,
          displayName: accountConfig.displayName,
          emailVerified: true,
        });
        console.log(`✓ Created Firebase Auth user: ${accountConfig.email} (UID: ${user.uid})`);
      } else {
        throw error;
      }
    }

    // Create user profile in Firestore
    const now = new Date().toISOString();
    const userDocData = {
      uid: user.uid,
      email: accountConfig.email,
      full_name: accountConfig.displayName,
      display_name: accountConfig.displayName,
      role: accountConfig.role,
      status: 'active',
      tenant_id: accountConfig.tenantId,
      company_name: accountConfig.company,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      updated_by: 'create-demo-accounts-script',
      record_id: `${accountConfig.tenantId}_users_${user.uid}`,
    };

    await setDoc(doc(db, 'users', user.uid), userDocData, { merge: true });
    console.log(`✓ Created Firestore user profile for: ${accountConfig.email}`);

    // Set custom claims for role-based access
    await auth.setCustomUserClaims(user.uid, {
      role: accountConfig.role,
      tenant_id: accountConfig.tenantId,
    });
    console.log(`✓ Set custom claims: role=${accountConfig.role}, tenant_id=${accountConfig.tenantId}`);

    return user;
  } catch (error) {
    console.error(`✗ Error creating account ${accountConfig.email}:`, error.message);
    throw error;
  }
}

async function createDemoDtenantIfNeeded() {
  try {
    const tenantDoc = doc(db, 'tenants', 'demo-company');
    const tenantSnap = await getDoc(tenantDoc);

    if (!tenantSnap.exists()) {
      console.log('\n🏢 Creating demo tenant: demo-company');
      const now = new Date().toISOString();
      await setDoc(tenantDoc, {
        id: 'demo-company',
        name: 'FleetPro Demo Company',
        status: 'active',
        plan: 'pro',
        is_deleted: 0,
        created_at: now,
        updated_at: now,
        created_by: 'create-demo-accounts-script',
      });
      console.log('✓ Created demo tenant');
    } else {
      console.log('\n✓ Demo tenant already exists: demo-company');
    }
  } catch (error) {
    console.error('Error creating demo tenant:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 FleetPro Demo Accounts Setup');
    console.log('='.repeat(60));

    // Create demo tenant first
    await createDemoDtenantIfNeeded();

    // Create all demo accounts
    console.log('\n📝 Creating demo accounts...\n');
    const createdUsers = [];

    for (const accountConfig of DEMO_ACCOUNTS) {
      const user = await createDemoAccount(accountConfig);
      createdUsers.push({
        email: accountConfig.email,
        password: accountConfig.password,
        role: accountConfig.role,
        uid: user.uid,
      });
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Demo Accounts Created Successfully!');
    console.log('='.repeat(60));

    console.log('\n📋 Demo Account Credentials:');
    console.log('─'.repeat(60));
    createdUsers.forEach((user) => {
      console.log(`\n${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  UID: ${user.uid}`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log('\n💡 Tips:');
    console.log('- All demo accounts share the password: Demo@1234');
    console.log('- Domain: demo.tnc.io.vn (professional for SEO & marketing)');
    console.log('- All accounts belong to tenant: demo-company');
    console.log('- Roles: CEO=admin, Manager=manager, Driver=driver, Developer=admin');

    console.log('\n' + '='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
