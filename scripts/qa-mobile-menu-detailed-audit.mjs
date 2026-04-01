#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5174';
const NOW = new Date();
const DATE_KEY = NOW.toISOString().slice(0, 10).replace(/-/g, '');
const TIME_KEY = NOW.toISOString().slice(11, 19).replace(/:/g, '');
const OUT_DIR = path.join(process.cwd(), 'docs', 'evidence', 'mobile-menu-audit', `${DATE_KEY}-${TIME_KEY}`);
const REPORT_PATH = path.join(process.cwd(), 'docs', `QA_MOBILE_MENU_DETAILED_AUDIT_${DATE_KEY}.md`);

const ACCOUNTS = [
  {
    key: 'admin',
    label: 'Admin',
    email: 'admindemo@tnc.io.vn',
    password: 'Demo@1234',
    menus: [
      { path: '/', label: 'Bang Dieu Khien' },
      { path: '/reports', label: 'Bao Cao' },
      { path: '/alerts', label: 'Canh Bao' },
      { path: '/vehicles', label: 'Xe' },
      { path: '/drivers', label: 'Tai Xe' },
      { path: '/routes', label: 'Tuyen Duong' },
      { path: '/customers', label: 'Khach Hang' },
      { path: '/transport-orders', label: 'Don Hang' },
      { path: '/dispatch', label: 'Dieu Phoi' },
      { path: '/tracking-center', label: 'Tracking' },
      { path: '/trips', label: 'Doanh Thu' },
      { path: '/expenses', label: 'Chi Phi' },
      { path: '/maintenance', label: 'Bao Tri' },
      { path: '/inventory/tires', label: 'Kho Va Lop' },
      { path: '/profile', label: 'Ho So' },
      { path: '/settings', label: 'Cai Dat' },
      { path: '/members', label: 'Team' },
      { path: '/logs', label: 'Logs' },
    ],
  },
  {
    key: 'manager',
    label: 'Manager',
    email: 'quanlydemo@tnc.io.vn',
    password: 'Demo@1234',
    menus: [
      { path: '/', label: 'Bang Dieu Khien' },
      { path: '/reports', label: 'Bao Cao' },
      { path: '/alerts', label: 'Canh Bao' },
      { path: '/vehicles', label: 'Xe' },
      { path: '/drivers', label: 'Tai Xe' },
      { path: '/routes', label: 'Tuyen Duong' },
      { path: '/customers', label: 'Khach Hang' },
      { path: '/transport-orders', label: 'Don Hang' },
      { path: '/dispatch', label: 'Dieu Phoi' },
      { path: '/tracking-center', label: 'Tracking' },
      { path: '/trips', label: 'Doanh Thu' },
      { path: '/expenses', label: 'Chi Phi' },
      { path: '/maintenance', label: 'Bao Tri' },
      { path: '/inventory/tires', label: 'Kho Va Lop' },
      { path: '/profile', label: 'Ho So' },
    ],
  },
  {
    key: 'accountant',
    label: 'Accountant',
    email: 'ketoandemo@tnc.io.vn',
    password: 'Demo@1234',
    menus: [
      { path: '/', label: 'Bang Dieu Khien' },
      { path: '/reports', label: 'Bao Cao' },
      { path: '/customers', label: 'Khach Hang' },
      { path: '/transport-orders', label: 'Don Hang' },
      { path: '/trips', label: 'Doanh Thu' },
      { path: '/expenses', label: 'Chi Phi' },
      { path: '/maintenance', label: 'Bao Tri' },
      { path: '/inventory/tires', label: 'Kho Va Lop' },
      { path: '/profile', label: 'Ho So' },
    ],
  },
  {
    key: 'driver',
    label: 'Driver',
    email: 'taixedemo@tnc.io.vn',
    password: 'Demo@1234',
    menus: [
      { path: '/driver', label: 'Viec Hom Nay' },
      { path: '/driver/history', label: 'Lich Su' },
      { path: '/driver/profile', label: 'Ca Nhan' },
    ],
  },
];

