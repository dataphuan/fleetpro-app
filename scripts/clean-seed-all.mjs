/**
 * 🔥 CLEAN SEED v2 — Rate-limited for Firestore Spark/Blaze quota
 * 
 * Step 1: Delete in small paginated batches (100 docs, 5s delay)
 * Step 2: Seed fresh data with delays
 * 
 * Usage: node scripts/clean-seed-all.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const COLLECTIONS = ['trips', 'vehicles', 'drivers', 'routes', 'customers', 'expenses', 'maintenance', 'public_tracking'];
const TENANTS = ['internal-tenant-1', 'internal-tenant-phuan'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[rand(0, arr.length - 1)]; }
function pad(n, len = 5) { return String(n).padStart(len, '0'); }
function dateStr(d) { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString().split('T')[0]; }
function isoDate(d) { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString(); }

// ===================== DATA =====================

const VEHICLES = [
    { code: 'XE0001', plate: '51C-847.96', type: 'Xe tải nhẹ', brand: 'Hyundai', model: 'Porter 150', cap: 1.5 },
    { code: 'XE0002', plate: '60C-360.28', type: 'Xe tải trung', brand: 'Isuzu', model: 'NQR75LE', cap: 5.0 },
    { code: 'XE0003', plate: '62C-502.40', type: 'Xe tải trung', brand: 'Hino', model: 'XZU730L', cap: 3.5 },
    { code: 'XE0004', plate: '51C-710.39', type: 'Xe tải nặng', brand: 'Hino', model: 'FC9JESW', cap: 8.0 },
    { code: 'XE0005', plate: '61C-813.98', type: 'Xe tải nặng', brand: 'Hyundai', model: 'HD120', cap: 8.5 },
    { code: 'XE0006', plate: '60C-962.95', type: 'Xe đầu kéo', brand: 'Daewoo', model: 'Prima K9KEF', cap: 20.0 },
    { code: 'XE0007', plate: '62C-863.42', type: 'Xe tải nhẹ', brand: 'Kia', model: 'K200', cap: 1.9 },
    { code: 'XE0008', plate: '59C-464.47', type: 'Xe tải trung', brand: 'Hyundai', model: 'Mighty EX8', cap: 7.0 },
    { code: 'XE0009', plate: '61C-631.66', type: 'Xe tải trung', brand: 'Isuzu', model: 'FRR90N', cap: 6.0 },
    { code: 'XE0010', plate: '60C-380.72', type: 'Xe tải nặng', brand: 'Hino', model: 'FG8JPSL', cap: 10.0 },
    { code: 'XE0011', plate: '62C-415.27', type: 'Xe tải nhẹ', brand: 'Thaco', model: 'Ollin 350', cap: 3.5 },
    { code: 'XE0012', plate: '51C-505.28', type: 'Xe đầu kéo', brand: 'Hyundai', model: 'HD1000', cap: 22.0 },
    { code: 'XE0013', plate: '61C-512.40', type: 'Xe tải trung', brand: 'Mitsubishi', model: 'Canter 7.5', cap: 5.5 },
    { code: 'XE0014', plate: '60C-860.25', type: 'Xe tải nhẹ', brand: 'Kia', model: 'K250', cap: 2.4 },
    { code: 'XE0015', plate: '62C-277.75', type: 'Xe tải nặng', brand: 'Fuso', model: 'Fighter FJ', cap: 15.0 },
];

const DRIVERS = [
    { code: 'TX0001', name: 'Nguyễn Văn Hùng', phone: '0934665066', lic: 'C', dob: '1985-03-15', addr: 'Quận 1, TP.HCM' },
    { code: 'TX0002', name: 'Trần Minh Đức', phone: '0357744408', lic: 'C', dob: '1990-07-22', addr: 'Quận Bình Thạnh, TP.HCM' },
    { code: 'TX0003', name: 'Lê Thanh Tùng', phone: '0325954683', lic: 'B2', dob: '1988-11-05', addr: 'TP. Thủ Đức, TP.HCM' },
    { code: 'TX0004', name: 'Phạm Hoàng Nam', phone: '0918223344', lic: 'C', dob: '1992-01-18', addr: 'Quận Tân Bình, TP.HCM' },
    { code: 'TX0005', name: 'Võ Quốc Bảo', phone: '0987112233', lic: 'D', dob: '1987-06-30', addr: 'Quận 7, TP.HCM' },
    { code: 'TX0006', name: 'Hoàng Anh Tuấn', phone: '0901556677', lic: 'C', dob: '1993-09-12', addr: 'Quận Gò Vấp, TP.HCM' },
    { code: 'TX0007', name: 'Đặng Văn Khoa', phone: '0945889900', lic: 'FC', dob: '1984-12-25', addr: 'Huyện Bình Chánh, TP.HCM' },
    { code: 'TX0008', name: 'Bùi Trọng Nghĩa', phone: '0912445566', lic: 'C', dob: '1991-04-08', addr: 'Quận 12, TP.HCM' },
    { code: 'TX0009', name: 'Ngô Anh Tuấn', phone: '0978334455', lic: 'C', dob: '1989-08-17', addr: 'TP. Biên Hòa, Đồng Nai' },
    { code: 'TX0010', name: 'Lý Minh Quân', phone: '0933667788', lic: 'D', dob: '1986-02-28', addr: 'TP. Dĩ An, Bình Dương' },
    { code: 'TX0011', name: 'Trương Văn Phát', phone: '0905112233', lic: 'C', dob: '1994-05-20', addr: 'TP. Thuận An, Bình Dương' },
    { code: 'TX0012', name: 'Mai Xuân Hòa', phone: '0968778899', lic: 'B2', dob: '1990-10-03', addr: 'Quận 9, TP.HCM' },
    { code: 'TX0013', name: 'Đỗ Công Minh', phone: '0937223344', lic: 'FC', dob: '1983-07-14', addr: 'Huyện Nhà Bè, TP.HCM' },
    { code: 'TX0014', name: 'Huỳnh Tấn Phước', phone: '0919556677', lic: 'C', dob: '1995-12-01', addr: 'Quận 2, TP.HCM' },
    { code: 'TX0015', name: 'Phan Quang Vinh', phone: '0946889900', lic: 'C', dob: '1988-03-10', addr: 'Quận Phú Nhuận, TP.HCM' },
];

const ROUTES = [
    { code: 'TD0001', o: 'Cảng Cát Lái, TP.HCM', d: 'KCN Sóng Thần, Bình Dương', km: 35, p: 2800000 },
    { code: 'TD0002', o: 'KCN Tân Tạo, TP.HCM', d: 'KCN Mỹ Phước 3, Bình Dương', km: 55, p: 4200000 },
    { code: 'TD0003', o: 'Quận 7, TP.HCM', d: 'KCN Biên Hòa, Đồng Nai', km: 40, p: 3200000 },
    { code: 'TD0004', o: 'Cảng Hiệp Phước, TP.HCM', d: 'KCN Long Hậu, Long An', km: 25, p: 2200000 },
    { code: 'TD0005', o: 'ICD Phước Long, TP.HCM', d: 'KCN VSIP, Bình Dương', km: 45, p: 3500000 },
    { code: 'TD0006', o: 'Cảng Cát Lái, TP.HCM', d: 'KCN Nhơn Trạch, Đồng Nai', km: 50, p: 3800000 },
    { code: 'TD0007', o: 'Quận 12, TP.HCM', d: 'KCN Tân Bình, TP.HCM', km: 15, p: 1500000 },
    { code: 'TD0008', o: 'Cảng Mỹ Tho, Tiền Giang', d: 'ICD Phước Long, TP.HCM', km: 130, p: 8500000 },
    { code: 'TD0009', o: 'KCN Long Thành, Đồng Nai', d: 'Cảng Cát Lái, TP.HCM', km: 60, p: 4500000 },
    { code: 'TD0010', o: 'TP. Vũng Tàu', d: 'KCN Biên Hòa, Đồng Nai', km: 95, p: 6800000 },
    { code: 'TD0011', o: 'Cảng Cái Mép, Bà Rịa', d: 'KCN Sóng Thần, Bình Dương', km: 120, p: 8000000 },
    { code: 'TD0012', o: 'KCN Tân Đức, Long An', d: 'Cảng Hiệp Phước, TP.HCM', km: 30, p: 2500000 },
];

const CUSTOMERS = [
    { code: 'KH0001', n: 'TNHH Thực Phẩm Sài Gòn', p: 'Nguyễn Thị Hương', ph: '0283 9876 543', a: '179 Xa lộ Hà Nội, Bình Dương' },
    { code: 'KH0002', n: 'CTCP Vật Liệu XD Hòa Phát', p: 'Trần Văn Minh', ph: '0283 6543 210', a: '319 Phạm Văn Đồng, TP.HCM' },
    { code: 'KH0003', n: 'TNHH Logistics Phương Nam', p: 'Lê Thị Mai', ph: '0903 456 789', a: '466 Quốc lộ 1A, Quận 7, TP.HCM' },
    { code: 'KH0004', n: 'CTCP Thương Mại Đại Việt', p: 'Phạm Quang Huy', ph: '0912 345 678', a: '88 Nguyễn Huệ, Quận 1, TP.HCM' },
    { code: 'KH0005', n: 'TNHH Samsung HCMC CE Complex', p: 'Kim Soo Jin', ph: '0283 8765 432', a: 'KCN SHTP, Quận 9, TP.HCM' },
    { code: 'KH0006', n: 'CTCP Dược Phẩm Hậu Giang', p: 'Võ Thanh Tùng', ph: '0710 3861 234', a: '288 Nguyễn Văn Cừ, Cần Thơ' },
    { code: 'KH0007', n: 'TNHH Tân Hiệp Phát', p: 'Trần Quý Thanh', ph: '0650 3761 567', a: 'KCN Bình Dương, Dĩ An' },
    { code: 'KH0008', n: 'CTCP Sữa Vinamilk', p: 'Nguyễn Thị Thanh Hằng', ph: '0283 9155 555', a: '10 Tân Trào, Quận 7, TP.HCM' },
    { code: 'KH0009', n: 'TNHH Thép Pomina', p: 'Đỗ Duy Thái', ph: '0283 8963 111', a: '91 Pasteur, Quận 1, TP.HCM' },
    { code: 'KH0010', n: 'CTCP Phân Bón Bình Điền', p: 'Huỳnh Văn Lâm', ph: '0283 8560 222', a: 'Phường An Bình, TP. Dĩ An' },
];

const CARGO = ['Thịt heo đông lạnh','Xi măng bao','Gạch men','Linh kiện điện tử','Nước giải khát',
    'Gạo đóng bao','Thép cuộn','Phân bón NPK','Sữa hộp','Container 20ft','Hàng bách hóa','Vải cuộn'];
const ST = ['completed','completed','completed','completed','completed','in_progress','confirmed','dispatched','cancelled','draft'];

// ===================== DELETE (paginated) =====================

async function deleteCollection(colName) {
    let deleted = 0;
    while (true) {
        const snap = await db.collection(colName).limit(100).get();
        if (snap.empty) break;
        
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        deleted += snap.size;
        process.stdout.write(`  ${colName}: ${deleted}...\r`);
        await sleep(2000);
    }
    if (deleted > 0) console.log(`  ${colName}: deleted ${deleted} docs`);
    else console.log(`  ${colName}: 0 docs`);
}

async function deleteAll() {
    console.log('🗑️  DELETING ALL DATA (paginated)...');
    for (const col of COLLECTIONS) {
        await deleteCollection(col);
    }
    console.log('  ⏳ Cooling down 10s...');
    await sleep(10000);
}

// ===================== SEED =====================

async function seedTenant(tid) {
    console.log(`\n📦 SEEDING ${tid}...`);
    const now = new Date().toISOString();
    
    // VEHICLES
    let b = db.batch();
    VEHICLES.forEach((v, i) => {
        const id = `${tid}_vehicles_${v.code}`;
        const drv = i < DRIVERS.length ? `${tid}_drivers_${DRIVERS[i].code}` : null;
        b.set(db.collection('vehicles').doc(id), {
            tenant_id: tid, vehicle_code: v.code, license_plate: v.plate,
            vehicle_type: v.type, brand: v.brand, model: v.model,
            capacity_tons: v.cap, fuel_type: 'Diesel',
            year_manufacture: 2019 + (i % 6),
            color: ['Trắng','Xanh dương','Xám bạc','Đỏ','Vàng'][i % 5],
            current_odometer: rand(40000, 200000), status: 'active',
            engine_number: `ENG${rand(100000,999999)}`, chassis_number: `CHS${rand(100000,999999)}`,
            current_location: ROUTES[i % ROUTES.length].o,
            registration_date: dateStr(rand(365,1800)), registration_expiry_date: dateStr(-rand(30,365)),
            registration_cost: rand(300000,800000),
            insurance_purchase_date: dateStr(rand(30,365)), insurance_expiry_date: dateStr(-rand(30,365)),
            insurance_cost: rand(2000000,5000000), usage_limit_years: 15,
            assignment_type: drv ? 'fixed' : 'pool', assigned_driver_id: drv, default_driver_id: drv,
            is_deleted: 0, created_at: now, updated_at: now,
        });
    });
    await b.commit(); await sleep(1000);
    console.log(`  ✅ ${VEHICLES.length} vehicles`);

    // DRIVERS
    b = db.batch();
    DRIVERS.forEach((d, i) => {
        b.set(db.collection('drivers').doc(`${tid}_drivers_${d.code}`), {
            tenant_id: tid, driver_code: d.code, full_name: d.name,
            phone: d.phone, license_type: d.lic,
            license_number: `GP-${String(100000+i*31).slice(-6)}`,
            date_of_birth: d.dob, address: d.addr, status: 'active',
            vehicle_id: i < VEHICLES.length ? `${tid}_vehicles_${VEHICLES[i].code}` : null,
            is_deleted: 0, created_at: now, updated_at: now,
        });
    });
    await b.commit(); await sleep(1000);
    console.log(`  ✅ ${DRIVERS.length} drivers`);

    // ROUTES
    b = db.batch();
    ROUTES.forEach(r => {
        b.set(db.collection('routes').doc(`${tid}_routes_${r.code}`), {
            tenant_id: tid, route_code: r.code,
            route_name: `${r.o} → ${r.d}`, origin: r.o, destination: r.d,
            distance_km: r.km, base_price: r.p,
            status: 'active', is_deleted: 0, created_at: now, updated_at: now,
        });
    });
    await b.commit(); await sleep(1000);
    console.log(`  ✅ ${ROUTES.length} routes`);

    // CUSTOMERS
    b = db.batch();
    CUSTOMERS.forEach((c, i) => {
        b.set(db.collection('customers').doc(`${tid}_customers_${c.code}`), {
            tenant_id: tid, customer_code: c.code,
            customer_name: c.n, company_name: c.n, name: c.n,
            contact_person: c.p, contact_phone: c.ph, phone: c.ph,
            email: `lienhe@${c.n.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12)}.vn`,
            address: c.a, customer_type: 'corporate',
            tax_code: `0${300000000 + i * 7}`,
            credit_limit: rand(50,500)*1e6, current_debt: rand(0,100)*1e6,
            payment_terms: pick(['COD','NET15','NET30']),
            status: 'active', is_deleted: 0, created_at: now, updated_at: now,
        });
    });
    await b.commit(); await sleep(1000);
    console.log(`  ✅ ${CUSTOMERS.length} customers`);

    // TRIPS + EXPENSES + PUBLIC_TRACKING (batches of 50 trips)
    const TOTAL = 200;
    let expN = 0;
    for (let chunk = 0; chunk < TOTAL; chunk += 50) {
        const end = Math.min(chunk + 50, TOTAL);
        let tb = db.batch(), eb = db.batch(), pb = db.batch();
        let ec = 0;
        
        for (let i = chunk; i < end; i++) {
            const tc = `CD${pad(i+1)}`;
            const tId = `${tid}_trips_${tc}`;
            const da = Math.floor(i / 7);
            const s = ST[i % ST.length];
            const rt = ROUTES[i % ROUTES.length];
            const ve = VEHICLES[i % VEHICLES.length];
            const dr = DRIVERS[i % DRIVERS.length];
            const cu = CUSTOMERS[i % CUSTOMERS.length];
            
            const rId = `${tid}_routes_${rt.code}`;
            const vId = `${tid}_vehicles_${ve.code}`;
            const dId = `${tid}_drivers_${dr.code}`;
            const cId = `${tid}_customers_${cu.code}`;
            
            const fr = rt.p + rand(-200000,500000);
            const ac = rand(0,5) > 3 ? rand(100000,500000) : 0;
            const gr = fr + ac;
            const fl = Math.round(rt.km * rand(15,35) / 100);
            const fc = fl * rand(21000,23000);
            const tc2 = rand(0,3) > 1 ? rand(25000,200000) : 0;
            const dav = rand(0,2) > 0 ? rand(50000,300000) : 0;
            const tot = fc + tc2 + dav;
            const so = rand(40000,180000);
            const eo = so + rt.km + rand(-5,15);
            const dep = dateStr(da);
            const arr = s !== 'cancelled' && s !== 'draft' ? dep : null;
            
            tb.set(db.collection('trips').doc(tId), {
                tenant_id: tid, trip_code: tc, status: s,
                route_id: rId, vehicle_id: vId, driver_id: dId, customer_id: cId,
                origin: rt.o, destination: rt.d, route_name: `${rt.o} → ${rt.d}`,
                vehicle_plate: ve.plate, driver_name: dr.name, customer_name: cu.n, distance_km: rt.km,
                freight_revenue: fr, additional_charges: ac, gross_revenue: gr,
                fuel_cost: fc, toll_cost: tc2, driver_advance: dav,
                total_cost: tot, gross_profit: gr - tot, total_revenue: gr, total_expenses: tot,
                cargo_type: CARGO[i % CARGO.length], cargo_weight_tons: Math.round(rand(5,200)/10*10)/10,
                departure_date: dep, arrival_date: arr,
                start_odometer: so, end_odometer: eo, actual_distance_km: eo - so,
                fuel_liters: fl, pod_status: s === 'completed' ? 'RECEIVED' : 'PENDING',
                notes: `${CARGO[i % CARGO.length]} - ${rt.km}km`,
                source: 'manager', is_deleted: 0,
                created_at: isoDate(da), updated_at: isoDate(da > 0 ? da-1 : 0),
            });
            
            pb.set(db.collection('public_tracking').doc(tId), {
                trip_code: tc, status: s, tenant_id: tid,
                origin: rt.o, destination: rt.d, route_name: `${rt.o} → ${rt.d}`,
                vehicle_plate: ve.plate, distance_km: rt.km,
                departure_date: dep, arrival_date: arr, updated_at: isoDate(da > 0 ? da-1 : 0),
            });
            
            // Expenses
            const exps = [
                fc > 0 ? { d: `Đổ ${fl}L Diesel - ${tc}`, a: fc, c: 'fuel' } : null,
                tc2 > 0 ? { d: `Phí BOT - ${tc}`, a: tc2, c: 'toll' } : null,
                dav > 0 ? { d: `Khoán chuyến ${dr.name} - ${tc}`, a: dav, c: 'driver_allowance' } : null,
            ].filter(Boolean);
            
            for (const ex of exps) {
                expN++;
                const eCode = `PC${pad(expN)}`;
                eb.set(db.collection('expenses').doc(`${tid}_expenses_${eCode}`), {
                    tenant_id: tid, expense_code: eCode,
                    trip_id: tId, trip_code: tc, vehicle_id: vId, driver_id: dId,
                    description: ex.d, amount: ex.a, category: ex.c,
                    expense_date: dep, status: 'approved',
                    is_deleted: 0, created_at: isoDate(da), updated_at: isoDate(da),
                });
                ec++;
            }
        }
        
        await tb.commit(); await sleep(1000);
        await pb.commit(); await sleep(1000);
        await eb.commit(); await sleep(1000);
        console.log(`    trips ${chunk+1}-${end} + ${ec} expenses ✓`);
    }
    console.log(`  ✅ ${TOTAL} trips, ${expN} expenses, ${TOTAL} public_tracking`);

    // MAINTENANCE
    b = db.batch();
    const mt = ['Bảo dưỡng định kỳ','Thay lốp','Sửa phanh','Thay nhớt + lọc','Sửa hộp số'];
    for (let i = 0; i < 10; i++) {
        const v = VEHICLES[i]; const odo = rand(50000,150000);
        b.set(db.collection('maintenance').doc(`${tid}_maintenance_BD${pad(i+1,4)}`), {
            tenant_id: tid, maintenance_code: `BD${pad(i+1,4)}`,
            vehicle_id: `${tid}_vehicles_${v.code}`,
            maintenance_type: mt[i%mt.length], description: `${mt[i%mt.length]} - ${v.plate}`,
            maintenance_date: dateStr(rand(5,60)), cost: rand(500000,5000000), currency: 'VND',
            odometer: odo, next_maintenance_odometer: odo + 10000,
            notes: 'Bảo dưỡng theo định mức 10.000km',
            status: 'completed', is_deleted: 0, created_at: now, updated_at: now,
        });
    }
    await b.commit(); await sleep(1000);
    console.log(`  ✅ 10 maintenance`);
}

// ===================== MAIN =====================

async function main() {
    console.log('🔥 CLEAN SEED v2 — DELETE ALL + SEED (rate-limited)');
    console.log('='.repeat(55));
    await deleteAll();
    for (const tid of TENANTS) {
        await seedTenant(tid);
    }
    console.log('\n✅ DONE! Data per tenant: 15 vehicles, 15 drivers, 12 routes, 10 customers, 200 trips, ~500 expenses, 10 maintenance');
}

main().catch(console.error);
