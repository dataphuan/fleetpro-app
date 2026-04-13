import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = 'd:/AI-KILLS/V1-quanlyxeonline';
const serviceAccount = JSON.parse(readFileSync(resolve(root, 'fleetpro-app-service-account.json'), 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function verifyDriver() {
  const email = 'taixe1@phuancr.com';
  console.log(`🔍 Checking ${email}...`);
  
  const userSnap = await db.collection('users').where('email', '==', email).get();
  if (userSnap.empty) {
    console.log('❌ User not found!');
  } else {
    const user = userSnap.docs[0].data();
    console.log('✅ User doc found:', user);
  }

  const driverSnap = await db.collection('drivers').where('email', '==', email).get();
  if (driverSnap.empty) {
    console.log('❌ Driver doc not found!');
  } else {
    const driver = driverSnap.docs[0].data();
    console.log('✅ Driver doc found:', driver);
  }
}

verifyDriver();
