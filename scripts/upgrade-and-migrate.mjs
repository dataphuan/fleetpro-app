import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('fleetpro-app-service-account.json', 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function runUpgrade() {
  console.log('🚀 Starting Data Migration and Premium Upgrade Audit...');

  // 1. Migrate companySettings -> company_settings
  console.log('--- Phase 1: Migrating Collections ---');
  const oldSettings = await db.collection('companySettings').get();
  console.log(`Found ${oldSettings.size} documents in legacy companySettings.`);
  
  for (const doc of oldSettings.docs) {
    const data = doc.data();
    // Use tenant_id as document ID or original ID if tenant_id missing
    const newId = data.tenant_id ? `${data.tenant_id}_main` : doc.id;
    await db.collection('company_settings').doc(newId).set({
      ...data,
      updated_at: new Date().toISOString()
    }, { merge: true });
    console.log(`Migrated: ${doc.id} -> ${newId}`);
  }

  // 2. Upgrade specific tenants to PRO
  console.log('\n--- Phase 2: Upgrading Strategic Tenants to PRO ---');
  const strategicTenants = [
    'internal-tenant-1',        // Demo Tenant
    'internal-tenant-phuan',    // Phú An Tenant
    'tenant-phuan-1e5c'         // Any other Phuan variant found in earlier audits
  ];

  for (const tid of strategicTenants) {
    const settingsSnap = await db.collection('company_settings').where('tenant_id', '==', tid).get();
    if (settingsSnap.empty) {
      console.log(`[!] Setting up new PRO settings for ${tid}`);
      await db.collection('company_settings').doc(`${tid}_main`).set({
        tenant_id: tid,
        company_name: tid.includes('phuan') ? 'Công ty Phú An' : 'FleetPro Demo',
        subscription: {
          plan: 'pro',
          status: 'active',
          trial_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        updated_at: new Date().toISOString()
      }, { merge: true });
    } else {
      for (const doc of settingsSnap.docs) {
        await doc.ref.update({
          'subscription.plan': 'pro',
          'subscription.status': 'active',
          'subscription.trial_ends_at': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        });
        console.log(`Upgraded to PRO: ${tid} (${doc.id})`);
      }
    }
  }

  // 3. Audit Demo User Roles 
  console.log('\n--- Phase 3: Auditing Demo Roles (MAP Alignment) ---');
  const demoAccounts = [
    { email: 'admindemo@tnc.io.vn', role: 'admin' },
    { email: 'quanlydemo@tnc.io.vn', role: 'manager' }, // Merged Dispatcher duties
    { email: 'ketoandemo@tnc.io.vn', role: 'accountant' },
    { email: 'taixedemo@tnc.io.vn', role: 'driver' }
  ];

  for (const acc of demoAccounts) {
    const userSnap = await db.collection('users').where('email', '==', acc.email).get();
    if (!userSnap.empty) {
      const uDoc = userSnap.docs[0];
      await uDoc.ref.update({
        role: acc.role,
        tenant_id: 'internal-tenant-1',
        updated_at: new Date().toISOString()
      });
      console.log(`Verified Role: ${acc.email} -> ${acc.role}`);
    } else {
      console.log(`[!] Warning: Demo account ${acc.email} missing from Firestore.`);
    }
  }

  console.log('\n✅ Upgrade Complete!');
}

runUpgrade().catch(console.error);
