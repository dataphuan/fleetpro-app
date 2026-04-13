import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccountPath = path.join(__dirname, '../fleetpro-app-service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}

const auth = admin.auth();
const db = admin.firestore();

async function diagnoseUser(email) {
    console.log(`\n🔍 DIAGNOSING USER: ${email}`);
    try {
        const userRecord = await auth.getUserByEmail(email);
        console.log(`✅ Auth Record Found: UID = ${userRecord.uid}`);
        
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        if (!userDoc.exists) {
            console.log(`❌ Firestore User Document MISSING (/users/${userRecord.uid})`);
        } else {
            console.log(`✅ Firestore User Document Found:`, JSON.stringify(userDoc.data(), null, 2));
        }

        const driverSnap = await db.collection('drivers').where('email', '==', email).get();
        if (driverSnap.empty) {
            console.log(`❌ Driver Record MISSING (/drivers where email == ${email})`);
        } else {
            driverSnap.forEach(doc => {
                console.log(`✅ Driver Record Found: ID = ${doc.id}`, JSON.stringify(doc.data(), null, 2));
            });
        }
    } catch (error) {
        console.error(`❌ Error diagnosing user: ${error.message}`);
    }
}

const email = process.argv[2] || 'taixe1@phuancr.com';
diagnoseUser(email).then(() => process.exit(0));
