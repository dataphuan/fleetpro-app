#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testAuth() {
  console.log('🔍 Testing Firebase Admin SDK Auth\n');
  
  try {
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    console.log('Service Account Loaded:');
    console.log('  Project ID:', serviceAccount.project_id);
    console.log('  Client Email:', serviceAccount.client_email);
    
    // Initialize Firebase Admin SDK
    console.log('\n📦 Initializing Firebase Admin SDK...\n');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'fleetpro-app'
      });
      console.log('✅ Firebase Admin SDK Initialized');
    }
    
    const db = admin.firestore();
    console.log('✅ Firestore instance created\n');
    
    // Try to get tenants collection info
    console.log('Attempting to access Firestore...');
    const snapshot = await db.collection('tenants').limit(1).get();
    console.log('✅ Successfully queried Firestore!');
    console.log(`   Tenants collection has ${snapshot.size} documents\n`);
    
    // Try to write
    console.log('Attempting to create test document...');
    await db.collection('testcol').doc('testdoc').set({
      timestamp: new Date(),
      test: true
    });
    console.log('✅ Successfully wrote test document!');
    
    // Clean up test
    await db.collection('testcol').doc('testdoc').delete();
    console.log('✅ Cleaned up test document\n');
    
    console.log('✨ All tests passed! Firebase Admin SDK is working correctly.');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetails:', error.code);
    process.exit(1);
  }
}

testAuth();
