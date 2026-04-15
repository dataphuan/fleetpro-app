/**
 * 🔧 DATA ENRICHMENT v3 — Normalize trip financial fields + fix maintenance
 * 
 * Fixes remaining issues:
 * 1. Trips: Add total_cost, gross_profit, total_expenses, driver_name, route_name
 * 2. Maintenance: Fill odometer, next_maintenance_odometer
 * 3. Phuan tenant: Normalize LĐX trips (remove old field names)
 * 4. Vehicles: Ensure model field exists
 * 
 * Usage: node scripts/enrich-demo-data-v3.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const TENANTS = ['internal-tenant-1', 'internal-tenant-phuan'];

// Vehicle models per brand
const MODELS = {
    'Hyundai': ['Porter 150', 'HD72', 'HD120', 'Mighty EX8'],
    'Isuzu': ['NQR75M', 'FRR90N', 'FVR34Q', 'QKR77H'],
    'Hino': ['300 Series', '500 Series', 'Dutro WU342', 'XZU730'],
    'Mitsubishi': ['Canter 4.99', 'Canter 7.5', 'FI', 'FJ'],
    'Thaco': ['Ollin 350', 'Ollin 700', 'Auman C160', 'Auman C300'],
    'Daewoo': ['Maximus HC6AA', 'Prima 15T', 'Novus SE'],
    'Fuso': ['Canter TF', 'Fighter FJ', 'FI1217'],
};

async function enrichTrips() {
    console.log('\n📊 ENRICHING TRIP FINANCIAL FIELDS...');
    
    for (const tid of TENANTS) {
        // Build lookups
        const drivers = new Map();
        const dSnap = await db.collection('drivers').where('tenant_id', '==', tid).get();
        dSnap.docs.forEach(d => drivers.set(d.id, d.data()));
        
        const routes = new Map();
        const rSnap = await db.collection('routes').where('tenant_id', '==', tid).get();
        rSnap.docs.forEach(d => routes.set(d.id, d.data()));
        
        const vehicles = new Map();
        const vSnap = await db.collection('vehicles').where('tenant_id', '==', tid).get();
        vSnap.docs.forEach(d => vehicles.set(d.id, d.data()));
        
        const customers = new Map();
        const cSnap = await db.collection('customers').where('tenant_id', '==', tid).get();
        cSnap.docs.forEach(d => customers.set(d.id, d.data()));
        
        // Get expenses per trip
        const tripExpenses = new Map();
        const eSnap = await db.collection('expenses').where('tenant_id', '==', tid).get();
        eSnap.docs.forEach(d => {
            const e = d.data();
            const tripCode = e.trip_code || e.description?.match(/CD\d+|LĐX-\d+/)?.[0] || '';
            if (tripCode) {
                if (!tripExpenses.has(tripCode)) tripExpenses.set(tripCode, 0);
                tripExpenses.set(tripCode, tripExpenses.get(tripCode) + (e.amount || 0));
            }
        });
        
        const tSnap = await db.collection('trips').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        
        for (const doc of tSnap.docs) {
            const t = doc.data();
            const driver = t.driver_id ? drivers.get(t.driver_id) : null;
            const route = t.route_id ? routes.get(t.route_id) : null;
            const vehicle = t.vehicle_id ? vehicles.get(t.vehicle_id) : null;
            const customer = t.customer_id ? customers.get(t.customer_id) : null;
            
            const totalRevenue = t.total_revenue || t.freight_revenue || t.gross_revenue || 0;
            const fuelCost = t.fuel_cost || 0;
            const expenseTotal = tripExpenses.get(t.trip_code) || 0;
            const totalCost = expenseTotal || fuelCost;
            const grossProfit = totalRevenue - totalCost;
            
            const updates = {};
            
            // Financial fields
            if (!t.total_cost && totalCost > 0) updates.total_cost = totalCost;
            if (!t.total_expenses && expenseTotal > 0) updates.total_expenses = expenseTotal;
            if (!t.gross_profit && totalRevenue > 0) updates.gross_profit = grossProfit;
            if (!t.gross_revenue) updates.gross_revenue = totalRevenue;
            
            // Denormalized names for fast display
            if (!t.driver_name && driver) updates.driver_name = driver.full_name || '';
            if (!t.route_name && route) updates.route_name = route.route_name || '';
            if (!t.origin && route) updates.origin = route.origin || '';
            if (!t.destination && route) updates.destination = route.destination || '';
            if (!t.distance_km && route) updates.distance_km = route.distance_km || 0;
            if (!t.vehicle_plate && vehicle) updates.vehicle_plate = vehicle.license_plate || '';
            if (!t.customer_name && customer) updates.customer_name = customer.company_name || customer.customer_name || '';
            
            // Normalize old field names (phuan LĐX trips)
            if (t.tenantId && !t.tenant_id) updates.tenant_id = t.tenantId;
            if (t.createdAt && !t.created_at) updates.created_at = t.createdAt;
            
            // Ensure source field
            if (!t.source) {
                updates.source = t.trip_code?.startsWith('LĐX') ? 'driver' : 'manager';
            }
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                batchCount++;
            }
            count++;
            
            if (batchCount >= 400) {
                await batch.commit();
                console.log(`    ${tid}: committed ${count}...`);
                batch = db.batch();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${count} trips enriched`);
    }
}

async function enrichMaintenance() {
    console.log('\n🔧 ENRICHING MAINTENANCE...');
    
    for (const tid of TENANTS) {
        // Build vehicle lookup for odometer
        const vehicleOdo = new Map();
        const vSnap = await db.collection('vehicles').where('tenant_id', '==', tid).get();
        vSnap.docs.forEach(d => vehicleOdo.set(d.id, d.data().current_odometer || 50000));
        
        const mSnap = await db.collection('maintenance').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        
        for (const doc of mSnap.docs) {
            const m = doc.data();
            const updates = {};
            
            const vOdo = vehicleOdo.get(m.vehicle_id) || 50000;
            if (!m.odometer) updates.odometer = vOdo - Math.floor(Math.random() * 5000);
            if (!m.next_maintenance_odometer) updates.next_maintenance_odometer = vOdo + 10000;
            if (!m.maintenance_code) updates.maintenance_code = `BD${String(count + 1).padStart(4, '0')}`;
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                batchCount++;
            }
            count++;
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${count} maintenance records enriched`);
    }
}

async function enrichVehicles() {
    console.log('\n🚛 ENRICHING VEHICLES...');
    
    for (const tid of TENANTS) {
        const vSnap = await db.collection('vehicles').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        
        for (const doc of vSnap.docs) {
            const v = doc.data();
            const updates = {};
            
            if (!v.model) {
                const brand = v.brand || 'Hyundai';
                const models = MODELS[brand] || MODELS['Hyundai'];
                updates.model = models[count % models.length];
            }
            if (!v.year_manufacture) {
                updates.year_manufacture = 2019 + (count % 6);
            }
            if (!v.color) {
                const colors = ['Trắng', 'Xanh dương', 'Xám bạc', 'Đỏ', 'Vàng'];
                updates.color = colors[count % colors.length];
            }
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                batchCount++;
            }
            count++;
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${count} vehicles enriched`);
    }
}

async function updatePublicTracking() {
    console.log('\n📦 RE-SYNCING PUBLIC TRACKING...');
    
    for (const tid of TENANTS) {
        const tSnap = await db.collection('trips').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        
        for (const doc of tSnap.docs) {
            const t = doc.data();
            
            const publicData = {
                trip_code: t.trip_code || '',
                status: t.status || 'draft',
                origin: t.origin || '',
                destination: t.destination || '',
                departure_date: t.departure_date || t.created_at || '',
                arrival_date: t.arrival_date || null,
                vehicle_plate: t.vehicle_plate || '',
                route_name: t.route_name || '',
                distance_km: t.distance_km || 0,
                updated_at: t.updated_at || '',
                tenant_id: tid,
            };
            
            batch.set(db.collection('public_tracking').doc(doc.id), publicData, { merge: true });
            batchCount++;
            count++;
            
            if (batchCount >= 400) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${count} public_tracking synced`);
    }
}

async function main() {
    console.log('🔧 DATA ENRICHMENT v3 — Financial + Maintenance + Vehicles');
    console.log('=' .repeat(55));
    
    await enrichTrips();
    await enrichMaintenance();
    await enrichVehicles();
    await updatePublicTracking();
    
    console.log('\n✅ ALL DONE!');
}

main().catch(console.error);
