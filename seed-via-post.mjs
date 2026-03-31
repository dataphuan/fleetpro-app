#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedViaPOST() {
  console.log('🚀 Seeding Test Tenants via Apps Script POST\n');
  
  const webapp = 'https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec';
  
  // Try various POST payloads to find a seed/admin endpoint
  const payloads = [
    {
      name: 'Upsert Tenants',
      payload: {
        type: 'upsert',
        resource: 'tenants',
        rows: [
          { tenant_id: 'internal-tenant-1', tenant_name: 'Tenant Alpha', domain: 'tenant-a.example.com', status: 'active' },
          { tenant_id: 'internal-tenant-2', tenant_name: 'Tenant Beta', domain: 'tenant-b.example.com', status: 'active' }
        ]
      }
    },
    {
      name: 'Admin Seed',
      payload: {
        type: 'adminSeed',
        resource: 'tenants',
        data: [
          { id: 'internal-tenant-1', name: 'Tenant Alpha', domain: 'tenant-a.example.com', status: 'active' },
          { id: 'internal-tenant-2', name: 'Tenant Beta', domain: 'tenant-b.example.com', status: 'active' }
        ]
      }
    },
    {
      name: 'Insert Rows',
      payload: {
        type: 'insertRows',
        sheet: 'Tenants',
        rows: [
          ['internal-tenant-1', 'Tenant Alpha', 'tenant-a.example.com', 'active'],
          ['internal-tenant-2', 'Tenant Beta', 'tenant-b.example.com', 'active']
        ]
      }
    },
    {
      name: 'Seed Data',
      payload: {
        type: 'seed',
        tenants: [
          { tenant_id: 'internal-tenant-1', tenant_name: 'Tenant Alpha' },
          { tenant_id: 'internal-tenant-2', tenant_name: 'Tenant Beta' }
        ]
      }
    }
  ];
  
  for (const { name, payload } of payloads) {
    console.log(`\n📝 Trying: ${name}`);
    console.log(`   Payload type: ${payload.type}`);
    
    try {
      const res = await fetch(webapp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeout: 5000
      });
      
      const text = await res.text();
      let data = text;
      try {
        data = JSON.parse(text);
      } catch {}
      
      const resStr = JSON.stringify(data).substring(0, 150);
      console.log(`   ✓ Status ${res.status}: ${resStr}`);
      
      // Check if this worked
      if (data.status === 'ok' || data.status === 'success' || (typeof data === 'object' && data.rowsAdded)) {
        console.log(`   ✅ POSSIBLE SUCCESS!`);
      }
      
    } catch (err) {
      console.log(`   ✗ Error: ${err.message}`);
    }
  }
  
  // After trying all methods, test if tenants are accessible
  console.log('\n\n🧪 Verification: Testing tenant access...\n');
  
  try {
    const cfgRes = await fetch(`${webapp}?action=tenant-config&tenant_id=internal-tenant-1`);
    const cfg = await cfgRes.json();
    
    if (cfg.status === 'ok') {
      console.log('✅ SUCCESS: Tenants are now accessible!');
      console.log('   Ready for Phase C test');
    } else {
      console.log('Status:', cfg.status);
      console.log('Response:', JSON.stringify(cfg).substring(0, 200));
    }
  } catch (err) {
    console.error('Verification error:', err.message);
  }
}

seedViaPOST();
