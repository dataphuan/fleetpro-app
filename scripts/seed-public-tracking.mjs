/**
 * One-time script: Seed public_tracking from existing trips
 * Run: node scripts/seed-public-tracking.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./fleetpro-app-service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

async function seed() {
    console.log('📦 Seeding public_tracking from trips...');
    
    const tripsSnap = await db.collection('trips').get();
    console.log(`Found ${tripsSnap.size} trips`);

    let batch = db.batch();
    let count = 0;
    let batchCount = 0;

    for (const tripDoc of tripsSnap.docs) {
        const d = tripDoc.data();
        const publicData = {
            trip_code: d.trip_code || '',
            status: d.status || 'draft',
            origin: d.origin || d.route?.origin || '',
            destination: d.destination || d.route?.destination || '',
            departure_date: d.departure_date || d.created_at || '',
            arrival_date: d.arrival_date || d.completed_at || null,
            vehicle_plate: d.vehicle?.license_plate || d.vehicle_plate || null,
            route_name: d.route?.route_name || d.route_name || null,
            distance_km: d.distance_km || d.route?.distance_km || null,
            updated_at: d.updated_at || d.created_at || '',
            tenant_id: d.tenant_id || '',
        };
        
        batch.set(db.collection('public_tracking').doc(tripDoc.id), publicData);
        count++;
        batchCount++;

        // Firestore batch max = 500
        if (batchCount >= 400) {
            await batch.commit();
            console.log(`  Committed ${count} docs...`);
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log(`✅ Done! Seeded ${count} public_tracking documents.`);
}

seed().catch(console.error);
