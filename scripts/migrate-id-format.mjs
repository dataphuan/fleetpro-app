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
  // Already initialized maybe
}

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan'; // OR just all in db

// Chuyển TX-xx -> TX00xx, XE-xx -> XE00xx
function normalizeCode(prefix, code) {
    if (!code) return null;
    const match = code.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (match) {
        let num = match[1];
        return `${prefix}${num.padStart(4, '0')}`;
    }
    const looseMatch = code.match(new RegExp(`^${prefix}(\\d+)$`));
    if (looseMatch) {
       let num = looseMatch[1];
       return `${prefix}${num.padStart(4, '0')}`;
    }
    return code; // return original if no match
}

async function migrate() {
    console.log("🚀 Bắt đầu Migrate ID format TẤT CẢ tenant (Bỏ dấu gạch ngang, ép 4 số)");
    try {
        const batch = db.batch();
        let count = 0;

        // 1. Drivers
        const driverSnap = await db.collection('drivers').get();
        for (const docSnap of driverSnap.docs) {
            const data = docSnap.data();
            const newCode = normalizeCode('TX', data.driver_code || data['Mã tài xế']);
            if (newCode && (newCode !== data.driver_code || newCode !== data['Mã tài xế'])) {
                batch.update(docSnap.ref, { 
                    driver_code: newCode, 
                    'Mã tài xế': newCode 
                });
                count++;
            }
        }

        // 2. Vehicles
        const vehicleSnap = await db.collection('vehicles').get();
        for (const docSnap of vehicleSnap.docs) {
            const data = docSnap.data();
            const newCode = normalizeCode('XE', data.vehicle_code || data['Mã xe']);
            if (newCode && (newCode !== data.vehicle_code || newCode !== data['Mã xe'])) {
                batch.update(docSnap.ref, { 
                    vehicle_code: newCode, 
                    'Mã xe': newCode 
                });
                count++;
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`✅ Đã xử lý chuẩn hóa ${count} bản ghi Mã Tài Xế và Mã Xe`);
        } else {
            console.log(`✅ Dữ liệu đã chuẩn, không có bản ghi nào bị format cũ.`);
        }
    } catch (e) {
        console.error("Lỗi:", e);
    }
    process.exit(0);
}

migrate();
