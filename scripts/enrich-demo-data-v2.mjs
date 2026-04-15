/**
 * 🔧 COMPREHENSIVE DATA ENRICHMENT SCRIPT
 * 
 * Fixes all data quality issues found in the audit:
 * 1. Customers: Add company_name, contact_phone, contact_person
 * 2. Drivers: Add license_type, license_number
 * 3. Expenses: Add category based on description
 * 4. public_tracking: Enrich with origin/destination from routes
 * 
 * Runs for BOTH tenants: internal-tenant-1, internal-tenant-phuan
 * 
 * Usage: node scripts/enrich-demo-data-v2.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

const TENANTS = ['internal-tenant-1', 'internal-tenant-phuan'];

// ===== Vietnamese Company Names =====
const VN_COMPANIES = [
    { company_name: 'TNHH Thực Phẩm Sài Gòn', contact_person: 'Nguyễn Thị Hương', contact_phone: '0283 9876 543' },
    { company_name: 'CTCP Vật Liệu Xây Dựng Hòa Phát', contact_person: 'Trần Văn Minh', contact_phone: '0283 6543 210' },
    { company_name: 'Công Ty TNHH Logistics Phương Nam', contact_person: 'Lê Thị Mai', contact_phone: '0903 456 789' },
    { company_name: 'CTCP Thương Mại Đại Việt', contact_person: 'Phạm Quang Huy', contact_phone: '0912 345 678' },
    { company_name: 'Công Ty TNHH Điện Tử Samsung HCMC', contact_person: 'Kim Soo Jin', contact_phone: '0283 8765 432' },
    { company_name: 'CTCP Dược Phẩm Hậu Giang (DHG)', contact_person: 'Võ Thanh Tùng', contact_phone: '0710 3861 234' },
    { company_name: 'Công Ty TNHH Nước Giải Khát Tân Hiệp Phát', contact_person: 'Trần Quý Thanh', contact_phone: '0650 3761 567' },
    { company_name: 'CTCP Sữa Việt Nam (Vinamilk)', contact_person: 'Nguyễn Thị Thanh Hằng', contact_phone: '0283 9155 555' },
    { company_name: 'Công Ty TNHH Thép Pomina', contact_person: 'Đỗ Duy Thái', contact_phone: '0283 8963 111' },
    { company_name: 'CTCP Phân Bón Bình Điền', contact_person: 'Huỳnh Văn Lâm', contact_phone: '0283 8560 222' },
];

// ===== Vietnamese License Types =====
const LICENSE_TYPES = ['B2', 'C', 'D', 'E', 'FC'];
const LICENSE_PREFIXES = ['GP', 'BG', 'GX'];

// ===== Expense Categories =====
const EXPENSE_CATEGORIES = {
    'Diesel': 'fuel',
    'diesel': 'fuel',
    'xăng': 'fuel',
    'xang': 'fuel',
    'nhiên liệu': 'fuel',
    'Đổ': 'fuel',
    'lít': 'fuel',
    'BOT': 'toll',
    'cao tốc': 'toll',
    'phí cầu': 'toll',
    'phí đường': 'toll',
    'Khoán chuyến': 'driver_allowance',
    'khoán': 'driver_allowance',
    'tài xế': 'driver_allowance',
    'lương': 'salary',
    'bảo hiểm': 'insurance',
    'sửa chữa': 'repair',
    'bảo trì': 'maintenance',
    'bảo dưỡng': 'maintenance',
    'lốp': 'tire',
    'nhớt': 'oil',
    'dầu nhớt': 'oil',
    'rửa xe': 'wash',
    'đậu xe': 'parking',
    'bốc xếp': 'loading',
    'phạt': 'fine',
    'ăn': 'meal',
    'khác': 'other',
};

async function enrichCustomers() {
    console.log('\n📋 ENRICHING CUSTOMERS...');
    for (const tid of TENANTS) {
        const snap = await db.collection('customers').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        
        for (const doc of snap.docs) {
            const data = doc.data();
            const idx = count % VN_COMPANIES.length;
            const company = VN_COMPANIES[idx];
            
            const updates = {};
            if (!data.company_name) updates.company_name = company.company_name;
            if (!data.customer_name) updates.customer_name = company.company_name;
            if (!data.contact_person) updates.contact_person = company.contact_person;
            if (!data.contact_phone) updates.contact_phone = company.contact_phone;
            if (!data.email) updates.email = `info@${company.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.vn`;
            if (!data.tax_code) updates.tax_code = `0${300000000 + count * 7}`;
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                batchCount++;
            }
            count++;
            
            if (batchCount >= 400) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${count} customers enriched`);
    }
}

async function enrichDrivers() {
    console.log('\n🚛 ENRICHING DRIVERS...');
    for (const tid of TENANTS) {
        const snap = await db.collection('drivers').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        
        for (const doc of snap.docs) {
            const data = doc.data();
            const updates = {};
            
            if (!data.license_type) {
                updates.license_type = LICENSE_TYPES[count % LICENSE_TYPES.length];
            }
            if (!data.license_number) {
                const prefix = LICENSE_PREFIXES[count % LICENSE_PREFIXES.length];
                updates.license_number = `${prefix}-${String(100000 + count * 31).slice(-6)}`;
            }
            if (!data.date_of_birth) {
                const year = 1975 + (count % 20);
                const month = String((count % 12) + 1).padStart(2, '0');
                const day = String((count % 28) + 1).padStart(2, '0');
                updates.date_of_birth = `${year}-${month}-${day}`;
            }
            if (!data.address) {
                const addresses = [
                    'Quận 1, TP.HCM', 'Quận Bình Thạnh, TP.HCM', 'TP. Thủ Đức, TP.HCM',
                    'Quận Tân Bình, TP.HCM', 'Quận 7, TP.HCM', 'Quận Gò Vấp, TP.HCM',
                    'Quận 9, TP.HCM', 'Huyện Bình Chánh, TP.HCM', 'Quận 12, TP.HCM',
                    'TP. Biên Hòa, Đồng Nai', 'TP. Dĩ An, Bình Dương', 'TP. Thuận An, Bình Dương',
                ];
                updates.address = addresses[count % addresses.length];
            }
            if (data.status === undefined) updates.status = 'active';
            
            if (Object.keys(updates).length > 0) {
                batch.update(doc.ref, updates);
                batchCount++;
            }
            count++;
            
            if (batchCount >= 400) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${count} drivers enriched`);
    }
}

async function enrichExpenses() {
    console.log('\n💰 ENRICHING EXPENSES...');
    for (const tid of TENANTS) {
        const snap = await db.collection('expenses').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        let enriched = 0;
        
        for (const doc of snap.docs) {
            const data = doc.data();
            count++;
            
            if (data.category) continue; // Already has category
            
            const desc = (data.description || data.notes || '').toLowerCase();
            let category = 'other';
            for (const [keyword, cat] of Object.entries(EXPENSE_CATEGORIES)) {
                if (desc.includes(keyword.toLowerCase())) {
                    category = cat;
                    break;
                }
            }
            
            batch.update(doc.ref, { category });
            batchCount++;
            enriched++;
            
            if (batchCount >= 400) {
                await batch.commit();
                console.log(`    Committed ${enriched} expenses...`);
                batch = db.batch();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${enriched}/${count} expenses categorized`);
    }
}

async function enrichPublicTracking() {
    console.log('\n📦 ENRICHING PUBLIC TRACKING...');
    
    // Build route lookup across all tenants
    const routeMap = new Map();
    for (const tid of TENANTS) {
        const rSnap = await db.collection('routes').where('tenant_id', '==', tid).get();
        rSnap.docs.forEach(d => routeMap.set(d.id, d.data()));
    }
    
    // Build vehicle lookup
    const vehicleMap = new Map();
    for (const tid of TENANTS) {
        const vSnap = await db.collection('vehicles').where('tenant_id', '==', tid).get();
        vSnap.docs.forEach(d => vehicleMap.set(d.id, d.data()));
    }
    
    // Build driver lookup
    const driverMap = new Map();
    for (const tid of TENANTS) {
        const dSnap = await db.collection('drivers').where('tenant_id', '==', tid).get();
        dSnap.docs.forEach(d => driverMap.set(d.id, d.data()));
    }
    
    // Enrich trips + sync to public_tracking
    for (const tid of TENANTS) {
        const tSnap = await db.collection('trips').where('tenant_id', '==', tid).get();
        let batch = db.batch();
        let count = 0;
        let batchCount = 0;
        
        for (const doc of tSnap.docs) {
            const t = doc.data();
            const route = t.route_id ? routeMap.get(t.route_id) : null;
            const vehicle = t.vehicle_id ? vehicleMap.get(t.vehicle_id) : null;
            const driver = t.driver_id ? driverMap.get(t.driver_id) : null;
            
            const origin = route?.origin || t.origin || '';
            const destination = route?.destination || t.destination || '';
            const route_name = route?.route_name || t.route_name || '';
            const distance_km = route?.distance_km || t.distance_km || t.actual_distance_km || 0;
            const vehicle_plate = vehicle?.license_plate || t.vehicle_plate || '';
            
            // Update public_tracking doc
            const publicData = {
                trip_code: t.trip_code || '',
                status: t.status || 'draft',
                origin: origin,
                destination: destination,
                departure_date: t.departure_date || t.created_at || '',
                arrival_date: t.arrival_date || t.completed_at || null,
                vehicle_plate: vehicle_plate || null,
                route_name: route_name || null,
                distance_km: distance_km || null,
                updated_at: t.updated_at || t.created_at || '',
                tenant_id: tid,
            };
            
            batch.set(db.collection('public_tracking').doc(doc.id), publicData, { merge: true });
            batchCount++;
            count++;
            
            if (batchCount >= 400) {
                await batch.commit();
                console.log(`    Committed ${count} docs...`);
                batch = db.batch();
                batchCount = 0;
            }
        }
        if (batchCount > 0) await batch.commit();
        console.log(`  ${tid}: ${count} public_tracking docs enriched`);
    }
}

async function main() {
    console.log('🔧 COMPREHENSIVE DATA ENRICHMENT v2');
    console.log('=' .repeat(50));
    
    await enrichCustomers();
    await enrichDrivers();
    await enrichExpenses();
    await enrichPublicTracking();
    
    console.log('\n✅ ALL DONE!');
}

main().catch(console.error);
