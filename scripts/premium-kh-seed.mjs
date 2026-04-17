/**
 * 🚜 PREMIUM KHÁNH HÒA ELITE SEED (v8.0 - Professional localization)
 * 
 * Target: internal-tenant-phuan
 * 
 * Objectives:
 *  1. TOTAL WIPE for phuan tenant.
 *  2. 100% REALISTIC DATA: 20 Trucks (79/78/47), 15 Local Drivers.
 *  3. LOGICAL FINANCIALS: Actual BOT fees, Real Fuel rates, Connected entities.
 *  4. FULL DENSITY: Mandatory Engine/Chassis/CCCD/Tax non-empty.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));

if (getApps().length === 0) {
    initializeApp({ credential: cert(sa) });
}
const db = getFirestore();

const TENANT_ID = 'internal-tenant-phuan';
const COLLECTIONS_TO_WIPE = [
    'vehicles', 'drivers', 'trips', 'transportOrders', 
    'routes', 'customers', 'expenses', 'expenseCategories', 
    'maintenance', 'maintenanceLogs', 'inventory'
];

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
};

// --- ELITE KHÁNH HÒA DATA POOLS ---

const TRUCK_MODELS = [
    { name: 'Hino 500 Model FG8J', type: 'Tải 8 tấn', cap: 8, fuel: 18, price: 1250000000 },
    { name: 'Hyundai HD1000 Premium', type: 'Đầu kéo', cap: 32, fuel: 35, price: 2100000000 },
    { name: 'Isuzu FVR 900', type: 'Tải 15 tấn', cap: 15, fuel: 24, price: 1650000000 },
    { name: 'Chenglong M3 4x2', type: 'Tải 9 tấn', cap: 9, fuel: 19, price: 950000000 }
];

const PLATES = [
    '79H-012.34', '79H-045.67', '79C-011.22', '79C-088.99', '79H-055.44',
    '79H-123.45', '79C-678.90', '79H-999.88', '79H-777.66', '79C-555.33',
    '78C-012.34', '78C-045.67', '78C-088.99', '78C-055.44', '78C-123.45',
    '47C-099.11', '47C-077.22', '47C-055.33', '47C-011.44', '47C-022.55'
];

const DRIVER_DATAS = [
    { name: 'Nguyễn Diệp Ninh', id: '056085001234', address: 'Trần Quý Cáp, Ninh Hòa' },
    { name: 'Phạm Hữu Thọ', id: '056087002345', address: 'Hùng Vương, Nha Trang' },
    { name: 'Trần Văn Cam', id: '056090003456', address: 'Cam Lộc, Cam Ranh' },
    { name: 'Lê Minh Thành', id: '056088004567', address: 'Diên Khánh, Khánh Hòa' },
    { name: 'Võ Văn Kiệt', id: '056092005678', address: 'Vạn Giã, Vạn Ninh' },
    { name: 'Đặng Quốc Khánh', id: '056084006789', address: 'Ninh Giang, Ninh Hòa' },
    { name: 'Bùi Thế Hiển', id: '056089007890', address: 'Nha Trang, Khánh Hòa' },
    { name: 'Lý Trọng Nghĩa', id: '056091008901', address: 'Cam Phước, Cam Ranh' },
    { name: 'Ngô Việt Hùng', id: '056086009012', address: 'Ninh Hiệp, Ninh Hòa' },
    { name: 'Trịnh Công Sơn', id: '056083000123', address: 'Vĩnh Thái, Nha Trang' },
    { name: 'Hoàng Anh Tuấn', id: '056082001234', address: 'Diên An, Diên Khánh' },
    { name: 'Phan Đình Giót', id: '056093002345', address: 'Vạn Thắng, Vạn Ninh' },
    { name: 'Đỗ Mười', id: '056070003456', address: 'Ninh Xuân, Ninh Hòa' },
    { name: 'Nguyễn Văn Linh', id: '056071004567', address: 'Cam Nghĩa, Cam Ranh' },
    { name: 'Vũ Khoan', id: '056072005678', address: 'Nha Trang, Khánh Hòa' }
];

const CUSTOMER_DATAS = [
    { name: 'Công ty CP Đường Ninh Hòa', mst: '4200389234', addr: 'Ninh Hiệp, Ninh Hòa' },
    { name: 'Muối Hòn Khói (Ninh Hòa)', mst: '4200123456', addr: 'Ninh Hải, Ninh Hòa' },
    { name: 'Thủy sản Cam Ranh - Chi nhánh 1', mst: '4200987654', addr: 'Cảng Ba Ngòi, Cam Ranh' },
    { name: 'Nông sản Buôn Ma Thuột (Vận chuyển)', mst: '6000123456', addr: 'QL26, Buôn Ma Thuột' }
];

const ROUTE_DATAS = [
    { 
        name: 'Ninh Hòa - Tuy Hòa (Phú Yên)', origin: 'Ninh Hòa', dest: 'Tuy Hòa', 
        dist: 75, cargo: 'Đường cát', weight: 15, price: 120000,
        toll: 320000, // BOT Ninh An (140k) + Hầm Đèo Cả (180k)
        fuel_l: 22, alw: 250000
    },
    { 
        name: 'Buôn Ma Thuột - Ninh Hòa', origin: 'Buôn Ma Thuột', dest: 'Ninh Hòa', 
        dist: 155, cargo: 'Nông sản', weight: 12, price: 180000,
        toll: 180000, // BOT QL26
        fuel_l: 45, alw: 400000
    },
    { 
        name: 'Cam Ranh - Nha Trang', origin: 'Cam Ranh', dest: 'Nha Trang', 
        dist: 50, cargo: 'Thủy sản', weight: 10, price: 100000,
        toll: 0, // QL1A ko qua trạm chính
        fuel_l: 14, alw: 150000
    },
    { 
        name: 'Ninh Hòa - Nha Trang (Cước tấn)', origin: 'Ninh Hòa', dest: 'Nha Trang', 
        dist: 35, cargo: 'Vật liệu xây dựng', weight: 15, price: 85000,
        toll: 0, 
        fuel_l: 10, alw: 120000
    }
];

const CAT = { FUEL: 'CAT_FUEL', TOLL: 'CAT_TOLL', ALW: 'CAT_ALLOWANCE', REP: 'CAT_REPAIR', MISC: 'CAT_MISC' };
const FUEL_PRICE = 20000; // 20k/L for easy calc

// --- LOGIC ---

async function wipeTenant(tenantId) {
    console.log(`🧹 WIPE: ${tenantId}`);
    for (const coll of COLLECTIONS_TO_WIPE) {
        const snap = await db.collection(coll).where('tenant_id', '==', tenantId).get();
        if (snap.empty) continue;
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        console.log(`  - Cleared ${snap.size} from ${coll}`);
    }
}

async function seedV8(tenantId) {
    console.log(`💎 SEED V8 PROFESSIONAL: ${tenantId}`);
    const yymm = '2604';
    const created_at = new Date().toISOString();

    // 1. Categories
    const catsData = [
        { id: CAT.FUEL, name: 'Nhiên liệu (Dầu DO)' },
        { id: CAT.TOLL, name: 'Cầu đường (VETC/BOT)' },
        { id: CAT.ALW, name: 'Bồi dưỡng tài xế' },
        { id: CAT.REP, name: 'Sửa chữa bảo trì' },
        { id: CAT.MISC, name: 'Chi phí khác (Luật, Bốc xếp)' }
    ];
    for (const c of catsData) {
        await db.collection('expenseCategories').doc(`${tenantId}_${c.id}`).set({
            ...c, category_code: c.id, category_name: c.name, tenant_id: tenantId
        });
    }

    // 2. Customers
    const custIds = [];
    for (let i = 0; i < CUSTOMER_DATAS.length; i++) {
        const id = `CUS-${yymm}-${String(i+1).padStart(2, '0')}`;
        const c = CUSTOMER_DATAS[i];
        await db.collection('customers').doc(`${tenantId}_${id}`).set({
            id, customer_code: id, customer_name: c.name, tax_code: c.mst,
            address: c.addr, tenant_id: tenantId, created_at
        });
        custIds.push(id);
    }

    // 3. Vehicles (20 trucks)
    const vehIds = [];
    for (let i = 0; i < 20; i++) {
        const id = `VEH-${yymm}-${String(i+1).padStart(2, '0')}`;
        const model = TRUCK_MODELS[i % TRUCK_MODELS.length];
        await db.collection('vehicles').doc(`${tenantId}_${id}`).set({
            id, vehicle_code: id, license_plate: PLATES[i],
            brand: model.name, vehicle_type: model.type, 
            payload_capacity: model.cap,
            engine_number: `ENG-${model.name.split(' ')[0]}-${i+1000}`, 
            chassis_number: `CHS-${PLATES[i].replace('-', '')}`,
            fuel_consumption_rate: model.fuel,
            purchase_price: model.price,
            insurance_civil_expiry: '2027-01-15',
            registration_expiry_date: '2026-10-20',
            status: 'active', assignment_type: i < 15 ? 'fixed' : 'pool',
            tenant_id: tenantId, created_at
        });
        vehIds.push(id);
    }

    // 4. Drivers (15 drivers)
    const drvIds = [];
    for (let i = 0; i < 15; i++) {
        const id = `DRV-${yymm}-${String(i+1).padStart(2, '0')}`;
        const data = DRIVER_DATAS[i];
        await db.collection('drivers').doc(`${tenantId}_${id}`).set({
            id, driver_code: id, full_name: data.name,
            phone: `0905${String(100000 + i).slice(-6)}`,
            id_card: data.id, address: data.address,
            license_class: i % 2 === 0 ? 'FC' : 'C',
            license_expiry: '2030-05-15',
            health_check_expiry: '2026-12-01',
            date_of_birth: '1985-06-12',
            base_salary: 8000000 + (i * 200000),
            status: 'active', tenant_id: tenantId, created_at
        });
        drvIds.push(id);
    }

    // 5. Routes (4 key routes)
    const rtIds = [];
    for (let i = 0; i < ROUTE_DATAS.length; i++) {
        const id = `RT-${yymm}-${String(i+1).padStart(2, '0')}`;
        const r = ROUTE_DATAS[i];
        const revenue = r.weight * r.price;
        await db.collection('routes').doc(`${tenantId}_${id}`).set({
            id, route_code: id, route_name: r.name, origin: r.origin, destination: r.dest,
            distance_km: r.dist, cargo_type: r.cargo, cargo_weight_standard: r.weight,
            base_price: r.price, transport_revenue_standard: revenue,
            fuel_liters_standard: r.fuel_l, fuel_cost_standard: r.fuel_l * FUEL_PRICE,
            toll_cost: r.toll, driver_allowance_standard: r.alw,
            status: 'active', tenant_id: tenantId, created_at
        });
        rtIds.push(id);
    }

    // 6. TRIPS HISTORY (3 months dense activity)
    console.log(`  🚛 Generating High-Value Trip History...`);
    const historyStart = new Date('2026-01-01');
    let totalRevenue = 0;
    let tripCount = 0;

    for (let day = 0; day < 100; day++) {
        const currentDate = addDays(historyStart, day);
        // Each day generate some trips (randomly 2-5 trips)
        const dailyTrips = 2 + Math.floor(Math.random() * 4);
        
        for (let t = 0; t < dailyTrips; t++) {
            tripCount++;
            const tripCode = `TRP-${yymm}-${String(tripCount).padStart(4, '0')}`;
            const routeIdx = tripCount % ROUTE_DATAS.length;
            const route = ROUTE_DATAS[routeIdx];
            const rev = route.weight * route.price;
            const fuel = route.fuel_l * FUEL_PRICE;
            const toll = route.toll;
            const alw = route.alw;
            
            const isClosed = day < 95; // Most are closed

            // Order
            const orderCode = `ORD-${yymm}-${String(tripCount).padStart(4, '0')}`;
            await db.collection('transportOrders').doc(`${tenantId}_${orderCode}`).set({
                id: orderCode, order_code: orderCode, 
                customer_id: custIds[tripCount % custIds.length],
                status: isClosed ? 'delivered' : 'in_progress',
                tenant_id: tenantId, created_at: currentDate
            });

            // Trip
            await db.collection('trips').doc(`${tenantId}_${tripCode}`).set({
                id: tripCode, trip_code: tripCode, tenant_id: tenantId,
                vehicle_id: vehIds[tripCount % vehIds.length],
                driver_id: drvIds[tripCount % drvIds.length],
                customer_id: custIds[tripCount % custIds.length],
                route_id: rtIds[routeIdx],
                departure_date: currentDate,
                arrival_date: currentDate,
                status: isClosed ? 'closed' : 'in_progress',
                freight_revenue: rev,
                fuel_cost: fuel,
                fuel_liters: route.fuel_l,
                toll_cost: toll,
                driver_pay: alw,
                total_expenses: fuel + toll + alw,
                created_at: currentDate
            });
            
            totalRevenue += rev;

            // Expenses
            if (isClosed) {
                const exps = [
                    { cat: CAT.FUEL, name: 'Dầu DO', amt: fuel, suffix: 'F' },
                    { cat: CAT.TOLL, name: 'BOT Ninh An / Đèo Cả', amt: toll, suffix: 'T' },
                    { cat: CAT.ALW, name: 'Bồi dưỡng', amt: alw, suffix: 'A' }
                ];
                for (const x of exps) {
                    if (x.amt === 0) continue;
                    const eId = `EXP-${tripCode}-${x.suffix}`;
                    await db.collection('expenses').doc(`${tenantId}_${eId}`).set({
                        id: eId, expense_code: eId, trip_id: tripCode,
                        amount: x.amt, category_id: x.cat, 
                        status: 'confirmed', notes: x.name,
                        tenant_id: tenantId, created_at: currentDate
                    });
                }
            }
        }
    }
    
    console.log(`  ✅ Mission Success. Generated ${tripCount} trips.`);
    console.log(`  💰 Total Revenue: ${totalRevenue.toLocaleString()} VND`);
}

async function run() {
    console.log('🚀 INITIALIZING PROFESSIONAL KHÁNH HÒA SEEDING...');
    await wipeTenant(TENANT_ID);
    await seedV8(TENANT_ID);
    console.log('🌟 DATA SYNC COMPLETE: SYSTEM IS NOW ELITE READY.');
}

run().catch(console.error);
