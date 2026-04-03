#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5174';
const NOW = new Date();
const DATE_KEY = NOW.toISOString().slice(0, 10).replace(/-/g, '');
const OUT_DIR = path.join(process.cwd(), 'docs', 'evidence', 'mobile-ui-audit');
const REPORT_PATH = path.join(process.cwd(), 'docs', `QA_MOBILE_UI_AUDIT_${DATE_KEY}.md`);

const ACCOUNTS = [
  { key: 'admin', label: 'Admin', email: 'admindemo@tnc.io.vn', password: 'Demo@1234', expectedPathPrefix: '/' },
  { key: 'manager', label: 'Manager', email: 'quanlydemo@tnc.io.vn', password: 'Demo@1234', expectedPathPrefix: '/' },
  { key: 'accountant', label: 'Accountant', email: 'ketoandemo@tnc.io.vn', password: 'Demo@1234', expectedPathPrefix: '/' },
  { key: 'driver', label: 'Driver', email: 'taixedemo@tnc.io.vn', password: 'Demo@1234', expectedPathPrefix: '/driver' },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

function statusFromFindings(findings) {
  if (findings.some((x) => x.level === 'FAIL')) return 'FAIL';
  if (findings.some((x) => x.level === 'WARN')) return 'WARN';
  return 'PASS';
}

async function login(page, account) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator('#email');
  const loginButton = page.locator('button:has-text("Vào hệ thống ngay")').first();

  // If still on auth page, perform login.
  if (new URL(page.url()).pathname.includes('/auth')) {
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });
    await emailInput.fill(account.email);
    await page.fill('#password', account.password);
    await loginButton.click();
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
  }

  await page.waitForTimeout(1400);
}

