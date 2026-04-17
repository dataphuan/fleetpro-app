/**
 * 🚜 PREMIUM KHÁNH HÒA ELITE SEED (v14.0 - Dual-Track ID synchronization)
 * 
 * Target: internal-tenant-phuan
 * 
 * Objectives:
 *  1. TOTAL WIPE for phuan tenant.
 *  2. IDs Standard: Registry (KH/XE/TX/TD xxxx) vs Operations (DH/CD/PC yy-mm-nn).
 *  3. Monthly Resets: Operational sequences reset every month.
 *  4. High Density: 100% data coverage for all UI columns.
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
    'maintenance', 'maintenanceLogs'
];

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
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
        toll: 0, 
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
const FUEL_PRICE = 20000; 

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

async function seedV14(tenantId) {
    console.log(`💎 SEED V14 DUAL-TRACK: ${tenantId}`);
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

    // 2. Customers (Static: KHxxxx)
    const custIds = [];
    for (let i = 0; i < CUSTOMER_DATAS.length; i++) {
        const id = `KH${String(i+1).padStart(4, '0')}`;
        const c = CUSTOMER_DATAS[i];
        await db.collection('customers').doc(`${tenantId}_${id}`).set({
            id, customer_code: id, customer_name: c.name, tax_code: c.mst,
            address: c.addr, tenant_id: tenantId, created_at,
            customer_type: 'Doanh nghiệp', contact_person: 'Nguyễn Văn A',
            phone: '0909123456', email: `contact@${c.name.replace(/ /g,'').toLowerCase()}.vn`,
            credit_limit: 500000000, payment_terms: 30, account_number: '0123456789',
            bank_name: 'Vietcombank', branch_name: 'Chi nhánh Khánh Hòa', notes: 'Khách hàng chiến lược VIP',
            status: 'active'
        });
        custIds.push(id);
    }

    // 3. Vehicles (Static: XExxxx)
    const vehIds = [];
    for (let i = 0; i < 20; i++) {
        const id = `XE${String(i+1).padStart(4, '0')}`;
        const model = TRUCK_MODELS[i % TRUCK_MODELS.length];
        await db.collection('vehicles').doc(`${tenantId}_${id}`).set({
            id, vehicle_code: id, license_plate: PLATES[i],
            brand: model.name, vehicle_type: model.type, 
            capacity_tons: model.cap,
            engine_number: `ENG-${model.name.split(' ')[0]}-${i+1000}`, 
            chassis_number: `CHS-${PLATES[i].replace('-', '')}`,
            fuel_type: 'Dầu Diesel',
            fuel_consumption_per_100km: model.fuel,
            purchase_date: '2025-01-15',
            purchase_price: model.price,
            insurance_civil_expiry: '2027-01-15',
            registration_expiry_date: '2026-10-20',
            usage_limit_years: '2046',
            insurance_purchase_date: '2025-01-15',
            insurance_expiry_date: '2026-01-15',
            insurance_body_expiry: '2026-01-15',
            insurance_cost: 15000000,
            registration_cycle: '6 tháng',
            registration_date: '2026-04-20',
            registration_cost: 340000,
            current_location: 'Bãi đỗ xe trung tâm Phú An',
            current_odometer: 15200 + (i*1000),
            notes: 'Xe đủ tiêu chuẩn vận hành',
            status: 'active', assignment_type: i < 15 ? 'fixed' : 'pool',
            tenant_id: tenantId, created_at
        });
        vehIds.push(id);
    }

    // 4. Drivers (Static: TXxxxx)
    const drvIds = [];
    for (let i = 0; i < 15; i++) {
        const id = `TX${String(i+1).padStart(4, '0')}`;
        const data = DRIVER_DATAS[i];
        await db.collection('drivers').doc(`${tenantId}_${id}`).set({
            id, driver_code: id, full_name: data.name,
            phone: `0905${String(100000 + i).slice(-6)}`,
            email: `tai.xe${i}@phuan.com`,
            id_card: data.id, id_issue_date: '2020-10-15', address: data.address,
            license_class: i % 2 === 0 ? 'FC' : 'C',
            license_expiry: '2030-05-15',
            health_check_expiry: '2026-12-01',
            hire_date: '2023-01-05',
            contract_type: 'Hợp đồng dài hạn',
            base_salary: 8000000 + (i * 200000),
            assigned_vehicle_id: vehIds[i] || '',
            driver_type: 'Chính thức',
            notes: 'Không có ghi chú gì thêm',
            status: 'active', tenant_id: tenantId, created_at
        });
        drvIds.push(id);
    }

    // 5. Routes (Static: TDxxxx)
    const rtIds = [];
    for (let i = 0; i < ROUTE_DATAS.length; i++) {
        const id = `TD${String(i+1).padStart(4, '0')}`;
        const r = ROUTE_DATAS[i];
        await db.collection('routes').doc(`${tenantId}_${id}`).set({
            id, route_code: id, route_name: r.name,
            origin: r.origin, destination: r.dest,
            distance_km: r.dist, cargo_type: r.cargo, weight_tons: r.weight,
            base_price: r.price, toll_fee: r.toll, fuel_liters: r.fuel_l,
            driver_allowance: r.alw,
            loading_fee: 50000, unloading_fee: 50000,
            extra_fee: 0, extra_fee_desc: 'Không có phụ phí phát sinh',
            total_cost: r.toll + r.alw + 100000,
            customer_id: custIds[i % custIds.length], vehicle_type_req: 'Xe tải trên 5 tấn', status: 'active',
            notes: 'Tuyến đường quy định chuẩn của cty Phú An',
            tenant_id: tenantId, created_at
        });
        rtIds.push(id);
    }

    // 6. DYNAMIC OPERATIONS (Monthly Reset: PREFIX-YYMM-NN)
    console.log(`  🚛 Generating High-Density Operational History...`);
    const historyStart = new Date('2026-01-01');
    let totalRevenue = 0;
    
    // Monthly counters
    const monthlyCounters = { 'CD': {}, 'DH': {}, 'PC': {}, 'BD': {} };
    const getNextSeq = (prefix, date) => {
        const yymm = String(date.getFullYear()).slice(-2) + String(date.getMonth() + 1).padStart(2, '0');
        if (!monthlyCounters[prefix][yymm]) monthlyCounters[prefix][yymm] = 0;
        monthlyCounters[prefix][yymm]++;
        return `${prefix}-${yymm}-${String(monthlyCounters[prefix][yymm]).padStart(2, '0')}`;
    };

    for (let day = 0; day < 100; day++) {
        const currentDay = addDays(historyStart, day);
        const dailyTrips = 2 + Math.floor(Math.random() * 4);
        
        for (let t = 0; t < dailyTrips; t++) {
            const tripCode = getNextSeq('CD', currentDay);
            const orderCode = getNextSeq('DH', currentDay);
            const routeIdx = (day + t) % ROUTE_DATAS.length;
            const route = ROUTE_DATAS[routeIdx];
            const rev = route.weight * route.price;
            const isClosed = day < 95; 

            // Order
            await db.collection('transportOrders').doc(`${tenantId}_${orderCode}`).set({
                id: orderCode, order_code: orderCode, 
                customer_id: custIds[day % custIds.length],
                requested_by_driver_email: `${drvIds[t % drvIds.length]}@phuan.vn`,
                order_date: currentDay.toISOString().slice(0, 10),
                expected_delivery_date: currentDay.toISOString().slice(0, 10),
                cargo_description: route.cargo,
                total_value: rev,
                priority: 'normal',
                status: isClosed ? 'completed' : 'in_progress',
                tenant_id: tenantId, created_at: currentDay.toISOString()
            });

            // Trip
            await db.collection('trips').doc(`${tenantId}_${tripCode}`).set({
                id: tripCode, trip_code: tripCode, tenant_id: tenantId,
                vehicle_id: vehIds[(day + t) % vehIds.length],
                driver_id: drvIds[(day + t) % drvIds.length],
                customer_id: custIds[day % custIds.length],
                route_id: rtIds[routeIdx],
                departure_date: currentDay.toISOString().slice(0, 10),
                arrival_date: currentDay.toISOString().slice(0, 10),
                status: isClosed ? 'completed' : 'in_progress',
                freight_revenue: rev,
                fuel_cost: route.fuel_l * FUEL_PRICE,
                toll_cost: route.toll,
                driver_pay: route.alw,
                total_expenses: (route.fuel_l * FUEL_PRICE) + route.toll + route.alw,
                created_at: currentDay.toISOString()
            });
            
            totalRevenue += rev;

            // Expenses
            if (isClosed) {
                const pcCode = getNextSeq('PC', currentDay);
                await db.collection('expenses').doc(`${tenantId}_${pcCode}`).set({
                    id: pcCode, expense_code: pcCode, expense_date: currentDay.toISOString().slice(0, 10),
                    category_id: CAT.FUEL, amount: route.fuel_l * FUEL_PRICE,
                    description: `Chi phí dầu cho chuyến ${tripCode}`,
                    trip_id: tripCode, vehicle_id: vehIds[(day+t)%vehIds.length],
                    status: 'confirmed', tenant_id: tenantId, created_at: currentDay.toISOString()
                });
            }
        }
    }
    console.log(`✅ Seeded ${Object.values(monthlyCounters.CD).reduce((a,b)=>a+b, 0)} Elite Trips.`);
}

async function run() {
    await wipeTenant('internal-tenant-1');
    await wipeTenant(TENANT_ID);
    await seedV14(TENANT_ID);
    console.log('\n🚀 ALL DONE. System is synchronized and professional.');
    process.exit(0);
}

run();
