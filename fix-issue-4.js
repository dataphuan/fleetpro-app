#!/usr/bin/env node
/**
 * URGENT: Create Firestore Tenants - Issue #4 FIX
 * Usage: node fix-issue-4.js
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function fixIssue4() {
  console.log('🚀 ISSUE #4 FIX: Creating Firestore Tenants\n');
  
  try {
    // Load service account with fleetpro-app project
    const projectRoot = path.resolve(__dirname, '..');
    const serviceAccountPath = path.join(projectRoot, 'fleetpro-app-service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Service account not found');
      process.exit(1);
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const projectId = 'fleetpro-app'; // Always use fleetpro-app project
    
    // OAuth token to use Firestore REST API
    console.log('📌 Note: This script requires manual Firestore setup OR');
    console.log('   Run: firebase firestore:documents:create tenants/internal-tenant-1 --data "{...}"\n');
    
    console.log('🔗 Firestore REST API Alternative:\n');
    
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    
    const tenants = [
      {
        id: 'internal-tenant-1',
        fields: {
          name: { stringValue: 'Tenant Alpha' },
          status: { stringValue: 'active' },
          tier: { stringValue: 'standard' },
          region: { stringValue: 'us-east-1' },
          created_at: { integerValue: '1711804800' },
          owner_email: { stringValue: 'admin@tenant-a.example.com' },
          domain: { stringValue: 'tenant-a.example.com' },
          app_name: { stringValue: 'FleetPro Alpha' }
        }
      },
      {
        id: 'internal-tenant-2',
        fields: {
          name: { stringValue: 'Tenant Beta' },
          status: { stringValue: 'active' },
          tier: { stringValue: 'standard' },
          region: { stringValue: 'us-east-1' },
          created_at: { integerValue: '1711804800' },
          owner_email: { stringValue: 'admin@tenant-b.example.com' },
          domain: { stringValue: 'tenant-b.example.com' },
          app_name: { stringValue: 'FleetPro Beta' }
        }
      }
    ];
    
    console.log('✅ Tenant 1 (Internal-Tenant-Alpha):');
    console.log(`  - Name: Tenant Alpha`);
    console.log(`  - Status: Active`);
    console.log(`  - Owner: admin@tenant-a.example.com\n`);
    
    console.log('✅ Tenant 2 (Internal-Tenant-Beta):');
    console.log(`  - Name: Tenant Beta`);
    console.log(`  - Status: Active`);
    console.log(`  - Owner: admin@tenant-b.example.com\n`);
    
    console.log('📝 To create documents, use one of these methods:\n');
    
    console.log('METHOD 1: Firebase Console (Easiest)');
    console.log('  1. Open: https://console.firebase.google.com/project/fleetpro-app/firestore');
    console.log('  2. Click "Start collection" → ID: tenants');
    console.log('  3. Add document ID: internal-tenant-1 (custom ID)');
    console.log('  4. Add fields as shown above');
    console.log('  5. Repeat for internal-tenant-2\n');
    
    console.log('METHOD 2: Firebase CLI');
    console.log('  firebase firestore:documents:create tenants/internal-tenant-1 --data \\');
    console.log('    \'{"name":"Tenant Alpha","status":"active","tier":"standard","region":"us-east-1","created_at":1711804800,"owner_email":"admin@tenant-a.example.com","domain":"tenant-a.example.com","app_name":"FleetPro Alpha"}\'');
    console.log('  firebase firestore:documents:create tenants/internal-tenant-2 --data \\');
    console.log('    \'{"name":"Tenant Beta","status":"active","tier":"standard","region":"us-east-1","created_at":1711804800,"owner_email":"admin@tenant-b.example.com","domain":"tenant-b.example.com","app_name":"FleetPro Beta"}\'\n');
    
    console.log('METHOD 3: Node Script with Admin SDK');
    console.log('  Requires service account with correct project (fleetpro-app) permissions\n');
    
    console.log('⏱️  ETA: 3-5 minutes to complete\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixIssue4();
