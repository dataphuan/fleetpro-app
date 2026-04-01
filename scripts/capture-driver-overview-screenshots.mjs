import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5174';
const OUT_DIR = path.join(process.cwd(), 'docs', 'evidence', 'driver-overview');

fs.mkdirSync(OUT_DIR, { recursive: true });

async function loginDriver(page) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });

  // Stable login path: fill credential form directly.
  await page.fill('#email', 'taixedemo@tnc.io.vn');
  await page.fill('#password', 'Demo@1234');
  await page.locator('button:has-text("Vào hệ thống ngay")').first().click();
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
  await page.waitForTimeout(1200);

  // Force open driver overview instead of generic home dashboard.
  await page.goto(`${BASE_URL}/driver`, { waitUntil: 'domcontentloaded' });

  // Wait for driver-overview specific UI before taking screenshots.
  await page.waitForFunction(() => {
    const text = document.body?.innerText || '';
    return (
      text.includes('Cổng Tài Xế') ||
      text.includes('Việc Hôm Nay') ||
      text.includes('Chuyến đi của bạn') ||
      text.includes('Chưa có chuyến')
    );
  }, { timeout: 30000 });

  await page.waitForTimeout(800);
}

async function captureDesktop() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await loginDriver(page);
  await page.screenshot({ path: path.join(OUT_DIR, 'driver-overview-desktop.png'), fullPage: true });

  await browser.close();
}

async function captureMobile() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 12'] });
  const page = await context.newPage();

  await loginDriver(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: path.join(OUT_DIR, 'driver-overview-mobile-375.png'), fullPage: true });

  await browser.close();
}

(async function main() {
  await captureDesktop();
  await captureMobile();
  console.log('Screenshots saved to', OUT_DIR);
})();
