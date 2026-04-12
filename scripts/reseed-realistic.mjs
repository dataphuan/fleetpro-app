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
const tenantId = process.argv[2] || 'internal-tenant-1';
const nowIso = new Date().toISOString();

async function reseed() {
    console.log(`\n🚀 STARTING AUDIT-COMPLIANT RESEED (THE "MAP") FOR: ${tenantId}\n`);

    // 1. Load the generated seed data
    const seedPath = path.join(__dirname, '../src/data/tenantDemoSeed.ts');
    const content = fs.readFileSync(seedPath, 'utf8');
    const jsonStr = content
        .substring(content.indexOf('{'), content.lastIndexOf('}') + 1)
        .replace(/ as const;$/, '');
    
    let rawCollections;
    try {
        const payload = JSON.parse(jsonStr);
        rawCollections = payload.collections;
    } catch (e) {
        console.error("❌ Failed to parse seed data.");
        process.exit(1);
    }

    // 2. Build ID Mapper (SourceID -> PrefixedDocID)
    const idMap = new Map();
    const toDocId = (coll, id) => `${tenantId}_${coll}_${String(id).replace(/[^a-zA-Z0-9_-]/g, '')}`;

    for (const [collName, rows] of Object.entries(rawCollections)) {
        rows.forEach(row => {
            const sid = row.id || row.vehicle_code || row.driver_code || row.customer_code || row.route_code || row.trip_code;
            if (sid) {
                idMap.set(`${collName}:${sid}`, toDocId(collName, sid));
            }
        });
    }

    // 3. Helper for ID Resolution
    const resolve = (coll, sid) => {
        if (!sid) return null;
        if (sid.startsWith(tenantId)) return sid;
        return idMap.get(`${coll}:${sid}`) || toDocId(coll, sid);
    };

    // 4. Normalization Engine (Mirroring App Logic)
    const normalized = {};
    const routeById = new Map(rawCollections.routes.map(r => [r.id, r]));
    const driverById = new Map(rawCollections.drivers.map(d => [d.id, d]));
    const customerById = new Map(rawCollections.customers.map(c => [c.id, c]));
    const todayIso = new Date().toISOString().slice(0, 10);
    const nowIsoFull = new Date().toISOString();

    // Normalize Trips & calculate revenue organically
    normalized.trips = rawCollections.trips.map((trip, idx) => {
        const route = routeById.get(trip.route_id);
        const driver = driverById.get(trip.driver_id);
        const freight_revenue = Number(trip.cargo_weight_tons || 0) * Number(route?.base_price || 0);
        const total_revenue = freight_revenue + Number(trip.additional_charges || 0);
        
        const out = {
            ...trip,
            vehicle_id: resolve('vehicles', trip.vehicle_id),
            driver_id: resolve('drivers', trip.driver_id),
            customer_id: resolve('customers', trip.customer_id),
            route_id: resolve('routes', trip.route_id),
            // HIGH-FIDELITY AUDIT: Denormalize names for Dashboard UI
            driver_name: driver?.full_name || 'Tài xế Demo',
            route_name: route?.route_name || 'Tuyến Demo',
            freight_revenue,
            total_revenue,
            gross_revenue: total_revenue,
            total_expenses: 0,
            gross_profit: 0
        };

        // Shift at least 10 trips to TODAY for Live Dashboard WOW
        if (idx < 10) {
            out.departure_date = todayIso;
            out.actual_departure_time = nowIsoFull;
            out.status = 'in_progress';
        }

        return out;
    });

    // Normalize Expenses
    normalized.expenses = rawCollections.expenses.map((exp, idx) => {
        const out = {
            ...exp,
            trip_id: resolve('trips', exp.trip_id),
            vehicle_id: resolve('vehicles', exp.vehicle_id),
            driver_id: resolve('drivers', exp.driver_id),
            category_id: resolve('expenseCategories', exp.category_id),
        };

        // Shift expenses linked to the Today's trips or some random ones
        if (idx < 25) {
            out.expense_date = todayIso;
            out.created_at = nowIsoFull;
        }

        return out;
    });

    // Aggregate Trip financial layers
    const tripExpMap = new Map();
    normalized.expenses.forEach(exp => {
        if (exp.trip_id) {
            tripExpMap.set(exp.trip_id, (tripExpMap.get(exp.trip_id) || 0) + Number(exp.amount || 0));
        }
    });

    normalized.trips.forEach(trip => {
        const docId = toDocId('trips', trip.id);
        trip.total_expenses = tripExpMap.get(docId) || 0;
        trip.gross_profit = trip.total_revenue - trip.total_expenses;
        trip.total_cost = trip.total_expenses;
    });

    // Normalize Drivers (Assign vehicle & stats)
    normalized.drivers = rawCollections.drivers.map(driver => {
        const resolvedVehicleId = resolve('vehicles', driver.assigned_vehicle_id);
        
        // Count trips for this driver
        const driverDocId = toDocId('drivers', driver.id);
        const driverTrips = normalized.trips.filter(t => t.driver_id === driverDocId);
        
        return {
            ...driver,
            assigned_vehicle_id: resolvedVehicleId,
            total_trips: driverTrips.length,
            total_km: driverTrips.reduce((sum, t) => sum + (t.actual_distance_km || 0), 0),
            total_revenue: driverTrips.reduce((sum, t) => sum + (t.total_revenue || 0), 0)
        };
    });

    // Prepare other collections
    const collectionsToPush = ['vehicles', 'customers', 'routes', 'expenseCategories', 'maintenance', 'accountingPeriods', 'inventory', 'tires', 'partners', 'companySettings', 'transportOrders'];
    collectionsToPush.forEach(coll => {
        if (!rawCollections[coll]) return; // safe guard
        normalized[coll] = rawCollections[coll].map(row => {
            const out = { ...row };
            // Fix specific known relation fields
            if (out.item_id) out.item_id = resolve('inventory', out.item_id);
            if (out.current_vehicle_id) out.current_vehicle_id = resolve('vehicles', out.current_vehicle_id);
            if (out.customer_id) {
                out.customer_id = resolve('customers', out.customer_id);
                // Denormalize customer_name
                const c = customerById.get(row.customer_id);
                if (c) out.customer_name = c.name;
            }
            if (out.route_id) {
                out.route_id = resolve('routes', out.route_id);
                const r = routeById.get(row.route_id);
                if (r) out.route_name = r.route_name;
            }
            return out;
        });
    });

    // Final Sync: Accounting Periods (Apr 2026)
    const aprPeriod = normalized.accountingPeriods.find(p => p.id === 'AP2026-04');
    if (aprPeriod) {
        aprPeriod.total_revenue = normalized.trips.reduce((sum, t) => sum + (t.total_revenue || 0), 0);
        aprPeriod.total_expense = normalized.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        aprPeriod.net_profit = aprPeriod.total_revenue - aprPeriod.total_expense;
    }

    // 5. Atomic Batch Injection
    console.log(`📦 PREPARING DATABASE INJECTION...`);
    for (const [collName, rows] of Object.entries(normalized)) {
        console.log(`   - Writing ${rows.length} records to ${collName}...`);
        const chunkSize = 400;
        for (let i = 0; i < rows.length; i += chunkSize) {
            const batch = db.batch();
            rows.slice(i, i + chunkSize).forEach(row => {
                const docId = toDocId(collName, row.id || row.record_id || row.vehicle_code || row.driver_code || row.customer_code || row.route_code || row.trip_code);
                const payload = { ...row, tenant_id: tenantId, created_at: nowIso, updated_at: nowIso, is_deleted: 0 };
                delete payload.id;
                batch.set(db.collection(collName).doc(docId), payload, { merge: true });
            });
            await batch.commit();
        }
    }

    console.log(`\n✅ AUDIT COMPLETE. Data Relationships mapped and normalized.`);
    console.log(`📈 Summary for internal-tenant-1:`);
    console.log(`   - Revenue: ${normalized.trips.reduce((s,t) => s+t.total_revenue, 0).toLocaleString()} VND`);
    console.log(`   - Expenses: ${normalized.expenses.reduce((s,e) => s+e.amount, 0).toLocaleString()} VND`);
    console.log(`   - Profit: ${(normalized.trips.reduce((s,t) => s+t.total_revenue, 0) - normalized.expenses.reduce((s,e) => s+e.amount, 0)).toLocaleString()} VND`);
}

reseed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
