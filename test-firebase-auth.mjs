#!/usr/bin/env node
/**
 * Test Firebase Admin SDK authentication
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testAuth() {
  console.log('Testing Firebase Admin SDK Auth\n');

  try {
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    console.log('Service Account Loaded:');
    console.log('  Project ID:', serviceAccount.project_id);
    console.log('  Client Email:', serviceAccount.client_email);
    console.log('  Auth URI:', serviceAccount.auth_uri);
    console.log('  Token URI:', serviceAccount.token_uri);
    console.log('  Key ID:', serviceAccount.private_key_id ? 'OK' : 'MISSING');
    console.log('  Private Key:', serviceAccount.private_key ? 'OK (loaded)' : 'MISSING');

    const adminModule = await import('firebase-admin');
    const admin = adminModule.default;

    console.log('\nFirebase Admin SDK loaded\n');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'fleetpro-app'
      });
      console.log('Firebase Admin SDK Initialized');
    }

    const db = admin.firestore();
    console.log('Firestore instance created\n');

    console.log('Attempting to access Firestore...');
    const snapshot = await db.collection('tenants').limit(1).get();
    console.log('Successfully queried Firestore!');
    console.log(`   Tenants collection sample size: ${snapshot.size}\n`);

    console.log('Attempting to create test document...');
    await db.collection('testcol').doc('testdoc').set({
      timestamp: new Date(),
      test: true
    });
    console.log('Successfully wrote test document!');

    await db.collection('testcol').doc('testdoc').delete();
    console.log('Cleaned up test document\n');

    console.log('All tests passed! Firebase Admin SDK is working correctly.');
    process.exit(0);
  } catch (error) {
    const err = error;
    console.error('Error:', err?.message || err);
    console.error('\nDetails:', err?.code || err?.type || 'unknown_error');
    if (err?.stack) {
      console.error('\nStack:', err.stack.split('\n').slice(0, 3).join('\n'));
    }
    process.exit(1);
  }
}

testAuth();
