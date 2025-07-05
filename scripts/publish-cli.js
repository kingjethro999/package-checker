#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function publishCLI() {
  console.log('🚀 Publishing Package Checker CLI...\n');
  
  try {
    // Backup original package.json
    const originalPackagePath = path.join(__dirname, '..', 'package.json');
    const backupPath = path.join(__dirname, '..', 'package.json.backup');
    
    console.log('📦 Backing up original package.json...');
    await fs.copy(originalPackagePath, backupPath);
    
    // Copy CLI package.json to main package.json
    const cliPackagePath = path.join(__dirname, '..', 'package-cli.json');
    console.log('📋 Using CLI package configuration...');
    await fs.copy(cliPackagePath, originalPackagePath);
    
    // Build CLI
    console.log('🔨 Building CLI...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Publish to npm
    console.log('📤 Publishing to npm...');
    execSync('npm publish', { stdio: 'inherit' });
    
    // Restore original package.json
    console.log('🔄 Restoring original package.json...');
    await fs.copy(backupPath, originalPackagePath);
    await fs.remove(backupPath);
    
    console.log('\n✅ CLI published successfully!');
    console.log('📦 Package: package-checker-cli');
    console.log('🔗 Install with: npm install -g package-checker-cli');
    console.log('🚀 Use with: checker --help');
    
  } catch (error) {
    console.error('❌ Error publishing CLI:', error.message);
    
    // Try to restore package.json on error
    try {
      const backupPath = path.join(__dirname, '..', 'package.json.backup');
      const originalPackagePath = path.join(__dirname, '..', 'package.json');
      
      if (await fs.pathExists(backupPath)) {
        await fs.copy(backupPath, originalPackagePath);
        await fs.remove(backupPath);
        console.log('🔄 Restored original package.json');
      }
    } catch (restoreError) {
      console.error('❌ Failed to restore package.json:', restoreError.message);
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  publishCLI();
}

module.exports = { publishCLI }; 