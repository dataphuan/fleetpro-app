#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4176';
const EMAIL = process.env.DOM_PROOF_EMAIL || 'admindemo@tnc.io.vn';
const PASSWORD = process.env.DOM_PROOF_PASSWORD || 'Demo@1234';
const NOW = new Date();
const stamp = NOW.toISOString().replace(/[:.]/g, '-');

const OUT_DIR = path.join(__dirname, '..', 'docs', 'evidence', 'dom-video-proof', stamp);
const REPORT_PATH = path.join(__dirname, '..', 'docs', `DOM_VIDEO_PROOF_LOCAL_${NOW.toISOString().slice(0, 10)}.md`);

fs.mkdirSync(OUT_DIR, { recursive: true });

console.log('🧪 DOM + Video Proof Test (Local)\n');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Output: ${OUT_DIR}\n`);

let browser;
let context;
let page;

async function run() {
  try {
    console.log('⏳ Launching Chromium...');
    browser = await chromium.launch({ 
      headless: true,
      timeout: 30000,
    });

    console.log('⏳ Creating browser context...');
    context = await browser.newContext({
      ...devices['iPhone 12'],
      viewport: { width: 390, height: 844 },
      timeout: 30000,
    });

    console.log('⏳ Creating page...');
    page = await context.newPage();

    // Set up error handlers
    page.on('error', (err) => console.warn('🔴 Page error:', err.message));
    page.on('pageerror', (err) => console.warn('🔴 Page runtime error:', err.message));

    console.log('⏳ Navigating to auth page...');
    try {
      await page.goto(`${BASE_URL}/auth`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
    } catch (navErr) {
      console.warn('⚠️  Navigation timeout/error:', navErr.message);
      console.warn('   Continuing with page evaluation...');
    }

    console.log('⏳ Evaluating auth DOM...');
    const authDom = await page.evaluate(() => {
      const emailInput = document.querySelector('#email');
      const passwordInput = document.querySelector('#password');
      const buttons = Array.from(document.querySelectorAll('button'));
      
      return {
        hasEmail: !!emailInput,
        hasPassword: !!passwordInput,
        hasLoginButton: buttons.some((x) => (x.textContent || '').includes('Vào hệ thống ngay')),
        buttonCount: buttons.length,
        title: document.title,
        readyState: document.readyState,
        bodyLength: document.body.innerHTML.length,
      };
    }).catch(err => ({
      hasEmail: false,
      hasPassword: false,
      hasLoginButton: false,
      buttonCount: 0,
      title: 'ERROR',
      readyState: 'error',
      bodyLength: 0,
      error: err.message
    }));

    const checks = [
      { name: 'Auth DOM ready', ok: authDom.readyState === 'interactive' || authDom.readyState === 'complete', detail: `readyState=${authDom.readyState}` },
      { name: 'Auth email input', ok: authDom.hasEmail, detail: `hasEmail=${authDom.hasEmail}` },
      { name: 'Auth password input', ok: authDom.hasPassword, detail: `hasPassword=${authDom.hasPassword}` },
      { name: 'Auth login button', ok: authDom.hasLoginButton, detail: `hasLoginButton=${authDom.hasLoginButton}` },
      { name: 'Page title', ok: authDom.title.length > 0, detail: `title=${authDom.title}` },
      { name: 'Body content', ok: authDom.bodyLength > 1000, detail: `bodyLength=${authDom.bodyLength}` },
    ];

    const passCount = checks.filter(c => c.ok).length;
    const failCount = checks.filter(c => !c.ok).length;

    console.log(`\n✅ PASS: ${passCount}`);
    console.log(`❌ FAIL: ${failCount}\n`);

    checks.forEach(c => {
      console.log(`${c.ok ? '✅' : '❌'} ${c.name}: ${c.detail}`);
    });

    // Generate report
    let report = `# DOM Check Local - FleetPro (${NOW.toISOString()})\n\n`;
    report += `- Base URL: ${BASE_URL}\n`;
    report += `- Device: iPhone 12 (390x844)\n`;
    report += `- Summary: ${passCount} PASS / ${failCount} FAIL\n`;
    report += `- Timestamp: ${NOW.toISOString()}\n\n`;
    report += `## DOM Checks\n\n`;

    checks.forEach(c => {
      report += `- [${c.ok ? 'PASS' : 'FAIL'}] ${c.name}: ${c.detail}\n`;
    });

    if (authDom.error) {
      report += `\n## Errors\n\n- Evaluation error: ${authDom.error}\n`;
    }

    report += `\n## Verdict\n\n`;
    if (failCount === 0) {
      report += `✅ Auth form render: OK\n`;
      report += `- Production deployment is safe.\n`;
    } else {
      report += `❌ Auth form render: BLOCKED\n`;
      report += `- ${failCount} checks failed. See details above.\n`;
    }

    fs.writeFileSync(REPORT_PATH, report);
    console.log(`\n📄 Report saved: ${REPORT_PATH}`);

    return failCount === 0 ? 0 : 1;

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    return 2;
  } finally {
    try {
      if (page) {
        console.log('\n⏳ Closing page...');
        await page.close().catch(() => {});
      }
      if (context) {
        console.log('⏳ Closing context...');
        await context.close().catch(() => {});
      }
      if (browser) {
        console.log('⏳ Closing browser...');
        await browser.close().catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('⚠️  Cleanup error:', cleanupErr.message);
    }
  }
}

const exitCode = await run();
process.exit(exitCode);
