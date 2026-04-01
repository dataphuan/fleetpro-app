import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Validate Firebase Configuration (8 required fields per connection standard)
// See: docs/FIREBASE_CONNECTION_STANDARD_20260331.md
const validateFirebaseConfig = () => {
  const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_DATABASE_URL',  // ⭐ Recently added as required
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MEASUREMENT_ID'  // Including measurement ID for completeness
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
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://fleetpro-app-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// 🔧 Debug logging for Firebase initialization
if (import.meta.env.DEV) {
  console.log('🔧 Firebase Config Check:', {
    apiKey: firebaseConfig.apiKey.substring(0, 10) + '...', // Don't log full key
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    appId: firebaseConfig.appId,
    hasAllRequired: !!(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId)
  });
}

// Validate before initializing
validateFirebaseConfig();

// Initialize Firebase with error handling
let app: any;
let auth: any;
let db: any;
let storage: any;
let functions: any;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Initialize Firestore and Storage
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, 'asia-southeast1');
  
  // Initialize Auth with persistent session
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
  
  // Enable offline persistence for Firestore
  try {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Firebase persistence: Multiple tabs detected');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Firebase persistence: Not supported by this browser');
      }
    });
  } catch (e) {
    console.warn('⚠️ Firebase persistence setup issue:', e);
  }
  
  console.log('✅ Firebase initialized successfully');
} catch (error: any) {
  console.error('❌ Firebase Initialization Failed:', {
    error: error.message,
    code: error.code,
    config: {
      apiKey: firebaseConfig.apiKey ? '***' : 'MISSING',
      authDomain: firebaseConfig.authDomain || 'MISSING',
      projectId: firebaseConfig.projectId || 'MISSING'
    }
  });
  
  // Re-throw for visibility
  throw error;
}

export { app, db, auth, storage, functions };
