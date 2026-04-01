#!/usr/bin/env node

/**
 * Create professional demo accounts via Firebase REST API
 * (No Admin SDK required - direct REST calls)
 */

const FIREBASE_API_KEY = 'AIzaSyBmIshCPM_9xBrZrulqQNuPVDQ8oYIqv0M';
const FIREBASE_PROJECT_ID = 'quanlyxe-484904';

const DEMO_ACCOUNTS = [
  {
    email: 'admindemo@tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'Admin - TNC Demo',
    photoURL: '👑',
  },
  {
    email: 'quanlydemo@tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'Quan ly - TNC Demo',
    photoURL: '👔',
  },
  {
    email: 'ketoandemo@tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'Ke toan - TNC Demo',
    photoURL: '🧾',
  },
  {
    email: 'taixedemo@tnc.io.vn',
    password: 'Demo@1234',
    displayName: 'Tai xe - TNC Demo',
    photoURL: '🚚',
  },
];

async function createAccountViaREST(accountConfig) {
  const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

  try {
    console.log(`\n🔧 Creating account: ${accountConfig.email}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: accountConfig.email,
        password: accountConfig.password,
        displayName: accountConfig.displayName,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error?.message === 'EMAIL_EXISTS') {
        console.log(`✓ Account already exists: ${accountConfig.email}`);
        return { email: accountConfig.email, exists: true };
      }
      throw new Error(data.error?.message || 'Failed to create account');
    }

    console.log(`✓ Created account: ${accountConfig.email}`);
    console.log(`  UID: ${data.localId}`);
    console.log(`  Token: ${data.idToken.substring(0, 20)}...`);

    return { email: accountConfig.email, uid: data.localId, exists: false };
  } catch (error) {
    console.error(`✗ Error creating account ${accountConfig.email}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 FleetPro Demo Accounts Setup (Firebase REST API)');
  console.log('='.repeat(70));

  console.log('\n📝 Creating professional demo accounts...\n');

  const createdAccounts = [];

  for (const accountConfig of DEMO_ACCOUNTS) {
    try {
      const result = await createAccountViaREST(accountConfig);
      createdAccounts.push(result);
      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to create ${accountConfig.email}, continuing...`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('✅ Demo Accounts Ready!');
  console.log('='.repeat(70));

  console.log('\n📋 Demo Account Credentials:');
  console.log('─'.repeat(70));

  DEMO_ACCOUNTS.forEach((account) => {
    console.log(`\n${account.photoURL} ${account.displayName}`);
    console.log(`   Email: ${account.email}`);
    console.log(`   Password: ${account.password}`);
  });

  console.log('\n' + '─'.repeat(70));
  console.log('\n💡 Login Instructions:');
  console.log('1. Go to: https://tnc.io.vn');
  console.log('2. Click "TÀI KHOẢN DÙNG THỬ (DEMO MODE)" to see credentials');
  console.log('3. Enter email and password from above');
  console.log('4. Click "🚀 Vào hệ thống ngay"');
  console.log('5. Complete 4-step onboarding flow');
  console.log('6. View dashboard with sample data');

  console.log('\n📊 Web URLs:');
  console.log('   ✅ https://tnc.io.vn (primary)');
  console.log('   ✅ https://fleetpro-app.pages.dev (backup)');

  console.log('\n' + '='.repeat(70) + '\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
