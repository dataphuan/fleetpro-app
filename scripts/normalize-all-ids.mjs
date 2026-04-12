#!/usr/bin/env node
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {
  // Already initialized
}

const db = admin.firestore();

/**
 * Normalize codes to Prefix + 4 digits
 * e.g. TX-1 -> TX0001
 * e.g. CD2401001 -> CD0001
 */
function normalizeCode(prefix, code, targetPrefix = null) {
    if (!code || typeof code !== 'string') return null;
    
    const actualPrefix = targetPrefix || prefix;
    
    // Check if already correct format
    const correctRegex = new RegExp(`^${actualPrefix}\\d{4}$`);
    if (correctRegex.test(code)) return code;

    // Extract numbers
    const digits = code.replace(/\D/g, '');
    if (!digits) return null;

    // Take the last 4 digits (or all if < 4)
    const seq = digits.slice(-4).padStart(4, '0');
    return `${actualPrefix}${seq}`;
}

async function migrateCollection(collectionName, prefix, fieldMappings, targetPrefix = null) {
    console.log(`\n--- Migrating ${collectionName} (${targetPrefix || prefix}) ---`);
    const snap = await db.collection(collectionName).get();
    const batch = db.batch();
    let count = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const updates = {};
        let needsUpdate = false;

        for (const [oldField, newField] of Object.entries(fieldMappings)) {
            const oldValue = data[oldField];
            if (oldValue) {
                const newCode = normalizeCode(prefix, oldValue, targetPrefix);
                if (newCode && newCode !== oldValue) {
                    updates[oldField] = newCode;
                    if (newField && newField !== oldField) {
                        updates[newField] = newCode;
                    }
                    needsUpdate = true;
                }
            }
        }

        if (needsUpdate) {
            batch.update(docSnap.ref, updates);
            count++;
        }
    }

    if (count > 0) {
        await batch.commit();
        console.log(`✅ Updated ${count} records in ${collectionName}`);
    } else {
        console.log(`✅ ${collectionName} is already clean.`);
    }
}

async function runMigration() {
    console.log("🚀 STARTING GLOBAL ID NORMALIZATION (4-DIGIT STANDARD)");
    
    try {
        // 1. Drivers (TX)
        await migrateCollection('drivers', 'TX', { 'driver_code': 'driver_code', 'Mã tài xế': 'Mã tài xế' });

        // 2. Vehicles (XE)
        await migrateCollection('vehicles', 'XE', { 'vehicle_code': 'vehicle_code', 'Mã xe': 'Mã xe' });

        // 3. Customers (KH)
        await migrateCollection('customers', 'KH', { 'customer_code': 'customer_code' });

        // 4. Routes (TD)
        await migrateCollection('routes', 'TD', { 'route_code': 'route_code' });

        // 5. Trips (CD) - Handle TRP, CH, TD (old) -> CD
        await migrateCollection('trips', 'CD', { 'trip_code': 'trip_code', 'Mã chuyến': 'Mã chuyến' });

        // 6. Orders (DH)
        await migrateCollection('transport_orders', 'DH', { 'order_code': 'order_code' });

        // 7. Expenses (PC) - Old prefix often CP
        await migrateCollection('expenses', 'CP', { 'expense_code': 'expense_code' }, 'PC');

        // 8. Maintenance (BD) - Old prefix often BT
        await migrateCollection('maintenance_orders', 'BT', { 'order_code': 'order_code' }, 'BD');

        console.log("\n✨ ALL COLLECTIONS NORMALIZED TO 4-DIGIT STANDARD ✨");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

runMigration();
