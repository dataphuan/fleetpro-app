#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import adminSDK from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testAuth() {
  console.log('🔍 Testing Firebase Admin SDK Auth\n');
  
  try {
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    console.log('Service Account Loaded:');
    console.log('  Project ID:', serviceAccount.project_id);
    console.log('  Client Email:', serviceAccount.client_email);
    
    // Initialize Firebase Admin SDK using project from service account
    console.log('\n📦 Initializing Firebase Admin SDK...\n');
    
    if (!adminSDK.apps || !adminSDK.apps.length) {
      adminSDK.initializeApp({
        credential: adminSDK.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id // Use project from service account!
      });
      console.log('✅ Firebase Admin SDK Initialized');
    }
    
    const db = adminSDK.firestore();
    console.log('✅ Firestore instance created\n');
    
    // Try to get tenants collection info
    console.log('Attempting to access Firestore...');
    const snapshot = await db.collection('tenants').limit(1).get();
    console.log('✅ Successfully queried Firestore!');
    console.log(`   Tenants collection has ${snapshot.size} documents\n`);
    
    console.log('✨ Success! Now will create documents.\n');
    
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
    
    for (const tenant of tenants) {
      console.log(`Creating ${tenant.id}...`);
      await db.collection('tenants').doc(tenant.id).set(tenant.data);
      console.log(`✅ Created: tenants/${tenant.id}`);
    }
    
    console.log('\n✨ SUCCESS: Firestore tenants created!');
    console.log('\n📊 Documents Created:');
    console.log('  ✓ internal-tenant-1: Tenant Alpha (active)');
    console.log('  ✓ internal-tenant-2: Tenant Beta (active)');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  }
}

testAuth();
