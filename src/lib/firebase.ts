import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { initializeAuth, browserLocalPersistence, type Auth } from 'firebase/auth';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';

// Validate Firebase Configuration (8 required fields per connection standard)
// See: docs/FIREBASE_CONNECTION_STANDARD_20260331.md
const validateFirebaseConfig = () => {
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_DATABASE_URL',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MEASUREMENT_ID'
  ];
  
  const missing = requiredEnvVars.filter(
    key => {
      const value = import.meta.env[key];
      return !value || value === 'REPLACE_FIREBASE_API_KEY' || value === 'REPLACE_MESSAGING_SENDER_ID' || value === 'REPLACE_FIREBASE_APP_ID' || value === 'REPLACE_MEASUREMENT_ID';
    }
  );
  
  if (missing.length > 0) {
    const missingList = missing.join(', ');
    console.error('❌ Firebase Configuration Error - Missing or invalid environment variables:', {
      missing: missing,
      hint: 'Copy .env.example → .env.local and replace REPLACE_* placeholder values'
    });
    throw new Error(`📋 Firebase config incomplete (${missing.length} missing). See docs/FIREBASE_CONNECTION_STANDARD_20260331.md. Missing: ${missingList}`);
  }
};

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Debug logging for Firebase initialization (DEV only)
if (import.meta.env.DEV) {
  console.log('🔧 Firebase Config Check:', {
    apiKey: firebaseConfig.apiKey.substring(0, 10) + '...',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
    hasAllRequired: !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
  });
}

// Validate before initializing
validateFirebaseConfig();

// Initialize Firebase with proper types
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Initialize Firestore with modern persistence API (replaces deprecated enableIndexedDbPersistence)
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  
  storage = getStorage(app);
  functions = getFunctions(app, 'asia-southeast1');
  
  // Initialize Auth with persistent session
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
  
  if (import.meta.env.DEV) {
    console.log('✅ Firebase initialized successfully');
  }
} catch (error: unknown) {
  const err = error as Error & { code?: string };
  console.error('❌ Firebase Initialization Failed:', {
    error: err.message,
    code: err.code,
    config: {
      apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
      authDomain: firebaseConfig.authDomain || 'MISSING',
      projectId: firebaseConfig.projectId || 'MISSING'
    }
  });
  throw error;
}

// Cache buster: 2026-04-03
export { app, db, auth, storage, functions };
