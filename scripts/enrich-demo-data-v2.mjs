/**
 * 🔧 COMPREHENSIVE DATA ENRICHMENT v2 — WITH STT NORMALIZATION
 * 
 * Target: Normalize all IDs to the new format: PREFIX + YYMM + -NN
 * Handles:
 * 1. Renaming Document IDs (Create-Delete batches)
 * 2. Updating all foreign key references
 * 3. Initializing Firestore 'counters' collection
 * 4. General data quality fixes (Company names, License info, Expense categories)
 * 
 * Usage: node scripts/enrich-demo-data-v2.mjs
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));

if (getApps().length === 0) {
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const TENANTS = ['internal-tenant-1', 'internal-tenant-phuan'];

const COUNTER_CONFIGS = {
    vehicles: { prefix: 'XE', idField: 'vehicle_code' },
    drivers: { prefix: 'TX', idField: 'driver_code' },
    customers: { prefix: 'KH', idField: 'customer_code' },
    trips: { prefix: 'CD', idField: 'trip_code' },
    routes: { prefix: 'TD', idField: 'route_code' },
    transportOrders: { prefix: 'DH', idField: 'order_code' },
    expenses: { prefix: 'PC', idField: 'expense_code' },
    maintenance: { prefix: 'BD', idField: 'maintenance_code' },
};

const VN_COMPANIES = [
    { company_name: 'TNHH Thực Phẩm Sài Gòn', contact_person: 'Nguyễn Thị Hương', contact_phone: '0283 9876 543' },
    { company_name: 'CTCP Vật Liệu Xây Dựng Hòa Phát', contact_person: 'Trần Văn Minh', contact_phone: '0283 6543 210' },
    { company_name: 'Công Ty TNHH Logistics Phương Nam', contact_person: 'Lê Thị Mai', contact_phone: '0903 456 789' },
    { company_name: 'CTCP Thương Mại Đại Việt', contact_person: 'Phạm Quang Huy', contact_phone: '0912 345 678' },
    { company_name: 'Công Ty TNHH Điện Tử Samsung HCMC', contact_person: 'Kim Soo Jin', contact_phone: '0283 8765 432' },
];

const LICENSE_TYPES = ['B2', 'C', 'D', 'E', 'FC'];

const EXPENSE_CATEGORIES = {
    'Diesel': 'fuel', 'xăng': 'fuel', 'BOT': 'toll', 'cao tốc': 'toll',
    'Khoán chuyến': 'driver_allowance', 'lương': 'salary', 'sửa chữa': 'repair',
};

// Map to track [OldDocID] -> [NewDocID]
const oldToNewIdMap = new Map();

/**
 * Generate a new-format ID: PREFIX + YYMM + -NN
 */
function generateNewId(prefix, index, timestamp) {
    const date = timestamp ? new Date(timestamp) : new Date();
    const yymm = date.toISOString().slice(2, 4) + date.toISOString().slice(5, 7);
    return `${prefix}${yymm}-${String(index).padStart(2, '0')}`;
}

/**
 * Step 1: Analyze existing data and build ID migration map
 */
async function buildMigrationMap() {
    console.log('🔍 BUILDING MIGRATION MAP...');
    for (const tid of TENANTS) {
        for (const [coll, config] of Object.entries(COUNTER_CONFIGS)) {
            const snap = await db.collection(coll).where('tenant_id', '==', tid).get();
            let index = 1;
            
            // Sort by created_at to maintain chronological sequence if possible
            const docs = snap.docs.sort((a, b) => {
                const ta = a.data().created_at || '';
                const tb = b.data().created_at || '';
                return ta.localeCompare(tb);
            });

            for (const doc of docs) {
                const data = doc.data();
                const oldId = doc.id;
                
                // If already in new format, skip or re-index
                const newId = generateNewId(config.prefix, index, data.created_at);
                
                if (oldId !== newId) {
                    oldToNewIdMap.set(`${coll}:${oldId}`, newId);
                }
                index++;
            }
            console.log(`  ${tid} - ${coll}: ${docs.length} IDs mapped`);
        }
    }
}

/**
 * Step 2: Migrate Documents (Create new + Delete old) using EXTREMELY conservative batches
 */
