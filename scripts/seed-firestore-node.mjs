import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  writeBatch,
  collection,
} from 'firebase/firestore';

function extractConstArray(source, constName) {
  const re = new RegExp(`const\\s+${constName}\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = source.match(re);
  if (!m) throw new Error(`Cannot find const ${constName} in seed-firestore.html`);
  const context = {};
  vm.runInNewContext(`${constName} = ${m[1]};`, context);
  return context[constName];
}

function extractFirebaseConfig(source) {
  const re = /const\s+firebaseConfig\s*=\s*(\{[\s\S]*?\});/;
  const m = source.match(re);
  if (!m) throw new Error('Cannot find firebaseConfig in seed-firestore.html');
  const context = {};
  vm.runInNewContext(`firebaseConfig = ${m[1]};`, context);
  return context.firebaseConfig;
}

async function seedCollection(db, tenantId, name, items) {
  const chunkSize = 400;
  for (let i = 0; i < items.length; i += chunkSize) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + chunkSize);
    for (const item of chunk) {
      const { id, ...data } = item;
      const now = new Date().toISOString();
      const payload = {
        ...data,
        tenant_id: tenantId,
        is_deleted: typeof data.is_deleted === 'undefined' ? 0 : data.is_deleted,
        created_at: data.created_at || now,
        updated_at: now,
        updated_by: 'seed-node-script',
      };

      if (name === 'customers' && !payload.name && payload.customer_name) payload.name = payload.customer_name;
      if (name === 'routes' && !payload.name && payload.route_name) payload.name = payload.route_name;
      if (name === 'trips') {
        if (typeof payload.freight_revenue === 'undefined') payload.freight_revenue = payload.total_revenue || 0;
        if (typeof payload.additional_charges === 'undefined') payload.additional_charges = 0;
        if (typeof payload.total_expenses === 'undefined') payload.total_expenses = 0;
      }

      payload.record_id = payload.record_id || `${tenantId}_${name}_${id}`;
      batch.set(doc(db, name, String(id)), payload, { merge: true });
    }
    await batch.commit();
  }
  console.log(`OK ${name}: ${items.length}`);
}

async function ensureCurrentUserProfile(db, user, tenantId) {
  const now = new Date().toISOString();
  await setDoc(
    doc(db, 'users', user.uid),
    {
      email: user.email || '',
      full_name: user.email || 'Admin User',
      role: 'admin',
      status: 'active',
      tenant_id: tenantId,
      is_deleted: 0,
      created_at: now,
      updated_at: now,
      updated_by: 'seed-node-script',
      record_id: `${tenantId}_users_${user.uid}`,
    },
    { merge: true }
  );
  console.log(`OK users/current: ${user.email} uid=${user.uid}`);
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const tenantId = process.argv[4] || 'internal-tenant-1';

  if (!email || !password) {
    console.error('Usage: node scripts/seed-firestore-node.mjs <email> <password> [tenantId]');
    process.exit(1);
  }

  const htmlPath = path.resolve('scripts/seed-firestore.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const firebaseConfig = extractFirebaseConfig(html);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const datasets = {
    vehicles: extractConstArray(html, 'VEHICLES'),
    drivers: extractConstArray(html, 'DRIVERS'),
    customers: extractConstArray(html, 'CUSTOMERS'),
    routes: extractConstArray(html, 'ROUTES'),
    trips: extractConstArray(html, 'TRIPS'),
    expenses: extractConstArray(html, 'EXPENSES'),
    maintenance: extractConstArray(html, 'MAINTENANCE'),
    expenseCategories: extractConstArray(html, 'EXPENSE_CATEGORIES'),
    accountingPeriods: extractConstArray(html, 'ACCOUNTING_PERIODS'),
    companySettings: extractConstArray(html, 'COMPANY_SETTINGS'),
    transportOrders: extractConstArray(html, 'TRANSPORT_ORDERS'),
    tires: extractConstArray(html, 'TIRES'),
    inventory: extractConstArray(html, 'INVENTORY'),
    purchaseOrders: extractConstArray(html, 'PURCHASE_ORDERS'),
    inventoryTransactions: extractConstArray(html, 'INVENTORY_TRANSACTIONS'),
    tripExpenses: extractConstArray(html, 'TRIP_EXPENSES'),
    alerts: extractConstArray(html, 'ALERTS'),
    partners: extractConstArray(html, 'PARTNERS'),
    users: extractConstArray(html, 'USERS'),
  };

  console.log(`Signing in as ${email} ...`);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  console.log(`Signed in. uid=${user.uid}`);
  console.log(`Seeding tenant=${tenantId}`);

  await ensureCurrentUserProfile(db, user, tenantId);

  for (const [name, items] of Object.entries(datasets)) {
    await seedCollection(db, tenantId, name, items);
  }

  console.log('DONE: full seed completed.');
}

main().catch((err) => {
  console.error('SEED FAILED:', err?.message || err);
  process.exit(1);
});
