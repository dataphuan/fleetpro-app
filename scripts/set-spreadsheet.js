#!/usr/bin/env node
// Simple Node script to call the Apps Script admin endpoint to set Spreadsheet ID
// Usage:
//   node scripts/set-spreadsheet.js --webapp=WEBAPP_URL --token=ADMIN_TOKEN --id=SPREADSHEET_ID
//   or
//   node scripts/set-spreadsheet.js --webapp=WEBAPP_URL --token=ADMIN_TOKEN --url=SPREADSHEET_EDIT_URL

(async function(){
  const argv = process.argv.slice(2);
  const opts = {};
  argv.forEach(a => {
    if (a.startsWith('--webapp=')) opts.webapp = a.split('=')[1];
    if (a.startsWith('--token=')) opts.token = a.split('=')[1];
    if (a.startsWith('--id=')) opts.id = a.split('=')[1];
    if (a.startsWith('--url=')) opts.url = a.split('=')[1];
  });

  opts.webapp = opts.webapp || process.env.WEBAPP_URL || process.env.VITE_GOOGLE_APPS_SCRIPT_WEBHOOK_URL;
  opts.token = opts.token || process.env.ADMIN_TOKEN;

  if (!opts.webapp || !opts.token || (!opts.id && !opts.url)) {
    console.error('Missing required args. Usage: --webapp=WEBAPP_URL --token=ADMIN_TOKEN --id=SPREADSHEET_ID|--url=SPREADSHEET_EDIT_URL');
    process.exit(2);
  }

  // ensure fetch exists (Node 18+). Fallback to node-fetch if needed.
  let _fetch = global.fetch;
  if (typeof _fetch !== 'function') {
    try {
      const nodeFetch = await import('node-fetch');
      _fetch = nodeFetch.default;
    } catch (err) {
      console.error('Fetch is not available and node-fetch could not be imported. Use Node 18+ or install node-fetch.');
      process.exit(3);
    }
  }

  const payload = {
    type: 'setSpreadsheetId',
    adminToken: opts.token
  };
  if (opts.id) payload.spreadsheetId = opts.id;
  if (opts.url) payload.spreadsheetUrl = opts.url;

  try {
    const res = await _fetch(opts.webapp, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // Try to parse JSON response
    let text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('Response:', JSON.stringify(json, null, 2));
      if (json.status && (json.status === 'success' || json.status === 'ok')) process.exit(0);
      else process.exit(4);
    } catch (e) {
      console.log('Non-JSON response:', text);
      process.exit(res.ok ? 0 : 5);
    }
  } catch (err) {
    console.error('Request failed:', err.message || err);
    process.exit(1);
  }
})();
