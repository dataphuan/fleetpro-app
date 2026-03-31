#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createTenantsViaREST() {
  console.log('🚀 ISSUE #4 FIX: Creating Firestore Tenants via REST API\n');
  
  try {
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    console.log('Step 1: Generate JWT from service account...\n');
    
    // Create JWT for OAuth
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    
    const token = jwt.sign(payload, serviceAccount.private_key, {
      algorithm: 'RS256'
    });
    
    console.log('✅ JWT generated\n');
    
    console.log('Step 2: Exchange JWT for OAuth access token...\n');
    
    // Get access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token
      })
    });
    
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }
    
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    
    console.log('✅ OAuth token obtained\n');
    
    console.log('Step 3: Create Firestore documents...\n');
    
    const projectId = 'fleetpro-app'; // Firebase project
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tenants`;
    
    const tenants = [
      {
        id: 'internal-tenant-1',
        data: {
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
        data: {
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
    
    for (const tenant of tenants) {
      console.log(`Creating ${tenant.id}...`);
      
      const docRes = await fetch(`${baseUrl}?documentId=${tenant.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: tenant.data
        })
      });
      
      if (!docRes.ok) {
        const error = await docRes.text();
        console.log(`Response status: ${docRes.status}`);
        console.log(`Error: ${error}`);
        throw new Error(`Failed to create ${tenant.id}: ${docRes.status}`);
      }
      
      console.log(`✅ Created: tenants/${tenant.id}\n`);
    }
    
    console.log('✨ SUCCESS: Firestore tenants created!');
    console.log('\n📊 Documents Created:');
    console.log('  ✓ internal-tenant-1: Tenant Alpha');
    console.log('  ✓ internal-tenant-2: Tenant Beta');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTenantsViaREST();
