import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

// Khởi tạo Firebase
const serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'fleetpro-app-service-account.json'), 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function runQA() {
    console.log('# Báo cáo QA P0 - Lucky');
    console.log('Đang lấy dữ liệu từ collections...');

    // Lấy dữ liệu
    const tripsSnap = await db.collection('trips').get();
    const vehiclesSnap = await db.collection('vehicles').get();
    const driversSnap = await db.collection('drivers').get();
    const expensesSnap = await db.collection('expenses').get();
    
    const trips = tripsSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
    const vehicles = vehiclesSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
    const drivers = driversSnap.docs.map(d => ({ docId: d.id, ...d.data() }));
    const expenses = expensesSnap.docs.map(d => ({ docId: d.id, ...d.data() }));

    const vehiclesMap = vehicles.reduce((acc, v) => ({ ...acc, [v.id || v['Mã xe']]: v }), {});
    const driversMap = drivers.reduce((acc, d) => ({ ...acc, [d.id || d['Mã tài xế']]: d }), {});
    
    let fails = [];
    let passes = [];

    function fail(ruleId, recordId, currentData, expected, failReason, suspiciousFile) {
        fails.push(`### FAIL — ${ruleId}
- Màn hình: DB Level / API
- URL/Route: Backend Firestore
- Record ID: ${recordId}
- Dữ liệu hiện tại: ${JSON.stringify(currentData)}
- Kết quả hiện tại: ${failReason}
- Kết quả mong đợi: ${expected}
- Mức độ: P0
- Ảnh chụp: [Không khả dụng - Lỗi DB/Logic]
- Log liên quan: Vi phạm Rule
- File nghi ngờ: ${suspiciousFile}
- Hướng fix đề xuất: Bổ sung Zod Schema và logic chặn ở data-adapter / UI`);
    }

    function pass(ruleId) {
        passes.push(`### PASS — ${ruleId}
- Màn hình: Data/Logic Core
- URL/Route: Backend
- Phạm vi đã kiểm: Toàn bộ DB
- Dữ liệu mẫu: Số lượng record đã được test
- Ảnh chụp bằng chứng: Log script passed
- Ghi chú: Dữ liệu hiện tại không vi phạm rule này.`);
    }

    // CHECK R01: Mỗi chuyến phải có `tripId` duy nhất, không null
    let tripIds = new Set();
    let r01Failed = false;
    for (const t of trips) {
        const tId = t.id || t['Mã chuyến'];
        if (!tId) {
            fail('R01', t.docId, {id: tId}, 'Có tripId', 'tripId bị null/rỗng', 'src/lib/schemas.ts');
            r01Failed = true;
        } else if (tripIds.has(tId)) {
            fail('R01', t.docId, {id: tId}, 'tripId duy nhất', 'tripId bị trùng', 'src/lib/data-adapter.ts');
            r01Failed = true;
        }
        if (tId) tripIds.add(tId);
    }
    if (!r01Failed) pass('R01');

    // CHECK R02: Mỗi chuyến phải gắn xe (nếu không draft/cancelled)
    let r02Failed = false;
    for (const t of trips) {
        if (t.status !== 'draft' && t.status !== 'cancelled') {
            if (!t.vehicle_id && !t['Mã xe']) {
                fail('R02', t.docId, {status: t.status, vehicle_id: t.vehicle_id}, 'Phải có mã xe', 'Thiếu vehicle_id khi trạng thái hoạt động', 'src/lib/schemas.ts TripSchema');
                r02Failed = true;
                break; // chỉ log 1 cái tiêu biểu cho report
            }
        }
    }
    if (!r02Failed) pass('R02');

    // CHECK R03: Mỗi chuyến phải gắn tài xế
    let r03Failed = false;
    for (const t of trips) {
        if (t.status !== 'draft' && t.status !== 'cancelled') {
            if (!t.driver_id && !t['Mã tài xế']) {
                fail('R03', t.docId, {status: t.status, driver_id: t.driver_id}, 'Phải có mã tài xế', 'Thiếu driver_id khi trạng thái hoạt động', 'src/lib/schemas.ts TripSchema');
                r03Failed = true;
                break;
            }
        }
    }
    if (!r03Failed) pass('R03');

    // R21: Km đầu chuyến không được âm
    let r21Failed = false;
    for (const t of trips) {
        if (t.start_odometer !== undefined && t.start_odometer < 0 || t.startOdometer < 0) {
            fail('R21', t.docId, {startOdometer: t.start_odometer || t.startOdometer}, '>= 0', '< 0', 'src/lib/schemas.ts');
            r21Failed = true;
            break;
        }
        // Force fail if the schema literally doesn't even define it, but let's just check DB instances.
    }
    if (!r21Failed) pass('R21');

    // R22/R23: Km cuối >= Km đầu
    let r22Failed = false;
    for (const t of trips) {
        const start = t.start_odometer || t.startOdometer || 0;
        const end = t.end_odometer || t.endOdometer || 0;
        if (end !== 0 && end < start) {
            fail('R22', t.docId, {start, end}, 'end >= start', 'end < start', 'src/lib/schemas.ts');
            r22Failed = true;
            break;
        }
    }
    if (!r22Failed) pass('R22');

    // R31: Tiền không âm
    let r31Failed = false;
    for (const t of trips) {
        if (t.freight_revenue < 0 || t.fuel_cost < 0) {
            fail('R31', t.docId, {rev: t.freight_revenue, fuel: t.fuel_cost}, '>= 0', '< 0', 'src/lib/schemas.ts');
            r31Failed = true; break;
        }
    }
    for (const e of expenses) {
        if (e.amount < 0 || e['Số tiền'] < 0) {
            fail('R31', e.docId, {amount: e.amount || e['Số tiền']}, '>= 0', '< 0', 'src/lib/schemas.ts');
            r31Failed = true; break;
        }
    }
    if (!r31Failed) pass('R31');

    // R08: Expense mồ côi
    let r08Failed = false;
    for (const e of expenses) {
        // usually mapped with trip_id, vehicle_id, driver_id
        if (!e.trip_id && !e.vehicle_id && !e.driver_id && !e['Mã chuyến'] && !e['Mã xe']) {
            fail('R08', e.docId, e, 'Có trip_id/vehicle_id', 'Expense không có refernce key nào', 'src/lib/schemas.ts ExpenseSchema');
            r08Failed = true; break;
        }
    }
    if (!r08Failed) pass('R08');


    console.log('\n======================================');
    passes.forEach(p => console.log(p + '\n'));
    fails.forEach(f => console.log(f + '\n'));
    console.log('Done script.');
}

runQA().catch(console.error);
