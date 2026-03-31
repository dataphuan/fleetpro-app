#!/usr/bin/env node
/**
 * URGENT: Create Firestore Tenants - Issue #4 FIX
 * Usage: node fix-issue-4.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fixIssue4() {
  console.log('🚀 ISSUE #4 FIX: Creating Firestore Tenants\n');
  
  try {
    // Load service account
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Service account not found at:', serviceAccountPath);
      process.exit(1);
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'fleetpro-app'
    });
    
    const db = admin.firestore();
    
    console.log('📝 Creating Firestore Documents...\n');
    
    // Tenant 1
    const tenant1Data = {
      name: 'Tenant Alpha',
      status: 'active',
      tier: 'standard',
      region: 'us-east-1',
      created_at: 1711804800,
      owner_email: 'admin@tenant-a.example.com',
      domain: 'tenant-a.example.com',
      app_name: 'FleetPro Alpha'
    };
    
    // Tenant 2
    const tenant2Data = {
      name: 'Tenant Beta',
      status: 'active',
      tier: 'standard',
      region: 'us-east-1',
      created_at: 1711804800,
      owner_email: 'admin@tenant-b.example.com',
      domain: 'tenant-b.example.com',
      app_name: 'FleetPro Beta'
    };
    
    // Write documents
    await db.collection('tenants').doc('internal-tenant-1').set(tenant1Data);
    console.log('✅ Created: tenants/internal-tenant-1');
    
    await db.collection('tenants').doc('internal-tenant-2').set(tenant2Data);
    console.log('✅ Created: tenants/internal-tenant-2');
    
    console.log('\n✨ SUCCESS: Firestore tenants created!');
    console.log('\n📊 Document Details:');
    console.log('  internal-tenant-1: Tenant Alpha (active)');
    console.log('  internal-tenant-2: Tenant Beta (active)');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'PERMISSION_DENIED') {
      console.error('   → Service account lacks Firestore write permissions');
    }
    process.exit(1);
  }
}

fixIssue4();