async function migrateDocuments() {
    console.log('\n🚀 MIGRATING DOCUMENTS TO NEW IDs...');
    let totalMigrated = 0;

    for (const [coll, config] of Object.entries(COUNTER_CONFIGS)) {
        const snap = await db.collection(coll).get();
        let batchSize = 0;
        let batch = db.batch();

        for (const doc of snap.docs) {
            const oldId = doc.id;
            const key = `${coll}:${oldId}`;
            if (!oldToNewIdMap.has(key)) continue;

            const newShortId = oldToNewIdMap.get(key);
            const data = doc.data();
            
            if (config.idField) data[config.idField] = newShortId;

            // Enrichment
            if (coll === 'customers' && !data.company_name) {
                const company = VN_COMPANIES[totalMigrated % VN_COMPANIES.length];
                data.company_name = company.company_name;
                data.contact_person = company.contact_person;
            }

            const newRef = db.collection(coll).doc(newShortId);
            batch.set(newRef, data);
            batch.delete(doc.ref);
            
            batchSize += 2;
            totalMigrated++;

            // Extremely small batch to avoid quota peaks
            if (batchSize >= 100) {
                await batch.commit();
                console.log(`    ${coll}: Committed ${totalMigrated} migrations...`);
                batch = db.batch();
                batchSize = 0;
                await new Promise(r => setTimeout(r, 1000)); // 1 second delay
            }
        }
        if (batchSize > 0) {
            await batch.commit();
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    console.log(`  Done: Migrated ${totalMigrated} documents.`);
}


/**
 * Step 3: Fix Foreign Keys with optimized batching
 */
async function fixForeignKeys() {
    console.log('\n🔗 FIXING FOREIGN KEY REFERENCES...');
    const collectionsToFix = ['trips', 'expenses', 'maintenance', 'transportOrders'];
    
    for (const coll of collectionsToFix) {
        const snap = await db.collection(coll).get();
        let fixCount = 0;
        let batch = db.batch();
        let batchSize = 0;

        for (const doc of snap.docs) {
            const data = doc.data();
            const updates = {};
            
            const fieldsToCheck = [
                { field: 'vehicle_id', target: 'vehicles' },
                { field: 'driver_id', target: 'drivers' },
                { field: 'customer_id', target: 'customers' },
                { field: 'route_id', target: 'routes' },
                { field: 'trip_id', target: 'trips' },
            ];

            for (const { field, target } of fieldsToCheck) {
                const oldVal = data[field];
                if (oldVal && oldToNewIdMap.has(`${target}:${oldVal}`)) {
                    updates[field] = oldToNewIdMap.get(`${target}:${oldVal}`);
                }
            }

            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                fixCount++;
                batchSize++;
            }

            if (batchSize >= 450) {
                await batch.commit();
                batch = db.batch();
                batchSize = 0;
                await new Promise(r => setTimeout(r, 100));
            }
        }
        if (batchSize > 0) await batch.commit();
        console.log(`  ${coll}: Fixed ${fixCount} references`);
    }
}


/**
 * Step 4: Synchronize counters collection
 */
async function syncCounters() {
    console.log('\n🔢 SYNCHRONIZING COUNTERS...');
    const now = new Date();
    const yymm = now.toISOString().slice(2, 4) + now.toISOString().slice(5, 7);

    for (const tid of TENANTS) {
        for (const [coll, config] of Object.entries(COUNTER_CONFIGS)) {
            const snap = await db.collection(coll).where('tenant_id', '==', tid).get();
            
            // Find max index for this month
            let maxIndex = 0;
            snap.docs.forEach(doc => {
                const id = doc.id;
                if (id.includes(yymm)) {
                    const parts = id.split('-');
                    const idx = parseInt(parts[parts.length - 1]);
                    if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
                }
            });

            const counterDocId = `${tid}_${coll}_${yymm}`;
            await db.collection('counters').doc(counterDocId).set({
                tenant_id: tid,
                month_period: yymm,
                last_value: maxIndex,
                updated_at: new Date().toISOString()
            }, { merge: true });
            
            console.log(`  ${tid} - ${coll}: Counter set to ${maxIndex} for period ${yymm}`);
        }
    }
}

/**
 * Step 5: Final Enrichment (Public Tracking sync)
 */
async function syncPublicTracking() {
    console.log('\n📦 RE-SYNCING PUBLIC TRACKING...');
    for (const tid of TENANTS) {
        const tSnap = await db.collection('trips').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        
        for (const doc of tSnap.docs) {
            const t = doc.data();
            const publicData = {
                trip_code: t.trip_code || '',
                status: t.status || 'draft',
                origin: t.origin || '',
                destination: t.destination || '',
                departure_date: t.departure_date || t.created_at || '',
                vehicle_plate: t.vehicle_plate || '',
                route_name: t.route_name || '',
                tenant_id: tid,
                updated_at: new Date().toISOString(),
            };
            batch.set(db.collection('public_tracking').doc(doc.id), publicData, { merge: true });
            count++;
        }
        await batch.commit();
        console.log(`  ${tid}: ${count} tracking records updated`);
    }
}

async function main() {
    console.log('🔧 ENRICH-DEMO-DATA-V2: STARTING FULL MIGRATION');
    console.log('=' .repeat(50));
    
    await buildMigrationMap();
    await migrateDocuments();
    await fixForeignKeys();
    await syncCounters();
    await syncPublicTracking();
    
    console.log('\n✅ MIGRATION & ENRICHMENT COMPLETE!');
}

main().catch(err => {
    console.error('❌ MIGRATION FAILED:', err);
    process.exit(1);
});
