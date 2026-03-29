const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE_DIR = path.join(ROOT, 'import-templates');
const MAPPING_PATH = path.join(__dirname, 'migration-mapping.json');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    args[key] = value;
  }
  return args;
}

function parseCsvLine(line) {
  const output = [];
  let buffer = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buffer += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      output.push(buffer.trim());
      buffer = '';
      continue;
    }

    buffer += ch;
  }

  output.push(buffer.trim());
  return output;
}

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function buildRecordId(tenantId, resource, keyValue) {
  return [tenantId, resource, keyValue].join('_');
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (_err) {
    return { status: 'ok', raw: text };
  }
}

async function migrateResource({ webhook, token, tenantId, resource, keyColumn, fileName, dryRun }) {
  const filePath = path.join(TEMPLATE_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsv(content).map((row) => {
    const keyValue = String(row[keyColumn] || '').trim();
    return {
      ...row,
      tenant_id: tenantId,
      record_id: buildRecordId(tenantId, resource, keyValue || Date.now().toString()),
      updated_by: 'migration-script',
    };
  });

  if (dryRun) {
    return { resource, dryRun: true, rows: rows.length, keyColumn, fileName };
  }

  return postJson(webhook, {
    type: 'upsert',
    token,
    tenant_id: tenantId,
    resource,
    keyColumn,
    rows,
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const webhook = args.webhook || process.env.WEBHOOK_URL;
  const token = args.token || process.env.API_TOKEN || '';
  const tenantId = args.tenant || process.env.TENANT_ID;
  const resourceFilter = args.resource || '';
  const dryRun = args['dry-run'] === 'true';

  if (!webhook || !tenantId) {
    throw new Error('Required: --webhook <url> and --tenant <tenantId>');
  }

  const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf8'));
  const resources = Object.keys(mapping).filter((resource) => !resourceFilter || resource === resourceFilter);

  if (resources.length === 0) {
    throw new Error('No resources matched migration mapping');
  }

  const report = [];
  for (const resource of resources) {
    const cfg = mapping[resource];
    const result = await migrateResource({
      webhook,
      token,
      tenantId,
      resource,
      keyColumn: cfg.keyColumn,
      fileName: cfg.file,
      dryRun,
    });
    report.push({ resource, result });
    console.log(`[${resource}]`, result);
  }

  console.log('\nMigration completed.');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
