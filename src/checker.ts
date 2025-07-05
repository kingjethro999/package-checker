import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AIService } from './aiService';

const execAsync = promisify(exec);

interface DependencyResult {
  missing: string[];
  unused: { package: string; locations: Array<{ file: string; line: number }> }[];
  notInstalled: string[];
  aiAnalysis?: any;
}

interface PackageInfo {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export class PackageChecker {
  private workspacePath: string;
  private aiService: AIService;

  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.aiService = new AIService(); // Always create AI service with embedded key
  }

  async analyzeDependencies(): Promise<DependencyResult> {
    // Check for different package manager files
    const packageFiles = await this.findPackageFiles();

    if (packageFiles.length === 0) {
      throw new Error('No package files found in workspace');
    }

    const mainPackageFile = packageFiles[0];
    const packageInfo = await this.parsePackageFile(mainPackageFile);
    const { usedPackages, packageLocations } = await this.scanForImports();
    const installedPackages = await this.getInstalledPackages();

    const allDeclared = new Set([
      ...Object.keys(packageInfo.dependencies || {}),
      ...Object.keys(packageInfo.devDependencies || {})
    ]);

    // Filter out invalid package names and validate missing packages
    const validUsedPackages = await this.validatePackageNames(usedPackages);

    const missing = validUsedPackages.filter(pkg => !allDeclared.has(pkg));
    const unused = Array.from(allDeclared).filter(pkg =>
      !validUsedPackages.includes(pkg) && !this.isDevDependencyOnly(pkg)
    );
    const notInstalled = Array.from(allDeclared).filter(pkg => !installedPackages.includes(pkg));

    // Create detailed unused dependencies with file locations
    const unusedWithLocations = unused.map(pkg => {
      const locations = packageLocations[pkg] || [];
      return {
        package: pkg,
        locations: locations
      };
    });

    const result: DependencyResult = {
      missing,
      unused: unusedWithLocations,
      notInstalled
    };

    // Always run AI analysis since we have embedded API key
    try {
      console.log('Running AI analysis...');
      const aiAnalysis = await this.aiService.analyzeProject(result);
      result.aiAnalysis = aiAnalysis;
    } catch (error) {
      console.warn('AI analysis failed:', error);
    }

    return result;
  }

