#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log('🔍 DOM Quick Check (Build Artifacts)\n');

// Check 1: index.html exists
const hasIndex = fs.existsSync(indexPath);
console.log(`${hasIndex ? '✅' : '❌'} index.html exists`);

// Check 2: Read index.html
if (hasIndex) {
  const content = fs.readFileSync(indexPath, 'utf8');
  
  // Check for root div
  const hasRoot = content.includes('id="root"');
  console.log(`${hasRoot ? '✅' : '❌'} Has root div for React`);
  
  // Check for script
  const hasScript = content.includes('<script');
  console.log(`${hasScript ? '✅' : '❌'} Has script tags`);
  
  // Check for title
  const hasTitle = content.includes('<title>');
  console.log(`${hasTitle ? '✅' : '❌'} Has title tag`);
  
  // Check for manifest
  const hasManifest = content.includes('manifest');
  console.log(`${hasManifest ? '✅' : '❌'} Has PWA manifest reference`);
}

// Check 3: Verify assets exist
const assetsPath = path.join(distPath, 'assets');
const hasAssets = fs.existsSync(assetsPath);
console.log(`${hasAssets ? '✅' : '❌'} assets/ directory exists`);

if (hasAssets) {
  const files = fs.readdirSync(assetsPath);
  console.log(`   - ${files.length} files in assets`);
  
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));
  
  console.log(`   - JS: ${jsFiles.length} files`);
  console.log(`   - CSS: ${cssFiles.length} files`);
  
  // Check main index bundle
  const mainBundle = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
  if (mainBundle) {
    console.log(`✅ Main bundle found: ${mainBundle}`);
    
    // Check bundle size
    const bundlePath = path.join(assetsPath, mainBundle);
    const stat = fs.statSync(bundlePath);
    console.log(`   - Size: ${(stat.size / 1024).toFixed(2)} KB`);
    
    // Quick check for obvious errors - this is very basic
    const bundleContent = fs.readFileSync(bundlePath, 'utf8');
    
    // Check for "e0 is not defined" pattern (minified error)
    if (bundleContent.includes('e0 is not') || bundleContent.includes('cannot access')) {
      console.log('❌ Potential runtime error pattern detected');
    } else {
      console.log('✅ No obvious error patterns in bundle');
    }
  } else {
    console.log('❌ Main bundle not found');
  }
}

console.log('\n✅ Build validation complete!');
console.log('\nNext: Deploy to production or run on local server for full DOM test.');
