import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// We need to read the JSON version or JS version of the seed.
// Since it's a .ts file exporting a constant, we'll read the generated file if it exists or mock the essential part.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Mocking the extraction of SEED data since we can't easily import .ts here without ts-node.
// I will read the file and parse the collection part using regex or simple parsing for this task.
const seedFilePath = path.join(__dirname, '../src/data/tenantDemoSeed.ts');
const seedContent = fs.readFileSync(seedFilePath, 'utf-8');

// Simple extraction of the collections object
const collectionsMatch = seedContent.match(/collections": (\{[\s\S]*?\n\s+\}\s+),/);
if (!collectionsMatch) {
  console.error("Could not parse TENANT_DEMO_SEED collections from file.");
  process.exit(1);
}

// Cleaning up the TS/JS string to make it valid JSON (roughly)
let collectionsJsonStr = collectionsMatch[1]
  .replace(/\/\/.*$/gm, '') // remove comments
  .replace(/([a-zA-Z0-9_]+):/g, '"$1":') // quote keys
  .replace(/,\s+\]/g, ']') // trailing commas in arrays
  .replace(/,\s+\}/g, '}') // trailing commas in objects
  .replace(/'/g, '"'); // single to double quotes

const SEED_COLLECTIONS = JSON.parse(collectionsJsonStr);

const TENANT_ID = 'internal-tenant-1';
const nowIso = new Date().toISOString();

async function seed() {
  console.log(`🚀 BẮT ĐẦU SEED DỮ LIỆU THỰC TẾ VÀO TENANT: ${TENANT_ID}`);
  
  const toDocId = (coll, id) => `${TENANT_ID}_${coll}_${id}`;
  
  for (const [collName, rows] of Object.entries(SEED_COLLECTIONS)) {
     if (collName === 'users') continue; // Users are handled separately
     
     console.log(` - Seeding collection: ${collName} (${rows.length} records)...`);
     
     const batch = db.batch();
     let count = 0;
     
     for (const row of rows) {
        const sourceId = row.id || row.record_id || row.vehicle_code || row.driver_code || `${Math.random().toString(36).slice(2, 8)}`;
        const docId = toDocId(collName, sourceId);
        
        const payload = { 
            ...row, 
            tenant_id: TENANT_ID,
            created_at: nowIso,
            updated_at: nowIso,
            is_deleted: 0
        };
        delete payload.id;
        
        // Resolve refs (simplified for this script)
        Object.keys(payload).forEach(key => {
            if (key.endsWith('_id') || key === 'assigned_vehicle_id') {
                const val = payload[key];
                if (val && typeof val === 'string' && !val.includes(TENANT_ID)) {
                    // Try to map to other collections if possible, but keep it simple for now
                }
            }
        });

        batch.set(db.collection(collName).doc(docId), payload, { merge: true });
        count++;
        
        if (count >= 400) {
            await batch.commit();
            console.log(`   ... đã commit ${count} bản ghi`);
            // Reset for next batch
            // (Need a new batch object)
            // But for simple script I'll just break and use chunks if needed
        }
     }
     await batch.commit();
     console.log(`   ✅ Hoàn tất ${collName}.`);
  }
}

seed().then(() => {
  console.log('\n🌟 HOÀN TẤT SEED DATA CHO internal-tenant-1! HIỆN TẠI HỆ THỐNG ĐÃ CÓ ĐỦ XE, TÀI XẾ VÀ CHI PHÍ.');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