async function collectMobileChecks(page, account) {
  const findings = [];

  const currentPath = new URL(page.url()).pathname;
  if (currentPath === '/auth') {
    findings.push({ level: 'FAIL', check: 'Authenticated session', detail: 'Still on /auth after login flow' });
  }

  if (account.expectedPathPrefix === '/driver') {
    if (!currentPath.startsWith('/driver')) {
      findings.push({ level: 'FAIL', check: 'Role redirect', detail: `Expected /driver*, got ${currentPath}` });
    } else {
      findings.push({ level: 'PASS', check: 'Role redirect', detail: `Driver landed on ${currentPath}` });
    }
  } else {
    if (currentPath.startsWith('/driver')) {
      findings.push({ level: 'WARN', check: 'Role redirect', detail: `Non-driver landed on driver path ${currentPath}` });
    } else {
      findings.push({ level: 'PASS', check: 'Role redirect', detail: `User landed on ${currentPath}` });
    }
  }

  const viewportCheck = await page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const htmlOverflow = html.scrollWidth - window.innerWidth;
    const bodyOverflow = body ? body.scrollWidth - window.innerWidth : 0;
    return {
      htmlOverflow,
      bodyOverflow,
      hasHorizontalOverflow: htmlOverflow > 1 || bodyOverflow > 1,
    };
  });

  if (viewportCheck.hasHorizontalOverflow) {
    findings.push({
      level: 'WARN',
      check: 'Horizontal overflow',
      detail: `htmlOverflow=${viewportCheck.htmlOverflow}px, bodyOverflow=${viewportCheck.bodyOverflow}px`,
    });
  } else {
    findings.push({ level: 'PASS', check: 'Horizontal overflow', detail: 'No overflow on 390px viewport' });
  }

  const touchTargets = await page.evaluate(() => {
    const selector = 'button, a, input, textarea, select, [role="button"]';
    const all = Array.from(document.querySelectorAll(selector));
    const bad = all
      .filter((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36);
      })
      .slice(0, 8)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || '').trim().slice(0, 40),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });

    return {
      totalInteractive: all.length,
      badCount: bad.length,
      bad,
    };
  });

  if (touchTargets.badCount > 0) {
    findings.push({
      level: 'WARN',
      check: 'Touch target size',
      detail: `${touchTargets.badCount} interactive element(s) under 36px among ${touchTargets.totalInteractive}`,
    });
  } else if (touchTargets.totalInteractive === 0) {
    findings.push({
      level: 'FAIL',
      check: 'Interactive surface',
      detail: 'No interactive elements detected; page may not be rendered correctly',
    });
  } else {
    findings.push({ level: 'PASS', check: 'Touch target size', detail: `All sampled targets >= 36px (${touchTargets.totalInteractive} elements)` });
  }

  if (account.key === 'driver') {
    const hasBottomNav = await page.locator('a:has-text("Việc Hôm Nay")').count();
    findings.push(
      hasBottomNav
        ? { level: 'PASS', check: 'Driver bottom nav', detail: 'Bottom navigation is visible' }
        : { level: 'FAIL', check: 'Driver bottom nav', detail: 'Bottom navigation missing' },
    );
  } else {
    const menuBtn = page.locator('button[aria-label="Mở menu"]');
    if (await menuBtn.count()) {
      await menuBtn.first().click();
      await page.waitForTimeout(300);
      const hasSidebarSection = await page.locator('text=TỔNG QUAN').count();
      findings.push(
        hasSidebarSection
          ? { level: 'PASS', check: 'Mobile sidebar drawer', detail: 'Drawer opens and displays navigation sections' }
          : { level: 'WARN', check: 'Mobile sidebar drawer', detail: 'Menu opened but section labels not detected' },
      );
      await page.keyboard.press('Escape').catch(() => {});
    } else {
      findings.push({ level: 'WARN', check: 'Mobile sidebar drawer', detail: 'Menu button not found on current screen' });
    }
  }

  return { findings, touchTargets };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const account of ACCOUNTS) {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const accountResult = {
      account,
      findings: [],
      status: 'PASS',
      screenshot: '',
      url: '',
      touchTargets: null,
    };

    try {
      await login(page, account);
      const checks = await collectMobileChecks(page, account);
      accountResult.findings = checks.findings;
      accountResult.touchTargets = checks.touchTargets;
      accountResult.status = statusFromFindings(checks.findings);
      accountResult.url = page.url();

      const screenshotPath = path.join(OUT_DIR, `mobile-${account.key}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      accountResult.screenshot = path.relative(process.cwd(), screenshotPath).replaceAll('\\', '/');
    } catch (error) {
      accountResult.findings.push({ level: 'FAIL', check: 'Execution', detail: error?.message || String(error) });
      accountResult.status = 'FAIL';
      accountResult.url = page.url();
    } finally {
      await page.close();
      await context.close();
      results.push(accountResult);
    }
  }

  await browser.close();

  const passCount = results.filter((x) => x.status === 'PASS').length;
  const warnCount = results.filter((x) => x.status === 'WARN').length;
  const failCount = results.filter((x) => x.status === 'FAIL').length;

  const lines = [];
  lines.push(`# QA Mobile UI Audit - All Login Roles (${NOW.toISOString()})`);
  lines.push('');
  lines.push(`- Base URL: \`${BASE_URL}\``);
  lines.push(`- Viewport: iPhone 12 profile, 390x844`);
  lines.push(`- Summary: ${passCount} PASS / ${warnCount} WARN / ${failCount} FAIL`);
  lines.push('');
  lines.push('## Role Results');
  lines.push('');

  for (const r of results) {
    lines.push(`### ${r.account.label} (${r.account.email}) - ${r.status}`);
    lines.push(`- Final URL: \`${r.url}\``);
    if (r.screenshot) lines.push(`- Screenshot: \`${r.screenshot}\``);
    lines.push('- Checks:');
    for (const f of r.findings) {
      lines.push(`  - [${f.level}] ${f.check}: ${f.detail}`);
    }

    if (r.touchTargets?.bad?.length) {
      lines.push('- Small touch targets sample:');
      for (const b of r.touchTargets.bad) {
        lines.push(`  - ${b.tag} \"${b.text || '(no text)'}\" (${b.width}x${b.height})`);
      }
    }

    lines.push('');
  }

  lines.push('## Recommendation Priority');
  lines.push('');
  lines.push('1. Fix all FAIL items before release.');
  lines.push('2. Reduce WARN items related to touch targets and horizontal overflow.');
  lines.push('3. Re-run this script after UI updates to compare delta.');
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  console.log('QA MOBILE UI AUDIT COMPLETE');
  console.log('REPORT:', path.relative(process.cwd(), REPORT_PATH));
  console.log('EVIDENCE DIR:', path.relative(process.cwd(), OUT_DIR));
  console.log(`SUMMARY: ${passCount} PASS / ${warnCount} WARN / ${failCount} FAIL`);

  process.exit(failCount > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('FATAL:', error?.message || error);
  process.exit(1);
});
