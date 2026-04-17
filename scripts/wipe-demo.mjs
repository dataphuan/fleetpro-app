/**
 * WIPE ONLY SCRIPT
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
const COLLECTIONS_TO_WIPE = [
    'vehicles', 'drivers', 'trips', 'transportOrders', 
    'routes', 'customers', 'expenses', 'expenseCategories', 
    'maintenance', 'maintenanceLogs', 'inventory'
];

async function wipeTenant(tenantId) {
    console.log(`🧹 WIPE: ${tenantId}`);
    let totalDeleted = 0;
    for (const coll of COLLECTIONS_TO_WIPE) {
        const snap = await db.collection(coll).where('tenant_id', '==', tenantId).get();
        if (snap.empty) continue;
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`  - Cleared ${snap.size} from ${coll}`);
        totalDeleted += snap.size;
    }
    console.log(`✅ Hoàn thành xóa toàn bộ ${totalDeleted} bản ghi.`);
}

async function run() {
    await wipeTenant(TENANT_ID);
    process.exit(0);
}

run().catch(console.error);
