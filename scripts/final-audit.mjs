/**
 * 🕵️ FINAL AUDIT CHECK
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));

if (getApps().length === 0) {
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const TENANT_ID = 'internal-tenant-phuan';

async function audit() {
    console.log(`📊 FINAL AUDIT FOR: ${TENANT_ID}`);
    const results = {};
    
    // Vehicles
    const veh = await db.collection('vehicles').where('tenant_id', '==', TENANT_ID).limit(1).get();
    if (!veh.empty) {
        const data = veh.docs[0].data();
        results.vehicles_cols = Object.keys(data).filter(k => k !== 'tenant_id' && k !== 'created_at').length;
        console.log(`✅ Vehicles: Found ${results.vehicles_cols} data fields.`);
    }

    // Drivers
    const drv = await db.collection('drivers').where('tenant_id', '==', TENANT_ID).limit(1).get();
    if (!drv.empty) {
        const data = drv.docs[0].data();
        results.drivers_cols = Object.keys(data).filter(k => k !== 'tenant_id' && k !== 'created_at').length;
        console.log(`✅ Drivers: Found ${results.drivers_cols} data fields.`);
    }

    // Routes
    const rt = await db.collection('routes').where('tenant_id', '==', TENANT_ID).limit(1).get();
    if (!rt.empty) {
        const data = rt.docs[0].data();
        results.routes_cols = Object.keys(data).filter(k => k !== 'tenant_id' && k !== 'created_at').length;
        console.log(`✅ Routes: Found ${results.routes_cols} data fields.`);
    }

    // Customers
    const cust = await db.collection('customers').where('tenant_id', '==', TENANT_ID).limit(1).get();
    if (!cust.empty) {
        const data = cust.docs[0].data();
        results.customers_cols = Object.keys(data).filter(k => k !== 'tenant_id' && k !== 'created_at').length;
        console.log(`✅ Customers: Found ${results.customers_cols} data fields.`);
    }

    process.exit(0);
}

audit().catch(console.error);
