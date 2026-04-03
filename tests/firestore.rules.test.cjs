const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, updateDoc, collection, addDoc } = require('firebase/firestore');

const projectId = 'fleetpro-v1-security-test';

async function seedUser(testEnv, uid, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users', uid), data);
  });
}

async function seedTrip(testEnv, id, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'trips', id), data);
  });
}

async function run() {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });

  try {
    await seedUser(testEnv, 'user_t1', {
      tenant_id: 'tenant-1',
      role: 'accountant',
      status: 'active',
      email: 'u1@fleetpro.vn',
    });

    await seedUser(testEnv, 'admin_t1', {
      tenant_id: 'tenant-1',
      role: 'admin_tenant',
      status: 'active',
      email: 'admin@fleetpro.vn',
    });

    await seedUser(testEnv, 'user_t2', {
      tenant_id: 'tenant-2',
      role: 'accountant',
      status: 'active',
      email: 'u2@fleetpro.vn',
    });

    await seedTrip(testEnv, 'trip-t1-001', {
      tenant_id: 'tenant-1',
      trip_code: 'CD26030001',
      status: 'confirmed',
    });

    await seedTrip(testEnv, 'trip-t2-001', {
      tenant_id: 'tenant-2',
      trip_code: 'CD26030099',
      status: 'confirmed',
    });

    const t1UserDb = testEnv.authenticatedContext('user_t1').firestore();
    const t1AdminDb = testEnv.authenticatedContext('admin_t1').firestore();

    await assertSucceeds(
      getDoc(doc(t1UserDb, 'trips', 'trip-t1-001'))
    );

    await assertFails(
      getDoc(doc(t1UserDb, 'trips', 'trip-t2-001'))
    );

    await assertFails(
      setDoc(doc(t1UserDb, 'trips', 'trip-t1-bad-create'), {
        tenant_id: 'tenant-2',
        trip_code: 'CD26030002',
        status: 'confirmed',
      })
    );

    await assertSucceeds(
      setDoc(doc(t1UserDb, 'trips', 'trip-t1-002'), {
        tenant_id: 'tenant-1',
        trip_code: 'CD26030003',
        status: 'confirmed',
      })
    );

    await assertFails(
      updateDoc(doc(t1UserDb, 'users', 'user_t2'), { role: 'admin_tenant' })
    );

    await assertSucceeds(
      updateDoc(doc(t1AdminDb, 'users', 'user_t1'), { role: 'viewer' })
    );

    // --- NEW TESTS: IMMUTABILITY & AUDIT INTEGRITY ---

    // 1. Closed Trip Immutability
    await seedTrip(testEnv, 'trip-closed', {
        tenant_id: 'tenant-1',
        trip_code: 'CLOSED-001',
        status: 'closed'
    });
    
    await assertFails(
        updateDoc(doc(t1UserDb, 'trips', 'trip-closed'), { notes: 'hacking' })
    );

    // 2. Audit Trail Spoofing (Wrong User ID)
    const logCol = collection(t1UserDb, 'system_logs');
    await assertFails(
        addDoc(logCol, {
            user_id: 'other-user', // Trying to spoof another user
            tenant_id: 'tenant-1',
            action: 'DELETE',
            timestamp: new Date().toISOString()
        })
    );

    // 3. Audit Trail Cross-Tenant Read
    const t2UserDb = testEnv.authenticatedContext('user_t2').firestore();
    await seedUser(testEnv, 'log-leak-check', {
        tenant_id: 'tenant-1',
        user_id: 'user_t1',
        action: 'LOGIN'
    });
    // Assuming we have a log from tenant-1
    await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'system_logs', 'log-t1'), {
            tenant_id: 'tenant-1',
            user_id: 'user_t1'
        });
    });

    await assertFails(
        getDoc(doc(t2UserDb, 'system_logs', 'log-t1'))
    );

    console.log('PASS: Practical QA Audit - All security and isolation benchmarks PASSED.');
    process.exit(0);
  } catch (error) {
    console.error('FAIL: Practical QA Audit failed one or more benchmarks.');
    console.error(error);
    process.exit(1);
  } finally {
    await testEnv.cleanup();
  }
}

run();
