#!/usr/bin/env node
/**
 * DEMO ACCOUNTS SETUP - 4 Full-Access Demo Accounts
 * Creates 4 demo accounts with complete permissions and NO LIMITS
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app',
});

const db = admin.firestore();
const auth = admin.auth();

// Demo Tenant ID
const DEMO_TENANT_ID = 'demo-tenant-tnc-001';

// 4 Demo Accounts Configuration
const demoAccounts = [
  {
    email: 'admin@demo.tnc.io.vn',
    password: 'Demo@2024123',
    displayName: 'Admin - TNC Demo',
    role: 'admin',
    access: 'full-access',
  },
  {
    email: 'dispatcher@demo.tnc.io.vn',
    password: 'Demo@2024123',
    displayName: 'Dispatcher - TNC Demo',
    role: 'dispatcher',
    access: 'full-access',
  },
  {
    email: 'driver@demo.tnc.io.vn',
    password: 'Demo@2024123',
    displayName: 'Driver - TNC Demo',
    role: 'driver',
    access: 'full-access',
  },
  {
    email: 'accountant@demo.tnc.io.vn',
    password: 'Demo@2024123',
    displayName: 'Accountant - TNC Demo',
    role: 'accountant',
    access: 'full-access',
  },
];

async function createDemoAccounts() {
  console.log('🚀 Creating 4 Demo Accounts with Full Access\n');
  console.log('═'.repeat(70));

  const results = [];

  for (const account of demoAccounts) {
    try {
      console.log(`\n📝 Creating: ${account.displayName}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Role: ${account.role}`);

      // Create Firebase Auth user
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(account.email);
        console.log(`   ℹ️  Already exists (UID: ${userRecord.uid})`);
      } catch (error) {
        userRecord = await auth.createUser({
          email: account.email,
          password: account.password,
          displayName: account.displayName,
        });
        console.log(`   ✅ Auth user created (UID: ${userRecord.uid})`);
      }

      // Set custom claims for role-based access
      await auth.setCustomUserClaims(userRecord.uid, {
        role: account.role,
        tenant_id: DEMO_TENANT_ID,
        demo: true,
        unlimited: true,
      });
      console.log(`   ✅ Custom claims set`);

      // Create user document in Firestore
      await db
        .collection('tenants')
        .doc(DEMO_TENANT_ID)
        .collection('users')
        .doc(userRecord.uid)
        .set(
          {
            uid: userRecord.uid,
            email: account.email,
            displayName: account.displayName,
            role: account.role,
            tenant_id: DEMO_TENANT_ID,
            status: 'active',
            access: 'full-access',
            demo: true,
            unlimited: true,
            quotas: {
              vehicles: -1,
              drivers: -1,
              trips: -1,
              storage_gb: -1,
            },
            billing: {
              plan: 'business',
              status: 'active',
              trial_end_date: null,
              subscription_end_date: null,
              unlimited: true,
            },
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

      console.log(`   ✅ Firestore user document created`);

      results.push({
        email: account.email,
        uid: userRecord.uid,
        role: account.role,
        status: '✅ SUCCESS',
      });
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        email: account.email,
        uid: 'ERROR',
        role: account.role,
        status: '❌ FAILED',
      });
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n📊 SUMMARY\n');

  results.forEach((r) => {
    console.log(`${r.status} | ${r.email} (${r.role})`);
  });

  const successful = results.filter((r) => r.uid !== 'ERROR').length;
  console.log(`\n✅ Successfully created: ${successful}/${demoAccounts.length} accounts`);

  // Save credentials to file
  const credentialsPath = path.join(process.cwd(), 'DEMO_CREDENTIALS.md');
  const credentialsContent = generateCredentialsMarkdown(demoAccounts);

  fs.writeFileSync(credentialsPath, credentialsContent);
  console.log(`\n📄 Credentials saved to: ${credentialsPath}`);

  console.log('\n' + '═'.repeat(70));
  console.log('\n🎉 DEMO ACCOUNTS READY FOR TESTING\n');
}

function generateCredentialsMarkdown(accounts) {
  return `# 🎯 FleetPro Demo Accounts - Full Access

## Setup Date: ${new Date().toISOString()}

All demo accounts are configured with **UNLIMITED** access and **NO RESTRICTIONS**.

---

## Account Credentials

### 1. Admin Account
**Email:** \`${accounts[0].email}\`  
**Password:** \`${accounts[0].password}\`  
**Role:** Admin - Full System Access  
**Tenant:** \`demo-tenant-tnc-001\`  
**Access Level:** UNLIMITED  

**Features:**
- ✅ System Management
- ✅ User Management
- ✅ Billing & Payments
- ✅ Reports & Analytics
- ✅ Audit Logs
- ✅ System Configuration

---

### 2. Dispatcher Account
**Email:** \`${accounts[1].email}\`  
**Password:** \`${accounts[1].password}\`  
**Role:** Dispatcher - Full Dispatch Access  
**Tenant:** \`demo-tenant-tnc-001\`  
**Access Level:** UNLIMITED  

**Features:**
- ✅ Trip Management
- ✅ Vehicle Assignment
- ✅ Driver Dispatch
- ✅ Real-time Tracking
- ✅ Incident Management
- ✅ Reports & Analytics

---

### 3. Driver Account
**Email:** \`${accounts[2].email}\`  
**Password:** \`${accounts[2].password}\`  
**Role:** Driver - Full Driver Features  
**Tenant:** \`demo-tenant-tnc-001\`  
**Access Level:** UNLIMITED  

**Features:**
- ✅ Trip Tracking
- ✅ Vehicle Inspection (Pre/Post-Trip)
- ✅ Media Capture (📸 📹 🎙️)
- ✅ Document Upload
- ✅ Location Check-in
- ✅ Trip Reporting

---

### 4. Accountant Account
**Email:** \`${accounts[3].email}\`  
**Password:** \`${accounts[3].password}\`  
**Role:** Accountant - Full Finance Access  
**Tenant:** \`demo-tenant-tnc-001\`  
**Access Level:** UNLIMITED  

**Features:**
- ✅ Trip Reconciliation
- ✅ Invoice Management
- ✅ Cost Analysis
- ✅ Financial Reports
- ✅ Expense Tracking
- ✅ Audit Logs

---

## System Configuration

### Quotas - ALL UNLIMITED ✅
- **Vehicles:** Unlimited (no limit)
- **Drivers:** Unlimited (no limit)
- **Trips:** Unlimited (no limit)
- **Storage:** Unlimited (no limit)

### Billing Status - NO RESTRICTIONS ✅
- **Plan:** Business (Full Access)
- **Status:** Active
- **Trial Period:** None
- **Subscription:** No end date

### Features Enabled - ALL ✅
- 📸 Camera capture
- 🎥 Video recording
- 🎙️ Audio recording
- 📍 GPS tracking
- 💳 Payment processing
- 📊 Advanced reports
- 🔍 Audit logs

---

## Quick Start

### Test Admin Panel:
\`\`\`
Email: admin@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173/admin
\`\`\`

### Test Dispatcher:
\`\`\`
Email: dispatcher@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173/dispatch
\`\`\`

### Test Driver Mobile:
\`\`\`
Email: driver@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173/driver/menu
\`\`\`

### Test Accounting:
\`\`\`
Email: accountant@demo.tnc.io.vn
Password: Demo@2024123
URL: http://localhost:5173/accounting
\`\`\`

---

**Generated:** ${new Date().toLocaleString('vi-VN')}  
**Demo Tenant:** \`demo-tenant-tnc-001\`  
**Status:** ✅ Ready for Demo Testing
`;
}

// Run the script
createDemoAccounts()
  .then(() => {
    console.log('✅ Demo accounts setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
