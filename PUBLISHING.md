# Publishing Guide

This guide explains how to publish both the VS Code extension and CLI tool components of Package Checker.

## Package Structure

- **VS Code Extension:** `package-checker` (main package)
- **CLI Tool:** `package-checker-cli` (separate package)

## Publishing Options

### Option 1: Publish Both as Separate Packages (Recommended)

This approach publishes the VS Code extension and CLI as separate npm packages, giving users the flexibility to install either or both.

#### Publishing the VS Code Extension

1. **Build the extension:**
   ```bash
   npm run build:extension
   ```

2. **Package for VS Code Marketplace:**
   ```bash
   npm install -g vsce
   vsce package
   ```

3. **Publish to VS Code Marketplace:**
   ```bash
   vsce publish
   ```

#### Publishing the CLI Tool

**Easy Method (Recommended):**
```bash
npm run publish:cli
```

**Manual Method:**
1. **Build the CLI:**
   ```bash
   npm run build:cli
   ```

2. **Publish using CLI package.json:**
   ```bash
   cp package-cli.json package.json
   npm publish
   git checkout package.json
   ```

### Option 2: Publish CLI Only

If you only want to publish the CLI tool:

```bash
npm run publish:cli
```

### Option 3: Publish Extension Only

If you only want to publish the VS Code extension:

```bash
npm run build:extension
vsce publish
```

## Pre-publishing Checklist

### For VS Code Extension:
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Test extension in VS Code
- [ ] Ensure all commands work
- [ ] Test sidebar functionality
- [ ] Verify AI integration works

### For CLI Tool:
- [ ] Update version in package-cli.json
- [ ] Update CHANGELOG.md
- [ ] Test all CLI commands
- [ ] Verify AI integration works
- [ ] Test on different platforms (Windows, macOS, Linux)
- [ ] Ensure proper error handling

### For Both:
- [ ] Run `npm run lint`
- [ ] Run `npm run check-types`
- [ ] Test build process
- [ ] Update README.md with installation instructions

## Publishing Commands

### Quick Commands

```bash
# Build extension
npm run build:extension

# Build CLI
npm run build:cli

# Publish VS Code extension
npm run package && vsce publish

# Publish CLI tool (easy way)
npm run publish:cli

# Publish CLI tool (manual way)
cp package-cli.json package.json && npm run build && npm publish && git checkout package.json
```

### Development Commands

```bash
# Watch mode for extension
npm run watch:esbuild

# Watch mode for CLI
npm run build:cli -- --watch

# Test CLI locally
npm run build:cli && node dist/cli.js --help
```

## Package Names and URLs

### VS Code Extension
- **Name:** `package-checker`
- **Publisher:** Your VS Code publisher name
- **Marketplace URL:** `https://marketplace.visualstudio.com/items?itemName=yourname.package-checker`

### CLI Tool
- **Name:** `package-checker-cli`
- **npm URL:** `https://www.npmjs.com/package/package-checker-cli`

## Installation Instructions

### For Users

#### Installing VS Code Extension
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Package Checker"
4. Click Install

#### Installing CLI Tool
```bash
# Global installation
npm install -g package-checker-cli

# Usage
checker --help
checker check
checker doctor --ai
```

## Version Management

### Semantic Versioning
- **Major:** Breaking changes
- **Minor:** New features
- **Patch:** Bug fixes

### Version Synchronization
Keep versions synchronized between:
- `package.json` (main extension)
- `package-cli.json` (CLI package)
- `CHANGELOG.md`
- VS Code extension manifest

## Troubleshooting

### Common Issues

1. **Build Errors:**
   ```bash
   npm run check-types
   npm run lint
   ```

2. **Publishing Errors:**
   - Ensure you're logged in: `npm login`
   - Check package name availability
   - Verify all required fields in package.json

3. **CLI Not Found:**
   - Ensure shebang is correct: `#!/usr/bin/env node`
   - Check file permissions: `chmod +x dist/cli.js`
   - Verify bin field in package-cli.json

4. **Package Name Conflicts:**
   - Check if `package-checker-cli` is available on npm
   - Consider alternative names if needed

### Support

For publishing issues:
1. Check npm documentation
2. Verify VS Code extension publishing guide
3. Review package.json configuration
4. Test locally before publishing

## Package Structure Summary

```
package-checker/
├── package.json          # VS Code extension package
├── package-cli.json      # CLI tool package
├── scripts/
│   └── publish-cli.js    # CLI publishing automation
├── src/
│   ├── extension.ts      # VS Code extension entry
│   ├── cli.ts           # CLI tool entry
│   └── ...
└── dist/
    ├── extension.js      # Built extension
    └── cli.js           # Built CLI
``` 