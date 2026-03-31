#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminSDK from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createTenants() {
  console.log('🚀 ISSUE #4 FIX: Creating Firestore Tenants\n');
  
  try {
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    console.log('Service Account Loaded:');
    console.log('  Project ID: quanlyxe-484904');
    console.log('  Firebase App: fleetpro-app\n');
    
    // Initialize - use fleetpro-app as projectId (the Firebase config name)
    if (!adminSDK.apps || !adminSDK.apps.length) {
      adminSDK.initializeApp({
        credential: adminSDK.credential.cert(serviceAccount),
        projectId: 'fleetpro-app'  // Use Firebase app name as projectId
      });
      console.log('✅ Firebase Admin SDK Initialized\n');
    }
    
    const db = adminSDK.firestore();
    
    // Now create the two tenant documents
    const tenants = [
      {
        id: 'internal-tenant-1',
        data: {
          name: 'Tenant Alpha',
          status: 'active',
          tier: 'standard',
          region: 'us-east-1',
          created_at: 1711804800,
          owner_email: 'admin@tenant-a.example.com',
          domain: 'tenant-a.example.com',
          app_name: 'FleetPro Alpha'
        }
      },
      {
        id: 'internal-tenant-2',
        data: {
          name: 'Tenant Beta',
          status: 'active',
          tier: 'standard',
          region: 'us-east-1',
          created_at: 1711804800,
          owner_email: 'admin@tenant-b.example.com',
          domain: 'tenant-b.example.com',
          app_name: 'FleetPro Beta'
        }
      }
    ];
    
    console.log('Creating tenant documents...\n');
    for (const tenant of tenants) {
      console.log(`Creating ${tenant.id}...`);
      await db.collection('tenants').doc(tenant.id).set(tenant.data);
      console.log(`✅ Created: tenants/${tenant.id}`);
    }
    
    console.log('\n✨ SUCCESS: Firestore tenants created!');
    console.log('\n📊 Documents Created:');
    console.log('  ✓ internal-tenant-1: Tenant Alpha (active)');
    console.log('  ✓ internal-tenant-2: Tenant Beta (active)');
    console.log('\n⏭️  Next: Re-run Phase C Release Gate test');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 5) {
      console.error('\n💡 Note: If this is a "NOT_FOUND" error, the Firestore database might not');
      console.error('   exist in the fleetpro-app Firebase project.');
      console.error('\n   To fix: Open https://console.firebase.google.com/project/fleetpro-app');
      console.error('   and create a Firestore database for this project.');
    }
    process.exit(1);
  }
}

createTenants();
