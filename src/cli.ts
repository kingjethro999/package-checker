// Load environment variables from .env file
// import 'dotenv/config';

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PackageChecker } from './checker';
import { AIService } from './aiService';
import * as readline from 'readline';

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const VERSION = packageJson.version;

// Type definitions for command options
interface CheckOptions {
  path?: string;
  ai?: boolean;
  json?: boolean;
}

interface FixOptions {
  path?: string;
  dryRun?: boolean;
}

interface InstallOptions {
  path?: string;
}

interface ListOptions {
  path?: string;
  json?: boolean;
}

interface DoctorOptions {
  path?: string;
  ai?: boolean;
}

interface ScanOptions {
  ai?: boolean;
  json?: boolean;
}

interface SyncOptions {
  path?: string;
}

interface CleanOptions {
  path?: string;
  dryRun?: boolean;
}

interface ConfigOptions {
  set?: string;
  get?: string;
  list?: boolean;
}

interface HelpOptions {
  auto?: boolean;
}

const program = new Command();

program
  .name('checker')
  .description('Package Checker - AI-powered dependency analysis and code assistance')
  .version(VERSION);

// Initialize AI service
const aiService = new AIService();

// Function to get user confirmation
async function getUserConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (Y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer === '');
    });
  });
}

// New help command for natural language queries
program
  .command('help <query>')
  .description('Ask AI for help with your code problems or project issues')
  .option('--auto', 'Automatically apply suggested file operations without confirmation')
  .action(async (query: string, options: HelpOptions) => {
    try {
      console.log(`🤖 Processing your query: "${query}"`);
      console.log('🔍 Analyzing your project...\n');
      
      // Get AI help response
      const helpResponse = await aiService.handleHelpQuery(query);
      
      // Display explanation
      console.log('💡 Analysis:');
      console.log(helpResponse.explanation);
      console.log('');
      
      // Display code examples if available
      if (helpResponse.codeExamples && helpResponse.codeExamples.length > 0) {
        console.log('📝 Code Examples:');
        helpResponse.codeExamples.forEach((example, index) => {
          console.log(`${index + 1}. ${example}`);
        });
        console.log('');
      }
      
      // Display resources if available
      if (helpResponse.resources && helpResponse.resources.length > 0) {
        console.log('📚 Helpful Resources:');
        helpResponse.resources.forEach((resource, index) => {
          console.log(`${index + 1}. ${resource}`);
        });
        console.log('');
      }
      
      // Handle suggested file operations
      if (helpResponse.suggestedActions && helpResponse.suggestedActions.length > 0) {
        console.log('🛠️  Suggested File Operations:');
        helpResponse.suggestedActions.forEach((action, index) => {
          console.log(`${index + 1}. ${action.type.toUpperCase()}: ${action.file}`);
          console.log(`   Reason: ${action.reason}`);
        });
        console.log('');
        
        let shouldProceed = options.auto;
        if (!shouldProceed) {
          shouldProceed = await getUserConfirmation('Would you like me to apply these changes?');
        }
        
        if (shouldProceed) {
          console.log('🚀 Applying changes...\n');
          const success = await aiService.executeFileOperations(helpResponse.suggestedActions);
          
          if (success) {
            console.log('\n✅ All changes applied successfully!');
          } else {
            console.log('\n❌ Some changes failed. Please check the output above.');
          }
        } else {
          console.log('👍 No changes applied. You can run the command again with --auto to apply changes automatically.');
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker check
program
  .command('check')
  .description('Scans the project for missing, uninstalled, and unused dependencies')
  .option('-p, --path <path>', 'Path to scan (default: current directory)')
  .option('--ai', 'Enable AI-powered analysis and suggestions')
  .option('--json', 'Output results in JSON format')
  .action(async (options: CheckOptions) => {
    try {
      const scanPath = options.path || process.cwd();
      console.log(`🔍 Scanning ${scanPath}...`);
      
      const checker = new PackageChecker(scanPath);
      const result = await checker.analyzeDependencies();
      
      if (options.json) {
        // Output unused dependencies as JSON
        const unusedJson = result.unused.map(unusedPkg => ({
          package: unusedPkg.package,
          locations: unusedPkg.locations.map(loc => {
            const relativePath = path.relative(process.cwd(), loc.file);
            return `${relativePath}:${loc.line}`;
          })
        }));
        console.log(JSON.stringify(unusedJson, null, 2));
        return;
      }
      
      console.log('\n=== Package Checker Results ===\n');
      
      if (result.missing.length > 0) {
        console.log('❌ Missing Dependencies:');
        result.missing.forEach(pkg => console.log(`  - ${pkg}`));
        console.log('');
      }
      
      if (result.notInstalled.length > 0) {
        console.log('⚠️  Not Installed Dependencies:');
        result.notInstalled.forEach(pkg => console.log(`  - ${pkg}`));
        console.log('');
      }
      
      if (result.unused.length > 0) {
        console.log('🗑️  Unused Dependencies:');
        result.unused.forEach(unusedPkg => {
          console.log(`  - ${unusedPkg.package}`);
          if (unusedPkg.locations && unusedPkg.locations.length > 0) {
            const locationStrings = unusedPkg.locations.map(loc => {
              const relativePath = path.relative(process.cwd(), loc.file);
              return `${relativePath}:${loc.line}`;
            });
            console.log(`    Found in: ${locationStrings.join(', ')}`);
          }
        });
        console.log('');
      }
      
      const totalIssues = result.missing.length + result.notInstalled.length + result.unused.length;
      if (totalIssues === 0) {
        console.log('✅ All dependencies are properly configured!');
      } else {
        console.log(`Found ${totalIssues} issues. Use 'checker fix' to automatically resolve them.`);
      }
      
      // AI-powered analysis if requested
      if (options.ai) {
        console.log('\n🤖 AI Analysis:');
        console.log('🔍 Analyzing your project with AI...');
        
        const aiResult = await aiService.analyzeProject(result);
        
        if (aiResult.summary) {
          console.log(`\n📊 Summary: ${aiResult.summary}`);
        }
        
        if (aiResult.securityIssues.length > 0) {
          console.log('\n🔒 Security Issues:');
          aiResult.securityIssues.forEach(issue => {
            console.log(`  - ${issue.packageName}: ${issue.description} (${issue.severity})`);
          });
        }
        
        if (aiResult.performanceTips.length > 0) {
          console.log('\n⚡ Performance Tips:');
          aiResult.performanceTips.forEach(tip => {
            console.log(`  - ${tip.tip} (${tip.impact} impact)`);
          });
        }
        
        if (aiResult.codeSuggestions.length > 0) {
          console.log('\n💡 Code Suggestions:');
          aiResult.codeSuggestions.forEach(suggestion => {
            console.log(`  - ${suggestion.file}: ${suggestion.suggestion}`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker fix
program
  .command('fix')
  .description('Automatically installs missing dependencies and removes unused ones')
  .option('-p, --path <path>', 'Path to fix (default: current directory)')
  .option('--dry-run', 'Show what would be done without making changes')
  .action(async (options: FixOptions) => {
    try {
      const fixPath = options.path || process.cwd();
      console.log(`🔧 Fixing dependencies in ${fixPath}...`);
      
      const checker = new PackageChecker(fixPath);
      const result = await checker.analyzeDependencies();
      
      if (options.dryRun) {
        console.log('\n=== Dry Run - What would be fixed ===\n');
        
        if (result.missing.length > 0) {
          console.log('📦 Would install:');
          result.missing.forEach(pkg => console.log(`  npm install ${pkg}`));
          console.log('');
        }
        
        if (result.notInstalled.length > 0) {
          console.log('📦 Would install:');
          result.notInstalled.forEach(pkg => console.log(`  npm install ${pkg}`));
          console.log('');
        }
        
        if (result.unused.length > 0) {
          console.log('🗑️  Would remove:');
          result.unused.forEach(pkg => console.log(`  npm uninstall ${pkg}`));
          console.log('');
        }
        
        return;
      }
      
      // Actually perform the fixes
      if (result.missing.length > 0) {
        console.log(`📦 Installing ${result.missing.length} missing dependencies...`);
        await checker.autoFixAll();
      }
      
      if (result.notInstalled.length > 0) {
        console.log(`📦 Installing ${result.notInstalled.length} not installed dependencies...`);
        await checker.autoFixAll();
      }
      
      if (result.unused.length > 0) {
        console.log(`🗑️  Removing ${result.unused.length} unused dependencies...`);
        await checker.autoFixAll();
      }
      
      console.log('✅ Dependencies fixed successfully!');
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker install <module>
program
  .command('install <module>')
  .description('Installs a specific module that was flagged as missing')
  .option('-p, --path <path>', 'Path to install in (default: current directory)')
  .action(async (module: string, options: InstallOptions) => {
    try {
      const installPath = options.path || process.cwd();
      console.log(`📦 Installing ${module} in ${installPath}...`);
      
      const checker = new PackageChecker(installPath);
      await checker.installPackage(module);
      
      console.log(`✅ ${module} installed successfully!`);
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker uninstall <module>
program
  .command('uninstall <module>')
  .description('Uninstalls a specific module flagged as unused')
  .option('-p, --path <path>', 'Path to uninstall from (default: current directory)')
  .action(async (module: string, options: InstallOptions) => {
    try {
      const uninstallPath = options.path || process.cwd();
      console.log(`🗑️  Uninstalling ${module} from ${uninstallPath}...`);
      
      const checker = new PackageChecker(uninstallPath);
      await checker.uninstallPackage(module);
      
      console.log(`✅ ${module} uninstalled successfully!`);
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker list
program
  .command('list')
  .description('Lists all dependencies grouped by status: missing, uninstalled, unused')
  .option('-p, --path <path>', 'Path to list (default: current directory)')
  .option('--json', 'Output results in JSON format')
  .action(async (options: ListOptions) => {
    try {
      const listPath = options.path || process.cwd();
      console.log(`📋 Listing dependencies in ${listPath}...`);
      
      const checker = new PackageChecker(listPath);
      const result = await checker.analyzeDependencies();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log('\n=== Dependency Status ===\n');
      
      if (result.missing.length > 0) {
        console.log('❌ Missing Dependencies:');
        result.missing.forEach(pkg => console.log(`  - ${pkg}`));
        console.log('');
      } else {
        console.log('✅ No missing dependencies');
        console.log('');
      }
      
      if (result.notInstalled.length > 0) {
        console.log('⚠️  Not Installed Dependencies:');
        result.notInstalled.forEach(pkg => console.log(`  - ${pkg}`));
        console.log('');
      } else {
        console.log('✅ All declared dependencies are installed');
        console.log('');
      }
      
      if (result.unused.length > 0) {
        console.log('🗑️  Unused Dependencies:');
        result.unused.forEach(unusedPkg => {
          console.log(`  - ${unusedPkg.package}`);
          if (unusedPkg.locations && unusedPkg.locations.length > 0) {
            const locationStrings = unusedPkg.locations.map(loc => {
              const relativePath = path.relative(process.cwd(), loc.file);
              return `${relativePath}:${loc.line}`;
            });
            console.log(`    Found in: ${locationStrings.join(', ')}`);
          }
        });
        console.log('');
      } else {
        console.log('✅ No unused dependencies');
        console.log('');
      }
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker doctor
program
  .command('doctor')
  .description('Full health check for project dependencies and their actual usage')
  .option('-p, --path <path>', 'Path to check (default: current directory)')
  .option('--ai', 'Enable AI-powered analysis and suggestions')
  .action(async (options: DoctorOptions) => {
    try {
      const doctorPath = options.path || process.cwd();
      console.log(`🏥 Running health check on ${doctorPath}...`);
      
      const checker = new PackageChecker(doctorPath);
      const result = await checker.analyzeDependencies();
      
      console.log('\n=== Health Check Results ===\n');
      
      // Basic dependency health
      const totalIssues = result.missing.length + result.notInstalled.length + result.unused.length;
      console.log(`📊 Overall Health: ${totalIssues === 0 ? 'Excellent' : totalIssues < 5 ? 'Good' : 'Needs Attention'}`);
      console.log(`   - Missing: ${result.missing.length}`);
      console.log(`   - Not Installed: ${result.notInstalled.length}`);
      console.log(`   - Unused: ${result.unused.length}`);
      console.log('');
      
      // Recommendations
      if (totalIssues > 0) {
        console.log('💡 Recommendations:');
        console.log('  - Run "checker fix" to automatically resolve issues');
        console.log('  - Run "checker update" to check for package updates');
      } else {
        console.log('🎉 Your project is in excellent health!');
      }
      
      // AI-powered analysis if requested
      if (options.ai) {
        console.log('\n🤖 AI Health Analysis:');
        console.log('🔍 Getting AI insights...');
        
        const aiResult = await aiService.analyzeProject(result);
        
        if (aiResult.summary) {
          console.log(`\n📊 AI Summary: ${aiResult.summary}`);
        }
        
        if (aiResult.securityIssues.length > 0) {
          console.log('\n🔒 Security Recommendations:');
          aiResult.securityIssues.forEach(issue => {
            console.log(`  - ${issue.packageName}: ${issue.recommendation}`);
          });
        }
        
        if (aiResult.performanceTips.length > 0) {
          console.log('\n⚡ Performance Recommendations:');
          aiResult.performanceTips.forEach(tip => {
            console.log(`  - ${tip.tip}`);
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker scan <path>
program
  .command('scan <path>')
  .description('Run a scan on a specific directory or file instead of the whole workspace')
  .option('--ai', 'Enable AI-powered analysis and suggestions')
  .option('--json', 'Output results in JSON format')
  .action(async (scanPath: string, options: ScanOptions) => {
    try {
      console.log(`🔍 Scanning ${scanPath}...`);
      
      const checker = new PackageChecker(scanPath);
      const result = await checker.analyzeDependencies();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log('\n=== Scan Results ===\n');
      
      if (result.missing.length > 0) {
        console.log('❌ Missing Dependencies:');
        result.missing.forEach(pkg => console.log(`  - ${pkg}`));
        console.log('');
      }
      
      if (result.notInstalled.length > 0) {
        console.log('⚠️  Not Installed Dependencies:');
        result.notInstalled.forEach(pkg => console.log(`  - ${pkg}`));
        console.log('');
      }
      
      if (result.unused.length > 0) {
        console.log('🗑️  Unused Dependencies:');
        result.unused.forEach(unusedPkg => {
          console.log(`  - ${unusedPkg.package}`);
          if (unusedPkg.locations && unusedPkg.locations.length > 0) {
            const locationStrings = unusedPkg.locations.map(loc => {
              const relativePath = path.relative(process.cwd(), loc.file);
              return `${relativePath}:${loc.line}`;
            });
            console.log(`    Found in: ${locationStrings.join(', ')}`);
          }
        });
        console.log('');
      }
      
      const totalIssues = result.missing.length + result.notInstalled.length + result.unused.length;
      console.log(`📊 Scan Summary: ${totalIssues} issues found`);
      
      // AI-powered analysis if requested
      if (options.ai) {
        console.log('\n🤖 AI Scan Analysis:');
        console.log('🔍 Getting AI insights...');
        
        const aiResult = await aiService.analyzeProject(result);
        
        if (aiResult.summary) {
          console.log(`\n📊 AI Summary: ${aiResult.summary}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker sync
program
  .command('sync')
  .description('Syncs installed modules with your package.json (like reinstalling from scratch)')
  .option('-p, --path <path>', 'Path to sync (default: current directory)')
  .action(async (options: SyncOptions) => {
    try {
      const syncPath = options.path || process.cwd();
      console.log(`🔄 Syncing dependencies in ${syncPath}...`);
      
      // Remove node_modules and package-lock.json
      const nodeModulesPath = path.join(syncPath, 'node_modules');
      const packageLockPath = path.join(syncPath, 'package-lock.json');
      
      if (await fs.pathExists(nodeModulesPath)) {
        console.log('🗑️  Removing node_modules...');
        await fs.remove(nodeModulesPath);
      }
      
      if (await fs.pathExists(packageLockPath)) {
        console.log('🗑️  Removing package-lock.json...');
        await fs.remove(packageLockPath);
      }
      
      // Reinstall everything
      console.log('📦 Reinstalling all dependencies...');
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync('npm install', { cwd: syncPath });
      
      console.log('✅ Dependencies synced successfully!');
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker clean
program
  .command('clean')
  .description('Removes modules listed in package.json but not used in the code')
  .option('-p, --path <path>', 'Path to clean (default: current directory)')
  .option('--dry-run', 'Show what would be removed without making changes')
  .action(async (options: CleanOptions) => {
    try {
      const cleanPath = options.path || process.cwd();
      console.log(`🧹 Cleaning unused dependencies in ${cleanPath}...`);
      
      const checker = new PackageChecker(cleanPath);
      const result = await checker.analyzeDependencies();
      
      if (result.unused.length === 0) {
        console.log('✅ No unused dependencies found!');
        return;
      }
      
      if (options.dryRun) {
        console.log('\n=== Dry Run - Would Remove ===\n');
        result.unused.forEach(pkg => console.log(`  - ${pkg}`));
        console.log(`\nTotal: ${result.unused.length} unused dependencies`);
        return;
      }
      
      console.log(`🗑️  Removing ${result.unused.length} unused dependencies...`);
      await checker.autoFixAll();
      
      console.log('✅ Cleanup completed successfully!');
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker update
program
  .command('update')
  .description('Updates the CLI tool to the latest version (if published globally)')
  .action(async () => {
    try {
      console.log('🔄 Checking for updates...');
      
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync('npm update -g package-checker-cli');
      
      console.log('✅ Package Checker updated successfully!');
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// checker config
program
  .command('config')
  .description('Configure settings like ignored paths, file types, or auto-fix preferences')
  .option('--set <key=value>', 'Set a configuration value')
  .option('--get <key>', 'Get a configuration value')
  .option('--list', 'List all configuration values')
  .action(async (options: ConfigOptions) => {
    try {
      const configPath = path.join(process.cwd(), '.checkerrc');
      
      if (options.set) {
        const [key, value] = options.set.split('=');
        let config: Record<string, any> = {};
        
        if (await fs.pathExists(configPath)) {
          config = await fs.readJson(configPath);
        }
        
        config[key] = value;
        await fs.writeJson(configPath, config, { spaces: 2 });
        console.log(`✅ Set ${key} = ${value}`);
        
      } else if (options.get) {
        if (await fs.pathExists(configPath)) {
          const config = await fs.readJson(configPath);
          console.log(`${options.get} = ${config[options.get] || 'not set'}`);
        } else {
          console.log(`${options.get} = not set`);
        }
        
      } else if (options.list) {
        if (await fs.pathExists(configPath)) {
          const config = await fs.readJson(configPath);
          console.log('\n=== Configuration ===\n');
          Object.entries(config).forEach(([key, value]) => {
            console.log(`${key} = ${value}`);
          });
        } else {
          console.log('No configuration file found. Use --set to create one.');
        }
        
      } else {
        console.log('Usage:');
        console.log('  checker config --set key=value');
        console.log('  checker config --get key');
        console.log('  checker config --list');
      }
      
    } catch (error) {
      console.error('❌ Error:', (error as Error).message);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(); 