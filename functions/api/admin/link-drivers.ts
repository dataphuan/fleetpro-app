/**
 * 🔧 Cloudflare Pages Function: Admin Driver Linker API
 * 
 * POST /api/admin/link-drivers
 * Body: { tenantId: string }
 * 
 * Called from Admin Settings page to auto-link driver accounts.
 * Uses Firebase Admin SDK via service account in env vars.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getAdminApp(env: any) {
    if (getApps().length) return getApps()[0];
    
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT || '{}');
    return initializeApp({
        credential: cert(serviceAccount),
    });
}

export const onRequestPost: PagesFunction = async (context) => {
    try {
        const { tenantId } = await context.request.json() as any;
        
        if (!tenantId) {
            return new Response(JSON.stringify({ error: 'tenantId required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        getAdminApp(context.env);
        const db = getFirestore();
        const auth = getAuth();

        // Get driver records
        const driversSnap = await db
            .collection('tenants').doc(tenantId)
            .collection('drivers')
            .get();

        const drivers = driversSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as any[];

        // Get driver-role users
        const profilesSnap = await db.collection('userProfiles').get();
        const driverEmails = profilesSnap.docs
            .filter(doc => {
                const data = doc.data();
                return data.role === 'driver' && data.tenantId === tenantId;
            })
            .map(doc => ({ email: doc.data().email, uid: doc.id }))
            .filter(d => d.email);

        const results: any[] = [];

        for (const { email, uid } of driverEmails) {
            // Find matching driver
            let driver = drivers.find(d => 
                d.email === email || d.driver_email === email || d.user_id === uid
            );

            // Fallback: sequential match by email prefix number
            if (!driver) {
                const prefix = email.split('@')[0];
                const seqMatch = prefix.match(/(\d+)$/);
                if (seqMatch) {
                    const seq = parseInt(seqMatch[1], 10);
                    const unlinked = drivers
                        .filter(d => !d.driver_email && !d.email)
                        .sort((a, b) => (a.driver_code || '').localeCompare(b.driver_code || ''));
                    if (seq >= 1 && seq <= unlinked.length) {
                        driver = unlinked[seq - 1];
                    }
                }
            }

            if (driver) {
                if (driver.driver_email === email) {
                    results.push({ email, driver: driver.name, status: 'already_linked' });
                    continue;
                }

                await db
                    .collection('tenants').doc(tenantId)
                    .collection('drivers').doc(driver.id)
                    .update({
                        driver_email: email,
                        user_id: uid,
                        email: email,
                        linked_at: new Date().toISOString(),
                        linked_by: 'admin-api',
                    });

                results.push({ email, driver: driver.name, status: 'linked' });
            } else {
                results.push({ email, driver: null, status: 'no_match' });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            tenantId,
            total: results.length,
            linked: results.filter(r => r.status === 'linked').length,
            already: results.filter(r => r.status === 'already_linked').length,
            noMatch: results.filter(r => r.status === 'no_match').length,
            details: results,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
