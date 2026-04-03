#!/usr/bin/env node
import { chromium, devices } from 'playwright';

const baseUrl = process.env.BASE_URL || 'https://tnc.io.vn';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...devices['iPhone 12'],
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

page.on('pageerror', (e) => {
  console.log('PAGEERROR', e.message);
  console.log('PAGEERROR_STACK', e.stack || 'no-stack');
});
page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()));
page.on('requestfailed', (req) => {
  console.log('REQUESTFAILED', req.url(), req.failure()?.errorText || 'unknown');
});
page.on('response', async (res) => {
  if (res.status() >= 400) {
    console.log('HTTP', res.status(), res.url());
  }
});

const res = await page.goto(`${baseUrl}/auth`, { waitUntil: 'domcontentloaded' });
console.log('STATUS', res?.status());
console.log('URL', page.url());
await page.waitForTimeout(2500);

const dom = await page.evaluate(() => {
  const buttons = Array.from(document.querySelectorAll('button')).slice(0, 12).map((b) => (b.textContent || '').trim());
  return {
    title: document.title,
    readyState: document.readyState,
    hasEmail: !!document.querySelector('#email'),
    hasPassword: !!document.querySelector('#password'),
    buttonCount: document.querySelectorAll('button').length,
    buttons,
    bodyLen: (document.body?.innerText || '').length,
  };
});

console.log('DOM', JSON.stringify(dom));

const perf = await page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  return {
    type: nav?.type || 'unknown',
    domContentLoaded: nav?.domContentLoadedEventEnd || 0,
    loadEvent: nav?.loadEventEnd || 0,
  };
});
console.log('PERF', JSON.stringify(perf));

await page.waitForTimeout(1000);
await browser.close();
