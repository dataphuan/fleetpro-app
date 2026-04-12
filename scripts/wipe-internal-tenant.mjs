import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '../fleetpro-app-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const tenantId = 'internal-tenant-1';

const collections = [
    'vehicles', 'drivers', 'customers', 'routes', 'trips', 
    'expenses', 'expenseCategories', 'maintenance', 
    'accountingPeriods', 'transportOrders', 'inventory', 
    'tires', 'purchaseOrders', 'inventoryTransactions', 
    'tripExpenses', 'alerts', 'partners'
];

async function deleteCollectionByTenant(collectionName) {
    console.log(`🧹 Wiping collection: ${collectionName} for tenant ${tenantId}`);
    const snapshot = await db.collection(collectionName).where('tenant_id', '==', tenantId).get();
    
    if (snapshot.empty) {
        console.log(`   - No records found for ${collectionName}`);
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    // Also check for prefix-matched IDs just in case
    const allDocs = await db.collection(collectionName).get();
    allDocs.forEach(doc => {
        if (doc.id.startsWith(tenantId)) {
            batch.delete(doc.ref);
        }
    });

    await batch.commit();
    console.log(`   ✅ Deleted ${snapshot.size} records.`);
}

async function wipe() {
    console.log(`\n🚨 STARTING HARD WIPE FOR TENANT: ${tenantId}\n`);
    for (const coll of collections) {
        await deleteCollectionByTenant(coll);
    }
    
    // Wipe legacy subcollections if any
    const tenantRef = db.collection('tenants').doc(tenantId);
    for (const coll of collections) {
        const subSnap = await tenantRef.collection(coll).get();
        if (!subSnap.empty) {
            console.log(`🧹 Wiping legacy subcollection: tenants/${tenantId}/${coll}`);
            const subBatch = db.batch();
            subSnap.docs.forEach(d => subBatch.delete(d.ref));
            await subBatch.commit();
        }
    }

    console.log(`\n🎉 WIPE COMPLETE. System is clean for ${tenantId}.`);
}

wipe().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
