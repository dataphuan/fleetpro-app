import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();
const TENANT_ID = 'internal-tenant-phuan';

async function audit() {
    console.log(`🔍 AUDIT: ${TENANT_ID}`);
    const collections = ['vehicles', 'drivers', 'routes', 'customers', 'transportOrders', 'trips', 'expenses'];
    
    for (const coll of collections) {
        const snap = await db.collection(coll).where('tenant_id', '==', TENANT_ID).limit(3).get();
        console.log(`\n--- ${coll.toUpperCase()} ---`);
        snap.forEach(doc => {
            const data = doc.data();
            const code = data.order_code || data.trip_code || data.expense_code || data.vehicle_code || data.driver_code || data.customer_code || data.route_code || 'N/A';
            console.log(`ID: ${doc.id.padEnd(25)} | Code: ${code}`);
            if (coll === 'transportOrders') {
              console.log(`  > Cargo: ${data.cargo_description} | RequestedBy: ${data.requested_by_driver_email}`);
            }
        });
    }
    process.exit(0);
}
audit();
