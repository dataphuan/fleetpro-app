#!/usr/bin/env node
/**
 * DEMO ACCOUNTS SETUP - 4 Full-Access Demo Accounts
 * 
 * Creates 4 demo accounts with complete permissions:
 * 1. Admin Demo - Full system access
 * 2. Dispatcher Demo - Full dispatch & monitoring
 * 3. Driver Demo - Full driver features (mobile)
 * 4. Accountant Demo - Full reconciliation access
 * 
 * All accounts: NO TIME LIMIT, UNLIMITED VEHICLES, NO QUOTA RESTRICTIONS
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './fleetpro-app-service-account.json';

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
    permissions: {
      tenant_management: true,
      user_management: true,
      billing: true,
      reports: true,
      audit_logs: true,
      system_config: true,
    },
  },
  {
    email: 'dispatcher@demo.tnc.io.vn',
    password: 'Demo@2024123',
    displayName: 'Dispatcher - TNC Demo',
    role: 'dispatcher',
    access: 'full-access',
    permissions: {
      trip_management: true,
      vehicle_assignment: true,
      driver_dispatch: true,
      real_time_tracking: true,
      incident_management: true,
      reports: true,
    },
  },
  {
    email: 'driver@demo.tnc.io.vn',
    password: 'Demo@2024123',
    displayName: 'Driver - TNC Demo',
    role: 'driver',
    access: 'full-access',
    permissions: {
      trip_tracking: true,
      vehicle_inspection: true,
      media_capture: true,
      document_upload: true,
      location_checkin: true,
      trip_reporting: true,
    },
  },
  {
    email: 'accountant@demo.tnc.io.vn',
    password: 'Demo@2024123',
    displayName: 'Accountant - TNC Demo',
    role: 'accountant',
    access: 'full-access',
    permissions: {
      trip_reconciliation: true,
      invoice_management: true,
      cost_analysis: true,
      financial_reports: true,
      expense_tracking: true,
      audit_logs: true,
    },
  },
];

async function createDemoAccounts() {
  console.log('🚀 Creating 4 Demo Accounts with Full Access\n');
  console.log('═'.repeat(70));

  const results: Array<{
    email: string;
    uid: string;
    role: string;
    status: string;
  }> = [];

  for (const account of demoAccounts) {
    try {
      console.log(`\n📝 Creating: ${account.displayName}`);
      console.log(`   Email: ${account.email}`);
      console.log(`   Role: ${account.role}`);

      // Create Firebase Auth user
      let userRecord: UserRecord;
      try {
        userRecord = await auth.getUserByEmail(account.email);
        console.log(`   ℹ️  Already exists (UID: ${userRecord.uid})`);
      } catch {
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
            permissions: account.permissions,
            demo: true,
            unlimited: true,
            quotas: {
              vehicles: -1, // Unlimited
              drivers: -1, // Unlimited
              trips: -1, // Unlimited
              storage_gb: -1, // Unlimited
            },
            billing: {
              plan: 'business',
              status: 'active',
              trial_end_date: null, // No trial end
              subscription_end_date: null, // No expiration
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
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
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

function generateCredentialsMarkdown(accounts: DemoAccount[]): string {
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

**Permissions:**
- ✅ Tenant Management
- ✅ User Management
- ✅ Billing & Payments
- ✅ Reports & Analytics
- ✅ Audit Logs
- ✅ System Configuration

**Use Cases:**
- Complete system configuration
- User account management
- Billing & subscription setup
- System monitoring

---

### 2. Dispatcher Account
**Email:** \`${accounts[1].email}\`  
**Password:** \`${accounts[1].password}\`  
**Role:** Dispatcher - Full Dispatch Access  
**Tenant:** \`demo-tenant-tnc-001\`  
**Access Level:** UNLIMITED  

**Permissions:**
- ✅ Trip Management (create/edit/delete)
- ✅ Vehicle Assignment
- ✅ Driver Dispatch
- ✅ Real-time Tracking
- ✅ Incident Management
- ✅ Reports & Analytics

**Use Cases:**
- Create and assign trips
- Monitor live vehicle tracking
- Handle incidents and alerts
- Dispatch decision-making

---

### 3. Driver Account
**Email:** \`${accounts[2].email}\`  
**Password:** \`${accounts[2].password}\`  
**Role:** Driver - Full Driver Features  
**Tenant:** \`demo-tenant-tnc-001\`  
**Access Level:** UNLIMITED  

**Permissions:**
- ✅ Trip Tracking & Navigation
- ✅ Vehicle Inspection (Pre/Post-Trip)
- ✅ Media Capture (📸 📹 🎙️)
- ✅ Document Upload
- ✅ Location Check-in
- ✅ Trip Reporting

**Use Cases:**
- Mobile trip tracking
- Vehicle condition reporting
- Evidence capture (photos/video/audio)
- Real-time location updates

---

### 4. Accountant Account
**Email:** \`${accounts[3].email}\`  
**Password:** \`${accounts[3].password}\`  
**Role:** Accountant - Full Finance Access  
**Tenant:** \`demo-tenant-tnc-001\`  
**Access Level:** UNLIMITED  

**Permissions:**
- ✅ Trip Reconciliation
- ✅ Invoice Management
- ✅ Cost Analysis
- ✅ Financial Reports
- ✅ Expense Tracking
- ✅ Audit Logs

**Use Cases:**
- Reconcile completed trips
- Generate financial reports
- Analyze transportation costs
- Track expenses and invoices

---

## System Configuration

### Quotas (All Unlimited)
- **Vehicles:** Unlimited (no vehicle limit)
- **Drivers:** Unlimited (no driver limit)
- **Trips:** Unlimited (no trip limit)
- **Storage:** Unlimited (no storage limit)

### Billing Status
- **Plan:** Business (Full Access)
- **Status:** Active
- **Trial Period:** None (No expiration)
- **Subscription:** No end date

### Demo Flags
- **Demo Account:** Yes (flagged for analytics)
- **Demo Tenant:** demo-tenant-tnc-001
- **Unlimited Access:** Yes

---

## Quick Start Guide

### For Testing Admin Features:
\`\`\`
1. Login as: admin@demo.tnc.io.vn
2. Navigate to: http://localhost:5173/admin
3. Create test users, vehicles, drivers
4. Configure billing & plans
5. View system audit logs
\`\`\`

### For Testing Dispatch Operations:
\`\`\`
1. Login as: dispatcher@demo.tnc.io.vn
2. Navigate to: http://localhost:5173/dispatch
3. Create trips and assign drivers
4. Monitor real-time vehicle tracking
5. Manage incidents & exceptions
\`\`\`

### For Testing Driver Mobile App:
\`\`\`
1. Login as: driver@demo.tnc.io.vn
2. Navigate to: http://localhost:5173/driver/menu
3. Pre-trip vehicle inspection
4. Start trip tracking
5. Capture photos/videos/audio
6. Complete post-trip report
\`\`\`

### For Testing Finance Features:
\`\`\`
1. Login as: accountant@demo.tnc.io.vn
2. Navigate to: http://localhost:5173/accounting
3. Reconcile trips
4. Generate reports
5. Analyze costs
\`\`\`

---

## Important Notes

⚠️ **Do NOT use in production**  
These accounts are strictly for demonstration and testing purposes.

✅ **Complete Feature Access**  
All features enabled - no trial restrictions, no quota limits.

📊 **Full Data Access**  
Can create unlimited test data (vehicles, trips, drivers).

🔐 **Secure Password**  
Must change password on first production use.

---

## Testing Scenario

### Complete Demo Workflow:

1. **Admin Setup** (5 min)
   - Login as admin@demo.tnc.io.vn
   - Create 5 test vehicles
   - Create 3 test drivers

2. **Dispatch Operations** (10 min)
   - Login as dispatcher@demo.tnc.io.vn
   - Create 3 trips with the test vehicles
   - Assign drivers to trips

3. **Driver Mobile** (15 min)
   - Login as driver@demo.tnc.io.vn
   - Complete pre-trip inspection
   - Start trip tracking
   - Capture test media (camera/video/audio)
   - Complete post-trip report

4. **Finance Review** (10 min)
   - Login as accountant@demo.tnc.io.vn
   - View completed trips
   - Reconcile trip data
   - Generate sample report

**Total Time:** ~40 minutes for complete workflow demo

---

## Support & Troubleshooting

### If you cannot login:
1. Clear browser cache/cookies
2. Check email is correct (case-sensitive)
3. Verify Firebase connection
4. Check auth logs for errors

### If features are unavailable:
1. Verify user role in Firestore
2. Check custom claims in Auth
3. Verify tenant_id matches
4. Review user permissions document

### If data is not visible:
1. Ensure you're in the correct tenant
2. Check Firestore security rules
3. Verify user has document access
4. Check browser console for errors

---

## Next Steps

1. ✅ Test all 4 demo accounts
2. ✅ Verify unlimited vehicle creation
3. ✅ Test media capture features (camera/video/audio)
4. ✅ Confirm 4-step trip workflow
5. ✅ Validate pricing tier display
6. ✅ Test PayPal/MoMo payment buttons
7. ✅ Generate sample reports

---

**Generated:** ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}  
**Status:** ✅ Ready for Demo  
**Demo Tenant:** \`demo-tenant-tnc-001\`
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
