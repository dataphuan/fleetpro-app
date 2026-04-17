/**
 * ✅ LOGISTICS ID AUDIT & VERIFICATION TOOL (V5.1)
 * 
 * Verifies that data in Firestore follows the new Professional Industry Standard.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));
if (getApps().length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const TENANTS = ['internal-tenant-phuan', 'internal-tenant-1'];
const COLLECTIONS = [
    { coll: 'vehicles', prefix: 'VEH' },
    { coll: 'drivers', prefix: 'DRV' },
    { coll: 'trips', prefix: 'TRP' },
    { coll: 'transportOrders', prefix: 'ORD' },
    { coll: 'routes', prefix: 'RT' },
    { coll: 'customers', prefix: 'CUS' },
    { coll: 'expenses', prefix: 'EXP' }
];

async function verify() {
    console.log('🔍 COMMENCING GLOBAL AUDIT...');
    let totalIssues = 0;

    for (const tenantId of TENANTS) {
        console.log(`\n🏢 Auditing Tenant: ${tenantId}`);
        for (const meta of COLLECTIONS) {
            const snapshot = await db.collection(meta.coll).where('tenant_id', '==', tenantId).get();
            const count = snapshot.size;
            
            if (count === 0) {
                console.log(`  ⚠️  ${meta.coll}: No data found.`);
                continue;
            }

            let invalidCount = 0;
            const regex = new RegExp(`^${meta.prefix}-(\\d{4}-)+[\\w\\d-]+$`);
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const code = data[`${meta.coll.slice(0,-1)}_code`] || data.id;
                if (!regex.test(code)) {
                    invalidCount++;
                    console.log(`    ❌ Invalid ID: ${code} in ${meta.coll}`);
                }
            });

            if (invalidCount === 0) {
                console.log(`  ✅ ${meta.coll}: ${count} docs - ALL PASS (Standard V5)`);
            } else {
                console.log(`  ❌ ${meta.coll}: ${count} docs - ${invalidCount} INVALID`);
                totalIssues += invalidCount;
            }
        }
    }

    if (totalIssues === 0) {
        console.log('\n🌟 AUDIT VERDICT: 100% SUCCESS. ALL SYSTEMS COMPLIANT WITH V5 STANDARDS.');
    } else {
        console.log(`\n⚠️ AUDIT VERDICT: FAILED. ${totalIssues} non-compliant IDs found.`);
    }
}

verify().catch(console.error);
