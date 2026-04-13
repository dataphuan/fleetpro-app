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

const auth = admin.auth();
const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan';

async function finalizePhuanSetup() {
    console.log(`\n🚀 FINALIZING PHU AN SETUP [${TENANT_ID}]`);
    console.log('='.repeat(50));

    // 1. Upgrade Tenant to ENTERPRISE
    console.log('\n💎 Step 1: Upgrading to ENTERPRISE Plan...');
    const now = new Date().toISOString();
    await db.collection('company_settings').doc(TENANT_ID).set({
        company_name: 'Vận Tải Phú An',
        address: 'Q7, TP. Hồ Chí Minh',
        subscription: {
            plan: 'enterprise',
            status: 'active',
            started_at: now,
            expires_at: '2099-12-31T23:59:59Z'
        },
        updated_at: now
    }, { merge: true });
    console.log('✅ Upgraded company_settings.');

    // 2. Fix Driver Record for taixe1@phuancr.com
    console.log('\n🚛 Step 2: Fixing Driver Record for taixe1@phuancr.com...');
    try {
        const userRecord = await auth.getUserByEmail('taixe1@phuancr.com');
        const uid = userRecord.uid;
        
        // Ensure user document has correct tenant
        await db.collection('users').doc(uid).set({
            tenant_id: TENANT_ID,
            role: 'driver',
            full_name: 'Tài xế 1 - Phú An',
            status: 'active',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`✅ Verified User document for UID: ${uid}`);

        // Create driver record linked to this UID
        const driverDocId = `${TENANT_ID}_TX0001`;
        await db.collection('drivers').doc(driverDocId).set({
            id: driverDocId,
            driver_code: 'TX0001',
            full_name: 'Tài xế 1 - Phú An',
            email: 'taixe1@phuancr.com',
            user_id: uid,
            tenant_id: TENANT_ID,
            status: 'active',
            availability_status: 'available',
            assigned_vehicle_id: `${TENANT_ID}_XE0001`,
            created_at: now,
            updated_at: now
        }, { merge: true });
        console.log(`✅ Created/Updated Driver record: ${driverDocId}`);
    } catch (e) {
        console.error(`❌ Error fixing driver: ${e.message}`);
    }

    // 3. Initialize Counters
    console.log('\n🔢 Step 3: Initializing Sequential Counters...');
    const collections = ['vehicles', 'drivers', 'customers', 'trips', 'routes', 'expenses', 'transportOrders'];
    for (const coll of collections) {
        const counterId = `${TENANT_ID}_${coll}`;
        const snap = await db.collection(coll).where('tenant_id', '==', TENANT_ID).get();
        const currentCount = snap.size;
        
        await db.collection('counters').doc(counterId).set({
            tenant_id: TENANT_ID,
            last_value: Math.max(currentCount, 1),
            updated_at: now
        }, { merge: true });
        console.log(`✅ Set counter [${counterId}] to ${Math.max(currentCount, 1)}`);
    }

    // 4. Ensure at least one vehicle exists for the driver
    console.log('\n🚛 Step 4: Ensuring Vehicle XE0001 exists...');
    const vehicleId = `${TENANT_ID}_XE0001`;
    await db.collection('vehicles').doc(vehicleId).set({
        id: vehicleId,
        vehicle_code: 'XE0001',
        license_plate: '81H-226.22',
        vehicle_type: 'Xe ben',
        tenant_id: TENANT_ID,
        assigned_driver_id: 'TX0001', // Note: using local code for cross-integrity reference if needed
        status: 'active',
        created_at: now,
        updated_at: now
    }, { merge: true });
    console.log('✅ Verified vehicle XE0001.');

    console.log('\n✨ DONE: Phụ An tenant is now stable and ready for "WOW" experience.');
}

finalizePhuanSetup().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
