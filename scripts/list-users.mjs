import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function listUsers() {
  const usersRef = await db.collection('users').get();
  console.log(`FOUND ${usersRef.docs.length} USERS IN FIRESTORE:`);
  usersRef.docs.forEach((d) => {
    const data = d.data();
    console.log(`- ID: ${d.id}, Email: ${data.email}, Role: ${data.role}, Tenant: ${data.tenant_id}`);
  });
  
  console.log('\nFOUND USERS IN AUTH:');
  const listUsersResult = await auth.listUsers();
  listUsersResult.users.forEach((u) => {
     console.log(`- UID: ${u.uid}, Email: ${u.email}`);
  });
}
listUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
