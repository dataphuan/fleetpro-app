#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'https://tnc.io.vn';
const EMAIL = process.env.DOM_PROOF_EMAIL || 'admindemo@tnc.io.vn';
const PASSWORD = process.env.DOM_PROOF_PASSWORD || 'Demo@1234';
const NOW = new Date();
const stamp = NOW.toISOString().replace(/[:.]/g, '-');

const OUT_DIR = path.join(process.cwd(), 'docs', 'evidence', 'dom-video-proof', stamp);
const REPORT_PATH = path.join(process.cwd(), 'docs', `DOM_VIDEO_PROOF_${NOW.toISOString().slice(0, 10).replace(/-/g, '')}.md`);

fs.mkdirSync(OUT_DIR, { recursive: true });

function formatCheck(name, ok, detail) {
  return { name, ok, detail };
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 390, height: 844 },
    },
  });

  const page = await context.newPage();
  const checks = [];

  try {
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded', timeout: 45000 });

    const authDom = await page.evaluate(() => ({
      hasEmail: !!document.querySelector('#email'),
      hasPassword: !!document.querySelector('#password'),
      hasLoginButton: Array.from(document.querySelectorAll('button')).some((x) => (x.textContent || '').includes('Vào hệ thống ngay')),
      title: document.title,
      readyState: document.readyState,
    }));

    checks.push(formatCheck('Auth DOM ready', authDom.readyState === 'interactive' || authDom.readyState === 'complete', `readyState=${authDom.readyState}`));
    checks.push(formatCheck('Auth email input', authDom.hasEmail, `hasEmail=${authDom.hasEmail}`));
    checks.push(formatCheck('Auth password input', authDom.hasPassword, `hasPassword=${authDom.hasPassword}`));
    checks.push(formatCheck('Auth login button', authDom.hasLoginButton, `hasLoginButton=${authDom.hasLoginButton}`));

    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.locator('button:has-text("Vào hệ thống ngay")').first().click();
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 45000 });
    await page.waitForTimeout(1200);

    const currentPath = new URL(page.url()).pathname;
    checks.push(formatCheck('Post-login redirect', currentPath === '/', `path=${currentPath}`));

    const menuBtn = page.locator('button[aria-label="Mở menu"]');
    const hasMenuBtn = await menuBtn.count();
    checks.push(formatCheck('Mobile menu button visible', hasMenuBtn > 0, `count=${hasMenuBtn}`));

    if (hasMenuBtn > 0) {
      await menuBtn.first().click();
      await page.waitForTimeout(500);
    }

    const drawerDom = await page.evaluate(() => ({
      hasOverview: !!Array.from(document.querySelectorAll('h3, span, div')).find((n) => (n.textContent || '').includes('TỔNG QUAN')),
      hasTracking: !!Array.from(document.querySelectorAll('a, button, span, div')).find((n) => (n.textContent || '').includes('Tracking')),
      hasReports: !!Array.from(document.querySelectorAll('a, button, span, div')).find((n) => (n.textContent || '').includes('Báo Cáo')),
      hasProfile: !!Array.from(document.querySelectorAll('a, button, span, div')).find((n) => (n.textContent || '').includes('Hồ Sơ')),
      overflowPx: Math.max(document.documentElement.scrollWidth - window.innerWidth, 0),
    }));

    checks.push(formatCheck('Drawer section overview', drawerDom.hasOverview, `hasOverview=${drawerDom.hasOverview}`));
    checks.push(formatCheck('Drawer has tracking', drawerDom.hasTracking, `hasTracking=${drawerDom.hasTracking}`));
    checks.push(formatCheck('Drawer has reports', drawerDom.hasReports, `hasReports=${drawerDom.hasReports}`));
    checks.push(formatCheck('Drawer has profile', drawerDom.hasProfile, `hasProfile=${drawerDom.hasProfile}`));
    checks.push(formatCheck('No horizontal overflow', drawerDom.overflowPx <= 1, `overflowPx=${drawerDom.overflowPx}`));

    const screenshotPath = path.join(OUT_DIR, 'dom-proof-admin-mobile.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await context.close();
    await browser.close();

    const videos = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.webm'));
    const videoPath = videos.length ? path.join('docs', 'evidence', 'dom-video-proof', stamp, videos[0]).replaceAll('\\', '/') : '(not found)';
    const shotPath = path.join('docs', 'evidence', 'dom-video-proof', stamp, 'dom-proof-admin-mobile.png').replaceAll('\\', '/');

    const pass = checks.filter((c) => c.ok).length;
    const fail = checks.length - pass;

    const lines = [];
    lines.push(`# DOM + Video Proof (${NOW.toISOString()})`);
    lines.push('');
    lines.push(`- Base URL: ${BASE_URL}`);
    lines.push(`- Account: ${EMAIL}`);
    lines.push(`- Summary: ${pass} PASS / ${fail} FAIL`);
    lines.push(`- Screenshot: ${shotPath}`);
    lines.push(`- Video: ${videoPath}`);
    lines.push('');
    lines.push('## DOM Checks');
    lines.push('');
    for (const c of checks) {
      lines.push(`- [${c.ok ? 'PASS' : 'FAIL'}] ${c.name}: ${c.detail}`);
    }

    fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

    console.log('DOM VIDEO PROOF COMPLETE');
    console.log('REPORT:', path.relative(process.cwd(), REPORT_PATH));
    console.log('EVIDENCE DIR:', path.relative(process.cwd(), OUT_DIR));
    console.log(`SUMMARY: ${pass} PASS / ${fail} FAIL`);
    console.log('VIDEO:', videoPath);

    process.exit(fail > 0 ? 1 : 0);
  } catch (error) {
    await context.close().catch(() => null);
    await browser.close().catch(() => null);
    console.error('DOM VIDEO PROOF FAILED:', error?.message || String(error));
    process.exit(1);
  }
}

run();
