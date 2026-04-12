import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '../fleetpro-app-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();
const TENANT_ID = 'internal-tenant-phuan';

async function seedPhuAnRemaining() {
  console.log(`\n🚀 SEEDING REMAINING DATA FOR ${TENANT_ID}...`);
  const now = new Date().toISOString();

  // 1. Seed Routes (5 sample routes)
  const routes = [
    { code: 'TD0001', name: 'Kho Q7 - Cảng Cát Lái', distance: 15, revenue: 1500000, fuel: 8 },
    { code: 'TD0002', name: 'Kho Q7 - Vsip Bình Dương', distance: 35, revenue: 2800000, fuel: 15 },
    { code: 'TD0003', name: 'Kho Q7 - Biên Hòa', distance: 30, revenue: 2500000, fuel: 13 },
    { code: 'TD0004', name: 'Kho Q7 - Cảng Cái Mép', distance: 75, revenue: 5500000, fuel: 32 },
    { code: 'TD0005', name: 'Kho Q7 - Củ Chi', distance: 45, revenue: 3200000, fuel: 18 }
  ];

  for (const r of routes) {
    const docId = `${TENANT_ID}_routes_${r.code}`;
    await db.collection('routes').doc(docId).set({
      tenant_id: TENANT_ID,
      route_code: r.code,
      route_name: r.name,
      distance_km: r.distance,
      standard_freight_rate: r.revenue,
      fuel_liters_standard: r.fuel,
      status: 'active',
      is_deleted: 0,
      created_at: now,
      updated_at: now
    });
    console.log(`✅ Seeded Route: ${r.code} (${r.name})`);
  }

  // 2. Update existing Trips to link to these Routes randomly (to populate revenue/cost)
  const tripsSnap = await db.collection('trips').where('tenant_id', '==', TENANT_ID).get();
  let tripCount = 0;
  
  const batch = db.batch();
  tripsSnap.docs.forEach(docSnap => {
     const tripId = docSnap.id;
     const randomRoute = routes[Math.floor(Math.random() * routes.length)];
     
     // Calculate randomized finance
     const rev = randomRoute.revenue * (0.9 + Math.random() * 0.2); // +/- 10%
     const fuelCost = (randomRoute.fuel * 21000) * (0.95 + Math.random() * 0.1); // +/- 5%
     const tollCost = [150000, 250000, 50000][Math.floor(Math.random() * 3)];
     
     batch.update(docSnap.ref, {
       route_id: `${TENANT_ID}_routes_${randomRoute.code}`,
       route_code: randomRoute.code,
       freight_revenue: Math.round(rev),
       fuel_cost: Math.round(fuelCost),
       toll_cost: tollCost,
       gross_revenue: Math.round(rev),
       total_cost: Math.round(fuelCost + tollCost + 150000), // Driver allowance
       gross_profit: Math.round(rev - (fuelCost + tollCost + 150000)),
       updated_at: now
     });
     tripCount++;
  });
  
  if (tripCount > 0) {
    await batch.commit();
    console.log(`✅ Updated ${tripCount} trips with financial data matching routes.`);
  }

  // 3. Seed some Expenses (Xăng, Sửa xe, v.v.)
  const expenseCategories = ['Xăng dầu', 'Phí cầu đường', 'Sửa chữa', 'Bảo hiểm', 'Lương tài xế'];
  const vehicles = ['XE0001', 'XE0002', 'XE0003'];

  for (let i = 0; i < 20; i++) {
    const code = `PC${String(i + 1).padStart(4, '0')}`;
    const docId = `${TENANT_ID}_expenses_${code}`;
    const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
    const amount = [500000, 2000000, 150000, 5000000][Math.floor(Math.random() * 4)];
    
    await db.collection('expenses').doc(docId).set({
      tenant_id: TENANT_ID,
      expense_code: code,
      category: cat,
      amount: amount,
      vehicle_id: `${TENANT_ID}_vehicles_${vehicles[Math.floor(Math.random() * vehicles.length)]}`,
      expense_date: now,
      status: 'approved',
      is_deleted: 0,
      created_at: now,
      updated_at: now
    });
  }
  console.log(`✅ Seeded 20 general expenses for P&L data.`);

  console.log(`\n✨ SEEDING COMPLETE FOR ${TENANT_ID} ✨`);
}

seedPhuAnRemaining().then(() => process.exit(0));
