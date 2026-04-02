#!/usr/bin/env node
/**
 * QA Pre-Push Audit Script
 * Runs checks before pushing to GitHub
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPass(message) {
  log(`✅ ${message}`, 'green');
}

function checkFail(message) {
  log(`❌ ${message}`, 'red');
  process.exit(1);
}

function checkWarn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function runCommand(cmd, description) {
  log(`\n▶️  ${description}...`, 'blue');
  try {
    const result = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    return result;
  } catch (error) {
    checkFail(`${description} failed:\n${error.message}`);
  }
}

async function runAudit() {
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║    QA Pre-Push Audit Script v1.0     ║', 'blue');
  log('║    Running comprehensive checks...   ║', 'blue');
  log('╚════════════════════════════════════════╝', 'blue');

  // 1. Git Status
  log('\n📋 STEP 1: Git Status Check', 'blue');
  try {
    const status = execSync('git status --short', { encoding: 'utf-8' });
    if (status.trim() && !status.includes('??')) {
      checkWarn('Uncommitted changes detected:\n' + status);
    } else if (status.trim()) {
      checkWarn('Untracked files detected');
    } else {
      checkPass('Git working tree clean');
    }
  } catch (e) {
    checkWarn('Not a git repository or git not available');
  }

  // 2. Branch Check
  log('\n📋 STEP 2: Git Branch Check', 'blue');
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    if (branch === 'main') {
      checkPass(`On correct branch: ${branch}`);
    } else {
      checkWarn(`On branch: ${branch} (expected: main)`);
    }
  } catch (e) {
    checkWarn('Could not verify branch');
  }

  // 3. Build Check
  log('\n📋 STEP 3: Production Build', 'blue');
  runCommand('npm run build', 'Building application');
  checkPass('Build completed successfully');

  // Check dist folder
  if (!fs.existsSync('./dist')) {
    checkFail('dist folder not created');
  }
  checkPass('dist folder exists');

  // Check key files
  const requiredFiles = [
    'dist/index.html',
    'dist/assets/index-*.js',
  ];
  
  const hasIndexHtml = fs.existsSync('./dist/index.html');
  if (!hasIndexHtml) {
    checkFail('index.html not found in dist');
  }
  checkPass('index.html present');

  // 4. File Structure Check
  log('\n📋 STEP 4: Source File Integrity', 'blue');
  const criticalFiles = [
    'src/App.tsx',
    'src/main.tsx',
    'src/pages/driver/DriverMenu.tsx',
    'src/components/driver/MobileDriverMenu.tsx',
    'src/components/driver/DocumentUpload.tsx',
    'src/components/driver/LocationCheckIn.tsx',
    'src/components/driver/PreTripInspection.tsx',
    'src/components/driver/PostTripInspection.tsx',
  ];

  for (const file of criticalFiles) {
    if (fs.existsSync(file)) {
      checkPass(`Found: ${file}`);
    } else {
      checkFail(`Missing: ${file}`);
    }
  }

  // 5. Dependencies Check
  log('\n📋 STEP 5: Package Dependencies', 'blue');
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  const hasReact = 'react' in packageJson.dependencies;
  const hasVite = 'vite' in packageJson.devDependencies;
  const hasFirebase = 'firebase' in packageJson.dependencies;

  hasReact ? checkPass('React dependency present') : checkFail('React missing');
  hasVite ? checkPass('Vite dependency present') : checkFail('Vite missing');
  hasFirebase ? checkPass('Firebase dependency present') : checkFail('Firebase missing');

  // 6. Environment Check
  log('\n📋 STEP 6: Environment Configuration', 'blue');
  const envFile = fs.existsSync('.env') || fs.existsSync('.env.local');
  if (envFile) {
    checkPass('Environment file present');
  } else {
    checkWarn('.env file not found (may be ok if using other config)');
  }

  // 7. Summary
  log('\n╔════════════════════════════════════════╗', 'blue');
  log('║          ✅ ALL CHECKS PASSED!        ║', 'green');
  log('║                                        ║', 'green');
  log('║    Next Steps:                         ║', 'green');
  log('║    1. npm run dev (run locally)        ║', 'green');
  log('║    2. Test in browser                  ║', 'green');
  log('║    3. git push origin main             ║', 'green');
  log('╚════════════════════════════════════════╝', 'green');

  log('\n📌 Last Commit:', 'blue');
  try {
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf-8' }).trim();
    log(`   ${lastCommit}`, 'blue');
  } catch (e) {
    // ignore
  }

  log('\n✅ QA Audit Complete! You\'re ready to push.\n', 'green');
}

// Run the audit
runAudit().catch(err => {
  checkFail(`Unexpected error: ${err.message}`);
});
