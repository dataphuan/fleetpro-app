#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const liveReportPath = path.join(root, 'docs', 'QA_AUDIT_PHASE_EXECUTION_LIVE_20260331.md');

const checks = [
  { name: 'Phase1', command: ['npm', 'run', 'qa:phase1'] },
  { name: 'Phase2', command: ['npm', 'run', 'qa:phase2'] },
  { name: 'Phase3', command: ['npm', 'run', 'qa:phase3'] },
  { name: 'Phase4', command: ['npm', 'run', 'qa:phase4'] },
  { name: 'Phase5', command: ['npm', 'run', 'qa:phase5'] },
  { name: 'Phase6', command: ['npm', 'run', 'qa:phase6'] },
  { name: 'Typecheck', command: ['npm', 'run', 'typecheck'] },
  { name: 'Build', command: ['npm', 'run', 'build'] },
];

const runCommand = (commandParts) => {
  const [cmd, ...args] = commandParts;
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  return {
    code: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
};

const summarizePendingManual = () => {
  if (!fs.existsSync(liveReportPath)) {
    return { hasReport: false, pendingCount: 0 };
  }

  const src = fs.readFileSync(liveReportPath, 'utf8');
  const pending = (src.match(/- \[ \]/g) || []).length;
  return { hasReport: true, pendingCount: pending };
};

const outputs = [];
for (const item of checks) {
  const res = runCommand(item.command);
  outputs.push({ ...item, ...res });
}

const failed = outputs.filter((x) => x.code !== 0);
const passed = outputs.filter((x) => x.code === 0);

const reportInfo = summarizePendingManual();
const hasPendingManual = reportInfo.pendingCount > 0;

const go = failed.length === 0 && reportInfo.hasReport && !hasPendingManual;

console.log('\nPHASE 7 QA AUDIT: RELEASE GATE (GO/NO-GO)');
console.log('==========================================');
outputs.forEach((x) => {
  console.log(`${x.code === 0 ? 'PASS' : 'FAIL'}: ${x.name} (${x.command.join(' ')})`);
});

if (!reportInfo.hasReport) {
  console.log('WARN: Live execution report not found; cannot confirm manual completion state.');
} else {
  console.log(`INFO: Manual checklist pending items: ${reportInfo.pendingCount}`);
}

if (failed.length > 0) {
  console.log('\nFAILED COMMAND DETAILS:');
  failed.forEach((x) => {
    const tail = `${x.stdout}\n${x.stderr}`.trim().split(/\r?\n/).slice(-12).join('\n');
    console.log(`- ${x.name}:`);
    if (tail) console.log(tail);
  });
}

console.log(`\nSUMMARY: ${passed.length} PASS / ${failed.length} FAIL / ${hasPendingManual ? reportInfo.pendingCount : 0} PENDING-MANUAL`);
console.log(`RELEASE_DECISION: ${go ? 'GO' : 'NO-GO'}`);

process.exit(go ? 0 : 1);
