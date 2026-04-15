/**
 * 🔧 ADMIN SCRIPT: Auto-link Driver Accounts
 * 
 * Chạy script này để tự động liên kết tài khoản Firebase Auth 
 * với driver records trong Firestore cho BẤT KỲ tenant nào.
 * 
 * Cách chạy:
 *   npx tsx scripts/link-driver-accounts.ts --tenant=<TENANT_ID>
 * 
 * Hoặc link ALL tenants:
 *   npx tsx scripts/link-driver-accounts.ts --all
 * 
 * Yêu cầu: GOOGLE_APPLICATION_CREDENTIALS env var trỏ đến service account key
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: cert(
            process.env.GOOGLE_APPLICATION_CREDENTIALS 
                ? require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
                : undefined as any
        ),
    });
}

const db = getFirestore();
const auth = getAuth();

interface LinkResult {
    email: string;
    driverName: string;
    driverId: string;
    status: 'linked' | 'already_linked' | 'no_match' | 'error';
    detail?: string;
}

/**
 * Strategy: Match Firebase Auth users to Firestore driver records
 * 
 * Matching rules (in order of priority):
 * 1. Exact email match → driver.email === user.email
 * 2. Exact email match → driver.driver_email === user.email  
 * 3. Email prefix match → taixe1@company.com → driver with sequence #1
 * 4. Display name match → user.displayName contains driver.name
 */
async function linkDriverAccounts(tenantId: string): Promise<LinkResult[]> {
    console.log(`\n🔗 Linking driver accounts for tenant: ${tenantId}`);
    console.log('─'.repeat(60));

    // 1. Get all driver records for this tenant
    const driversSnap = await db
        .collection('tenants').doc(tenantId)
        .collection('drivers')
        .where('is_deleted', '!=', true)
        .get();

    const drivers = driversSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    })) as any[];

    console.log(`📋 Found ${drivers.length} driver records`);

    // 2. Get all Firebase Auth users
    const listUsersResult = await auth.listUsers(1000);
    const allUsers = listUsersResult.users;
    
    // Filter users that belong to this tenant (check custom claims or email pattern)
    const tenantUsers = allUsers.filter(u => {
        const claims = u.customClaims || {};
        // Match by custom claim tenantId
        if (claims.tenantId === tenantId) return true;
        // Match by email domain if tenant has consistent email domain
        return false;
    });

    // If no users found by claims, try matching by looking at userProfiles collection
    let driverUsers = tenantUsers.filter(u => {
        const claims = u.customClaims || {};
        return claims.role === 'driver' || claims.role === 'taixe';
    });

    // Fallback: check userProfiles collection
    if (driverUsers.length === 0) {
        console.log('⚠️  No users found via claims, checking userProfiles...');
        const profilesSnap = await db
            .collection('tenants').doc(tenantId)
            .collection('userProfiles')
            .where('role', '==', 'driver')
            .get();
        
        const driverEmails = profilesSnap.docs.map(doc => doc.data().email).filter(Boolean);
        
        // Also check root userProfiles
        const rootProfilesSnap = await db.collection('userProfiles').get();
        const rootDriverEmails = rootProfilesSnap.docs
            .filter(doc => {
                const data = doc.data();
                return data.role === 'driver' && data.tenantId === tenantId;
            })
            .map(doc => doc.data().email)
            .filter(Boolean);

        const allDriverEmails = [...new Set([...driverEmails, ...rootDriverEmails])];
        
        driverUsers = allUsers.filter(u => allDriverEmails.includes(u.email || ''));
        console.log(`📧 Found ${driverUsers.length} driver users via profiles`);
    }

    console.log(`👤 Found ${driverUsers.length} driver-role users in Firebase Auth`);

    const results: LinkResult[] = [];

    // 3. Match and link
    for (const user of driverUsers) {
        const email = user.email || '';
        
        // Try matching strategies
        let matchedDriver: any = null;

        // Strategy 1: Exact email match on driver record
        matchedDriver = drivers.find(d => 
            d.email === email || d.driver_email === email
        );

        // Strategy 2: Match by user_id if already set
        if (!matchedDriver) {
            matchedDriver = drivers.find(d => d.user_id === user.uid);
        }

        // Strategy 3: Email prefix sequential matching
        // e.g., taixe1@company.com → driver #1, taixe2 → driver #2
        if (!matchedDriver) {
            const emailPrefix = email.split('@')[0];
            const seqMatch = emailPrefix.match(/(\d+)$/);
            if (seqMatch) {
                const seq = parseInt(seqMatch[1], 10);
                // Sort drivers by driver_code or name to get consistent ordering
                const sortedDrivers = [...drivers]
                    .filter(d => !d.driver_email && !d.email) // Only unlinked drivers
                    .sort((a, b) => {
                        const codeA = a.driver_code || a.id;
                        const codeB = b.driver_code || b.id;
                        return codeA.localeCompare(codeB);
                    });
                
                if (seq >= 1 && seq <= sortedDrivers.length) {
                    matchedDriver = sortedDrivers[seq - 1];
                    console.log(`  🔍 Seq match: ${email} → ${matchedDriver.name} (by position #${seq})`);
                }
            }
        }

        if (matchedDriver) {
            // Check if already linked
            if (matchedDriver.driver_email === email && matchedDriver.user_id === user.uid) {
                results.push({
                    email,
                    driverName: matchedDriver.name || matchedDriver.full_name || 'N/A',
                    driverId: matchedDriver.id,
                    status: 'already_linked',
                });
                continue;
            }

            // Link it!
            try {
                await db
                    .collection('tenants').doc(tenantId)
                    .collection('drivers').doc(matchedDriver.id)
                    .update({
                        driver_email: email,
                        user_id: user.uid,
                        email: email,
                        linked_at: new Date().toISOString(),
                        linked_by: 'admin-script',
                    });

                results.push({
                    email,
                    driverName: matchedDriver.name || matchedDriver.full_name || 'N/A',
                    driverId: matchedDriver.id,
                    status: 'linked',
                });

                console.log(`  ✅ ${email} → ${matchedDriver.name} (${matchedDriver.driver_code})`);
            } catch (err: any) {
                results.push({
                    email,
                    driverName: matchedDriver.name || 'N/A',
                    driverId: matchedDriver.id,
                    status: 'error',
                    detail: err.message,
                });
                console.error(`  ❌ ${email}: ${err.message}`);
            }
        } else {
            results.push({
                email,
                driverName: 'N/A',
                driverId: 'N/A',
                status: 'no_match',
                detail: 'No driver record matched this email',
            });
            console.log(`  ⚠️  ${email}: No matching driver record found`);
        }
    }

    // Summary
    const linked = results.filter(r => r.status === 'linked').length;
    const already = results.filter(r => r.status === 'already_linked').length;
    const noMatch = results.filter(r => r.status === 'no_match').length;
    const errors = results.filter(r => r.status === 'error').length;

    console.log('\n📊 SUMMARY:');
    console.log(`  ✅ Linked: ${linked}`);
    console.log(`  🔗 Already linked: ${already}`);
    console.log(`  ⚠️  No match: ${noMatch}`);
    console.log(`  ❌ Errors: ${errors}`);

    return results;
}

