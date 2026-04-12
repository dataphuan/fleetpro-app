#!/usr/bin/env node
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  path.join(__dirname, '../fleetpro-app-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (e) {
  // Already initialized maybe
}

const db = admin.firestore();

const TENANT_ID = 'internal-tenant-phuan';
const BOT_TOKEN = '8702845729:AAGROiJGHoY9pu5SEl6CYReCodzD6F5d6AU';
const GROUP_ID = '-1003926229079';
const GROUP_LINK = 'https://t.me/quanlyxe';

async function setupTelegram() {
  console.log(`🚀 Bắt đầu cấu hình Telegram cho Căn cứ: ${TENANT_ID}...`);

  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  
  await tenantRef.set({
    telegram_config: {
      bot_token: BOT_TOKEN,
      group_chat_id: GROUP_ID,
      group_link: GROUP_LINK,
      status: 'active',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    }
  }, { merge: true });

  console.log(`✅ Cấu hình thành công!`);
  console.log(`   🔸 Group ID: ${GROUP_ID}`);
}

setupTelegram().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
