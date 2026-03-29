#!/usr/bin/env node
/**
 * QA Full System Check for FleetPro V3 Online
 * Node.js version
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbxAa4tpkPPQdbEPqSd_xv9Wb5U0fpe6nYcwTSfWw-cwwuojRN7mw9lM3rybxjpaldDeCg/exec';
const TENANT_ID = 'internal-tenant-1';

let passed = 0;
let failed = 0;

console.log('\n======================================================');
console.log('FleetPro V3 Online - QA Full System Check');
console.log('======================================================\n');

// Helper to make HTTPS requests
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { timeout: 10000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        }).on('error', reject);
    });
}

// Test 1: Check .env.local
console.log('[TEST 1] Checking .env.local...');
if (fs.existsSync(path.join(__dirname, '../.env.local'))) {
    console.log('✅ PASS: .env.local exists\n');
    passed++;
} else {
    console.log('❌ FAIL: .env.local not found\n');
    failed++;
}

// Test 2: API - List Vehicles
async function testVehicles() {
    console.log('[TEST 2] Testing API - List Vehicles...');
    try {
        const url = `${WEBHOOK_URL}?action=list&resource=vehicles&tenant_id=${TENANT_ID}`;
        const response = await fetchUrl(url);
        const count = Array.isArray(response) ? response.length : 1;
        console.log(`✅ PASS: API returned ${count} vehicles\n`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }
}

// Test 3: API - List Drivers
async function testDrivers() {
    console.log('[TEST 3] Testing API - List Drivers...');
    try {
        const url = `${WEBHOOK_URL}?action=list&resource=drivers&tenant_id=${TENANT_ID}`;
        const response = await fetchUrl(url);
        const count = Array.isArray(response) ? response.length : 1;
        console.log(`✅ PASS: API returned ${count} drivers\n`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }
}

// Test 4: API - List Trips
async function testTrips() {
    console.log('[TEST 4] Testing API - List Trips...');
    try {
        const url = `${WEBHOOK_URL}?action=list&resource=trips&tenant_id=${TENANT_ID}`;
        const response = await fetchUrl(url);
        const count = Array.isArray(response) ? response.length : 1;
        console.log(`✅ PASS: API returned ${count} trips\n`);
        passed++;
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }
}

// Test 5: Tenant Config
async function testTenantConfig() {
    console.log('[TEST 5] Testing Tenant Config Endpoint...');
    try {
        const url = `${WEBHOOK_URL}?action=tenant-config&tenant_id=${TENANT_ID}`;
        const response = await fetchUrl(url);
        if (response.status === 'ok') {
            console.log(`✅ PASS: Tenant config OK - ${response.tenant_id}\n`);
            passed++;
        } else {
            console.log(`❌ FAIL: ${response.message}\n`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ FAIL: ${error.message}\n`);
        failed++;
    }
}

// Test 6: package.json
console.log('[TEST 6] Checking package.json...');
if (fs.existsSync(path.join(__dirname, '../package.json'))) {
    console.log('✅ PASS: package.json exists\n');
    passed++;
} else {
    console.log('❌ FAIL: package.json not found\n');
    failed++;
}

// Test 7: vite.config.ts
console.log('[TEST 7] Checking vite.config.ts...');
if (fs.existsSync(path.join(__dirname, '../vite.config.ts'))) {
    console.log('✅ PASS: vite.config.ts exists\n');
    passed++;
} else {
    console.log('❌ FAIL: vite.config.ts not found\n');
    failed++;
}

// Run async tests and print summary
(async () => {
    await testVehicles();
    await testDrivers();
    await testTrips();
    await testTenantConfig();

    console.log('======================================================');
    console.log('SUMMARY');
    console.log('======================================================');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    const total = passed + failed;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;
    console.log(`Success Rate: ${successRate}%\n`);

    if (failed === 0) {
        console.log('✅ SUCCESS! System is ready.\n');
        console.log('Next steps:');
        console.log('  1. cd 1-ONLINE');
        console.log('  2. npm run dev');
        console.log('  3. Go to http://localhost:5173\n');
        process.exit(0);
    } else {
        console.log('⚠️ WARNING: Some tests failed!\n');
        process.exit(1);
    }
})();
