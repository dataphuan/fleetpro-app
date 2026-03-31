#!/usr/bin/env node
/**
 * Create Firestore documents using REST API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createTenantViaREST() {
  console.log('🚀 ISSUE #4 FIX: Creating Firestore Tenants via REST API\n');
  
  try {
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('❌ Service account not found');
      process.exit(1);
    }
    
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const projectId = serviceAccount.project_id;
    
    console.log(`📌 Project ID: ${projectId}\n`);
    
    // Get access token via JWT
    const JWT = require('jsonwebtoken');
    
    // For now, just show REST API instructions
    console.log('REST API Approach - Create document with curl:\n');
    console.log(`curl -X POST \\
  https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants \\
  -H "Authorization: Bearer <ACCESS_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fields": {
      "name": {"stringValue": "Tenant Alpha"},
      "status": {"stringValue": "active"},
      "tier": {"stringValue": "standard"},
      "region": {"stringValue": "us-east-1"},
      "created_at": {"integerValue": "1711804800"},
      "owner_email": {"stringValue": "admin@tenant-a.example.com"},
      "domain": {"stringValue": "tenant-a.example.com"},
      "app_name": {"stringValue": "FleetPro Alpha"}
    }
  }' \\
  -d '{"documentId": "internal-tenant-1"}'\n`);
    
    console.log('Alternative: Use Firebase Console UI:\n');
    console.log('1. Open https://console.firebase.google.com/project/fleetpro-app/firestore');
    console.log('2. Click "Create collection" → "tenants"');
    console.log('3. Add Document:');
    console.log('   - Document ID (use custom): internal-tenant-1');
    console.log('   - Field: name = Tenant Alpha (string)');
    console.log('   - Field: status = active (string)');
    console.log('   - Field: tier = standard (string)');
    console.log('   - Field: region = us-east-1 (string)');
    console.log('   - Field: created_at = 1711804800 (number)');
    console.log('   - Field: owner_email = admin@tenant-a.example.com (string)');
    console.log('   - Field: domain = tenant-a.example.com (string)');
    console.log('   - Field: app_name = FleetPro Alpha (string)');
    console.log('4. Repeat for internal-tenant-2 with Beta variants\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTenantViaREST();
