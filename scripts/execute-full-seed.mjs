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
      
      // ID Mapping logic to ensure linked data (Vehicles, Drivers, etc.) stay connected after prefixing
      const idMap = {
        vehicle_id: 'vehicles',
        driver_id: 'drivers',
        customer_id: 'customers',
        route_id: 'routes',
        category_id: 'expenseCategories',
        trip_id: 'trips',
        order_id: 'transportOrders',
        inventory_id: 'inventory',
        account_id: 'accounts'
      };

      chunk.forEach(row => {
        // Create unique ID for the document itself
        const docId = `${tenantId}_${coll}_${row.id || row.code}`;
        const docRef = db.collection(coll).doc(docId);
        
        // Clone data and rewrite Foreign Keys
        const data = { ...row };
        delete data.id; 

        // Apply Foreign Key transformation
        for (const [key, targetColl] of Object.entries(idMap)) {
          if (data[key] && typeof data[key] === 'string' && !data[key].startsWith(tenantId)) {
            data[key] = `${tenantId}_${targetColl}_${data[key]}`;
          }
        }
        
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
  const demoDataVersion = "2026-04-11T08:55:49.066Z";
  const tenants = ['internal-tenant-1', 'internal-tenant-phuan'];

  for (const tid of tenants) {
    await seedTenant(tid);
    
    // Authorize the version to prevent auto-wipe on login
    console.log(`🔒 Authorizing Data Version for ${tid}...`);
    await db.collection('tenants').doc(tid).set({
      demo_data_version: demoDataVersion,
      updated_at: new Date().toISOString()
    }, { merge: true });
  }

  console.log('\n✅ Full Seeding & Version Authorization Complete!');
}

run().catch(console.error);
