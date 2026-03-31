#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function addTenantsToSheet() {
  console.log('🚀 Adding Tenants to Google Sheet via REST API\n');
  
  try {
    // Load service account
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    console.log('📌 Service Account Loaded\n');
    
    // Create JWT for Sheets API
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };
    
    const token = jwt.sign(payload, serviceAccount.private_key, {
      algorithm: 'RS256'
    });
    
    console.log('✅ JWT generated');
    
    // Get access token
    console.log('📌 Exchanging JWT for OAuth token...\n');
    
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
    
    const spreadsheetId = '1SFXH7xwlMAGxjh-Y5PCglkadgxVVe5xRaEZZeewJv_o';
    
    console.log('📝 Adding tenant rows to Tenants sheet...\n');
    
    // Append rows to Tenants sheet
    const values = [
      ['internal-tenant-1', 'Tenant Alpha', 'tenant-a.example.com', 'active'],
      ['internal-tenant-2', 'Tenant Beta', 'tenant-b.example.com', 'active']
    ];
    
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Tenants!A:D:append`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: values,
          valueInputOption: 'RAW'
        })
      }
    );
    
    const appendText = await appendRes.text();
    let appendData = null;
    try {
      appendData = JSON.parse(appendText);
    } catch {
      appendData = { error: appendText };
    }
    
    if (!appendRes.ok) {
      console.error('❌ Append failed:', appendRes.status);
      console.error('Response:', JSON.stringify(appendData).substring(0, 200));
      throw new Error(`Failed to append rows: ${appendRes.status}`);
    }
    
    console.log('✅ Rows added successfully!');
    if (appendData.updates) {
      console.log(`   Rows updated: ${appendData.updates.updatedRows}`);
      console.log(`   Columns updated: ${appendData.updates.updatedColumns}`);
    }
    
    console.log('\n✨ SUCCESS: Tenants added to Google Sheet!');
    console.log('\n📊 Added:');
    console.log('  ✓ internal-tenant-1: Tenant Alpha');
    console.log('  ✓ internal-tenant-2: Tenant Beta');
    
    console.log('\n⏳ Waiting for sheet sync (2 seconds)...');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('\n🧪 Verifying tenants are accessible...\n');
    
    const webapp = 'https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec';
    
    const cfgRes = await fetch(`${webapp}?action=tenant-config&tenant_id=internal-tenant-1`);
    const cfgText = await cfgRes.text();
    let cfg = null;
    try {
      cfg = JSON.parse(cfgText);
    } catch {
      cfg = { raw: cfgText };
    }
    
    console.log('Tenant config response:');
    console.log(JSON.stringify(cfg, null, 2).substring(0, 300) + '...');
    
    if (cfg.status === 'ok') {
      console.log('\n✅ VERIFICATION PASSED: Tenant is accessible!');
      console.log('   Ready for Phase C Release Gate test');
    } else {
      console.log('\n⚠️  Status:', cfg.status);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Service account may need Sheets API scope');
    console.error('   - Check if service account is shared on the spreadsheet');
    console.error('   - Verify Sheets tab name is exactly "Tenants"');
    process.exit(1);
  }
}

addTenantsToSheet();
