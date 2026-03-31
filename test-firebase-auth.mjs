#!/usr/bin/env node
/**
 * Test Firebase Admin SDK authentication
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testAuth() {
  console.log('🔍 Testing Firebase Admin SDK Auth\n');
  
  try {
    const serviceAccountPath = path.join(__dirname, 'fleetpro-app-service-account.json');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    console.log('Service Account Loaded:');
    console.log('  Project ID:', serviceAccount.project_id);
    console.log('  Client Email:', serviceAccount.client_email);
    console.log('  Auth URI:', serviceAccount.auth_uri);
    console.log('  Token URI:', serviceAccount.token_uri);
    console.log('  Key ID:', serviceAccount.private_key_id ? '✓' : '✗');
    console.log('  Private Key:', serviceAccount.private_key ? '✓ (loaded)' : '✗');
    
    // Now test with Admin SDK
    import('firebase-admin').then(async (adminModule) => {
      const admin = adminModule.default;
      
      console.log('\n📦 Firebase Admin SDK loaded\n');
      
      // Now initialize and test
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
    }).catch((error) => {
      console.error('❌ Error in async:', error.message);
      process.exit(1);
    
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
    console.error('\nDetails:', error.code || error.type);
    if (error.stack) {
      console.error('\nStack:', error.stack.split('\n').slice(0, 3).join('\n'));
    }
    process.exit(1);
  }
}

testAuth();
