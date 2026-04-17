/**
 * 🚜 PREMIUM LOGISTICS SEED SCRIPT (v5.1 - Multi-Tenant Clean Wipe)
 * 
 * Target: internal-tenant-phuan, internal-tenant-1
 * Features:
 *  1. Clean Wipe: Removes all transactional data for specific tenant before seeding.
 *  2. Standard IDs: V5 Hyphenated formats (VEH-YYMM-NN).
 *  3. Full Financial Chain: Linked Orders -> Trips -> Expenses.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));

if (getApps().length === 0) {
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const TENANTS = ['internal-tenant-phuan', 'internal-tenant-1'];

const COLLECTIONS_TO_WIPE = [
    'vehicles', 'drivers', 'trips', 'transportOrders', 
    'routes', 'customers', 'expenses', 'expenseCategories', 
    'maintenance', 'maintenanceLogs', 'inventory'
];

const addDays = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

// --- GLOBAL STANDARD CATEGORIES ---
const CAT = {
    FUEL: 'CAT_FUEL',
    TOLL: 'CAT_TOLL',
    ALLOWANCE: 'CAT_ALLOWANCE',
    REPAIR: 'CAT_REPAIR',
    TIRE: 'CAT_TIRE',
    OIL: 'CAT_LUBRICANT'
};

const KH_CUSTOMERS = [
    { short_name: 'ĐƯỜNG KH', customer_name: 'CÔNG TY CP ĐƯỜNG KHÁNH HÒA', tax_code: '4200101111', address: 'Ninh Hòa, Khánh Hòa' },
    { short_name: 'KHATOCO', customer_name: 'TỔNG CÔNG TY KHÁNH VIỆT', tax_code: '4200102222', address: 'TP. Nha Trang, Khánh Hòa' },
    { short_name: 'VINAMILK KH', customer_name: 'VINAMILK - CHI NHÁNH KHÁNH HÒA', tax_code: '0300588569-011', address: 'KCN Suối Dầu, Cam Lâm, Khánh Hòa' }
];

const KH_ROUTES = [
    { 
        route_code: 'RT-2604-01', route_name: 'Ninh Hòa - Phú Yên', distance_km: 110, base_price_per_ton: 350000, 
        fuel_cost_standard: 800000, toll_cost_standard: 150000, driver_allowance_standard: 200000
    },
    { 
        route_code: 'RT-2604-03', route_name: 'Ninh Hòa - Đắk Lắk', distance_km: 165, base_price_per_ton: 550000,
        fuel_cost_standard: 1200000, toll_cost_standard: 50000, driver_allowance_standard: 300000
    }
];

const KH_VEHICLES = [
    { 
        vehicle_code: 'VEH-2604-01', license_plate: '79C-123.45', vehicle_type: 'Đầu kéo', payload_capacity: 32, fuel_consumption_rate: 35,
        insurance_expiry: addDays(4), registration_expiry: addDays(65), status: 'active', assignment_type: 'fixed',
        fuel_consumption_per_100km: 35, purchase_price: 2400000000
    },
    { 
        vehicle_code: 'VEH-2604-02', license_plate: '79C-678.90', vehicle_type: 'Tải 15 tấn', payload_capacity: 15, fuel_consumption_rate: 22,
        insurance_expiry: addDays(-2), registration_expiry: addDays(15), status: 'active', assignment_type: 'fixed',
        fuel_consumption_per_100km: 22, purchase_price: 1200000000
    },
    { 
        vehicle_code: 'VEH-2604-03', license_plate: '79H-111.22', vehicle_type: 'Tải 8 tấn', payload_capacity: 8, fuel_consumption_rate: 16,
        insurance_expiry: addDays(300), registration_expiry: addDays(400), status: 'maintenance', assignment_type: 'pool',
        fuel_consumption_per_100km: 16, purchase_price: 850000000
    }
];

const KH_DRIVERS = [
    { driver_code: 'DRV-2604-01', full_name: 'Nguyễn Văn Hùng', phone: '0905123456', license_class: 'FC', license_expiry: addDays(500), status: 'active', base_salary: 12000000 },
    { driver_code: 'DRV-2604-02', full_name: 'Lê Minh Tâm', phone: '0913789456', license_class: 'C', license_expiry: addDays(10), status: 'active', base_salary: 10000000 }
];

// --- UTILITIES ---
function formatYYMM() {
    const d = new Date();
    return d.toISOString().slice(2, 4) + d.toISOString().slice(5, 7);
}

async function wipeTenantData(tenantId) {
    console.log(` 🧹 Wiping data for tenant: ${tenantId}...`);
    for (const coll of COLLECTIONS_TO_WIPE) {
        const snapshot = await db.collection(coll).where('tenant_id', '==', tenantId).get();
        if (snapshot.empty) continue;
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`   - Deleted ${snapshot.size} docs from ${coll}`);
    }
}

async function seedTenant(tenantId) {
    console.log(` 🌱 Seeding V5 for tenant: ${tenantId}...`);
    const yymm = formatYYMM();
    const created_at = new Date().toISOString();

    // 1. Categories
    const categories = [
        { id: CAT.FUEL, name: 'Nhiên liệu' },
        { id: CAT.TOLL, name: 'Cầu đường' },
        { id: CAT.ALLOWANCE, name: 'Bồi dưỡng' },
        { id: CAT.REPAIR, name: 'Sửa chữa' }
    ];
    for (const cat of categories) {
        await db.collection('expenseCategories').doc(`${tenantId}_${cat.id}`).set({
            ...cat, id: cat.id, category_code: cat.id, category_name: cat.name, tenant_id: tenantId
        }, { merge: true });
    }

    // 2. Customers
    const customerIdMap = new Map();
    for (const c of KH_CUSTOMERS) {
        const id = `CUS-${yymm}-0${KH_CUSTOMERS.indexOf(c) + 1}`;
        await db.collection('customers').doc(`${tenantId}_${id}`).set({ ...c, id, customer_code: id, tenant_id: tenantId, created_at }, { merge: true });
        customerIdMap.set(c.short_name, id);
    }

    // 3. Master Data
    for (const v of KH_VEHICLES) {
        await db.collection('vehicles').doc(`${tenantId}_${v.vehicle_code}`).set({ ...v, id: v.vehicle_code, tenant_id: tenantId, created_at }, { merge: true });
    }
    for (const d of KH_DRIVERS) {
        await db.collection('drivers').doc(`${tenantId}_${d.driver_code}`).set({ ...d, id: d.driver_code, tenant_id: tenantId, created_at }, { merge: true });
    }
    for (const r of KH_ROUTES) {
        await db.collection('routes').doc(`${tenantId}_${r.route_code}`).set({ ...r, id: r.route_code, tenant_id: tenantId, created_at }, { merge: true });
    }

    // 4. Trips & Chain
    for (let i = 1; i <= 5; i++) {
        const tripCode = `TRP-${yymm}-${String(i).padStart(2, '0')}`;
        const orderCode = `ORD-${yymm}-${String(i).padStart(2, '0')}`;
        const route = KH_ROUTES[i % KH_ROUTES.length];
        const status = i <= 2 ? 'on_trip' : 'closed';
        const isFinished = status === 'closed';

        // Order
        await db.collection('transportOrders').doc(`${tenantId}_${orderCode}`).set({
            order_code: orderCode, id: orderCode,
            customer_id: customerIdMap.get(KH_CUSTOMERS[0].short_name),
            status: isFinished ? 'completed' : 'in_progress',
            order_date: addDays(-i), tenant_id: tenantId, created_at
        }, { merge: true });

        // Trip
        await db.collection('trips').doc(`${tenantId}_${tripCode}`).set({
            trip_code: tripCode, id: tripCode,
            tenant_id: tenantId,
            vehicle_id: KH_VEHICLES[i % KH_VEHICLES.length].vehicle_code,
            driver_id: KH_DRIVERS[i % KH_DRIVERS.length].driver_code,
            customer_id: customerIdMap.get(KH_CUSTOMERS[0].short_name),
            route_id: route.route_code,
            departure_date: addDays(-i),
            freight_revenue: 5000000,
            fuel_cost: isFinished ? route.fuel_cost_standard : 0,
            total_expenses: isFinished ? (route.fuel_cost_standard + 200000) : 0,
            status: status, created_at
        }, { merge: true });

        if (isFinished) {
            const expId = `EXP-${yymm}-${tripCode.split('-')[2]}-01`;
            await db.collection('expenses').doc(`${tenantId}_${expId}`).set({
                expense_code: expId, id: expId,
                trip_id: tripCode, category_id: CAT.FUEL, category: 'Nhiên liệu',
                amount: route.fuel_cost_standard, status: 'confirmed',
                tenant_id: tenantId, created_at
            }, { merge: true });
        }
    }
}

async function run() {
    console.log('🚀 INITIALIZING MULTI-TENANT CLEAN V5 SEED...');
    for (const tenantId of TENANTS) {
        await wipeTenantData(tenantId);
        await seedTenant(tenantId);
    }
    console.log('\n✅ ALL TENANTS SYNCED SUCCESSFULLY!');
}

run().catch(console.error);