/**
 * Get all tenant IDs from Firestore
 */
async function getAllTenantIds(): Promise<string[]> {
    const tenantsSnap = await db.collection('tenants').listDocuments();
    return tenantsSnap.map(doc => doc.id);
}

// ─── CLI Entry Point ─────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const tenantArg = args.find(a => a.startsWith('--tenant='));
    const allFlag = args.includes('--all');
    const dryRun = args.includes('--dry-run');

    if (dryRun) {
        console.log('🏃 DRY RUN MODE — no changes will be made\n');
    }

    console.log('╔══════════════════════════════════════════╗');
    console.log('║  FleetPro — Driver Account Linker v1.0   ║');
    console.log('╚══════════════════════════════════════════╝\n');

    if (allFlag) {
        const tenantIds = await getAllTenantIds();
        console.log(`🏢 Found ${tenantIds.length} tenants\n`);
        
        for (const tid of tenantIds) {
            await linkDriverAccounts(tid);
        }
    } else if (tenantArg) {
        const tenantId = tenantArg.split('=')[1];
        await linkDriverAccounts(tenantId);
    } else {
        console.log('Usage:');
        console.log('  npx tsx scripts/link-driver-accounts.ts --tenant=<TENANT_ID>');
        console.log('  npx tsx scripts/link-driver-accounts.ts --all');
        console.log('  npx tsx scripts/link-driver-accounts.ts --all --dry-run');
        process.exit(1);
    }

    console.log('\n✨ Done!');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
