import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('fleetpro-app-service-account.json', 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const seedData = JSON.parse(fs.readFileSync('seed_data.json', 'utf-8'));

async function seedTenant(tenantId) {
  console.log(`\n🚜 Seeding Tenant: ${tenantId}`);
  const now = new Date().toISOString();
  
  const collectionsToSeed = [
    'vehicles', 'drivers', 'customers', 'routes', 'trips', 
    'expenses', 'expenseCategories', 'maintenance', 'inventory', 'tires'
  ];

  for (const coll of collectionsToSeed) {
    const rows = seedData.collections[coll] || [];
    if (rows.length === 0) continue;

    console.log(`  - Seeding ${rows.length} records into ${coll}...`);
    
    // Batch processing
    const chunkSize = 400;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const batch = db.batch();
      const chunk = rows.slice(i, i + chunkSize);
      
      chunk.forEach(row => {
        // Create unique ID based on tenant
        const docId = `${tenantId}_${coll}_${row.id || row.code || Math.random().toString(36).substr(2,9)}`;
        const docRef = db.collection(coll).doc(docId);
        
        // Clean up row and add tenant context
        const data = { ...row };
        delete data.id; // use our generated docId
        
        // Data localization logic (already handled in seed data but ensuring tenant isolation)
        batch.set(docRef, {
          ...data,
          tenant_id: tenantId,
          created_at: data.created_at || now,
          updated_at: now,
          is_deleted: 0
        }, { merge: true });
      });
      
      await batch.commit();
    }
  }
}

async function run() {
  await seedTenant('internal-tenant-1');
  await seedTenant('internal-tenant-phuan');
  console.log('\n✅ Full Seeding Complete!');
}

run().catch(console.error);
