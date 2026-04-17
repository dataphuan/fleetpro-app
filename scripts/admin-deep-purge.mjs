import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const TENANTS_TO_PURGE = ['internal-tenant-phuan', 'internal-tenant-1'];
const COLLECTIONS = [
    'vehicles', 'drivers', 'trips', 'transportOrders', 
    'routes', 'customers', 'expenses', 'expenseCategories', 
    'maintenance', 'maintenanceLogs', 'counters'
];

async function deepPurge() {
    console.log('🚀 STARTING DEEP PURGE...');
    
    for (const collName of COLLECTIONS) {
        console.log(`\n📂 Purging collection: ${collName}`);
        const collRef = db.collection(collName);
        
        // 1. Purge by tenant_id field
        for (const tid of TENANTS_TO_PURGE) {
            const snap = await collRef.where('tenant_id', '==', tid).get();
            if (!snap.empty) {
                const batch = db.batch();
                snap.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                console.log(`  - Deleted ${snap.size} docs with tenant_id: ${tid}`);
            }
        }
        
        // 2. Purge by Document ID prefix (to catch inconsistent IDs)
        // This is necessary because some docs might be named {tenantId}_{id} or {tenantId}_{coll}_{id}
        const allDocs = await collRef.listDocuments();
        let prefixCount = 0;
        const batchSize = 400;
        let batch = db.batch();
        let operationCount = 0;

        for (const docRef of allDocs) {
            const id = docRef.id;
            const matchesTenant = TENANTS_TO_PURGE.some(t => id.startsWith(t));
            
            if (matchesTenant) {
                batch.delete(docRef);
                prefixCount++;
                operationCount++;
                
                if (operationCount >= batchSize) {
                    await batch.commit();
                    batch = db.batch();
                    operationCount = 0;
                }
            }
        }
        
        if (operationCount > 0) {
            await batch.commit();
        }
        console.log(`  - Deleted ${prefixCount} docs matching tenant ID prefixes.`);
    }
    
    console.log('\n✨ DEEP PURGE COMPLETE. ALL GARBAGE REMOVED.');
    process.exit(0);
}

deepPurge().catch(err => {
    console.error('❌ Purge failed:', err);
    process.exit(1);
});
