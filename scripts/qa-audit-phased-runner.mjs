#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const now = new Date();
const yyyy = now.getFullYear();
const mm = String(now.getMonth() + 1).padStart(2, '0');
const dd = String(now.getDate()).padStart(2, '0');
const hh = String(now.getHours()).padStart(2, '0');
const mi = String(now.getMinutes()).padStart(2, '0');
const stamp = `${yyyy}${mm}${dd}_${hh}${mi}`;

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const reportPath = path.join(docsDir, `QA_AUDIT_RUN_${stamp}.md`);

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const run = (name, command) => {
  const started = new Date();
  try {
    const output = execSync(command, {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
    });
    const ended = new Date();
    return {
      name,
      command,
      status: 'PASS',
      started,
      ended,
      output: output?.trim() || '(no output)',
    };
  } catch (error) {
    const ended = new Date();
    return {
      name,
      command,
      status: 'FAIL',
      started,
      ended,
      output: String(error?.stdout || '').trim() || String(error?.message || 'Unknown error'),
      errorOutput: String(error?.stderr || '').trim(),
    };
  }
};

const checks = [
  run('Gate A - Menu Coverage', 'npm run qa:menu-audit'),
  run('Gate B1 - Typecheck', 'npm run typecheck'),
  run('Gate B2 - Build', 'npm run build'),
];

const hasFail = checks.some((c) => c.status === 'FAIL');
const releaseDecision = hasFail ? 'NO-GO' : 'GO (automation gates only)';

const fmt = (d) => d.toISOString();

const report = [
  '# QA Audit Run (Automated Phased Gates)',
  '',
  `- Generated at: ${now.toISOString()}`,
  `- Workspace: ${root}`,
  `- Decision (automation): ${releaseDecision}`,
  '',
  '## Gate Summary',
  '',
  '| Gate | Status | Command | Started | Ended |',
  '|------|--------|---------|---------|-------|',
  ...checks.map((c) => `| ${c.name} | ${c.status} | ${c.command} | ${fmt(c.started)} | ${fmt(c.ended)} |`),
  '',
  '## Logs',
  '',
  ...checks.flatMap((c) => [
    `### ${c.name} - ${c.status}`,
    '',
    '```text',
    c.output || '(no output)',
    c.errorOutput ? `\n[stderr]\n${c.errorOutput}` : '',
    '```',
    '',
  ]),
  '## Manual Phases Pending',
  '',
  '- Phase 1-7 manual and integration checks must follow:',
  '- docs/QA_AUDIT_PHASED_DEEP_20260331.md',
  '- docs/QA_AUDIT_PHASE_EXECUTION_TEMPLATE_20260331.md',
  '',
].join('\n');

fs.writeFileSync(reportPath, report, 'utf8');

console.log('\nQA phased automation completed.');
console.log(`Report: ${path.relative(root, reportPath)}`);
console.log(`Decision (automation): ${releaseDecision}`);

process.exit(hasFail ? 1 : 0);
