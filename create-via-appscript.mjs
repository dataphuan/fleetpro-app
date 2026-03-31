#!/usr/bin/env node

import fetch from 'node-fetch';

async function createTestTenants() {
  console.log('🚀 Creating Test Tenants via Apps Script\n');
  
  const webapp = 'https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec';
  
  const tenants = [
    {
      tenant_id: 'internal-tenant-1',
      tenant_name: 'Tenant Alpha',
      domain: 'tenant-a.example.com',
      status: 'active'
    },
    {
      tenant_id: 'internal-tenant-2',
      tenant_name: 'Tenant Beta',
      domain: 'tenant-b.example.com',
      status: 'active'
    }
  ];
  
  try {
    // First, try to list existing tenants
    console.log('Checking existing tenants...\n');
    const listRes = await fetch(`${webapp}?action=list&resource=tenants`);
    const tenantList = await listRes.json();
    console.log('Existing tenants:', tenantList);
    console.log();
    
    // Try different POST types to see if any work for creating tenants
    const postTypes = [
      { type: 'upsert', resource: 'tenants', rows: tenants  },
      { type: 'createTenant', tenants: tenants },
      {type: 'addTenant', data: tenants[0] },
    ];
    
    for (const payload of postTypes) {
      console.log(`Trying POST type: ${payload.type || Object.keys(payload)[0]}`);
      console.log(`Payload:`, JSON.stringify(payload).substring(0, 100) + '...\n');
      
      try {
        const res = await fetch(webapp, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const text = await res.text();
        let data = text;
        try {
          data = JSON.parse(text);
        } catch {}
        
        console.log(`Response:`, JSON.stringify(data).substring(0, 150) + '...\n');
      } catch (err) {
        console.log(`Error:`, err.message, '\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestTenants();