  private async findPackageFiles(): Promise<string[]> {
    const packageFilePatterns = [
      '**/package.json',           // npm/yarn
      '**/composer.json',          // PHP Composer
      '**/requirements.txt',       // Python pip
      '**/Pipfile',               // Python pipenv
      '**/pyproject.toml',        // Python poetry
      '**/Gemfile',               // Ruby bundler
      '**/Cargo.toml',            // Rust cargo
      '**/go.mod',                // Go modules
      '**/pom.xml',               // Java Maven
      '**/build.gradle',          // Java Gradle
      '**/*.csproj',              // .NET
      '**/pubspec.yaml',          // Dart/Flutter
    ];

    const files = await glob(packageFilePatterns, {
      cwd: this.workspacePath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/vendor/**', '**/__pycache__/**']
    });

    return files.map(file => path.join(this.workspacePath, file));
  }

  private async parsePackageFile(packageFilePath: string): Promise<PackageInfo> {
    const ext = path.extname(packageFilePath).toLowerCase();

    try {
      if (ext === '.json') {
        // Handle JSON-based package files
        if (path.basename(packageFilePath) === 'package.json') {
          return await this.parsePackageJson(packageFilePath);
        } else if (path.basename(packageFilePath) === 'composer.json') {
          return await this.parseComposerJson(packageFilePath);
        }
      } else if (ext === '.txt' && path.basename(packageFilePath) === 'requirements.txt') {
        return await this.parseRequirementsTxt(packageFilePath);
      } else if (ext === '.toml') {
        return await this.parseTomlFile(packageFilePath);
      } else if (ext === '.yaml' || ext === '.yml') {
        return await this.parseYamlFile(packageFilePath);
      }

      // Default to empty package info
      return { dependencies: {}, devDependencies: {} };
    } catch (error) {
      console.warn(`Failed to parse package file ${packageFilePath}: ${error}`);
      return { dependencies: {}, devDependencies: {} };
    }
  }

  private async parseComposerJson(composerJsonPath: string): Promise<PackageInfo> {
    try {
      const content = await fs.readFile(composerJsonPath, 'utf-8');
      const composerJson = JSON.parse(content);
      return {
        dependencies: composerJson.require || {},
        devDependencies: composerJson['require-dev'] || {}
      };
    } catch (error) {
      throw new Error(`Failed to parse composer.json: ${error}`);
    }
  }

  private async parseRequirementsTxt(requirementsPath: string): Promise<PackageInfo> {
    try {
      const content = await fs.readFile(requirementsPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      const dependencies: Record<string, string> = {};

      lines.forEach(line => {
        const match = line.match(/^([a-zA-Z0-9_-]+)(?:==|>=|<=|~=)?([0-9.]+)?/);
        if (match) {
          dependencies[match[1]] = match[2] || '*';
        }
      });

      return {
        dependencies,
        devDependencies: {}
      };
    } catch (error) {
      throw new Error(`Failed to parse requirements.txt: ${error}`);
    }
  }

  private async parseTomlFile(tomlPath: string): Promise<PackageInfo> {
    // Basic TOML parsing for common package files
    try {
      const content = await fs.readFile(tomlPath, 'utf-8');
      const dependencies: Record<string, string> = {};
      const devDependencies: Record<string, string> = {};

      // Simple regex-based parsing for common patterns
      const depMatches = content.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/gm);
      if (depMatches) {
        depMatches.forEach(match => {
          const [, name, version] = match.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/) || [];
          if (name && version) {
            dependencies[name] = version;
          }
        });
      }

      return { dependencies, devDependencies };
    } catch (error) {
      throw new Error(`Failed to parse TOML file: ${error}`);
    }
  }

  private async parseYamlFile(yamlPath: string): Promise<PackageInfo> {
    // Basic YAML parsing for common package files
    try {
      const content = await fs.readFile(yamlPath, 'utf-8');
      const dependencies: Record<string, string> = {};
      const devDependencies: Record<string, string> = {};

      // Simple regex-based parsing for common patterns
      const depMatches = content.match(/^([a-zA-Z0-9_-]+):\s*["']([^"']+)["']/gm);
      if (depMatches) {
        depMatches.forEach(match => {
          const [, name, version] = match.match(/^([a-zA-Z0-9_-]+):\s*["']([^"']+)["']/) || [];
          if (name && version) {
            dependencies[name] = version;
          }
        });
      }

      return { dependencies, devDependencies };
    } catch (error) {
      throw new Error(`Failed to parse YAML file: ${error}`);
    }
  }

  private async validatePackageNames(packages: string[]): Promise<string[]> {
    const validPackages: string[] = [];

    for (const pkg of packages) {
      // Skip common false positives
      if (this.isFalsePositive(pkg)) {
        continue;
      }

      // Check if it's a valid npm package name
      if (this.isValidPackageName(pkg)) {
        validPackages.push(pkg);
      }
    }

    return validPackages;
  }

  private isFalsePositive(packageName: string): boolean {
    const falsePositives = [
      '@vitejs', // This is a namespace, not a package
      '@eslint', // This is a namespace, not a package
      'odometer', // Might be a local module or CSS library
      'vue', // Usually handled by Vue ecosystem
      'angular', // Usually handled by Angular ecosystem
      'typescript', // Usually a dev dependency
      'javascript', // Not a package
      'node', // Built-in Node.js modules
      'fs', // Built-in Node.js modules
      'path', // Built-in Node.js modules
      'http', // Built-in Node.js modules
      'https', // Built-in Node.js modules
      'url', // Built-in Node.js modules
      'querystring', // Built-in Node.js modules
      'crypto', // Built-in Node.js modules
      'os', // Built-in Node.js modules
      'util', // Built-in Node.js modules
      'events', // Built-in Node.js modules
      'stream', // Built-in Node.js modules
      'buffer', // Built-in Node.js modules
      'process', // Built-in Node.js modules
      'global', // Built-in Node.js modules
      'console', // Built-in Node.js modules
      'setTimeout', // Built-in Node.js modules
      'setInterval', // Built-in Node.js modules
      'clearTimeout', // Built-in Node.js modules
      'clearInterval', // Built-in Node.js modules
      'JSON', // Built-in Node.js modules
      'Math', // Built-in Node.js modules
      'Date', // Built-in Node.js modules
      'Array', // Built-in Node.js modules
      'Object', // Built-in Node.js modules
      'String', // Built-in Node.js modules
      'Number', // Built-in Node.js modules
      'Boolean', // Built-in Node.js modules
      'Function', // Built-in Node.js modules
      'RegExp', // Built-in Node.js modules
      'Error', // Built-in Node.js modules
      'Promise', // Built-in Node.js modules
      'Map', // Built-in Node.js modules
      'Set', // Built-in Node.js modules
      'WeakMap', // Built-in Node.js modules
      'WeakSet', // Built-in Node.js modules
      'Symbol', // Built-in Node.js modules
      'Proxy', // Built-in Node.js modules
      'Reflect', // Built-in Node.js modules
      'Intl', // Built-in Node.js modules
      'WebAssembly', // Built-in Node.js modules
      'Atomics', // Built-in Node.js modules
      'SharedArrayBuffer', // Built-in Node.js modules
      'DataView', // Built-in Node.js modules
      'Float32Array', // Built-in Node.js modules
      'Float64Array', // Built-in Node.js modules
      'Int8Array', // Built-in Node.js modules
      'Int16Array', // Built-in Node.js modules
      'Int32Array', // Built-in Node.js modules
      'Uint8Array', // Built-in Node.js modules
      'Uint8ClampedArray', // Built-in Node.js modules
      'Uint16Array', // Built-in Node.js modules
      'Uint32Array', // Built-in Node.js modules
      'BigInt64Array', // Built-in Node.js modules
      'BigUint64Array', // Built-in Node.js modules
      // Additional built-in Node.js modules
      'vscode', // VS Code extension API
      'child_process', // Built-in Node.js modules
      'assert', // Built-in Node.js modules
      'cluster', // Built-in Node.js modules
      'dgram', // Built-in Node.js modules
      'dns', // Built-in Node.js modules
      'domain', // Built-in Node.js modules
      'module', // Built-in Node.js modules
      'net', // Built-in Node.js modules
      'punycode', // Built-in Node.js modules
      'readline', // Built-in Node.js modules
      'repl', // Built-in Node.js modules
      'string_decoder', // Built-in Node.js modules
      'sys', // Built-in Node.js modules
      'timers', // Built-in Node.js modules
      'tls', // Built-in Node.js modules
      'tty', // Built-in Node.js modules
      'vm', // Built-in Node.js modules
      'zlib', // Built-in Node.js modules
      'package', // Built-in Node.js modules
    ];

    return falsePositives.includes(packageName.toLowerCase());
  }

  private isDevDependencyOnly(packageName: string): boolean {
    // Comprehensive list of dev dependencies across multiple languages and frameworks
    const devOnlyPackages = [
      // === JavaScript/Node.js Build Tools ===
      'react-scripts',
      'vite',
      '@vitejs/plugin-react',
      '@vitejs/plugin-vue',
      '@vitejs/plugin-svelte',
      'webpack',
      'webpack-cli',
      'webpack-dev-server',
      'webpack-merge',
      'rollup',
      'rollup-plugin-typescript2',
      'rollup-plugin-terser',
      'parcel',
      'esbuild',
      'swc',
      '@swc/core',
      '@swc/cli',
      'turbo',
      'nx',
      'lerna',
      'rush',

      // === TypeScript and Type Definitions ===
      'typescript',
      'ts-node',
      'tsx',
      'ts-jest',
      'ts-loader',
      'tsc-alias',
      '@types/react',
      '@types/react-dom',
      '@types/react-router-dom',
      '@types/node',
      '@types/express',
      '@types/cors',
      '@types/bcrypt',
      '@types/jsonwebtoken',
      '@types/multer',
      '@types/passport',
      '@types/lodash',
      '@types/uuid',
      '@types/debug',
      '@types/cookie-parser',
      '@types/compression',
      '@types/helmet',
      '@types/morgan',
      '@types/vscode',
      '@types/fs-extra',
      '@types/glob',
      '@types/mocha',
      '@types/jest',
      '@types/chai',
      '@types/sinon',
      '@types/supertest',
      '@types/selenium-webdriver',
      '@types/puppeteer',

      // === Vue.js Ecosystem ===
      '@vue/cli',
      '@vue/cli-service',
      '@vue/cli-plugin-router',
      '@vue/cli-plugin-vuex',
      '@vue/cli-plugin-typescript',
      '@vue/cli-plugin-eslint',
      '@vue/cli-plugin-pwa',
      'vue-cli-plugin-vuetify',
      '@vue/test-utils',
      '@vue/vue3-jest',
      'vue-jest',
      'vue-loader',
      'vue-style-loader',
      'vue-template-compiler',
      '@vue/compiler-sfc',
      '@vue/eslint-config-typescript',
      '@vue/eslint-config-prettier',
      'nuxt',
      '@nuxt/typescript-build',
      '@nuxt/typescript-runtime',

      // === React Ecosystem ===
      'create-react-app',
      '@craco/craco',
      'react-app-rewired',
      'customize-cra',
      'react-dev-utils',
      'react-error-overlay',
      'react-hot-loader',
      '@hot-loader/react-dom',
      'react-refresh',
      '@pmmmwh/react-refresh-webpack-plugin',

      // === Angular Ecosystem ===
      '@angular/cli',
      '@angular-devkit/build-angular',
      '@angular-devkit/architect',
      '@angular-devkit/core',
      '@angular-devkit/schematics',
      '@angular/compiler-cli',
      '@angular/language-service',
      '@angular-eslint/builder',
      '@angular-eslint/eslint-plugin',
      '@angular-eslint/eslint-plugin-template',
      '@angular-eslint/schematics',
      '@angular-eslint/template-parser',
      'ng-packagr',
      'protractor',
      'jasmine-core',
      'jasmine-spec-reporter',
      'karma',
      'karma-chrome-launcher',
      'karma-coverage',
      'karma-jasmine',
      'karma-jasmine-html-reporter',

      // === Svelte Ecosystem ===
      '@sveltejs/kit',
      '@sveltejs/adapter-auto',
      '@sveltejs/adapter-node',
      '@sveltejs/adapter-static',
      '@sveltejs/vite-plugin-svelte',
      'svelte',
      'svelte-check',
      'svelte-loader',
      'svelte-preprocess',
      'svelte-spa-router',

      // === Testing Frameworks ===
      'jest',
      'jest-environment-jsdom',
      'jest-environment-node',
      '@jest/globals',
      'mocha',
      'chai',
      'sinon',
      'supertest',
      'cypress',
      'playwright',
      '@playwright/test',
      'puppeteer',
      'selenium-webdriver',
      'webdriverio',
      '@wdio/cli',
      '@wdio/local-runner',
      '@wdio/mocha-framework',
      '@testing-library/react',
      '@testing-library/vue',
      '@testing-library/svelte',
      '@testing-library/angular',
      '@testing-library/jest-dom',
      '@testing-library/user-event',
      'vitest',
      '@vitest/ui',
      'ava',
      'tap',
      'tape',
      'qunit',
      'enzyme',
      'enzyme-adapter-react-16',
      'enzyme-adapter-react-17',
      'enzyme-to-json',

      // === Linting and Code Quality ===
      'eslint',
      '@eslint/js',
      '@eslint/eslintrc',
      'eslint-config-airbnb',
      'eslint-config-airbnb-base',
      'eslint-config-prettier',
      'eslint-config-standard',
      'eslint-plugin-import',
      'eslint-plugin-jsx-a11y',
      'eslint-plugin-react',
      'eslint-plugin-react-hooks',
      'eslint-plugin-vue',
      'eslint-plugin-svelte3',
      '@typescript-eslint/eslint-plugin',
      '@typescript-eslint/parser',
      'prettier',
      'stylelint',
      'stylelint-config-standard',
      'stylelint-config-prettier',
      'stylelint-scss',
      'jshint',
      'jslint',
      'tslint',
      'xo',
      'standard',
      'semistandard',

      // === CSS and Styling Tools ===
      'sass',
      'node-sass',
      'sass-loader',
      'less',
      'less-loader',
      'stylus',
      'stylus-loader',
      'postcss',
      'postcss-cli',
      'postcss-loader',
      'autoprefixer',
      'tailwindcss',
      '@tailwindcss/forms',
      '@tailwindcss/typography',
      '@tailwindcss/aspect-ratio',
      'bootstrap',
      'bulma',
      'materialize-css',
      'css-loader',
      'style-loader',
      'mini-css-extract-plugin',
      'extract-text-webpack-plugin',
      'optimize-css-assets-webpack-plugin',
      'purgecss',
      '@fullhuman/postcss-purgecss',

      // === Development Utilities ===
      'nodemon',
      'concurrently',
      'npm-run-all',
      'npm-run-all2',
      'wait-on',
      'cross-env',
      'dotenv',
      'dotenv-cli',
      'env-cmd',
      'rimraf',
      'del-cli',
      'cpx',
      'copyfiles',
      'mkdirp',
      'chokidar',
      'chokidar-cli',
      'live-server',
      'browser-sync',
      'reload',
      'http-server',
      'serve',
      'static-server',

      // === Documentation Tools ===
      'typedoc',
      'jsdoc',
      'esdoc',
      'documentation',
      'docsify',
      'docsify-cli',
      'gitbook',
      'gitbook-cli',
      'vuepress',
      '@vuepress/cli',
      'docusaurus',
      '@docusaurus/core',
      'storybook',
      '@storybook/react',
      '@storybook/vue',
      '@storybook/angular',
      '@storybook/svelte',

      // === Git Hooks and Code Quality ===
      'husky',
      'lint-staged',
      'pre-commit',
      'commitizen',
      'cz-conventional-changelog',
      'commitlint',
      '@commitlint/cli',
      '@commitlint/config-conventional',
      'semantic-release',
      'standard-version',
      'release-it',

      // === VS Code Extensions ===
      '@vscode/test-cli',
      '@vscode/test-electron',
      '@vscode/vsce',
      'vscode-languageserver',
      'vscode-languageserver-textdocument',
      'vscode-languageclient',

      // === Python Dev Dependencies ===
      'pytest',
      'pytest-cov',
      'pytest-mock',
      'pytest-django',
      'pytest-flask',
      'pytest-asyncio',
      'unittest2',
      'nose',
      'nose2',
      'coverage',
      'coveralls',
      'codecov',
      'tox',
      'flake8',
      'pylint',
      'pycodestyle',
      'pyflakes',
      'autopep8',
      'black',
      'isort',
      'mypy',
      'bandit',
      'safety',
      'pre-commit',
      'sphinx',
      'sphinx-rtd-theme',
      'mkdocs',
      'mkdocs-material',
      'jupyter',
      'notebook',
      'ipython',
      'pipenv',
      'poetry',
      'setuptools',
      'wheel',
      'twine',
      'bump2version',
      'factory-boy',
      'faker',
      'mock',
      'responses',
      'vcr',
      'pytest-vcr',
      'django-debug-toolbar',
      'django-extensions',
      'flask-testing',
      'flask-migrate',

      // === PHP Dev Dependencies ===
      'phpunit/phpunit',
      'phpstan/phpstan',
      'psalm/phar',
      'squizlabs/php_codesniffer',
      'friendsofphp/php-cs-fixer',
      'phpmd/phpmd',
      'sebastian/phpcpd',
      'phploc/phploc',
      'pdepend/pdepend',
      'mockery/mockery',
      'fakerphp/faker',
      'laravel/telescope',
      'laravel/dusk',
      'laravel/tinker',
      'barryvdh/laravel-debugbar',
      'barryvdh/laravel-ide-helper',
      'symfony/debug-bundle',
      'symfony/web-profiler-bundle',
      'symfony/maker-bundle',
      'doctrine/doctrine-fixtures-bundle',
      'phpspec/phpspec',
      'behat/behat',
      'codeception/codeception',
      'deployer/deployer',
      'roave/security-advisories',

      // === Ruby Dev Dependencies ===
      'rspec',
      'rspec-core',
      'rspec-expectations',
      'rspec-mocks',
      'rspec-rails',
      'minitest',
      'test-unit',
      'capybara',
      'selenium-webdriver',
      'factory_bot',
      'factory_bot_rails',
      'faker',
      'rubocop',
      'rubocop-rails',
      'rubocop-rspec',
      'reek',
      'brakeman',
      'bundler-audit',
      'simplecov',
      'guard',
      'guard-rspec',
      'guard-livereload',
      'spring',
      'spring-commands-rspec',
      'byebug',
      'pry',
      'pry-rails',
      'better_errors',
      'binding_of_caller',
      'web-console',
      'listen',
      'yard',
      'rdoc',
      'rails-erd',
      'annotate',

      // === Java Dev Dependencies ===
      'junit',
      'testng',
      'mockito-core',
      'powermock',
      'hamcrest',
      'assertj-core',
      'spring-boot-starter-test',
      'spring-test',
      'selenium-java',
      'cucumber-java',
      'rest-assured',
      'wiremock',
      'checkstyle',
      'pmd',
      'spotbugs',
      'findbugs',
      'jacoco',
      'maven-surefire-plugin',
      'maven-failsafe-plugin',
      'maven-checkstyle-plugin',
      'maven-pmd-plugin',
      'maven-spotbugs-plugin',

      // === .NET Dev Dependencies ===
      'Microsoft.NET.Test.Sdk',
      'xunit',
      'xunit.runner.visualstudio',
      'NUnit',
      'NUnit3TestAdapter',
      'MSTest.TestFramework',
      'MSTest.TestAdapter',
      'Moq',
      'FluentAssertions',
      'AutoFixture',
      'Bogus',
      'coverlet.collector',
      'coverlet.msbuild',
      'ReportGenerator',
      'StyleCop.Analyzers',
      'Microsoft.CodeAnalysis.Analyzers',
      'SonarAnalyzer.CSharp',

      // === Go Dev Dependencies ===
      'github.com/stretchr/testify',
      'github.com/golang/mock',
      'github.com/onsi/ginkgo',
      'github.com/onsi/gomega',
      'github.com/go-playground/validator',
      'github.com/golangci/golangci-lint',
      'github.com/golang/dep',
      'github.com/gomodule/redigo',
      'github.com/gorilla/mux',
      'github.com/gin-gonic/gin',

      // === Rust Dev Dependencies ===
      'tokio-test',
      'proptest',
      'criterion',
      'mockall',
      'serial_test',
      'tempfile',
      'assert_cmd',
      'predicates',
      'pretty_assertions',
      'cargo-audit',
      'cargo-outdated',
      'cargo-deny',
      'cargo-tarpaulin',
      'cargo-watch',
      'cargo-expand',
      'clippy',
      'rustfmt',

      // === Swift Dev Dependencies ===
      'Quick',
      'Nimble',
      'OHHTTPStubs',
      'Cuckoo',
      'SwiftLint',
      'SwiftFormat',
      'Sourcery',
      'XCTest',

      // === Kotlin Dev Dependencies ===
      'junit',
      'kotlintest',
      'mockk',
      'kluent',
      'detekt',
      'ktlint',
      'kotlinx-coroutines-test',

      // === Database and ORM Dev Tools ===
      'knex',
      'migration',
      'sequelize-cli',
      'typeorm',
      'prisma',
      '@prisma/client',
      'mongoose',
      'mongodb-memory-server',
      'sqlite3',
      'better-sqlite3',
      'pg',
      'mysql2',
      'redis',
      'ioredis',

      // === DevOps and CI/CD Tools ===
      'docker',
      'docker-compose',
      'kubernetes',
      'terraform',
      'ansible',
      'vagrant',
      'packer',
      'jenkins',
      'gitlab-ci',
      'github-actions',
      'circleci',
      'travis-ci',
      'azure-devops',
      'aws-cli',
      'gcloud',
      'heroku',
      'netlify-cli',
      'vercel',
      'surge',

      // === Performance and Monitoring ===
      'lighthouse',
      'web-vitals',
      'webpack-bundle-analyzer',
      'bundle-analyzer',
      'source-map-explorer',
      'why-did-you-render',
      'react-devtools',
      'vue-devtools',
      'redux-devtools',
      'sentry',
      '@sentry/browser',
      '@sentry/node',
      'bugsnag',
      'rollbar',
      'new-relic',
      'datadog',

      // === Additional Language-Specific Tools ===
      // Scala
      'scalatest',
      'scalamock',
      'scalacheck',
      'specs2',
      'sbt',
      'scalastyle',
      'wartremover',
      'scoverage',

      // Clojure
      'leiningen',
      'midje',
      'clojure.test',
      'expectations',
      'eastwood',
      'kibit',
      'cloverage',

      // Haskell
      'hspec',
      'quickcheck',
      'tasty',
      'criterion',
      'hlint',
      'hindent',
      'stylish-haskell',
      'hpc',

      // Elixir
      'exunit',
      'mock',
      'bypass',
      'credo',
      'dialyxir',
      'excoveralls',
      'ex_doc',
      'phoenix_live_reload',

      // Dart/Flutter
      'test',
      'mockito',
      'flutter_test',
      'integration_test',
      'flutter_driver',
      'dart_code_metrics',
      'pedantic',
      'effective_dart',
      'dartdoc',
    ];

    return devOnlyPackages.includes(packageName.toLowerCase());
  }

  private isValidPackageName(packageName: string): boolean {
    // Basic npm package name validation
    const npmPackageRegex = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    return npmPackageRegex.test(packageName);
  }

  async getPackageUpdates(): Promise<any[]> {
    try {
      const packageInfo = await this.parsePackageJson(path.join(this.workspacePath, 'package.json'));
      const allPackages = [
        ...Object.keys(packageInfo.dependencies || {}),
        ...Object.keys(packageInfo.devDependencies || {})
      ];
      
      return await this.aiService.checkPackageVersions(allPackages);
    } catch (error) {
      console.error('Failed to get package updates:', error);
      return [];
    }
  }

  async getSecurityAudit(): Promise<any[]> {
    try {
      const result = await this.analyzeDependencies();
      return result.aiAnalysis?.securityIssues || [];
    } catch (error) {
      console.error('Failed to get security audit:', error);
      return [];
    }
  }

  async getCodeSuggestions(): Promise<any[]> {
    try {
      const result = await this.analyzeDependencies();
      return result.aiAnalysis?.codeSuggestions || [];
    } catch (error) {
      console.error('Failed to get code suggestions:', error);
      return [];
    }
  }

  async getPerformanceTips(): Promise<any[]> {
    try {
      const result = await this.analyzeDependencies();
      return result.aiAnalysis?.performanceTips || [];
    } catch (error) {
      console.error('Failed to get performance tips:', error);
      return [];
    }
  }

  async suggestAlternatives(packageName: string): Promise<string[]> {
    try {
      return await this.aiService.suggestAlternatives(packageName);
    } catch (error) {
      console.error('Failed to suggest alternatives:', error);
      return [];
    }
  }

  private async parsePackageJson(packageJsonPath: string): Promise<PackageInfo> {
    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      return {
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {}
      };
    } catch (error) {
      throw new Error(`Failed to parse package.json: ${error}`);
    }
  }

  private async scanForImports(): Promise<{ usedPackages: string[]; packageLocations: Record<string, Array<{ file: string; line: number }>> }> {
    // Support multiple file types for different languages
    const fileExtensions = [
      // JavaScript/TypeScript
      'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs',
      // PHP
      'php',
      // Python
      'py',
      // Ruby
      'rb',
      // Go
      'go',
      // Rust
      'rs',
      // Java
      'java',
      // C#
      'cs',
      // Vue
      'vue',
      // Svelte
      'svelte'
    ];
    const patterns = fileExtensions.map(ext => `**/*.${ext}`);

    const files = await glob(patterns, {
      cwd: this.workspacePath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/vendor/**', '**/__pycache__/**']
    });

    const usedPackages = new Set<string>();
    const packageLocations: Record<string, Array<{ file: string; line: number }>> = {};

    for (const file of files) {
      const filePath = path.join(this.workspacePath, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        // Extract packages with line numbers
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          const packages = this.extractPackagesFromLine(line, filePath);

          packages.forEach(pkg => {
            usedPackages.add(pkg);
            if (!packageLocations[pkg]) {
              packageLocations[pkg] = [];
            }
            packageLocations[pkg].push({
              file: filePath,
              line: lineNum + 1 // Convert to 1-based line numbers
            });
          });
        }
      } catch (error) {
        console.warn(`Failed to read file ${file}: ${error}`);
      }
    }

    return {
      usedPackages: Array.from(usedPackages),
      packageLocations
    };
  }

  private extractPackagesFromLine(line: string, filePath: string): string[] {
    const packages = new Set<string>();
    const ext = path.extname(filePath).toLowerCase();

    // JavaScript/TypeScript imports
    if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue', '.svelte'].includes(ext)) {
      // ES6 imports
      const es6Imports = line.match(/(?:import|export)\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"`]([^'"`]+)['"`]/g);
      if (es6Imports) {
        es6Imports.forEach(imp => {
          const match = imp.match(/['"`]([^'"`]+)['"`]/);
          if (match && !this.isRelativePath(match[1])) {
            const pkg = this.extractPackageName(match[1]);
            if (pkg && !this.isFalsePositive(pkg)) {
              packages.add(pkg);
            }
          }
        });
      }

      // CommonJS requires
      const commonJSImports = line.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
      if (commonJSImports) {
        commonJSImports.forEach(imp => {
          const match = imp.match(/['"`]([^'"`]+)['"`]/);
          if (match && !this.isRelativePath(match[1])) {
            const pkg = this.extractPackageName(match[1]);
            if (pkg && !this.isFalsePositive(pkg)) {
              packages.add(pkg);
            }
          }
        });
      }
    }

    // PHP imports
    if (ext === '.php') {
      // Composer autoload, use statements, require/include
      const phpImports = line.match(/(?:use|require|include|require_once|include_once)\s+([^;]+)/g);
      if (phpImports) {
        phpImports.forEach(imp => {
          const match = imp.match(/(?:use|require|include|require_once|include_once)\s+([^;]+)/);
          if (match) {
            const pkg = this.extractPhpPackageName(match[1]);
            if (pkg && !this.isFalsePositive(pkg)) {
              packages.add(pkg);
            }
          }
        });
      }
    }

    // Python imports
    if (ext === '.py') {
      const pythonImports = line.match(/(?:import|from)\s+([^\s]+)/g);
      if (pythonImports) {
        pythonImports.forEach(imp => {
          const match = imp.match(/(?:import|from)\s+([^\s]+)/);
          if (match) {
            const pkg = this.extractPythonPackageName(match[1]);
            if (pkg && !this.isFalsePositive(pkg)) {
              packages.add(pkg);
            }
          }
        });
      }
    }

    // Ruby requires
    if (ext === '.rb') {
      const rubyRequires = line.match(/require\s+['"`]([^'"`]+)['"`]/g);
      if (rubyRequires) {
        rubyRequires.forEach(imp => {
          const match = imp.match(/['"`]([^'"`]+)['"`]/);
          if (match) {
            const pkg = this.extractRubyPackageName(match[1]);
            if (pkg && !this.isFalsePositive(pkg)) {
              packages.add(pkg);
            }
          }
        });
      }
    }

    return Array.from(packages);
  }

  private extractPhpPackageName(importPath: string): string | null {
    // Handle PHP package names (vendor/package format)
    const parts = importPath.trim().split('\\');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return null;
  }

  private extractPythonPackageName(importPath: string): string | null {
    // Handle Python package names
    const parts = importPath.trim().split('.');
    return parts[0] || null;
  }

  private extractRubyPackageName(importPath: string): string | null {
    // Handle Ruby gem names
    return importPath.trim() || null;
  }

  private extractPackageName(importPath: string): string | null {
    // Handle package names
    const parts = importPath.split('/');
    if (parts.length > 0) {
      return parts[0];
    }
    return null;
  }

  private isRelativePath(path: string): boolean {
    return path.startsWith('.') || path.startsWith('/');
  }

  private async getInstalledPackages(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('npm list --depth=0 --json', { cwd: this.workspacePath });
      const npmList = JSON.parse(stdout);
      return Object.keys(npmList.dependencies || {});
    } catch (error) {
      console.warn('Failed to get installed packages:', error);
      return [];
    }
  }

  async installPackage(packageName: string): Promise<void> {
    try {
      await execAsync(`npm install ${packageName}`, { cwd: this.workspacePath });
    } catch (error) {
      throw new Error(`Failed to install ${packageName}: ${error}`);
    }
  }

  async uninstallPackage(packageName: string): Promise<void> {
    try {
      await execAsync(`npm uninstall ${packageName}`, { cwd: this.workspacePath });
    } catch (error) {
      throw new Error(`Failed to uninstall ${packageName}: ${error}`);
    }
  }

  async autoFixAll(): Promise<void> {
    const result = await this.analyzeDependencies();

    if (result.missing.length > 0) {
      await execAsync(`npm install ${result.missing.join(' ')}`, { cwd: this.workspacePath });
    }

    if (result.notInstalled.length > 0) {
      await execAsync(`npm install ${result.notInstalled.join(' ')}`, { cwd: this.workspacePath });
    }

    if (result.unused.length > 0) {
      await execAsync(`npm uninstall ${result.unused.map(u => u.package).join(' ')}`, { cwd: this.workspacePath });
    }
  }

  getWorkspacePath(): string {
    return this.workspacePath;
  }

  isAIEnabled(): boolean {
    return true; // AI is always enabled with embedded API key
  }
} 