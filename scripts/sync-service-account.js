#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

const ROOT = path.resolve(process.cwd());
const TEMPLATE_DIR = path.join(ROOT, 'import-templates');

const RESOURCE_MAP = {
  vehicles: { file: 'vehicles.csv', sheet: 'Danh Muc Xe', keyColumn: 'Mã xe' },
  drivers: { file: 'drivers.csv', sheet: 'Tai Xe', keyColumn: 'Mã tài xế' },
  customers: { file: 'customers.csv', sheet: 'Khach Hang', keyColumn: 'Mã KH' },
  routes: { file: 'routes.csv', sheet: 'Tuyen Duong', keyColumn: 'Mã tuyến' },
  trips: { file: 'trips.csv', sheet: 'Chuyen Van Chuyen', keyColumn: 'Mã chuyến' },
  expenses: { file: 'expenses.csv', sheet: 'Chi Phi', keyColumn: 'Mã chi phí' },
  maintenance: { file: 'maintenance.csv', sheet: 'Bao Tri', keyColumn: 'Mã lệnh' },
};

const META_COLUMNS = ['tenant_id', 'record_id', 'created_at', 'updated_at', 'updated_by'];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = vals[idx] || '';
    });
    return row;
  });
  return { headers, rows };
}

function toCsv(headers, rows) {
  const escape = (value) => {
    const raw = value === null || value === undefined ? '' : String(value);
    if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [headers.join(',')];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escape(row[header])).join(','));
  });
  return `${lines.join('\n')}\n`;
}

function nowIso() {
  return new Date().toISOString();
}

function buildRecordId(tenantId, resource, keyValue) {
  return `${tenantId}_${resource}_${keyValue}`;
}

async function ensureSheet(sheetsApi, spreadsheetId, sheetName) {
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId });
  const exists = (meta.data.sheets || []).some((s) => s.properties?.title === sheetName);
  if (exists) return;
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });
}

async function readSheetValues(sheetsApi, spreadsheetId, sheetName) {
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:ZZ`,
  });
  return res.data.values || [];
}

function rowToObject(headers, row) {
  const out = {};
  headers.forEach((header, idx) => {
    out[header] = row[idx] || '';
  });
  return out;
}

async function pushResource({ sheetsApi, spreadsheetId, tenantId, serviceEmail, resource }) {
  const cfg = RESOURCE_MAP[resource];
  const filePath = path.join(TEMPLATE_DIR, cfg.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${filePath}`);
  }

  const parsed = parseCsv(fs.readFileSync(filePath, 'utf8'));
  await ensureSheet(sheetsApi, spreadsheetId, cfg.sheet);
  const values = await readSheetValues(sheetsApi, spreadsheetId, cfg.sheet);

  let headers = values[0] || [];
  if (headers.length === 0) {
    headers = [...parsed.headers];
  }
  [...META_COLUMNS, ...parsed.headers].forEach((header) => {
    if (!headers.includes(header)) headers.push(header);
  });

  const existingRows = values.slice(1);
  const existingIndexByTenantKey = new Map();
  existingRows.forEach((row, idx) => {
    const obj = rowToObject(headers, row);
    const key = `${obj.tenant_id || ''}::${obj[cfg.keyColumn] || ''}`;
    if (obj[cfg.keyColumn]) {
      existingIndexByTenantKey.set(key, idx + 2);
    }
  });

  const updates = [];
  const appends = [];
  const timestamp = nowIso();

  parsed.rows.forEach((item, seq) => {
    const keyValue = String(item[cfg.keyColumn] || '').trim();
    if (!keyValue) return;

    const obj = {
      ...item,
      tenant_id: tenantId,
      record_id: buildRecordId(tenantId, resource, keyValue),
      created_at: timestamp,
      updated_at: timestamp,
      updated_by: serviceEmail,
    };

    const key = `${tenantId}::${keyValue}`;
    const rowArray = headers.map((h) => obj[h] ?? '');
    const rowIndex = existingIndexByTenantKey.get(key);
    if (rowIndex) {
      updates.push({ rowIndex, rowArray });
    } else {
      appends.push(rowArray);
    }
  });

  await sheetsApi.spreadsheets.values.update({
    spreadsheetId,
    range: `${cfg.sheet}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] },
  });

  for (const update of updates) {
    await sheetsApi.spreadsheets.values.update({
      spreadsheetId,
      range: `${cfg.sheet}!A${update.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [update.rowArray] },
    });
  }

  if (appends.length > 0) {
    await sheetsApi.spreadsheets.values.append({
      spreadsheetId,
      range: `${cfg.sheet}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: appends },
    });
  }

  return { resource, updated: updates.length, appended: appends.length, totalInput: parsed.rows.length };
}

async function pullResource({ sheetsApi, spreadsheetId, tenantId, resource }) {
  const cfg = RESOURCE_MAP[resource];
  const filePath = path.join(TEMPLATE_DIR, cfg.file);
  const values = await readSheetValues(sheetsApi, spreadsheetId, cfg.sheet);
  if (!values.length) {
    return { resource, exported: 0, filePath };
  }

  const headers = values[0];
  const sourceRows = values.slice(1).map((row) => rowToObject(headers, row));

  const filtered = sourceRows.filter((row) => String(row.tenant_id || '') === tenantId);
  const csvHeaders = parseCsv(fs.readFileSync(filePath, 'utf8')).headers;
  const normalized = filtered.map((row) => {
    const out = {};
    csvHeaders.forEach((header) => {
      out[header] = row[header] ?? '';
    });
    return out;
  });

  fs.writeFileSync(filePath, toCsv(csvHeaders, normalized), 'utf8');
  return { resource, exported: normalized.length, filePath };
}

async function main() {
  const args = parseArgs(process.argv);
  const credentialsPath = args.credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const spreadsheetId = args['spreadsheet-id'] || process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tenantId = args.tenant || process.env.TENANT_ID || 'internal-tenant-1';
  const direction = args.direction || 'both'; // push | pull | both
  const resources = (args.resource ? [args.resource] : Object.keys(RESOURCE_MAP));

  if (!credentialsPath || !spreadsheetId) {
    throw new Error('Required: --credentials <service-account.json> and --spreadsheet-id <id>');
  }

  const credentials = JSON.parse(fs.readFileSync(path.resolve(credentialsPath), 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheetsApi = google.sheets({ version: 'v4', auth });
  const serviceEmail = credentials.client_email || 'service-account';
  const report = [];

  for (const resource of resources) {
    if (!RESOURCE_MAP[resource]) {
      console.warn(`Skip unknown resource: ${resource}`);
      continue;
    }
    if (direction === 'push' || direction === 'both') {
      const pushed = await pushResource({ sheetsApi, spreadsheetId, tenantId, serviceEmail, resource });
      report.push({ action: 'push', ...pushed });
      console.log(`[push:${resource}] updated=${pushed.updated} appended=${pushed.appended} input=${pushed.totalInput}`);
    }
    if (direction === 'pull' || direction === 'both') {
      const pulled = await pullResource({ sheetsApi, spreadsheetId, tenantId, resource });
      report.push({ action: 'pull', ...pulled });
      console.log(`[pull:${resource}] exported=${pulled.exported} -> ${pulled.filePath}`);
    }
  }

  console.log('\nSync completed.');
  console.log(JSON.stringify({ tenantId, direction, resources, report }, null, 2));
}

main().catch((error) => {
  console.error('Service-account sync failed:', error.message || error);
  process.exit(1);
});