const portalEmail = process.env.PORTAL_EMAIL;
const portalPassword = process.env.PORTAL_PASSWORD;

if (portalEmail && portalPassword) {
  ACCOUNTS.push({
    key: 'portal',
    label: 'Customer Portal',
    email: portalEmail,
    password: portalPassword,
    menus: [{ path: '/portal', label: 'Portal' }],
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function slugify(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function getStatus(findings) {
  if (findings.some((x) => x.level === 'FAIL')) return 'FAIL';
  if (findings.some((x) => x.level === 'WARN')) return 'WARN';
  return 'PASS';
}

async function login(page, account) {
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'domcontentloaded' });
  await page.fill('#email', account.email);
  await page.fill('#password', account.password);
  await page.locator('button:has-text("Vào hệ thống ngay")').first().click();
  await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function checkDrawerLayering(page) {
  const menuButton = page.locator('button[aria-label="Mở menu"]');
  if (!(await menuButton.count())) {
    return {
      status: 'PASS',
      detail: 'Driver layout does not use app sidebar drawer.',
      screenshot: '',
    };
  }

  await menuButton.first().click();
  await page.waitForTimeout(300);

  const drawerResult = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    if (!aside) {
      return { ok: false, detail: 'Sidebar drawer not found after opening menu.' };
    }

    const rect = aside.getBoundingClientRect();
    const sampleX = Math.min(rect.left + Math.max(16, rect.width * 0.5), window.innerWidth - 2);
    const sampleY = Math.min(rect.top + 80, window.innerHeight - 2);
    const sampleNode = document.elementFromPoint(sampleX, sampleY);
    const containsSample = !!sampleNode && aside.contains(sampleNode);

    const style = window.getComputedStyle(aside);
    const zIndexRaw = style.zIndex || 'auto';
    const zIndex = Number.isNaN(Number(zIndexRaw)) ? 0 : Number(zIndexRaw);
    const isVisible = rect.width > 200 && rect.height > 200 && rect.left <= 1;

    return {
      ok: containsSample || isVisible,
      detail: `containsSample=${containsSample}, visible=${isVisible}, zIndex=${zIndexRaw}, width=${Math.round(rect.width)}`,
    };
  });

  const screenshotPath = path.join(OUT_DIR, `drawer-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Close drawer via overlay tap.
  await page.mouse.click(380, 160);
  await page.waitForTimeout(200);

  return {
    status: drawerResult.ok ? 'PASS' : 'FAIL',
    detail: drawerResult.detail,
    screenshot: path.relative(process.cwd(), screenshotPath).replaceAll('\\', '/'),
  };
}

async function runMenuChecks(page, account, menu) {
  const findings = [];
  const evidence = {};

  await page.goto(`${BASE_URL}${menu.path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);

  const currentPath = new URL(page.url()).pathname;
  if (currentPath.startsWith('/auth')) {
    findings.push({ level: 'FAIL', check: 'Auth state', detail: 'Unexpected redirect to /auth.' });
  } else {
    findings.push({ level: 'PASS', check: 'Auth state', detail: `Current path ${currentPath}` });
  }

  const hasCrashScreen = await page
    .locator('h1:has-text("Đã xảy ra lỗi"), text=Chi tiết lỗi (dành cho kỹ thuật)')
    .first()
    .isVisible()
    .catch(() => false);

  if (hasCrashScreen) {
    findings.push({ level: 'FAIL', check: 'Runtime crash', detail: 'ErrorBoundary crash screen detected.' });
  } else {
    findings.push({ level: 'PASS', check: 'Runtime crash', detail: 'No crash screen detected.' });
  }

  const viewportCheck = await page.evaluate(() => {
    const htmlOverflow = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
    const bodyOverflow = Math.max(0, document.body.scrollWidth - window.innerWidth);
    return { htmlOverflow, bodyOverflow };
  });

  const overflowPx = Math.max(viewportCheck.htmlOverflow, viewportCheck.bodyOverflow);
  if (overflowPx > 2) {
    findings.push({
      level: overflowPx > 20 ? 'FAIL' : 'WARN',
      check: 'Horizontal overflow',
      detail: `Overflow ${overflowPx}px (html=${viewportCheck.htmlOverflow}, body=${viewportCheck.bodyOverflow})`,
    });
  } else {
    findings.push({ level: 'PASS', check: 'Horizontal overflow', detail: 'No meaningful horizontal overflow.' });
  }

  const titleCheck = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h1, h2'));
    const visible = headings.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    if (!visible) {
      return { ok: true, detail: 'No visible heading detected.' };
    }

    const text = (visible.textContent || '').trim();
    const rect = visible.getBoundingClientRect();
    const style = window.getComputedStyle(visible);
    const lineHeight = Number.parseFloat(style.lineHeight) || rect.height;
    const lineCount = Math.max(1, Math.round(rect.height / lineHeight));
    const wrapsTooHard = text.length > 18 && lineCount >= 4;
    return {
      ok: !wrapsTooHard,
      detail: `headingWidth=${Math.round(rect.width)} lines=${lineCount} textLength=${text.length}`,
    };
  });

  findings.push(
    titleCheck.ok
      ? { level: 'PASS', check: 'Header readability', detail: titleCheck.detail }
      : { level: 'WARN', check: 'Header readability', detail: titleCheck.detail },
  );

  const entryPath = path.join(OUT_DIR, `${account.key}-${slugify(menu.label)}-entry.png`);
  await page.screenshot({ path: entryPath, fullPage: true });
  evidence.entry = path.relative(process.cwd(), entryPath).replaceAll('\\', '/');

  await page.evaluate(() => window.scrollTo({ top: Math.min(600, document.body.scrollHeight), behavior: 'instant' }));
  await page.waitForTimeout(300);
  const interactionPath = path.join(OUT_DIR, `${account.key}-${slugify(menu.label)}-interaction.png`);
  await page.screenshot({ path: interactionPath, fullPage: true });
  evidence.interaction = path.relative(process.cwd(), interactionPath).replaceAll('\\', '/');

  const menuButton = page.locator('button[aria-label="Mở menu"]');
  if (await menuButton.count()) {
    await menuButton.first().click();
    await page.waitForTimeout(300);
    const sidebarPath = path.join(OUT_DIR, `${account.key}-${slugify(menu.label)}-sidebar.png`);
    await page.screenshot({ path: sidebarPath, fullPage: true });
    evidence.sidebar = path.relative(process.cwd(), sidebarPath).replaceAll('\\', '/');
    await page.keyboard.press('Escape').catch(() => {});
  }

  return {
    status: getStatus(findings),
    findings,
    finalPath: currentPath,
    evidence,
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const allResults = [];

  for (const account of ACCOUNTS) {
    const context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
    });

    const page = await context.newPage();
    const accountResults = {
      account,
      drawer: null,
      menus: [],
      status: 'PASS',
    };

    try {
      await login(page, account);

      const drawer = await checkDrawerLayering(page);
      accountResults.drawer = drawer;

      for (const menu of account.menus) {
        const menuResult = await runMenuChecks(page, account, menu);
        accountResults.menus.push({ ...menu, ...menuResult });
      }

      const levels = accountResults.menus.flatMap((m) => m.findings.map((f) => f.level));
      if (drawer.status === 'FAIL' || levels.includes('FAIL')) accountResults.status = 'FAIL';
      else if (levels.includes('WARN')) accountResults.status = 'WARN';
      else accountResults.status = 'PASS';
    } catch (error) {
      accountResults.status = 'FAIL';
      accountResults.menus.push({
        path: '(session)',
        label: 'Execution',
        status: 'FAIL',
        findings: [{ level: 'FAIL', check: 'Execution', detail: error?.message || String(error) }],
        finalPath: page.url(),
        screenshot: '',
      });
    } finally {
      await page.close();
      await context.close();
      allResults.push(accountResults);
    }
  }

  await browser.close();

  const totalMenus = allResults.reduce((sum, r) => sum + r.menus.length, 0);
  const passMenus = allResults.reduce((sum, r) => sum + r.menus.filter((m) => m.status === 'PASS').length, 0);
  const warnMenus = allResults.reduce((sum, r) => sum + r.menus.filter((m) => m.status === 'WARN').length, 0);
  const failMenus = allResults.reduce((sum, r) => sum + r.menus.filter((m) => m.status === 'FAIL').length, 0);

  const lines = [];
  lines.push(`# QA Mobile Detailed Menu Audit (${NOW.toISOString()})`);
  lines.push('');
  lines.push(`- Base URL: \`${BASE_URL}\``);
  lines.push('- Device profile: iPhone 12 (390x844)');
  lines.push(`- Portal audit: ${portalEmail && portalPassword ? 'ENABLED' : 'DISABLED (set PORTAL_EMAIL/PORTAL_PASSWORD)'}`);
  lines.push('- Evidence per menu: entry + interaction + sidebar');
  lines.push(`- Evidence directory: \`${path.relative(process.cwd(), OUT_DIR).replaceAll('\\\\', '/')}\``);
  lines.push(`- Menu summary: ${passMenus} PASS / ${warnMenus} WARN / ${failMenus} FAIL (total ${totalMenus})`);
  lines.push('');
  lines.push('## Release Gate');
  lines.push('');
  lines.push(failMenus === 0 && warnMenus === 0 ? '- PASS: No known mobile menu defects detected in this run.' : '- FAIL: Remaining WARN/FAIL findings require fixes before claiming zero-known-defect state.');
  lines.push('');

  for (const roleResult of allResults) {
    lines.push(`## ${roleResult.account.label} (${roleResult.account.email}) - ${roleResult.status}`);
    lines.push('');
    if (roleResult.drawer) {
      lines.push(`- Drawer layering: [${roleResult.drawer.status}] ${roleResult.drawer.detail}`);
      if (roleResult.drawer.screenshot) lines.push(`- Drawer evidence: \`${roleResult.drawer.screenshot}\``);
    }
    lines.push('');
    lines.push('| Menu | Path | Status | Screenshot |');
    lines.push('|---|---|---|---|');
    for (const menu of roleResult.menus) {
      const evidenceSummary = menu.evidence?.entry ? `\`${menu.evidence.entry}\`` : '-';
      lines.push(`| ${menu.label} | \`${menu.path}\` | ${menu.status} | ${evidenceSummary} |`);
    }
    lines.push('');

    for (const menu of roleResult.menus) {
      lines.push(`### ${roleResult.account.label} - ${menu.label} (${menu.status})`);
      lines.push(`- Final path: \`${menu.finalPath}\``);
      if (menu.evidence?.entry) lines.push(`- Evidence entry: \`${menu.evidence.entry}\``);
      if (menu.evidence?.interaction) lines.push(`- Evidence interaction: \`${menu.evidence.interaction}\``);
      if (menu.evidence?.sidebar) lines.push(`- Evidence sidebar: \`${menu.evidence.sidebar}\``);
      lines.push('- Checks:');
      for (const finding of menu.findings) {
        lines.push(`  - [${finding.level}] ${finding.check}: ${finding.detail}`);
      }
      lines.push('');
    }
  }

  lines.push('## Completion Criteria');
  lines.push('');
  lines.push('1. All menus PASS for all required roles.');
  lines.push('2. No FAIL and no WARN findings in final audit.');
  lines.push('3. Every menu has screenshot evidence attached.');
  lines.push('');

  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

  console.log('QA MOBILE DETAILED MENU AUDIT COMPLETE');
  console.log('REPORT:', path.relative(process.cwd(), REPORT_PATH));
  console.log('EVIDENCE DIR:', path.relative(process.cwd(), OUT_DIR));
  console.log(`SUMMARY: ${passMenus} PASS / ${warnMenus} WARN / ${failMenus} FAIL / ${totalMenus} TOTAL`);

  process.exit(failMenus > 0 ? 1 : 0);
}

run().catch((error) => {
  console.error('FATAL:', error?.message || error);
  process.exit(1);
});
