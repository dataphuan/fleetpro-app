/**
 * 🕵️ ANALYZE & CLEAN SCRIPT
 * Lists all tenants and allows wiping any of them.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));

if (getApps().length === 0) {
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const COLLECTIONS = [
    'vehicles', 'drivers', 'trips', 'transportOrders', 
    'routes', 'customers', 'expenses', 'expenseCategories', 
    'maintenance', 'maintenanceLogs', 'inventory'
];

async function analyze() {
    console.log('🔍 Analyzing Firestore for all tenants...');
    const tenants = new Set();
    
    // Check drivers collection for unique tenant_ids
    const driversSnap = await db.collection('drivers').get();
    driversSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.tenant_id) tenants.add(data.tenant_id);
    });

    console.log('📋 Found tenants:', Array.from(tenants));
    return Array.from(tenants);
}

async function wipeDocument(path) {
    console.log(`🗑️ Deleting specific document: ${path}`);
    try {
        await db.doc(path).delete();
        console.log('✅ Deleted.');
    } catch (e) {
        console.error('❌ Error deleting document:', e.message);
    }
}

async function wipeTenant(tenantId) {
    console.log(`🧹 Wiping ALL data for tenant: ${tenantId}`);
    let total = 0;
    for (const coll of COLLECTIONS) {
        const snap = await db.collection(coll).where('tenant_id', '==', tenantId).get();
        if (snap.empty) {
            // Also try to find by ID prefix if tenant_id field is missing (legacy)
            const allSnap = await db.collection(coll).get();
            const legacyDocs = allSnap.docs.filter(doc => doc.id.startsWith(tenantId + '_'));
            if (legacyDocs.length > 0) {
                const batch = db.batch();
                legacyDocs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`  - Cleared ${legacyDocs.length} legacy docs from ${coll}`);
                total += legacyDocs.length;
            }
            continue;
        };
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`  - Cleared ${snap.size} from ${coll}`);
        total += snap.size;
    }
    console.log(`✅ Finished wiping ${tenantId}. Total docs: ${total}`);
}

async function run() {
    const args = process.argv.slice(2);
    if (args[0] === '--analyze') {
        await analyze();
    } else if (args[0] === '--wipe-tenant' && args[1]) {
        await wipeTenant(args[1]);
    } else if (args[0] === '--wipe-path' && args[1]) {
        await wipeDocument(args[1]);
    } else {
        console.log('Usage:');
        console.log('  node scripts/wipe-any.mjs --analyze');
        console.log('  node scripts/wipe-any.mjs --wipe-tenant <tenant_id>');
        console.log('  node scripts/wipe-any.mjs --wipe-path <collection>/<doc_id>');
    }
    process.exit(0);
}

run().catch(console.error);
